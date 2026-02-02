"""Simple password authentication."""

import os
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Secret key for JWT (generate a random one in production)
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Shared password from environment variable
SHARED_PASSWORD = os.getenv("APP_PASSWORD", "")

security = HTTPBearer()


def verify_password(password: str) -> bool:
    """Verify the shared password."""
    if not SHARED_PASSWORD:
        raise HTTPException(status_code=500, detail="Password not configured")
    return password == SHARED_PASSWORD


def create_token() -> str:
    """Create a JWT token."""
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "exp": expiration,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    """Verify JWT token from Authorization header."""
    try:
        jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return True
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
