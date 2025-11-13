#!/usr/bin/env python3
"""
Import Firestore data from a JSON export into a Firestore project or emulator.

Mirrors the JSON structure produced by scripts/export_firestore.py:
  {
    "project": "...",
    "collections": {
      "collectionName": [
        {
          "id": "docId",
          "data": { ... any JSON ... },
          "subcollections": {
            "childCollection": [...]
          }
        }
      ]
    }
  }

Usage examples:
  python scripts/import_firestore.py --input export.json --project my-prod-project
  python scripts/import_firestore.py --gcs-url gs://bucket/path/export.json --project my-prod-project
  python scripts/import_firestore.py --emulator-host localhost:8080 --project demo-project --input export.json

Requirements:
  pip install google-cloud-firestore google-cloud-storage
"""
from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Iterable, Mapping, MutableMapping

from google.cloud import firestore  # type: ignore
from google.cloud import storage  # type: ignore

JsonDoc = MutableMapping[str, Any]
JsonExport = Mapping[str, Any]


def _download_from_gcs(gcs_url: str, destination: Path) -> Path:
    if not gcs_url.startswith("gs://"):
        raise SystemExit("--gcs-url must start with gs://")

    _, rest = gcs_url.split("gs://", 1)
    bucket_name, *object_parts = rest.split("/", 1)
    if not bucket_name or not object_parts:
        raise SystemExit("Provide an object path after the bucket in --gcs-url")
    object_name = object_parts[0]

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    blob.download_to_filename(destination.as_posix())
    return destination


def _ensure_emulator(host: str | None) -> None:
    if host:
        os.environ["FIRESTORE_EMULATOR_HOST"] = host


def _load_export(path: Path) -> JsonExport:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _ensure_iterable(node: Any, description: str) -> Iterable[Any]:
    if not isinstance(node, Iterable):
        raise SystemExit(f"Expected iterable for {description}, got {type(node).__name__}")
    return node


def _import_doc(coll_ref, doc_node: JsonDoc, dry_run: bool) -> None:
    doc_id = doc_node.get("id")
    if not isinstance(doc_id, str):
        raise SystemExit(f"Document entry is missing a string 'id': {doc_node}")

    doc_data = doc_node.get("data", {})
    if doc_data is None:
        doc_data = {}
    if not isinstance(doc_data, MutableMapping):
        raise SystemExit(f"'data' must be an object for doc {doc_id}")

    doc_ref = coll_ref.document(doc_id)
    if dry_run:
        print(f"[dry-run] Would write {doc_ref.path}")
    else:
        doc_ref.set(doc_data)

    subcollections = doc_node.get("subcollections", {})
    if subcollections:
        if not isinstance(subcollections, Mapping):
            raise SystemExit(f"'subcollections' must be an object for doc {doc_id}")
        for sub_name, sub_docs in subcollections.items():
            sub_coll_ref = doc_ref.collection(sub_name)
            for child_doc in _ensure_iterable(sub_docs or [], f"subcollection {sub_name} of {doc_id}"):
                if not isinstance(child_doc, MutableMapping):
                    raise SystemExit(f"Subcollection entries must be objects under {doc_ref.path}")
                _import_doc(sub_coll_ref, child_doc, dry_run)


def import_export(export_data: JsonExport, db: firestore.Client, *, include: set[str] | None, exclude: set[str], dry_run: bool) -> None:
    collections = export_data.get("collections")
    if not isinstance(collections, Mapping):
        raise SystemExit("Export JSON missing 'collections' object")

    allowed = include if include else set(collections.keys())
    if include:
        missing = include - set(collections.keys())
        if missing:
            print(f"Warning: requested collections not found in export and will be skipped: {', '.join(sorted(missing))}")

    for coll_name, docs in collections.items():
        if coll_name in exclude:
            continue
        if coll_name not in allowed:
            continue
        coll_ref = db.collection(coll_name)
        print(f"Importing collection '{coll_name}'")
        for doc in _ensure_iterable(docs or [], f"collection {coll_name}"):
            if not isinstance(doc, MutableMapping):
                raise SystemExit(f"Collection entries must be objects under {coll_name}")
            _import_doc(coll_ref, doc, dry_run)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Firestore data from JSON")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", help="Path to the JSON export file")
    source.add_argument("--gcs-url", help="gs://bucket/object to download the export before importing")

    parser.add_argument("--project", default=os.environ.get("GOOGLE_CLOUD_PROJECT"), help="Target Google Cloud project")
    parser.add_argument("--emulator-host", help="Optional Firestore emulator host, e.g. localhost:8080")
    parser.add_argument("--include", nargs="*", help="Restrict import to specific root collections")
    parser.add_argument("--exclude", nargs="*", default=[], help="Skip specific root collections")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing to Firestore")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.project:
        raise SystemExit("--project or GOOGLE_CLOUD_PROJECT must be set")

    os.environ["GOOGLE_CLOUD_PROJECT"] = args.project
    _ensure_emulator(args.emulator_host)

    if args.input:
        source_path = Path(args.input).expanduser().resolve()
        if not source_path.exists():
            raise SystemExit(f"Input file not found: {source_path}")
    else:
        temp_dir = Path(tempfile.mkdtemp(prefix="firestore-import-"))
        temp_path = temp_dir / "export.json"
        source_path = _download_from_gcs(args.gcs_url, temp_path)
        print(f"Downloaded export to {source_path}")

    export_data = _load_export(source_path)
    client = firestore.Client(project=args.project)

    include = set(args.include) if args.include else None
    exclude = set(args.exclude or [])
    import_export(export_data, client, include=include, exclude=exclude, dry_run=args.dry_run)

    print("Import complete (dry run)" if args.dry_run else "Import complete")


if __name__ == "__main__":
    main()
