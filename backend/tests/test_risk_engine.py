"""
AnnaKavach Smart Risk Radar — Backend Test Suite
=================================================
Challenge 4 automated tests covering:

  1. Risk engine unit tests (rules, scoring, deduplication, edge cases)
  2. API integration tests via FastAPI TestClient with in-memory SQLite
  3. Corrective action CRUD and status transitions
  4. Role-based access (restaurant vs officer)
  5. Filter and pagination correctness
  6. Analytics aggregation
  7. Regression guard for existing routes

Run with:
    cd backend
    python -m pytest tests/test_risk_engine.py -v

No running server required — uses in-memory SQLite.
"""

import sys
import os
import pytest
from datetime import datetime, timedelta

# ──────────────────────────────────────────────
# PATH SETUP  (so imports resolve from backend/)
# ──────────────────────────────────────────────
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ──────────────────────────────────────────────
# PATCH DATABASE BEFORE IMPORTING APP
# Use an in-memory SQLite so tests are isolated.
# ──────────────────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import database as db_module
from database import Base

# Override engine with in-memory DB
_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

db_module.engine = _test_engine
db_module.SessionLocal = _TestingSessionLocal

from models import (
    User, UserRole, Restaurant, CorrectiveAction, CorrectiveStatus,
    ComplianceDocument, StockItem, StockBatch, PestControlRecord,
    Inspection, InspectionViolation, InspectionStatus,
    Employee, StaffTraining, CleaningArea, CleaningTask, CleaningLog,
    DocumentValidity,
)
from auth import get_password_hash

# Import app AFTER patching so get_db uses the in-memory engine
import main as main_module
from main import app

# ──────────────────────────────────────────────
# DB SESSION OVERRIDE FOR TESTCLIENT
# ──────────────────────────────────────────────
from database import get_db

def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = _override_get_db

# ──────────────────────────────────────────────
# CREATE TABLES
# ──────────────────────────────────────────────
Base.metadata.create_all(bind=_test_engine)


# ═══════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════

