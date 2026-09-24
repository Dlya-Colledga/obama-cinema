import hashlib
import html
import secrets
import bcrypt


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash, supporting both $2y$ and $2b$ prefixes."""
    try:
        hash_bytes = hashed_password.encode("utf-8")
        if hash_bytes.startswith(b"$2y$"):
            hash_bytes = b"$2b$" + hash_bytes[4:]
        return bcrypt.checkpw(plain_password.encode("utf-8"), hash_bytes)
    except Exception:
        return False


def generate_token() -> str:
    """Generate secure 32-byte (64 hex characters) token."""
    return secrets.token_hex(32)


def hash_token(plain_token: str) -> str:
    """Calculate SHA-256 hash of token for database storage."""
    return hashlib.sha256(plain_token.encode("utf-8")).hexdigest()


def sanitize_text(text: str) -> str:
    """Sanitize HTML entities in user input to prevent XSS."""
    return html.escape(text.strip(), quote=True)
