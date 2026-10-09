"""
FoodShield - Messaging Provider Adapter (Challenge 3)
Handles real communication endpoints (Webhook/SMS/HTTP API) with dry-run mode,
idempotency, explicit timeouts, and structured delivery auditing.
"""

import os
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from conflict_models import IncidentNotification


class MessagingConfig:
    @staticmethod
    def get_provider() -> str:
        return os.getenv("MESSAGING_PROVIDER", "dry_run").strip().lower()

    @staticmethod
    def get_endpoint_url() -> Optional[str]:
        return os.getenv("MESSAGING_ENDPOINT_URL")

    @staticmethod
    def get_api_key() -> Optional[str]:
        return os.getenv("MESSAGING_API_KEY")

    @staticmethod
    def get_default_destination() -> str:
        return os.getenv("MESSAGING_DESTINATION", "+91 98765 43210")

    @staticmethod
    def get_sender_id() -> str:
        return os.getenv("MESSAGING_SENDER_ID", "FOODSHIELD")

    @staticmethod
    def get_timeout() -> float:
        return float(os.getenv("MESSAGING_TIMEOUT_SECONDS", "10.0"))

    @staticmethod
    def is_dry_run_forced() -> bool:
        val = os.getenv("MESSAGING_DRY_RUN", "").strip().lower()
        if val in ("true", "1", "yes"):
            return True
        # If no endpoint is configured, automatically default to dry-run safely
        return MessagingConfig.get_endpoint_url() is None


