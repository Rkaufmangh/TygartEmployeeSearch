#!/usr/bin/env python3
"""
Simple Firebase Admin helpers for creating and deleting users.

Usage examples:
  python auth.py add --email user@example.com --password "Secret123" --display-name "Jane User"
  python auth.py delete --email user@example.com

The script expects a Firebase service-account JSON. Either point the
GOOGLE_APPLICATION_CREDENTIALS env var at the file or pass --creds.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import auth, credentials


def _initialize_app(creds_path: Optional[str] = None) -> firebase_admin.App:
    """
    Initialize the Firebase Admin SDK exactly once. The credentials file
    can come from --creds or the GOOGLE_APPLICATION_CREDENTIALS env var.
    """
    if firebase_admin._apps:
        return firebase_admin.get_app()

    resolved = creds_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not resolved:
        raise RuntimeError(
            "Missing service-account credentials. "
            "Pass --creds or set GOOGLE_APPLICATION_CREDENTIALS."
        )
    if not os.path.exists(resolved):
        raise FileNotFoundError(f"Service-account file not found: {resolved}")

    cred = credentials.Certificate(resolved)
    return firebase_admin.initialize_app(cred)


def parse_claims(pairs: List[str]) -> Dict[str, Any]:
    """
    Convert key=value strings into a dict suitable for custom claims.
    Values are best-effort parsed as JSON, otherwise left as strings.
    """
    claims: Dict[str, Any] = {}
    for raw in pairs:
        if "=" not in raw:
            raise ValueError(f"Invalid claim '{raw}'. Use key=value syntax.")
        key, value = raw.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise ValueError(f"Claim key missing in '{raw}'")
        try:
            claims[key] = json.loads(value)
        except json.JSONDecodeError:
            claims[key] = value
    return claims


def add_user(
    email: str,
    password: Optional[str] = None,
    display_name: Optional[str] = None,
    phone_number: Optional[str] = None,
    disabled: bool = False,
    custom_claims: Optional[Dict[str, Any]] = None,
) -> auth.UserRecord:
    """Create a new Firebase Auth user and optionally set custom claims."""
    payload: Dict[str, Any] = {
        "email": email,
        "password": password,
        "display_name": display_name,
        "phone_number": phone_number,
        "disabled": disabled,
    }
    clean = {k: v for k, v in payload.items() if v not in (None, "")}
    user = auth.create_user(**clean)
    if custom_claims:
        auth.set_custom_user_claims(user.uid, custom_claims)
        # refresh to include claims in the returned record
        return auth.get_user(user.uid)
    return user


def delete_user(uid: Optional[str] = None, email: Optional[str] = None) -> None:
    """
    Delete a Firebase Auth user by UID or email. UID takes precedence.
    Raises if the user cannot be found.
    """
    target_uid = uid
    if not target_uid:
        if not email:
            raise ValueError("Either uid or email must be provided to delete a user.")
        user = auth.get_user_by_email(email)
        target_uid = user.uid
    auth.delete_user(target_uid)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Firebase Auth helper")
    parser.add_argument("--creds", help="Path to service-account JSON")
    sub = parser.add_subparsers(dest="command", required=True)

    add_cmd = sub.add_parser("add", help="Create a user")
    add_cmd.add_argument("--email", required=True, help="User email")
    add_cmd.add_argument("--password", help="Initial password")
    add_cmd.add_argument("--display-name", help="Display name")
    add_cmd.add_argument("--phone-number", help="E.164 phone number, e.g. +15555550123")
    add_cmd.add_argument("--disabled", action="store_true", help="Create the user disabled")
    add_cmd.add_argument(
        "--claim",
        action="append",
        default=[],
        help="Custom claim key=value (can repeat). Values parsed as JSON when possible.",
    )

    del_cmd = sub.add_parser("delete", help="Delete a user")
    del_cmd.add_argument("--uid", help="User UID to delete")
    del_cmd.add_argument("--email", help="Delete by email when UID is unknown")

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    _initialize_app(args.creds)

    if args.command == "add":
        claims = parse_claims(args.claim)
        record = add_user(
            email=args.email,
            password=args.password,
            display_name=args.display_name,
            phone_number=args.phone_number,
            disabled=args.disabled,
            custom_claims=claims or None,
        )
        print(f"Created user {record.uid} ({record.email})")
        if record.custom_claims:
            print(f"Custom claims: {json.dumps(record.custom_claims)}")
    elif args.command == "delete":
        delete_user(uid=args.uid, email=args.email)
        print("User deleted.")


if __name__ == "__main__":
    main()