@pytest.fixture(scope="function")
def db():
    """Provide a fresh, rolled-back DB session per test."""
    connection = _test_engine.connect()
    transaction = connection.begin()
    session = _TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    """TestClient that uses the rolled-back DB session."""
    def override():
        yield db
    app.dependency_overrides[get_db] = override
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
def restaurant_user(db):
    u = User(
        email="test_rest@example.com",
        hashed_password=get_password_hash("TestPass123!"),
        security_pin_hash=get_password_hash("1234"),
        full_name="Test Owner",
        role=UserRole.RESTAURANT,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def officer_user(db):
    u = User(
        email="test_officer@example.com",
        hashed_password=get_password_hash("OfficerPass123!"),
        security_pin_hash=get_password_hash("5678"),
        full_name="Test Officer",
        role=UserRole.OFFICER,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def restaurant(db, restaurant_user):
    r = Restaurant(
        owner_id=restaurant_user.id,
        name="Test Kitchen",
        registration_number="TEST-001",
        license_type="Test License",
        category="Test Category",
        address="1 Test Street",
        city="Test City",
        state="TS",
        pincode="000000",
        contact_phone="+91 00000 00000",
        contact_email="test@kitchen.com",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _login(client, email, password, role="restaurant"):
    r = client.post("/api/auth/login", json={"email": email, "password": password, "role": role})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════
# 1. RISK ENGINE UNIT TESTS (pure Python — no HTTP)
# ═══════════════════════════════════════════════

class TestScoreBands:
    """Verify score-to-severity mapping across all band boundaries."""

    def test_critical_at_80(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(80) == Severity.CRITICAL

    def test_critical_at_100(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(100) == Severity.CRITICAL

    def test_high_at_60(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(60) == Severity.HIGH

    def test_high_at_79(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(79) == Severity.HIGH

    def test_medium_at_35(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(35) == Severity.MEDIUM

    def test_medium_at_59(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(59) == Severity.MEDIUM

    def test_low_at_10(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(10) == Severity.LOW

    def test_low_at_34(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(34) == Severity.LOW

    def test_info_at_0(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(0) == Severity.INFO

    def test_info_at_9(self):
        from risk_engine import score_to_severity, Severity
        assert score_to_severity(9) == Severity.INFO


class TestRiskFinding:
    """Unit tests for the RiskFinding data class."""

    def test_score_clamped_above_100(self):
        from risk_engine import RiskFinding, Severity, FindingStatus
        f = RiskFinding(
            rule_id="TEST", title="T", description="D",
            severity=Severity.CRITICAL, score=150,
            category="Cat", restaurant_id=1, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C",
        )
        assert f.score == 100.0

    def test_score_clamped_below_0(self):
        from risk_engine import RiskFinding, Severity
        f = RiskFinding(
            rule_id="TEST", title="T", description="D",
            severity=Severity.INFO, score=-10,
            category="Cat", restaurant_id=1, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C",
        )
        assert f.score == 0.0

    def test_default_fingerprint(self):
        from risk_engine import RiskFinding, Severity
        f = RiskFinding(
            rule_id="VIOL-001", title="T", description="D",
            severity=Severity.HIGH, score=70,
            category="Cat", restaurant_id=5, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C",
        )
        assert f.fingerprint == "VIOL-001:5"

    def test_custom_fingerprint(self):
        from risk_engine import RiskFinding, Severity
        f = RiskFinding(
            rule_id="VIOL-001", title="T", description="D",
            severity=Severity.HIGH, score=70,
            category="Cat", restaurant_id=5, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C",
            fingerprint="VIOL-001:5:12",
        )
        assert f.fingerprint == "VIOL-001:5:12"

    def test_to_dict_contains_required_fields(self):
        from risk_engine import RiskFinding, Severity
        f = RiskFinding(
            rule_id="VIOL-001", title="T", description="D",
            severity=Severity.HIGH, score=70,
            category="Cat", restaurant_id=5, restaurant_name="R",
            evidence_refs=[{"type": "x", "id": 1, "label": "L"}],
            contributing_signals=["signal"],
            immediate_action="A", preventive_action="B",
            verification_steps="C",
        )
        d = f.to_dict()
        required = [
            "rule_id", "title", "description", "severity", "score",
            "category", "restaurant_id", "restaurant_name", "evidence_refs",
            "contributing_signals", "immediate_action", "preventive_action",
            "verification_steps", "status", "is_recurring", "is_overdue",
            "detected_at", "fingerprint", "limitations", "evidence_completeness",
        ]
        for key in required:
            assert key in d, f"Missing key: {key}"


class TestDeduplication:
    """Verify deduplication keeps the higher-score duplicate."""

    def test_dedup_keeps_higher_score(self):
        from risk_engine import RiskFinding, Severity, FindingStatus, _dedup
        make = lambda score, fp: RiskFinding(
            rule_id="X", title="T", description="D",
            severity=Severity.MEDIUM, score=score,
            category="C", restaurant_id=1, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C", fingerprint=fp,
        )
        findings = [make(40, "FP:1"), make(60, "FP:1"), make(20, "FP:1")]
        result = _dedup(findings)
        assert len(result) == 1
        assert result[0].score == 60.0

    def test_dedup_different_fingerprints_both_kept(self):
        from risk_engine import RiskFinding, Severity, _dedup
        make = lambda fp: RiskFinding(
            rule_id="X", title="T", description="D",
            severity=Severity.MEDIUM, score=40,
            category="C", restaurant_id=1, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C", fingerprint=fp,
        )
        findings = [make("FP:1"), make("FP:2")]
        result = _dedup(findings)
        assert len(result) == 2

    def test_dedup_idempotent(self):
        from risk_engine import RiskFinding, Severity, _dedup
        make = lambda score: RiskFinding(
            rule_id="X", title="T", description="D",
            severity=Severity.MEDIUM, score=score,
            category="C", restaurant_id=1, restaurant_name="R",
            evidence_refs=[], contributing_signals=[],
            immediate_action="A", preventive_action="B",
            verification_steps="C", fingerprint="FP:1",
        )
        first = _dedup([make(40), make(60)])
        second = _dedup(first)
        assert first[0].score == second[0].score


# ═══════════════════════════════════════════════
# 2. RULE TRIGGER TESTS (use real DB session)
# ═══════════════════════════════════════════════

class TestViolationRules:
    """VIOL-001, VIOL-002, VIOL-003"""

    def test_viol_001_critical_violation_triggers(self, db, restaurant):
        insp = Inspection(
            restaurant_id=restaurant.id,
            officer_id=1,
            inspection_date=datetime.utcnow() - timedelta(days=5),
            inspection_type="Routine",
            status=InspectionStatus.NON_COMPLIANT,
            score=40,
        )
        db.add(insp)
        db.flush()
        v = InspectionViolation(
            inspection_id=insp.id,
            category="Temperature Control",
            description="Fridge at 15°C",
            severity="Critical",
            reference_code="TC-001",
            is_rectified=False,
        )
        db.add(v)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        rule_ids = [f.rule_id for f in findings]
        assert "VIOL-001" in rule_ids

    def test_viol_001_not_triggered_for_minor(self, db, restaurant):
        insp = Inspection(
            restaurant_id=restaurant.id,
            officer_id=1,
            inspection_date=datetime.utcnow() - timedelta(days=5),
            inspection_type="Routine",
            status=InspectionStatus.PASSED,
            overall_score=90,
        )
        db.add(insp)
        db.flush()
        v = InspectionViolation(
            inspection_id=insp.id,
            category="Labelling",
            description="Minor label issue",
            severity="Minor",
            reference_code="LBL-001",
            is_rectified=True,
        )
        db.add(v)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id != "VIOL-001" for f in findings)

    def test_viol_003_unresolved_major(self, db, restaurant):
        insp = Inspection(
            restaurant_id=restaurant.id,
            officer_id=1,
            inspection_date=datetime.utcnow() - timedelta(days=10),
            inspection_type="Surprise",
            status=InspectionStatus.NON_COMPLIANT,
            score=50,
        )
        db.add(insp)
        db.flush()
        v = InspectionViolation(
            inspection_id=insp.id,
            category="Pest Control",
            description="Evidence of rodent activity",
            severity="Major",
            reference_code="PC-002",
            is_rectified=False,
        )
        db.add(v)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "VIOL-003" for f in findings)

    def test_viol_002_recurring_violations(self, db, restaurant):
        """Two violations in same category within window → VIOL-002."""
        for i in range(2):
            insp = Inspection(
                restaurant_id=restaurant.id,
                officer_id=1,
                inspection_date=datetime.utcnow() - timedelta(days=10 + i),
                inspection_type="Routine",
                status=InspectionStatus.NON_COMPLIANT,
                score=60,
            )
            db.add(insp)
            db.flush()
            v = InspectionViolation(
                inspection_id=insp.id,
                category="Personal Hygiene",
                description=f"Hygiene violation {i}",
                severity="Moderate",
                reference_code=f"HYG-{i:03}",
                is_rectified=False,
            )
            db.add(v)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "VIOL-002" and f.is_recurring for f in findings)

    def test_viol_002_not_triggered_with_single_violation(self, db, restaurant):
        insp = Inspection(
            restaurant_id=restaurant.id,
            officer_id=1,
            inspection_date=datetime.utcnow() - timedelta(days=5),
            inspection_type="Routine",
            status=InspectionStatus.PASSED_WITH_CONDITIONS,
            score=75,
        )
        db.add(insp)
        db.flush()
        v = InspectionViolation(
            inspection_id=insp.id,
            category="Labelling",
            description="One label issue",
            severity="Minor",
            reference_code="LBL-001",
            is_rectified=False,
        )
        db.add(v)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id != "VIOL-002" for f in findings)


class TestCorrectiveActionRules:
    """CA-001 (overdue), CA-002 (approaching deadline)."""

    def test_ca_001_overdue_ca_triggers(self, db, restaurant):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Pest issue",
            issue_description="Rodents found",
            required_action="Hire exterminator",
            deadline=datetime.utcnow() - timedelta(days=3),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        overdue = [f for f in findings if f.rule_id == "CA-001"]
        assert overdue, "CA-001 should trigger for overdue action"
        assert overdue[0].is_overdue

    def test_ca_002_approaching_triggers_within_warn_days(self, db, restaurant):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Cleaning task",
            issue_description="Deep clean required",
            required_action="Schedule deep clean",
            deadline=datetime.utcnow() + timedelta(days=3),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "CA-002" for f in findings)

    def test_verified_closed_ca_not_flagged(self, db, restaurant):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Old issue",
            issue_description="Resolved",
            required_action="Done",
            deadline=datetime.utcnow() - timedelta(days=10),
            status=CorrectiveStatus.VERIFIED_CLOSED,
            resolved_at=datetime.utcnow() - timedelta(days=5),
        )
        db.add(ca)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id not in ("CA-001", "CA-002") for f in findings)


class TestDocumentRules:
    """DOC-001 (expired), DOC-002 (expiring soon)."""

    def test_doc_001_expired_document(self, db, restaurant):
        doc = ComplianceDocument(
            restaurant_id=restaurant.id,
            document_name="FSSAI License",
            document_number="DOC-TEST-001",
            category="Operating License",
            issuing_authority="FSSAI",
            issue_date=datetime.utcnow() - timedelta(days=400),
            expiry_date=datetime.utcnow() - timedelta(days=30),
            validity_status=DocumentValidity.EXPIRED,
        )
        db.add(doc)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "DOC-001" for f in findings)

    def test_doc_002_expiring_soon(self, db, restaurant):
        doc = ComplianceDocument(
            restaurant_id=restaurant.id,
            document_name="Fire NOC",
            document_number="DOC-TEST-002",
            category="Safety Clearance",
            issuing_authority="Fire Dept",
            issue_date=datetime.utcnow() - timedelta(days=350),
            expiry_date=datetime.utcnow() + timedelta(days=7),
            validity_status=DocumentValidity.VALID,
        )
        db.add(doc)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "DOC-002" for f in findings)

    def test_valid_document_not_flagged(self, db, restaurant):
        doc = ComplianceDocument(
            restaurant_id=restaurant.id,
            document_name="Health Certificate",
            document_number="DOC-TEST-003",
            category="Health",
            issuing_authority="Health Dept",
            issue_date=datetime.utcnow() - timedelta(days=30),
            expiry_date=datetime.utcnow() + timedelta(days=300),
            validity_status=DocumentValidity.VALID,
        )
        db.add(doc)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id not in ("DOC-001", "DOC-002") for f in findings)


class TestStockRules:
    """STOCK-001 (expired), STOCK-002 (expiring soon), STOCK-003 (below reorder)."""

    def _make_item(self, db, restaurant, current_qty, reorder_level):
        item = StockItem(
            restaurant_id=restaurant.id,
            name="Test Ingredient",
            category="Dairy",
            unit="kg",
            current_quantity=current_qty,
            reorder_level=reorder_level,
        )
        db.add(item)
        db.flush()
        return item

    def test_stock_001_expired_batch(self, db, restaurant):
        item = self._make_item(db, restaurant, 10, 5)
        batch = StockBatch(
            stock_item_id=item.id,
            batch_number="BATCH-EXP",
            quantity=5,
            unit="kg",
            purchase_price=100.0,
            purchase_date=datetime.utcnow() - timedelta(days=30),
            expiry_date=datetime.utcnow() - timedelta(days=3),
        )
        db.add(batch)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "STOCK-001" for f in findings)

    def test_stock_002_expiring_soon(self, db, restaurant):
        item = self._make_item(db, restaurant, 10, 5)
        batch = StockBatch(
            stock_item_id=item.id,
            batch_number="BATCH-SOON",
            quantity=5,
            unit="kg",
            purchase_price=100.0,
            purchase_date=datetime.utcnow() - timedelta(days=10),
            expiry_date=datetime.utcnow() + timedelta(days=5),
        )
        db.add(batch)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "STOCK-002" for f in findings)

    def test_stock_003_below_reorder(self, db, restaurant):
        item = self._make_item(db, restaurant, current_qty=2, reorder_level=10)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "STOCK-003" for f in findings)

    def test_stock_003_not_triggered_above_reorder(self, db, restaurant):
        item = self._make_item(db, restaurant, current_qty=20, reorder_level=5)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id != "STOCK-003" for f in findings)


