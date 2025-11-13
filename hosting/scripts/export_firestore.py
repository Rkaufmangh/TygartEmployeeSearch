#!/usr/bin/env python3
"""
Export Firestore Emulator data (excluding specific collections) to a JSON file
and upload the result to Google Cloud Storage.

Requirements:
  pip install google-cloud-firestore google-cloud-storage

By default, connects to emulator at localhost:8080 and uses project 'demo-project'.
Respects FIRESTORE_EMULATOR_HOST and GOOGLE_CLOUD_PROJECT if already set.

Usage:
  python scripts/export_firestore.py --out export.json \
         [--emulator-host localhost:8080] [--project demo-project] \
         [--gcs-url gs://employee-qualification.firebasestorage.app/export]

Excludes the 'employees' and 'users' collections by default (configurable via --exclude).
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from datetime import datetime
from typing import Any, Dict, List

from google.cloud import firestore  # type: ignore
from google.cloud import storage  # type: ignore


def to_jsonable(value: Any) -> Any:
    """Convert Firestore Python types to JSON-serializable representations."""
    if isinstance(value, datetime):
        return value.isoformat()
    # Firestore DocumentReference
    try:
        from google.cloud.firestore_v1.base_document import BaseDocumentReference  # type: ignore

        if isinstance(value, BaseDocumentReference):
            return value.path
    except Exception:
        pass

    # GeoPoint
    try:
        from google.cloud.firestore_v1 import _helpers  # type: ignore

        if hasattr(value, "latitude") and hasattr(value, "longitude"):
            return {"latitude": value.latitude, "longitude": value.longitude}
    except Exception:
        pass

    # Bytes
    if isinstance(value, (bytes, bytearray)):
        return base64.b64encode(bytes(value)).decode("ascii")

    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    return value


def export_doc(doc_ref) -> Dict[str, Any]:
    snap = doc_ref.get()
    data = snap.to_dict() or {}
    node: Dict[str, Any] = {"id": snap.id, "data": to_jsonable(data), "subcollections": {}}
    # Recurse into subcollections
    for sub in doc_ref.collections():
        node["subcollections"][sub.id] = export_collection(sub)
    return node


def export_collection(coll_ref) -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []
    for doc in coll_ref.stream():
        docs.append(export_doc(doc.reference))
    return docs


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Firestore emulator data to JSON")
    parser.add_argument("--out", required=True, help="Output JSON file path")
    parser.add_argument("--emulator-host", default=os.environ.get("FIRESTORE_EMULATOR_HOST", "localhost:8080"))
    parser.add_argument("--project", default=os.environ.get("GOOGLE_CLOUD_PROJECT", "demo-project"))
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=["employees", "users"],
        help="Root collections to exclude (space-separated)",
    )
    parser.add_argument(
        "--gcs-url",
        default="gs://employee-qualification.firebasestorage.app/export",
        help="GCS URL (bucket/prefix) to upload the export JSON, e.g. gs://bucket/folder",
    )
    args = parser.parse_args()

    # Point client to emulator
    os.environ["FIRESTORE_EMULATOR_HOST"] = args.emulator_host
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", args.project)

    db = firestore.Client(project=args.project)

    export: Dict[str, Any] = {"project": args.project, "emulator": args.emulator_host, "collections": {}}
    for coll in db.collections():
        if coll.id in set(args.exclude):
            continue
        export["collections"][coll.id] = export_collection(coll)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(export, f, ensure_ascii=False, indent=2)
    print(f"Exported to {args.out}")

    # Upload to GCS
    if args.gcs_url:
        if not args.gcs_url.startswith("gs://"):
            raise SystemExit("--gcs-url must start with gs://")
        _, rest = args.gcs_url.split("gs://", 1)
        parts = rest.split("/", 1)
        bucket_name = parts[0]
        prefix = parts[1] if len(parts) > 1 else ""
        # Compose object path: <prefix>/<basename>
        base = os.path.basename(args.out)
        object_name = f"{prefix.rstrip('/')}/{base}" if prefix else base

        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        blob.upload_from_filename(args.out, content_type="application/json")
        print(f"Uploaded to gs://{bucket_name}/{object_name}")


if __name__ == "__main__":
    main()
