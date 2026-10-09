"""
FoodShield - Cryptographic OTP Service (Challenge 3)
Generates, stores (salted hash only), rate-limits, and verifies 6-digit one-time codes
for protected escalation actions.
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from conflict_models import IncidentOTP


OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300")) # 5 minutes
MAX_OTP_ATTEMPTS = int(os.getenv("MAX_OTP_ATTEMPTS", "3"))
RESEND_THROTTLE_SECONDS = int(os.getenv("OTP_RESEND_THROTTLE_SECONDS", "60")) # 1 minute
IS_DEV_MODE = os.getenv("FOODSHIELD_ENV", "development").lower() in ("development", "dev", "test")


def _generate_salt() -> str:
    return secrets.token_hex(16)


def _hash_otp(plain_otp: str, salt: str) -> str:
    """Cryptographically hash the OTP with its unique salt."""
    return hashlib.sha256((plain_otp + salt + "foodshield_otp_secret_key").encode('utf-8')).hexdigest()


class OTPService:
    @staticmethod
    def generate_otp_for_incident(
        db: Session,
        incident_id: str,
        user_email: str,
        action_type: str = "ESCALATE",
        destination: Optional[str] = None
    ) -> Tuple[IncidentOTP, str]:
        """
        Generates a 6-digit cryptographically secure OTP and stores its salted hash.
        Returns the DB record and the unhashed plain OTP (for one-time dispatch).
        Never logs or exposes the plain OTP in DB or production logs.
        """
        now = datetime.utcnow()

        # Check resend throttling: must wait RESEND_THROTTLE_SECONDS
        last_otp = (
            db.query(IncidentOTP)
            .filter(
                IncidentOTP.incident_id == incident_id,
                IncidentOTP.requested_by_email == user_email,
                IncidentOTP.is_used == False
            )
            .order_by(IncidentOTP.created_at.desc())
            .first()
        )

        if last_otp:
            time_since_creation = (now - last_otp.created_at).total_seconds()
            if time_since_creation < RESEND_THROTTLE_SECONDS:
                remaining = int(RESEND_THROTTLE_SECONDS - time_since_creation)
                raise ValueError(f"OTP request throttled. Please wait {remaining} seconds before requesting a new code.")
            # Invalidate older active OTPs for this incident/user
            last_otp.is_used = True
            last_otp.used_at = now

        # Generate 6-digit numeric token using cryptographically secure PRNG
        plain_code = f"{secrets.randbelow(900000) + 100000:06d}"
        salt = _generate_salt()
        hashed = _hash_otp(plain_code, salt)
        expires_at = now + timedelta(seconds=OTP_EXPIRY_SECONDS)

        otp_record = IncidentOTP(
            incident_id=incident_id,
            otp_hash=hashed,
            salt=salt,
            action_type=action_type,
            requested_by_email=user_email,
            destination=destination or "Official Restaurant Designated Responder",
            expires_at=expires_at,
            attempt_count=0,
            max_attempts=MAX_OTP_ATTEMPTS,
            is_used=False,
            created_at=now
        )
        db.add(otp_record)
        db.commit()
        db.refresh(otp_record)

        return otp_record, plain_code

    @staticmethod
    def verify_otp_for_incident(
        db: Session,
        incident_id: str,
        plain_code: str,
        action_type: str = "ESCALATE"
    ) -> Tuple[bool, str]:
        """
        Verifies the plain OTP against stored salted hash.
        Enforces expiry, max attempts, action_type match, and one-time invalidation.
        """
        now = datetime.utcnow()
        clean_code = plain_code.strip()

        # Find the latest unused OTP record for this incident and action
        record = (
            db.query(IncidentOTP)
            .filter(
                IncidentOTP.incident_id == incident_id,
                IncidentOTP.action_type == action_type,
                IncidentOTP.is_used == False
            )
            .order_by(IncidentOTP.created_at.desc())
            .first()
        )

        if not record:
            return False, "No active OTP found for this incident or code has already been used."

        # Check expiration
        if now > record.expires_at:
            record.is_used = True
            db.commit()
            return False, "OTP has expired. Please request a new security code."

        # Check attempt limits
        if record.attempt_count >= record.max_attempts:
            record.is_used = True # Lock out
            db.commit()
            return False, "Maximum verification attempts exceeded. Code invalidated for security."

        # Verify hash
        expected_hash = _hash_otp(clean_code, record.salt)
        if not secrets.compare_digest(record.otp_hash, expected_hash):
            record.attempt_count += 1
            remaining = record.max_attempts - record.attempt_count
            if remaining <= 0:
                record.is_used = True
            db.commit()
            if remaining > 0:
                return False, f"Invalid OTP code. {remaining} attempt(s) remaining."
            else:
                return False, "Invalid OTP code. Maximum attempts exceeded. Code has been invalidated."

        # Success: consume one-time token immediately
        record.is_used = True
        record.used_at = now
        db.commit()

        return True, "OTP verified successfully. Authorized action confirmed."

    @staticmethod
    def get_active_otp_status(db: Session, incident_id: str) -> Dict[str, Any]:
        """Returns non-sensitive metadata about active OTP status."""
        now = datetime.utcnow()
        record = (
            db.query(IncidentOTP)
            .filter(
                IncidentOTP.incident_id == incident_id,
                IncidentOTP.is_used == False,
                IncidentOTP.expires_at > now
            )
            .order_by(IncidentOTP.created_at.desc())
            .first()
        )

        if not record:
            return {"active": False, "expires_in_seconds": None, "attempts_remaining": None}

        expires_in = int((record.expires_at - now).total_seconds())
        remaining_attempts = max(0, record.max_attempts - record.attempt_count)

        return {
            "active": True,
            "expires_in_seconds": expires_in,
            "attempts_remaining": remaining_attempts,
            "action_type": record.action_type,
            "requested_at": record.created_at.isoformat()
        }


otp_service = OTPService()
