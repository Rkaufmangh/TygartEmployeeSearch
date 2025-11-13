# auth_claims.py
import firebase_admin
from firebase_admin import auth, credentials

# Initialize once (replace path with your service-account JSON)
if not firebase_admin._apps:
    cred = credentials.Certificate("path/to/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)


def get_user(uid: str) -> auth.UserRecord:
    """Return the Firebase user record for the given UID."""
    return auth.get_user(uid)


def set_custom_claims(uid: str, claims: dict) -> None:
    """
    Overwrite all custom claims for the user.
    Example: set_custom_claims('uid123', {'admin': True, 'tier': 'gold'})
    """
    auth.set_custom_user_claims(uid, claims)


def add_custom_claim(uid: str, key: str, value) -> None:
    """
    Add/update a single claim while preserving existing keys.
    """
    user = auth.get_user(uid)
    current = user.custom_claims or {}
    current[key] = value
    auth.set_custom_user_claims(uid, current)


def remove_custom_claim(uid: str, key: str) -> None:
    """
    Remove a single claim without touching others.
    """
    user = auth.get_user(uid)
    current = user.custom_claims or {}
    current.pop(key, None)
    auth.set_custom_user_claims(uid, current)


def iter_all_users(page_size: int = 1000):
    """Yield every user record in the project in batches."""
    page = auth.list_users(page_token=None, max_results=page_size)
    while page:
        for user in page.users:
            yield user
        page = page.get_next_page()