class TestPestControlRules:
    """PEST-001 (overdue), PEST-002 (due soon)."""

    def test_pest_001_overdue(self, db, restaurant):
        rec = PestControlRecord(
            restaurant_id=restaurant.id,
            agency_name="Test Pest Co",
            agency_contact="+91 00000 00000",
            treatment_type="General Treatment",
            service_date=datetime.utcnow() - timedelta(days=60),
            next_service_date=datetime.utcnow() - timedelta(days=10),
        )
        db.add(rec)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "PEST-001" and f.is_overdue for f in findings)

    def test_pest_002_due_soon(self, db, restaurant):
        rec = PestControlRecord(
            restaurant_id=restaurant.id,
            agency_name="Test Pest Co",
            agency_contact="+91 00000 00000",
            treatment_type="General Treatment",
            service_date=datetime.utcnow() - timedelta(days=30),
            next_service_date=datetime.utcnow() + timedelta(days=3),
        )
        db.add(rec)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "PEST-002" for f in findings)

    def test_no_pest_finding_when_schedule_is_future(self, db, restaurant):
        rec = PestControlRecord(
            restaurant_id=restaurant.id,
            agency_name="Test Pest Co",
            agency_contact="+91 00000 00000",
            treatment_type="General Treatment",
            service_date=datetime.utcnow() - timedelta(days=30),
            next_service_date=datetime.utcnow() + timedelta(days=30),
        )
        db.add(rec)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id not in ("PEST-001", "PEST-002") for f in findings)


