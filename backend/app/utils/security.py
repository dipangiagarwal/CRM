import bcrypt

def hash_password(plain: str) -> str:
    """Hash password using bcrypt directly — avoids passlib compatibility issues"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against stored hash"""
    return bcrypt.checkpw(
        plain.encode("utf-8"),
        hashed.encode("utf-8")
    )