class MessagingAdapter:
    def __init__(self):
        pass

    def check_configuration(self) -> Dict[str, Any]:
        """Validates current environment variable setup."""
        endpoint = MessagingConfig.get_endpoint_url()
        provider = MessagingConfig.get_provider()
        api_key = MessagingConfig.get_api_key()
        dry_run = MessagingConfig.is_dry_run_forced()

        return {
            "provider": provider,
            "has_endpoint": bool(endpoint),
            "endpoint_configured": endpoint or "None (Set MESSAGING_ENDPOINT_URL)",
            "has_api_key": bool(api_key),
            "destination": MessagingConfig.get_default_destination(),
            "dry_run_active": dry_run,
            "ready_for_live_dispatch": bool(endpoint and not dry_run)
        }

    def format_incident_message(
        self,
        incident_id: str,
        severity: str,
        location_id: str,
        action_required: str = "Immediate physical temperature inspection and manual logging required."
    ) -> str:
        """Concise, privacy-safe safety escalation message."""
        return (
            f"[FoodShield ESCALATION] Incident: {incident_id} | "
            f"Severity: {severity} | "
            f"Location: {location_id} | "
            f"Action: {action_required}"
        )

    def send_notification(
        self,
        db: Session,
        incident_id: str,
        severity: str = "CRITICAL",
        location_id: str = "cold_storage",
        destination: Optional[str] = None,
        custom_message: Optional[str] = None,
        dry_run: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Dispatches real or dry-run notification.
        Enforces idempotency: does not duplicate sent notifications for the same incident within 5 minutes.
        """
        now = datetime.utcnow()
        target_destination = destination or MessagingConfig.get_default_destination()
        message_body = custom_message or self.format_incident_message(incident_id, severity, location_id)

        # Idempotency check: prevent duplicate notifications within 300 seconds
        recent_sent = (
            db.query(IncidentNotification)
            .filter(
                IncidentNotification.incident_id == incident_id,
                IncidentNotification.status.in_(["ACCEPTED", "CONFIRMED"]),
                IncidentNotification.destination == target_destination
            )
            .order_by(IncidentNotification.sent_at.desc())
            .first()
        )

        if recent_sent:
            delta = (now - recent_sent.sent_at).total_seconds()
            if delta < 300: # 5 minutes
                return {
                    "success": True,
                    "status": "CONFIRMED",
                    "provider": recent_sent.provider,
                    "destination": target_destination,
                    "payload_preview": message_body,
                    "provider_response_id": f"IDEMPOTENT_SUPPRESSED_{recent_sent.provider_response_id}",
                    "error": None,
                    "timestamp": now.isoformat(),
                    "note": f"Duplicate notification suppressed (previously sent {int(delta)}s ago)."
                }

        is_dry_run = dry_run if dry_run is not None else MessagingConfig.is_dry_run_forced()
        endpoint_url = MessagingConfig.get_endpoint_url()
        provider_name = MessagingConfig.get_provider()

        # Handle Dry-Run Mode
        if is_dry_run or not endpoint_url:
            delivery_record = IncidentNotification(
                incident_id=incident_id,
                provider="dry_run_adapter" if not endpoint_url else f"dry_run_{provider_name}",
                destination=target_destination,
                payload_summary=message_body,
                status="DRY_RUN",
                provider_response_id=f"DRYRUN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                error_message=None if endpoint_url else "Endpoint not configured; simulated dry-run completed successfully.",
                sent_at=now
            )
            db.add(delivery_record)
            db.commit()
            db.refresh(delivery_record)

            return {
                "success": True,
                "status": "DRY_RUN",
                "provider": delivery_record.provider,
                "destination": target_destination,
                "payload_preview": message_body,
                "provider_response_id": delivery_record.provider_response_id,
                "error": None,
                "timestamp": now.isoformat(),
                "note": "DRY-RUN completed. Real network dispatch bypassed (or MESSAGING_ENDPOINT_URL unset)."
            }

        # Real Network Dispatch via HTTP/Webhook
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "FoodShield-EscalationEngine/2.0"
        }
        api_key = MessagingConfig.get_api_key()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "sender": MessagingConfig.get_sender_id(),
            "recipient": target_destination,
            "message": message_body,
            "incident_id": incident_id,
            "severity": severity,
            "location_id": location_id,
            "timestamp": now.isoformat()
        }

        try:
            with httpx.Client(timeout=MessagingConfig.get_timeout()) as client:
                resp = client.post(endpoint_url, json=payload, headers=headers)

            if 200 <= resp.status_code < 300:
                resp_data = {}
                try:
                    resp_data = resp.json()
                except Exception:
                    pass

                provider_msg_id = resp_data.get("id") or resp_data.get("message_id") or f"RESP-HTTP-{resp.status_code}"
                
                delivery_record = IncidentNotification(
                    incident_id=incident_id,
                    provider=provider_name,
                    destination=target_destination,
                    payload_summary=message_body,
                    status="ACCEPTED" if resp.status_code == 202 else "CONFIRMED",
                    provider_response_id=str(provider_msg_id),
                    error_message=None,
                    sent_at=now
                )
                db.add(delivery_record)
                db.commit()

                return {
                    "success": True,
                    "status": delivery_record.status,
                    "provider": provider_name,
                    "destination": target_destination,
                    "payload_preview": message_body,
                    "provider_response_id": str(provider_msg_id),
                    "error": None,
                    "timestamp": now.isoformat()
                }
            else:
                error_desc = f"Provider rejected request with status code {resp.status_code}: {resp.text[:200]}"
                delivery_record = IncidentNotification(
                    incident_id=incident_id,
                    provider=provider_name,
                    destination=target_destination,
                    payload_summary=message_body,
                    status="FAILED",
                    provider_response_id=None,
                    error_message=error_desc,
                    sent_at=now
                )
                db.add(delivery_record)
                db.commit()

                return {
                    "success": False,
                    "status": "FAILED",
                    "provider": provider_name,
                    "destination": target_destination,
                    "payload_preview": message_body,
                    "provider_response_id": None,
                    "error": error_desc,
                    "timestamp": now.isoformat()
                }

        except httpx.TimeoutException as exc:
            error_desc = f"Messaging provider connection timed out after {MessagingConfig.get_timeout()}s: {str(exc)}"
            delivery_record = IncidentNotification(
                incident_id=incident_id,
                provider=provider_name,
                destination=target_destination,
                payload_summary=message_body,
                status="FAILED",
                provider_response_id=None,
                error_message=error_desc,
                sent_at=now
            )
            db.add(delivery_record)
            db.commit()

            return {
                "success": False,
                "status": "FAILED",
                "provider": provider_name,
                "destination": target_destination,
                "payload_preview": message_body,
                "provider_response_id": None,
                "error": error_desc,
                "timestamp": now.isoformat()
            }
        except Exception as exc:
            error_desc = f"Network/Provider transmission error: {str(exc)}"
            delivery_record = IncidentNotification(
                incident_id=incident_id,
                provider=provider_name,
                destination=target_destination,
                payload_summary=message_body,
                status="FAILED",
                provider_response_id=None,
                error_message=error_desc,
                sent_at=now
            )
            db.add(delivery_record)
            db.commit()

            return {
                "success": False,
                "status": "FAILED",
                "provider": provider_name,
                "destination": target_destination,
                "payload_preview": message_body,
                "provider_response_id": None,
                "error": error_desc,
                "timestamp": now.isoformat()
            }


messaging_adapter = MessagingAdapter()