class TestMultiSignalRule:
    """MULTI-001 triggers when >= threshold independent open findings."""

    def test_multi_001_triggers_with_enough_signals(self, db, restaurant):
        # Create 3 independent signals: 1 overdue CA, 2 expiring stock
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Overdue CA",
            issue_description="...",
            required_action="Fix it",
            deadline=datetime.utcnow() - timedelta(days=5),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)

        item = StockItem(
            restaurant_id=restaurant.id,
            name="Milk", category="Dairy", unit="L",
            current_quantity=5, reorder_level=2,
        )
        db.add(item)
        db.flush()
        for i in range(2):
            batch = StockBatch(
                stock_item_id=item.id,
                batch_number=f"BATCH-{i}",
                quantity=2,
                unit="L",
                purchase_price=50.0,
                purchase_date=datetime.utcnow() - timedelta(days=5),
                expiry_date=datetime.utcnow() + timedelta(days=2 + i),
            )
            db.add(batch)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert any(f.rule_id == "MULTI-001" for f in findings)

    def test_multi_001_not_triggered_below_threshold(self, db, restaurant):
        # Only 2 signals — below default threshold of 3
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="One CA",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() - timedelta(days=2),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)

        item = StockItem(
            restaurant_id=restaurant.id,
            name="Cheese", category="Dairy", unit="kg",
            current_quantity=5, reorder_level=2,
        )
        db.add(item)
        db.flush()
        batch = StockBatch(
            stock_item_id=item.id,
            batch_number="BATCH-CHZ",
            quantity=2, unit="kg",
            purchase_price=50.0,
            purchase_date=datetime.utcnow() - timedelta(days=5),
            expiry_date=datetime.utcnow() + timedelta(days=3),
        )
        db.add(batch)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert all(f.rule_id != "MULTI-001" for f in findings)


