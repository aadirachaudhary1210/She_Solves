"""
AnnaKavach Food Safety Intelligence Center — Smart Risk Radar
Challenge 4: Rules-based risk analysis engine.

OBSERVE → DETECT → SCORE → EXPLAIN → PRIORITIZE → PREVENT → VERIFY → LEARN

This module implements a transparent, rules-based risk engine that consumes
authoritative records from the existing application models and produces
structured, explainable risk findings. It does NOT duplicate data; it reads
from the shared SQLAlchemy session.

Integration dependencies (not yet implemented by other teams):
  - CH1 Temperature readings: no TemperatureReading model exists yet.
    Rules A are documented but dormant until CH1 lands.
  - CH2 Demand forecasts: no ForecastDemand model exists yet.
    Rules C (demand-side) are documented but dormant until CH2 lands.
  - CH3 Conflicts: no ConflictIncident model exists yet.
    Rules B are documented but dormant until CH3 lands.

Currently active rules (evidence exists):
  - VIOL-001   Critical inspection violation detected
  - VIOL-002   Repeated violations (same category, >=2 in configured window)
  - VIOL-003   Unresolved major/critical violation (is_rectified=False)
  - CA-001     Overdue corrective action
  - CA-002     Corrective action approaching deadline (within WARN_DAYS)
  - DOC-001    Compliance document expired
  - DOC-002    Compliance document expiring soon (within EXPIRY_WARN_DAYS)
  - STOCK-001  Stock batch expired
  - STOCK-002  Stock batch expiring soon (within EXPIRY_WARN_DAYS days)
  - STOCK-003  Stock item below reorder level
  - PEST-001   Pest control overdue (next_service_date in past)
  - PEST-002   Pest control due soon (within PEST_WARN_DAYS)
  - HYG-001    Mandatory cleaning task not completed (needs_attention / not_completed)
  - STAFF-001  Staff training certificate expired
  - STAFF-002  Staff training certificate expiring soon
  - MULTI-001  Multiple independent risk signals affecting same restaurant
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import (
    Restaurant, InspectionViolation, Inspection, CorrectiveAction,
    ComplianceDocument, StockBatch, StockItem, PestControlRecord,
    CleaningArea, CleaningTask, CleaningLog, Employee, StaffTraining,
    CorrectiveStatus, DocumentValidity, InspectionStatus
)
import enum

# ─────────────────────────────────────────────
# CONFIGURATION  (thresholds clearly named)
# ─────────────────────────────────────────────

CONFIG = {
    # Corrective-action warning window (days before deadline)
    "CA_WARN_DAYS": 7,
    # Stock / document expiry warning window
    "EXPIRY_WARN_DAYS": 14,
    # Pest-control service warning window
    "PEST_WARN_DAYS": 7,
    # Repeated-violation detection window (days)
    "RECURRENCE_WINDOW_DAYS": 90,
    # Minimum violations in window to trigger VIOL-002
    "RECURRENCE_MIN_COUNT": 2,
    # Number of independent risk signals required to trigger MULTI-001
    "MULTI_SIGNAL_THRESHOLD": 3,
}

# ─────────────────────────────────────────────
# ENUMERATIONS
# ─────────────────────────────────────────────

class Severity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    AWAITING_VERIFICATION = "awaiting_verification"
    RESOLVED = "resolved"


# ─────────────────────────────────────────────
# SCORE BANDS  (0–100, higher = more urgent)
# ─────────────────────────────────────────────

SCORE_BANDS = {
    (80, 100): "critical",
    (60, 79):  "high",
    (35, 59):  "medium",
    (10, 34):  "low",
    (0,  9):   "info",
}

SEVERITY_BASE_SCORES = {
    "Critical": 75,
    "Major":    55,
    "Moderate": 35,
    "Minor":    15,
}


def score_to_severity(score: float) -> Severity:
    """Map a numeric score to a Severity label using configured bands."""
    for (lo, hi), sev in SCORE_BANDS.items():
        if lo <= score <= hi:
            return Severity(sev)
    return Severity.INFO


# ─────────────────────────────────────────────
# FINDING DATA CLASS
# ─────────────────────────────────────────────

class RiskFinding:
    """
    A single risk finding produced by the engine.
    Every field is populated from actual DB evidence; nothing is invented.
    """
    def __init__(
        self,
        rule_id: str,
        title: str,
        description: str,
        severity: Severity,
        score: float,
        category: str,
        restaurant_id: int,
        restaurant_name: str,
        evidence_refs: List[Dict[str, Any]],
        contributing_signals: List[str],
        immediate_action: str,
        preventive_action: str,
        verification_steps: str,
        status: FindingStatus = FindingStatus.OPEN,
        is_recurring: bool = False,
        is_overdue: bool = False,
        detected_at: Optional[datetime] = None,
        fingerprint: Optional[str] = None,
        limitations: Optional[str] = None,
        evidence_completeness: str = "sufficient",
    ):
        self.rule_id = rule_id
        self.title = title
        self.description = description
        self.severity = severity
        self.score = min(100.0, max(0.0, round(score, 1)))
        self.category = category
        self.restaurant_id = restaurant_id
        self.restaurant_name = restaurant_name
        self.evidence_refs = evidence_refs          # list of {type, id, label}
        self.contributing_signals = contributing_signals
        self.immediate_action = immediate_action
        self.preventive_action = preventive_action
        self.verification_steps = verification_steps
        self.status = status
        self.is_recurring = is_recurring
        self.is_overdue = is_overdue
        self.detected_at = detected_at or datetime.utcnow()
        self.fingerprint = fingerprint or f"{rule_id}:{restaurant_id}"
        self.limitations = limitations or ""
        self.evidence_completeness = evidence_completeness

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "score": self.score,
            "category": self.category,
            "restaurant_id": self.restaurant_id,
            "restaurant_name": self.restaurant_name,
            "evidence_refs": self.evidence_refs,
            "contributing_signals": self.contributing_signals,
            "immediate_action": self.immediate_action,
            "preventive_action": self.preventive_action,
            "verification_steps": self.verification_steps,
            "status": self.status.value,
            "is_recurring": self.is_recurring,
            "is_overdue": self.is_overdue,
            "detected_at": self.detected_at.isoformat(),
            "fingerprint": self.fingerprint,
            "limitations": self.limitations,
            "evidence_completeness": self.evidence_completeness,
        }


# ─────────────────────────────────────────────
# DEDUPLICATION
# ─────────────────────────────────────────────

def _dedup(findings: List[RiskFinding]) -> List[RiskFinding]:
    """
    Prevent duplicate active findings for the same underlying condition.
    Uses fingerprint equality; keeps the higher-score duplicate.
    """
    seen: Dict[str, RiskFinding] = {}
    for f in findings:
        key = f.fingerprint
        if key not in seen or f.score > seen[key].score:
            seen[key] = f
    return list(seen.values())


# ─────────────────────────────────────────────
# RULE IMPLEMENTATIONS
# ─────────────────────────────────────────────

def _run_violation_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rules VIOL-001, VIOL-002, VIOL-003 — Inspection violations."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    window_start = now - timedelta(days=CONFIG["RECURRENCE_WINDOW_DAYS"])

    violations = (
        db.query(InspectionViolation)
        .join(Inspection)
        .filter(Inspection.restaurant_id == restaurant.id)
        .all()
    )

    # Group by category for recurrence detection
    by_category: Dict[str, List[InspectionViolation]] = {}
    for v in violations:
        by_category.setdefault(v.category, []).append(v)

    for v in violations:
        insp = v.inspection
        base_score = SEVERITY_BASE_SCORES.get(v.severity, 15)

        # VIOL-001: Critical violation present
        if v.severity == "Critical":
            score = base_score
            if not v.is_rectified:
                score += 15  # persists
            findings.append(RiskFinding(
                rule_id="VIOL-001",
                title=f"Critical Violation: {v.category}",
                description=v.description,
                severity=score_to_severity(score),
                score=score,
                category="Inspection Violation",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "inspection_violation", "id": v.id, "label": f"Violation #{v.id} — {v.reference_code}"},
                    {"type": "inspection", "id": insp.id, "label": f"Inspection {insp.inspection_date.strftime('%Y-%m-%d')} ({insp.inspection_type})"},
                ],
                contributing_signals=[f"Severity: {v.severity}", f"Rectified: {v.is_rectified}"],
                immediate_action="Immediately investigate and isolate the affected area. Contact qualified food-safety personnel.",
                preventive_action="Review HACCP plan for this category. Schedule training refresher. Implement additional monitoring.",
                verification_steps="Submit photographic evidence of rectification via Corrective Action workflow. Officer re-inspection required.",
                status=FindingStatus.OPEN if not v.is_rectified else FindingStatus.RESOLVED,
                is_overdue=not v.is_rectified,
                fingerprint=f"VIOL-001:{restaurant.id}:{v.id}",
            ))

        # VIOL-003: Unresolved major/critical violation
        if v.severity in ("Critical", "Major") and not v.is_rectified:
            score = base_score + 10
            findings.append(RiskFinding(
                rule_id="VIOL-003",
                title=f"Unresolved {v.severity} Violation — {v.category}",
                description=f"Violation recorded during {insp.inspection_type} on {insp.inspection_date.strftime('%Y-%m-%d')} remains unresolved. {v.description}",
                severity=score_to_severity(score),
                score=score,
                category="Unresolved Violation",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "inspection_violation", "id": v.id, "label": f"Unresolved Violation #{v.id}"},
                ],
                contributing_signals=[f"Severity: {v.severity}", "is_rectified: False", f"Category: {v.category}"],
                immediate_action="Prioritise rectification of this violation before next operational day.",
                preventive_action="Establish a recurring checklist item for this category. Assign a responsible staff member.",
                verification_steps="Record corrective action, obtain officer sign-off, update violation record to rectified.",
                status=FindingStatus.OPEN,
                is_overdue=True,
                fingerprint=f"VIOL-003:{restaurant.id}:{v.id}",
            ))

    # VIOL-002: Repeated violations in same category within window
    recent_violations = (
        db.query(InspectionViolation)
        .join(Inspection)
        .filter(
            Inspection.restaurant_id == restaurant.id,
            Inspection.inspection_date >= window_start,
        )
        .all()
    )
    recent_by_cat: Dict[str, List[InspectionViolation]] = {}
    for v in recent_violations:
        recent_by_cat.setdefault(v.category, []).append(v)

    for cat, vlist in recent_by_cat.items():
        if len(vlist) >= CONFIG["RECURRENCE_MIN_COUNT"]:
            score = 50  # recurrence adds extra urgency
            findings.append(RiskFinding(
                rule_id="VIOL-002",
                title=f"Recurring Violations — {cat}",
                description=f"{len(vlist)} violations in the '{cat}' category recorded in the last {CONFIG['RECURRENCE_WINDOW_DAYS']} days. Recurring issues indicate a systemic control failure.",
                severity=score_to_severity(score),
                score=score,
                category="Recurring Violation",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "inspection_violation", "id": v.id, "label": f"Violation #{v.id}"} for v in vlist
                ],
                contributing_signals=[
                    f"Recurrence count: {len(vlist)}",
                    f"Window: {CONFIG['RECURRENCE_WINDOW_DAYS']} days",
                    f"Category: {cat}",
                ],
                immediate_action="Conduct immediate root-cause analysis for this category.",
                preventive_action="Implement a CAPA (Corrective and Preventive Action) plan. Review supplier/process for this category.",
                verification_steps="Document CAPA plan, assign owner, confirm resolution of each contributing violation.",
                status=FindingStatus.OPEN,
                is_recurring=True,
                fingerprint=f"VIOL-002:{restaurant.id}:{cat}",
            ))

    return findings


def _run_corrective_action_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rules CA-001, CA-002 — Corrective actions."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    warn_cutoff = now + timedelta(days=CONFIG["CA_WARN_DAYS"])

    actions = db.query(CorrectiveAction).filter(
        CorrectiveAction.restaurant_id == restaurant.id,
        CorrectiveAction.status.in_([CorrectiveStatus.PENDING, CorrectiveStatus.SUBMITTED, CorrectiveStatus.OVERDUE]),
    ).all()

    for ca in actions:
        is_overdue = ca.deadline < now
        days_remaining = (ca.deadline - now).days

        if is_overdue:
            score = 70
            findings.append(RiskFinding(
                rule_id="CA-001",
                title=f"Overdue Corrective Action: {ca.issue_title}",
                description=f"Corrective action was due on {ca.deadline.strftime('%Y-%m-%d')} ({abs(days_remaining)} days overdue). Issue: {ca.issue_description}",
                severity=Severity.HIGH,
                score=score,
                category="Corrective Action",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "corrective_action", "id": ca.id, "label": f"CA #{ca.id} — {ca.issue_title}"},
                ],
                contributing_signals=[
                    f"Deadline: {ca.deadline.strftime('%Y-%m-%d')}",
                    f"Days overdue: {abs(days_remaining)}",
                    f"Status: {ca.status.value}",
                ],
                immediate_action=f"Execute immediately: {ca.required_action}",
                preventive_action="Schedule recurring review of corrective action deadlines. Assign deputy responsibility.",
                verification_steps="Submit corrective action response with evidence. Await officer verification to close.",
                status=FindingStatus.OPEN,
                is_overdue=True,
                fingerprint=f"CA-001:{restaurant.id}:{ca.id}",
            ))
        elif ca.deadline <= warn_cutoff:
            score = 40
            findings.append(RiskFinding(
                rule_id="CA-002",
                title=f"Corrective Action Deadline Approaching: {ca.issue_title}",
                description=f"Corrective action is due in {days_remaining} day(s) on {ca.deadline.strftime('%Y-%m-%d')}. Issue: {ca.issue_description}",
                severity=Severity.MEDIUM,
                score=score,
                category="Corrective Action",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "corrective_action", "id": ca.id, "label": f"CA #{ca.id} — {ca.issue_title}"},
                ],
                contributing_signals=[
                    f"Deadline: {ca.deadline.strftime('%Y-%m-%d')}",
                    f"Days remaining: {days_remaining}",
                ],
                immediate_action=f"Begin implementing: {ca.required_action}",
                preventive_action="Set a reminder 14 days before future corrective action deadlines.",
                verification_steps="Submit corrective action response with evidence before deadline.",
                status=FindingStatus.IN_PROGRESS,
                fingerprint=f"CA-002:{restaurant.id}:{ca.id}",
            ))

    return findings


def _run_document_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rules DOC-001, DOC-002 — Compliance documents."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    warn_cutoff = now + timedelta(days=CONFIG["EXPIRY_WARN_DAYS"])

    docs = db.query(ComplianceDocument).filter(
        ComplianceDocument.restaurant_id == restaurant.id
    ).all()

    for doc in docs:
        if doc.expiry_date < now:
            score = 65
            findings.append(RiskFinding(
                rule_id="DOC-001",
                title=f"Expired Compliance Document: {doc.document_name}",
                description=f"Document '{doc.document_name}' (issued by {doc.issuing_authority}) expired on {doc.expiry_date.strftime('%Y-%m-%d')}. Operating with an expired document may constitute a regulatory violation.",
                severity=Severity.HIGH,
                score=score,
                category="Compliance Document",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "compliance_document", "id": doc.id, "label": f"Document #{doc.id} — {doc.category}"},
                ],
                contributing_signals=[
                    f"Expiry: {doc.expiry_date.strftime('%Y-%m-%d')}",
                    f"Issuing authority: {doc.issuing_authority}",
                    f"Category: {doc.category}",
                ],
                immediate_action="Suspend operations covered by this document until it is renewed. Contact issuing authority immediately.",
                preventive_action="Set automatic reminders 30 and 14 days before expiry for all compliance documents.",
                verification_steps="Upload renewed document in Compliance Vault. Update expiry date. Notify officer for review.",
                status=FindingStatus.OPEN,
                is_overdue=True,
                fingerprint=f"DOC-001:{restaurant.id}:{doc.id}",
            ))
        elif doc.expiry_date <= warn_cutoff:
            days_left = (doc.expiry_date - now).days
            score = 35
            findings.append(RiskFinding(
                rule_id="DOC-002",
                title=f"Document Expiring Soon: {doc.document_name}",
                description=f"'{doc.document_name}' expires in {days_left} day(s) on {doc.expiry_date.strftime('%Y-%m-%d')}. Renewal should be initiated without delay.",
                severity=Severity.MEDIUM,
                score=score,
                category="Compliance Document",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "compliance_document", "id": doc.id, "label": f"Document #{doc.id} — {doc.category}"},
                ],
                contributing_signals=[
                    f"Days remaining: {days_left}",
                    f"Expiry: {doc.expiry_date.strftime('%Y-%m-%d')}",
                ],
                immediate_action=f"Initiate renewal process for '{doc.document_name}' with {doc.issuing_authority}.",
                preventive_action="Maintain a renewal calendar for all regulated documents.",
                verification_steps="Upload renewed document and confirm new expiry date in Compliance Vault.",
                status=FindingStatus.OPEN,
                fingerprint=f"DOC-002:{restaurant.id}:{doc.id}",
            ))

    return findings


def _run_stock_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rules STOCK-001, STOCK-002, STOCK-003 — Stock batches and inventory levels."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    warn_cutoff = now + timedelta(days=CONFIG["EXPIRY_WARN_DAYS"])

    stock_items = db.query(StockItem).filter(StockItem.restaurant_id == restaurant.id).all()

    for item in stock_items:
        batches = db.query(StockBatch).filter(StockBatch.stock_item_id == item.id).all()

        for batch in batches:
            if batch.expiry_date < now:
                score = 60
                findings.append(RiskFinding(
                    rule_id="STOCK-001",
                    title=f"Expired Stock Batch: {item.name}",
                    description=f"Batch '{batch.batch_number}' of '{item.name}' ({batch.quantity} {batch.unit}) expired on {batch.expiry_date.strftime('%Y-%m-%d')}. Expired stock must not be used for food preparation.",
                    severity=Severity.HIGH,
                    score=score,
                    category="Stock Expiry",
                    restaurant_id=restaurant.id,
                    restaurant_name=restaurant.name,
                    evidence_refs=[
                        {"type": "stock_batch", "id": batch.id, "label": f"Batch {batch.batch_number} — {item.name}"},
                    ],
                    contributing_signals=[
                        f"Expiry date: {batch.expiry_date.strftime('%Y-%m-%d')}",
                        f"Quantity: {batch.quantity} {batch.unit}",
                        f"Category: {item.category}",
                    ],
                    immediate_action="Immediately quarantine and label this batch. Do not use for food preparation. Arrange safe disposal per local regulations.",
                    preventive_action="Implement FIFO (First-In-First-Out) stock rotation. Set expiry alerts at receipt.",
                    verification_steps="Record disposal action with date and responsible staff member. Photograph disposal evidence.",
                    status=FindingStatus.OPEN,
                    is_overdue=True,
                    fingerprint=f"STOCK-001:{restaurant.id}:{batch.id}",
                ))
            elif batch.expiry_date <= warn_cutoff:
                days_left = (batch.expiry_date - now).days
                score = 30
                findings.append(RiskFinding(
                    rule_id="STOCK-002",
                    title=f"Stock Expiring Soon: {item.name}",
                    description=f"Batch '{batch.batch_number}' of '{item.name}' ({batch.quantity} {batch.unit}) expires in {days_left} day(s) on {batch.expiry_date.strftime('%Y-%m-%d')}.",
                    severity=Severity.MEDIUM,
                    score=score,
                    category="Stock Expiry",
                    restaurant_id=restaurant.id,
                    restaurant_name=restaurant.name,
                    evidence_refs=[
                        {"type": "stock_batch", "id": batch.id, "label": f"Batch {batch.batch_number}"},
                    ],
                    contributing_signals=[
                        f"Days remaining: {days_left}",
                        f"Quantity: {batch.quantity} {batch.unit}",
                    ],
                    immediate_action=f"Prioritise use of this batch. Plan menu items to consume {item.name} before {batch.expiry_date.strftime('%Y-%m-%d')}.",
                    preventive_action="Order quantities matched to consumption rate. Review supplier delivery schedule.",
                    verification_steps="Confirm batch consumed or disposed of by expiry date. Update stock records.",
                    status=FindingStatus.OPEN,
                    fingerprint=f"STOCK-002:{restaurant.id}:{batch.id}",
                ))

        # STOCK-003: Item below reorder level
        if item.current_quantity <= item.reorder_level:
            score = 20
            findings.append(RiskFinding(
                rule_id="STOCK-003",
                title=f"Stock Below Reorder Level: {item.name}",
                description=f"'{item.name}' current stock ({item.current_quantity} {item.unit}) is at or below reorder level ({item.reorder_level} {item.unit}).",
                severity=Severity.LOW,
                score=score,
                category="Stock Level",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "stock_item", "id": item.id, "label": f"{item.name} (current: {item.current_quantity} {item.unit})"},
                ],
                contributing_signals=[
                    f"Current: {item.current_quantity} {item.unit}",
                    f"Reorder level: {item.reorder_level} {item.unit}",
                    f"Category: {item.category}",
                ],
                immediate_action="Raise a purchase order for this item with the registered supplier.",
                preventive_action="Review reorder level setting. Consider demand-based automatic reorder triggers.",
                verification_steps="Confirm new stock receipt and update inventory records.",
                status=FindingStatus.OPEN,
                fingerprint=f"STOCK-003:{restaurant.id}:{item.id}",
            ))

    return findings


def _run_pest_control_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rules PEST-001, PEST-002 — Pest control service schedules."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    warn_cutoff = now + timedelta(days=CONFIG["PEST_WARN_DAYS"])

    records = db.query(PestControlRecord).filter(
        PestControlRecord.restaurant_id == restaurant.id
    ).order_by(PestControlRecord.next_service_date.desc()).all()

    for record in records:
        if record.next_service_date < now:
            days_overdue = (now - record.next_service_date).days
            score = 55
            findings.append(RiskFinding(
                rule_id="PEST-001",
                title="Pest Control Service Overdue",
                description=f"The scheduled pest control service (next due: {record.next_service_date.strftime('%Y-%m-%d')}) is {days_overdue} day(s) overdue. Pest infestation presents a direct food-safety hazard.",
                severity=Severity.HIGH,
                score=score,
                category="Pest Control",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "pest_control_record", "id": record.id, "label": f"Pest Control Record #{record.id} — {record.agency_name}"},
                ],
                contributing_signals=[
                    f"Next service date: {record.next_service_date.strftime('%Y-%m-%d')}",
                    f"Days overdue: {days_overdue}",
                    f"Agency: {record.agency_name}",
                ],
                immediate_action=f"Contact {record.agency_name} immediately to schedule the overdue service. Conduct interim visual inspection.",
                preventive_action="Book standing recurring contract with your pest control agency. Set calendar reminder 7 days before each service.",
                verification_steps="Upload new pest control certificate and invoice after service is completed.",
                status=FindingStatus.OPEN,
                is_overdue=True,
                fingerprint=f"PEST-001:{restaurant.id}:{record.id}",
            ))
        elif record.next_service_date <= warn_cutoff:
            days_left = (record.next_service_date - now).days
            score = 20
            findings.append(RiskFinding(
                rule_id="PEST-002",
                title="Pest Control Service Due Soon",
                description=f"Scheduled pest control service is due in {days_left} day(s) on {record.next_service_date.strftime('%Y-%m-%d')}.",
                severity=Severity.LOW,
                score=score,
                category="Pest Control",
                restaurant_id=restaurant.id,
                restaurant_name=restaurant.name,
                evidence_refs=[
                    {"type": "pest_control_record", "id": record.id, "label": f"Pest Control Record #{record.id}"},
                ],
                contributing_signals=[f"Days remaining: {days_left}"],
                immediate_action=f"Confirm appointment with {record.agency_name}.",
                preventive_action="Keep agency contact details updated. Ensure access is available on service day.",
                verification_steps="Confirm service completed, upload certificate.",
                status=FindingStatus.OPEN,
                fingerprint=f"PEST-002:{restaurant.id}:{record.id}",
            ))

    return findings


def _run_hygiene_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rule HYG-001 — Mandatory cleaning tasks not completed."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Find mandatory tasks with failed/incomplete recent logs
    areas = db.query(CleaningArea).filter(CleaningArea.restaurant_id == restaurant.id).all()

    for area in areas:
        for task in area.tasks:
            if not task.is_mandatory:
                continue
            # Look for today's log entries with issues
            bad_logs = [
                log for log in task.logs
                if log.date >= today_start and log.status in ("not_completed", "needs_attention")
            ]
            if bad_logs:
                score = 30
                latest = max(bad_logs, key=lambda l: l.date)
                findings.append(RiskFinding(
                    rule_id="HYG-001",
                    title=f"Mandatory Hygiene Task Incomplete: {task.task_name[:60]}",
                    description=f"Mandatory cleaning task '{task.task_name}' in area '{area.name}' has status '{latest.status}'. Notes: {latest.notes or 'None provided.'}",
                    severity=Severity.MEDIUM,
                    score=score,
                    category="Hygiene & Sanitation",
                    restaurant_id=restaurant.id,
                    restaurant_name=restaurant.name,
                    evidence_refs=[
                        {"type": "cleaning_log", "id": latest.id, "label": f"Log #{latest.id} — {area.name}"},
                    ],
                    contributing_signals=[
                        f"Task frequency: {task.frequency}",
                        f"Status: {latest.status}",
                        f"Area: {area.name}",
                    ],
                    immediate_action=f"Assign a staff member to complete '{task.task_name}' in '{area.name}' before the next service period.",
                    preventive_action="Review staffing and shift allocation for hygiene tasks. Create accountability log.",
                    verification_steps="Log task completion with photographic evidence (where required). Mark task status as 'completed'.",
                    status=FindingStatus.OPEN,
                    fingerprint=f"HYG-001:{restaurant.id}:{task.id}:{latest.date.strftime('%Y-%m-%d')}",
                ))

    return findings


def _run_staff_training_rules(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """Rules STAFF-001, STAFF-002 — Staff training certificates."""
    findings: List[RiskFinding] = []
    now = datetime.utcnow()
    warn_cutoff = now + timedelta(days=CONFIG["EXPIRY_WARN_DAYS"])

    employees = db.query(Employee).filter(
        Employee.restaurant_id == restaurant.id,
        Employee.employment_status == "active",
    ).all()

    for emp in employees:
        for training in emp.trainings:
            if training.certificate_expiry < now:
                score = 40
                findings.append(RiskFinding(
                    rule_id="STAFF-001",
                    title=f"Expired Training Certificate: {emp.full_name}",
                    description=f"'{training.training_name}' certificate for {emp.full_name} ({emp.designation}) expired on {training.certificate_expiry.strftime('%Y-%m-%d')}.",
                    severity=Severity.MEDIUM,
                    score=score,
                    category="Staff Training",
                    restaurant_id=restaurant.id,
                    restaurant_name=restaurant.name,
                    evidence_refs=[
                        {"type": "staff_training", "id": training.id, "label": f"Training #{training.id} — {training.training_name}"},
                    ],
                    contributing_signals=[
                        f"Employee: {emp.full_name}",
                        f"Training: {training.training_name}",
                        f"Expiry: {training.certificate_expiry.strftime('%Y-%m-%d')}",
                    ],
                    immediate_action=f"Restrict {emp.full_name} from tasks requiring certified training until renewed.",
                    preventive_action="Schedule renewals 60 days before expiry. Maintain a training renewal calendar.",
                    verification_steps="Upload new training certificate in Staff Records. Update certificate_expiry date.",
                    status=FindingStatus.OPEN,
                    is_overdue=True,
                    fingerprint=f"STAFF-001:{restaurant.id}:{training.id}",
                ))
            elif training.certificate_expiry <= warn_cutoff:
                days_left = (training.certificate_expiry - now).days
                score = 20
                findings.append(RiskFinding(
                    rule_id="STAFF-002",
                    title=f"Training Certificate Expiring Soon: {emp.full_name}",
                    description=f"'{training.training_name}' for {emp.full_name} expires in {days_left} day(s) on {training.certificate_expiry.strftime('%Y-%m-%d')}.",
                    severity=Severity.LOW,
                    score=score,
                    category="Staff Training",
                    restaurant_id=restaurant.id,
                    restaurant_name=restaurant.name,
                    evidence_refs=[
                        {"type": "staff_training", "id": training.id, "label": f"Training #{training.id}"},
                    ],
                    contributing_signals=[f"Days remaining: {days_left}"],
                    immediate_action=f"Book renewal training for {emp.full_name} with {training.provider}.",
                    preventive_action="Stagger training renewal dates across team to avoid gaps.",
                    verification_steps="Upload renewed certificate after training completion.",
                    status=FindingStatus.OPEN,
                    fingerprint=f"STAFF-002:{restaurant.id}:{training.id}",
                ))

    return findings


def _run_multi_signal_rule(restaurant: Restaurant, all_findings: List[RiskFinding]) -> List[RiskFinding]:
    """
    Rule MULTI-001 — Multiple independent risk signals.
    Triggered when >= MULTI_SIGNAL_THRESHOLD distinct open findings exist for a restaurant.
    Generates ONE combined finding with elevated score to surface systemic risk.
    Avoids double-counting individual signals — uses their count only, not their scores.
    """
    open_findings = [
        f for f in all_findings
        if f.status in (FindingStatus.OPEN, FindingStatus.IN_PROGRESS)
    ]

    # Different rules can describe the same underlying problem (for example,
    # a critical violation can trigger both VIOL-001 and VIOL-003). Use distinct
    # categories as a conservative proxy for independent signals so correlated
    # findings do not inflate the systemic-risk trigger.
    categories = sorted({f.category for f in open_findings if f.category})
    independent_signal_count = len(categories)

    if independent_signal_count < CONFIG["MULTI_SIGNAL_THRESHOLD"]:
        return []

    score = min(85, 45 + independent_signal_count * 5)  # cap at 85

    return [RiskFinding(
        rule_id="MULTI-001",
        title=f"Multiple Concurrent Risk Signals ({independent_signal_count} Categories)",
        description=(
            f"{len(open_findings)} open findings across {independent_signal_count} distinct "
            f"categories ({', '.join(categories)}) indicate a possible systemic food-safety "
            f"management concern at {restaurant.name}. Related findings may share an underlying "
            f"cause, so category count is used as a conservative proxy for independent signals."
        ),
        severity=score_to_severity(score),
        score=score,
        category="Systemic Risk",
        restaurant_id=restaurant.id,
        restaurant_name=restaurant.name,
        evidence_refs=[
            {"type": "risk_finding", "id": None, "label": f.title} for f in open_findings[:5]
        ],
        contributing_signals=[
            f"Total open findings: {len(open_findings)}",
            f"Distinct risk categories (proxy for independent signals): {independent_signal_count}",
        ],
        immediate_action="Hold a management review to triage all open findings. Prioritise Critical and High severity items.",
        preventive_action="Establish a weekly food-safety risk review meeting. Assign an accountable manager for each category.",
        verification_steps="Resolve individual findings in priority order. MULTI-001 auto-resolves when open findings drop below threshold.",
        status=FindingStatus.OPEN,
        fingerprint=f"MULTI-001:{restaurant.id}",
        limitations=(
            f"Score for MULTI-001 is based on distinct risk-category count, not summed individual scores. "
            f"Category count is a conservative proxy for independent signals. "
            f"Threshold: {CONFIG['MULTI_SIGNAL_THRESHOLD']} categories."
        ),
    )]


# ─────────────────────────────────────────────
# DOCUMENTED DORMANT RULES (integration dependencies)
# ─────────────────────────────────────────────

DORMANT_RULES = [
    {
        "rule_id": "TEMP-001",
        "description": "Temperature reading outside configured safe range.",
        "depends_on": "CH1 TemperatureReading model — not yet available.",
        "trigger": "reading.value > threshold.max_safe OR reading.value < threshold.min_safe",
        "severity": "critical",
        "status": "dormant_pending_ch1",
    },
    {
        "rule_id": "TEMP-002",
        "description": "Repeated temperature violations within configurable window.",
        "depends_on": "CH1 TemperatureReading model — not yet available.",
        "status": "dormant_pending_ch1",
    },
    {
        "rule_id": "CONFLICT-001",
        "description": "System assessment conflicts with authoritative temperature evidence.",
        "depends_on": "CH3 ConflictIncident model — not yet available.",
        "status": "dormant_pending_ch3",
    },
    {
        "rule_id": "DEMAND-001",
        "description": "Critical ingredient stock insufficient relative to forecast demand.",
        "depends_on": "CH2 DemandForecast model — not yet available.",
        "status": "dormant_pending_ch2",
    },
]


# ─────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ─────────────────────────────────────────────

def analyse_restaurant(db: Session, restaurant: Restaurant) -> List[RiskFinding]:
    """
    Run all active rules for a single restaurant.
    Returns a deduplicated list of RiskFindings sorted by score (descending).
    """
    findings: List[RiskFinding] = []

    findings += _run_violation_rules(db, restaurant)
    findings += _run_corrective_action_rules(db, restaurant)
    findings += _run_document_rules(db, restaurant)
    findings += _run_stock_rules(db, restaurant)
    findings += _run_pest_control_rules(db, restaurant)
    findings += _run_hygiene_rules(db, restaurant)
    findings += _run_staff_training_rules(db, restaurant)

    # Deduplicate before computing MULTI-001 so signal count is accurate
    findings = _dedup(findings)

    # MULTI-001 examines the deduplicated set but is NOT counted in the
    # signal threshold to avoid recursion.
    multi = _run_multi_signal_rule(restaurant, findings)
    findings += multi

    # Final dedup pass
    findings = _dedup(findings)

    # Sort by score descending (highest urgency first)
    findings.sort(key=lambda f: f.score, reverse=True)
    return findings


def analyse_all_restaurants(db: Session) -> List[RiskFinding]:
    """Run analysis across every restaurant. For officer overview."""
    all_findings: List[RiskFinding] = []
    restaurants = db.query(Restaurant).all()
    for rest in restaurants:
        all_findings += analyse_restaurant(db, rest)
    # Final dedup across all restaurants
    all_findings = _dedup(all_findings)
    all_findings.sort(key=lambda f: f.score, reverse=True)
    return all_findings


def compute_overview(findings: List[RiskFinding], restaurants: List[Restaurant]) -> Dict[str, Any]:
    """
    Aggregate KPI metrics from the finding list.
    All values derived from loaded records — no hardcoded statistics.
    """
    total = len(findings)
    open_count = sum(1 for f in findings if f.status in (FindingStatus.OPEN, FindingStatus.IN_PROGRESS))
    critical_high = sum(1 for f in findings if f.severity in (Severity.CRITICAL, Severity.HIGH))
    overdue = sum(1 for f in findings if f.is_overdue and f.status in (FindingStatus.OPEN, FindingStatus.IN_PROGRESS))
    awaiting_verification = sum(1 for f in findings if f.status == FindingStatus.AWAITING_VERIFICATION)
    resolved = sum(1 for f in findings if f.status == FindingStatus.RESOLVED)
    recurring = sum(1 for f in findings if f.is_recurring)

    top_finding = findings[0].to_dict() if findings else None

    by_severity = {}
    for s in Severity:
        by_severity[s.value] = sum(1 for f in findings if f.severity == s)

    by_category: Dict[str, int] = {}
    for f in findings:
        by_category[f.category] = by_category.get(f.category, 0) + 1

    by_restaurant: Dict[str, int] = {}
    for f in findings:
        by_restaurant[f.restaurant_name] = by_restaurant.get(f.restaurant_name, 0) + 1

    return {
        "total_findings": total,
        "open_findings": open_count,
        "critical_high_count": critical_high,
        "overdue_actions": overdue,
        "awaiting_verification": awaiting_verification,
        "resolved_findings": resolved,
        "recurring_risks": recurring,
        "top_finding": top_finding,
        "by_severity": by_severity,
        "by_category": by_category,
        "by_restaurant": by_restaurant,
        "dormant_rules": DORMANT_RULES,
        "config": CONFIG,
        "data_mode": "live",
        "analysis_timestamp": datetime.utcnow().isoformat(),
    }
