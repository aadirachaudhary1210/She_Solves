"""
FoodShield - Authentication, Security PIN, and Authorization Middleware
Implements secure password hashing, JWT session tokens, and dual-layer PIN protection for sensitive modules.
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib

SECRET_KEY = os.getenv("JWT_SECRET", "foodshield-ultra-secure-key-2026-compliance-hub")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

def get_password_hash(password: str) -> str:
    """Generate SHA-256 + salt password hash."""
    salt = "foodshield_salt_9981"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored hash."""
    return get_password_hash(plain_password) == hashed_password

def verify_security_pin(plain_pin: str, stored_pin_hash: Optional[str]) -> bool:
    """Validate secondary 4-6 digit security PIN for protected staff & documents."""
    default_pin_hash = get_password_hash("7788") # Default secure access PIN
    target_hash = stored_pin_hash if stored_pin_hash else default_pin_hash
    return get_password_hash(plain_pin) == target_hash

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with role and subject."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def mask_sensitive_id(id_string: str) -> str:
    """
    Mask government identification numbers to avoid unauthorized exposure.
    Example: '1234-5678-9012' -> 'XXXX-XXXX-9012'
    """
    if not id_string:
        return "N/A"
    clean = id_string.strip()
    if len(clean) <= 4:
        return "****"
    return "X" * (len(clean) - 4) + clean[-4:]

def mask_pan(pan: str) -> str:
    """
    Mask PAN or Tax identification number.
    Example: 'ABCDE1234F' -> 'ABCDE****F'
    """
    if not pan or len(pan) < 6:
        return "XXXXX****X"
    return pan[:5] + "****" + pan[-1]

def mask_phone(phone: str) -> str:
    """
    Mask contact phone numbers for public/standard displays.
    Example: '+91 9876543210' -> '+91 98765 *****'
    """
    if not phone:
        return "N/A"
    if len(phone) > 6:
        return phone[:len(phone)-5] + "*****"
    return phone