class TestAnalyseAllRestaurants:
    """analyse_all_restaurants should union findings from all restaurants."""

    def test_returns_findings_for_multiple_restaurants(self, db, restaurant_user):
        # Create second restaurant under a different owner
        u2 = User(
            email="owner2@test.com",
            hashed_password=get_password_hash("Pass2!"),
            full_name="Owner2",
            role=UserRole.RESTAURANT,
        )
        db.add(u2)
        db.flush()
        r2 = Restaurant(
            owner_id=u2.id, name="Second Kitchen",
            registration_number="TEST-002",
            license_type="License", category="Cat",
            address="2 Test St", city="City",
            state="ST", pincode="000001",
            contact_phone="+91 00000 00001",
            contact_email="second@kitchen.com",
        )
        db.add(r2)
        db.flush()
        # Give r2 an expired document
        doc = ComplianceDocument(
            restaurant_id=r2.id,
            document_name="Test Doc",
            document_number="DOC-R2-001",
            category="License",
            issuing_authority="Auth",
            issue_date=datetime.utcnow() - timedelta(days=400),
            expiry_date=datetime.utcnow() - timedelta(days=10),
            validity_status=DocumentValidity.EXPIRED,
        )
        db.add(doc)
        db.commit()

        from risk_engine import analyse_all_restaurants
        all_findings = analyse_all_restaurants(db)
        restaurant_ids = {f.restaurant_id for f in all_findings}
        assert r2.id in restaurant_ids


class TestComputeOverview:
    """compute_overview aggregation correctness."""

    def test_overview_counts_match_finding_list(self, db, restaurant):
        from risk_engine import RiskFinding, Severity, FindingStatus, compute_overview
        findings = [
            RiskFinding("CA-001", "T1", "D", Severity.HIGH, 70, "CA",
                        restaurant.id, restaurant.name, [], [],
                        "A", "B", "C", status=FindingStatus.OPEN, is_overdue=True),
            RiskFinding("DOC-001", "T2", "D", Severity.MEDIUM, 35, "Doc",
                        restaurant.id, restaurant.name, [], [],
                        "A", "B", "C", status=FindingStatus.RESOLVED),
        ]
        overview = compute_overview(findings, [restaurant])
        assert overview["total_findings"] == 2
        assert overview["open_findings"] == 1
        assert overview["resolved_findings"] == 1
        assert overview["overdue_actions"] == 1
        assert overview["critical_high_count"] == 1

    def test_empty_findings_overview(self):
        from risk_engine import compute_overview
        overview = compute_overview([], [])
        assert overview["total_findings"] == 0
        assert overview["open_findings"] == 0
        assert overview["top_finding"] is None


# ═══════════════════════════════════════════════
# 3. API INTEGRATION TESTS
# ═══════════════════════════════════════════════

class TestHealthEndpoint:
    def test_health_no_auth_required(self, client):
        r = client.get("/api/risk/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "restaurant_count" in data
        assert "active_rules" in data


class TestOverviewEndpoint:
    def test_overview_requires_auth(self, client):
        r = client.get("/api/risk/overview")
        assert r.status_code == 401

    def test_overview_restaurant_user(self, client, restaurant_user, restaurant):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get("/api/risk/overview", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()
        assert "total_findings" in data
        assert "open_findings" in data
        assert "critical_high_count" in data
        assert "overdue_actions" in data

    def test_overview_officer_sees_all(self, client, officer_user, restaurant):
        token = _login(client, "test_officer@example.com", "OfficerPass123!")
        r = client.get("/api/risk/overview", headers=_auth(token))
        assert r.status_code == 200

    def test_overview_officer_filter_by_restaurant_id(
        self, client, officer_user, restaurant
    ):
        token = _login(client, "test_officer@example.com", "OfficerPass123!")
        r = client.get(
            f"/api/risk/overview?restaurant_id={restaurant.id}",
            headers=_auth(token),
        )
        assert r.status_code == 200

    def test_overview_officer_invalid_restaurant_404(self, client, officer_user):
        token = _login(client, "test_officer@example.com", "OfficerPass123!")
        r = client.get("/api/risk/overview?restaurant_id=99999", headers=_auth(token))
        assert r.status_code == 404


class TestFindingsEndpoint:
    def test_findings_list_returns_pagination_keys(
        self, client, restaurant_user, restaurant
    ):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get("/api/risk/findings", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "findings" in data
        assert isinstance(data["findings"], list)

    def test_findings_severity_filter(self, client, restaurant_user, restaurant, db):
        # Plant a HIGH severity finding by creating expired document
        doc = ComplianceDocument(
            restaurant_id=restaurant.id,
            document_name="FSSAI",
            document_number="DOC-FILTER-001",
            category="License",
            issuing_authority="FSSAI",
            issue_date=datetime.utcnow() - timedelta(days=400),
            expiry_date=datetime.utcnow() - timedelta(days=10),
            validity_status=DocumentValidity.EXPIRED,
        )
        db.add(doc)
        db.commit()

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get("/api/risk/findings?severity=high", headers=_auth(token))
        assert r.status_code == 200
        for f in r.json()["findings"]:
            assert f["severity"] == "high"

    def test_findings_category_filter(self, client, restaurant_user, restaurant, db):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Overdue CA",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() - timedelta(days=5),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get(
            "/api/risk/findings?category=Corrective+Action",
            headers=_auth(token),
        )
        assert r.status_code == 200
        for f in r.json()["findings"]:
            assert "corrective" in f["category"].lower()

    def test_findings_limit_and_offset(self, client, restaurant_user, restaurant):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get(
            "/api/risk/findings?limit=2&offset=0", headers=_auth(token)
        )
        assert r.status_code == 200
        assert len(r.json()["findings"]) <= 2


class TestFindingDetailEndpoint:
    def test_get_finding_by_fingerprint(self, client, restaurant_user, restaurant, db):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Find me",
            issue_description="...",
            required_action="Do it",
            deadline=datetime.utcnow() - timedelta(days=2),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()
        db.refresh(ca)

        expected_fp = f"CA-001:{restaurant.id}:{ca.id}"
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get(f"/api/risk/findings/{expected_fp}", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()
        assert data["fingerprint"] == expected_fp
        assert "scoring_explanation" in data

    def test_get_finding_unknown_fingerprint_404(
        self, client, restaurant_user, restaurant
    ):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get(
            "/api/risk/findings/NONEXISTENT:0:0", headers=_auth(token)
        )
        assert r.status_code == 404


class TestAnalyticsEndpoint:
    def test_analytics_structure(self, client, restaurant_user, restaurant):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get("/api/risk/analytics", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()
        assert "by_severity" in data
        assert "by_category" in data
        assert "by_status" in data
        assert "recurring_vs_non_recurring" in data
        assert "corrective_action_status" in data
        assert "total_findings" in data


class TestCorrectiveActionEndpoints:
    def test_create_ca_restaurant_user(self, client, restaurant_user, restaurant):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.post(
            "/api/risk/corrective-action",
            data={
                "issue_title": "Pest Problem",
                "issue_description": "Rodents spotted near storage",
                "required_action": "Hire pest control",
                "deadline_days": 7,
            },
            headers=_auth(token),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["issue_title"] == "Pest Problem"
        assert data["status"] == "pending"

    def test_create_ca_officer_requires_restaurant_id(
        self, client, officer_user
    ):
        token = _login(client, "test_officer@example.com", "OfficerPass123!", role="officer")
        r = client.post(
            "/api/risk/corrective-action",
            data={
                "issue_title": "Missing info",
                "issue_description": "desc",
                "required_action": "Fix",
            },
            headers=_auth(token),
        )
        assert r.status_code == 400

    def test_create_ca_invalid_deadline_days(
        self, client, restaurant_user, restaurant
    ):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.post(
            "/api/risk/corrective-action",
            data={
                "issue_title": "Bad deadline",
                "issue_description": "desc",
                "required_action": "Fix",
                "deadline_days": 0,
            },
            headers=_auth(token),
        )
        assert r.status_code == 400

    def test_list_corrective_actions(self, client, restaurant_user, restaurant, db):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="List me",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() + timedelta(days=5),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get("/api/risk/corrective-actions", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()
        assert "corrective_actions" in data
        assert data["total"] >= 1

    def test_list_ca_status_filter(self, client, restaurant_user, restaurant, db):
        for status in [CorrectiveStatus.PENDING, CorrectiveStatus.SUBMITTED]:
            ca = CorrectiveAction(
                restaurant_id=restaurant.id,
                issue_title=f"CA {status.value}",
                issue_description="...",
                required_action="Fix",
                deadline=datetime.utcnow() + timedelta(days=5),
                status=status,
            )
            db.add(ca)
        db.commit()

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get(
            "/api/risk/corrective-actions?status=pending", headers=_auth(token)
        )
        assert r.status_code == 200
        for ca in r.json()["corrective_actions"]:
            assert ca["status"] == "pending"

    def test_update_ca_status_transition(
        self, client, restaurant_user, restaurant, db
    ):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Update me",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() + timedelta(days=5),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()
        db.refresh(ca)

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.patch(
            f"/api/risk/corrective-action/{ca.id}/status",
            data={"new_status": "submitted", "notes": "Submitted via test"},
            headers=_auth(token),
        )
        assert r.status_code == 200
        assert r.json()["new_status"] == "submitted"

    def test_restaurant_cannot_set_verified_closed(
        self, client, restaurant_user, restaurant, db
    ):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Restricted",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() + timedelta(days=5),
            status=CorrectiveStatus.SUBMITTED,
        )
        db.add(ca)
        db.commit()
        db.refresh(ca)

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.patch(
            f"/api/risk/corrective-action/{ca.id}/status",
            data={"new_status": "verified_closed"},
            headers=_auth(token),
        )
        assert r.status_code == 403

    def test_officer_can_set_verified_closed(
        self, client, officer_user, restaurant_user, restaurant, db
    ):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Officer close",
            issue_description="...",
            required_action="Done",
            deadline=datetime.utcnow() + timedelta(days=5),
            status=CorrectiveStatus.SUBMITTED,
        )
        db.add(ca)
        db.commit()
        db.refresh(ca)

        token = _login(client, "test_officer@example.com", "OfficerPass123!", role="officer")
        r = client.patch(
            f"/api/risk/corrective-action/{ca.id}/status",
            data={"new_status": "verified_closed"},
            headers=_auth(token),
        )
        assert r.status_code == 200
        assert r.json()["new_status"] == "verified_closed"

    def test_update_ca_invalid_status_returns_400(
        self, client, restaurant_user, restaurant, db
    ):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Invalid",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() + timedelta(days=5),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()
        db.refresh(ca)

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.patch(
            f"/api/risk/corrective-action/{ca.id}/status",
            data={"new_status": "not_a_real_status"},
            headers=_auth(token),
        )
        assert r.status_code == 400

    def test_restaurant_cannot_update_other_restaurant_ca(
        self, client, restaurant_user, restaurant, db
    ):
        # Create a second restaurant owned by a different user
        u2 = User(
            email="other@test.com",
            hashed_password=get_password_hash("Pass2!"),
            full_name="Other",
            role=UserRole.RESTAURANT,
        )
        db.add(u2)
        db.flush()
        r2 = Restaurant(
            owner_id=u2.id, name="Other Kitchen",
            registration_number="OTHER-001",
            license_type="L", category="C",
            address="A", city="C", state="S",
            pincode="000002", contact_phone="+91 00 00",
            contact_email="o@k.com",
        )
        db.add(r2)
        db.flush()
        ca = CorrectiveAction(
            restaurant_id=r2.id,
            issue_title="Other CA",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() + timedelta(days=5),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()
        db.refresh(ca)

        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.patch(
            f"/api/risk/corrective-action/{ca.id}/status",
            data={"new_status": "submitted"},
            headers=_auth(token),
        )
        assert r.status_code == 403


class TestDormantRulesEndpoint:
    def test_dormant_rules_list(self, client, restaurant_user):
        token = _login(client, "test_rest@example.com", "TestPass123!")
        r = client.get("/api/risk/dormant-rules", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()
        assert "dormant_rules" in data
        assert len(data["dormant_rules"]) >= 4
        for rule in data["dormant_rules"]:
            assert "rule_id" in rule
            assert "depends_on" in rule


# ═══════════════════════════════════════════════
# 4. MISSING-EVIDENCE & EDGE-CASE TESTS
# ═══════════════════════════════════════════════

class TestMissingEvidence:
    """Missing data should produce no false-positive findings."""

    def test_restaurant_with_no_records_has_no_findings(
        self, db, restaurant
    ):
        """A brand-new restaurant with no records should generate zero findings."""
        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        assert findings == [], f"Expected no findings, got: {[f.rule_id for f in findings]}"

    def test_no_crash_on_empty_db(self, db):
        """analyse_all_restaurants should not crash on an empty database."""
        from risk_engine import analyse_all_restaurants
        findings = analyse_all_restaurants(db)
        assert isinstance(findings, list)


class TestDuplicatePrevention:
    """Running analysis twice must not double-count findings."""

    def test_repeated_analysis_gives_same_count(self, db, restaurant):
        ca = CorrectiveAction(
            restaurant_id=restaurant.id,
            issue_title="Dup test",
            issue_description="...",
            required_action="Fix",
            deadline=datetime.utcnow() - timedelta(days=2),
            status=CorrectiveStatus.PENDING,
        )
        db.add(ca)
        db.commit()

        from risk_engine import analyse_restaurant
        first = analyse_restaurant(db, restaurant)
        second = analyse_restaurant(db, restaurant)
        assert len(first) == len(second)

    def test_fingerprints_are_unique_in_result(self, db, restaurant):
        doc = ComplianceDocument(
            restaurant_id=restaurant.id,
            document_name="Test",
            document_number="DOC-DEDUP-001",
            category="License",
            issuing_authority="Auth",
            issue_date=datetime.utcnow() - timedelta(days=400),
            expiry_date=datetime.utcnow() - timedelta(days=10),
            validity_status=DocumentValidity.EXPIRED,
        )
        db.add(doc)
        db.commit()

        from risk_engine import analyse_restaurant
        findings = analyse_restaurant(db, restaurant)
        fps = [f.fingerprint for f in findings]
        assert len(fps) == len(set(fps)), f"Duplicate fingerprints: {fps}"
