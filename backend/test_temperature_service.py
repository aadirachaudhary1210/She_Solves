"""
Unit and Integration Tests for FoodShield Cold-Chain Telemetry, Spoilage Prediction & Escalation
Tests Challenge 2 business logic independently of external C/Rust binary DLL dependencies.
"""

import sys
import os
from datetime import datetime, timedelta

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from temperature_service import (
    evaluate_temperature,
    calculate_degree_hours_abuse,
    predict_spoilage_risk,
    advance_escalation_lifecycle,
    generate_simulation_stream,
    STORAGE_STANDARDS,
    CATEGORY_SENSITIVITY
)
from compliance_engine import calculate_restaurant_compliance


def test_temperature_evaluation():
    print("Testing evaluate_temperature()...")
    # Test 1: Compliant Walk-in Chiller (0.5 to 4.0 C)
    status, is_breach, narrative = evaluate_temperature(0.5, 4.0, 2.8)
    assert status == "normal", f"Expected normal, got {status}"
    assert is_breach is False
    assert "compliant" in narrative.lower()

    # Test 2: Warning Threshold (near 4.0 C)
    status, is_breach, narrative = evaluate_temperature(0.5, 4.0, 3.8)
    assert status == "warning", f"Expected warning, got {status}"
    assert is_breach is False
    assert "elevated" in narrative.lower()

    # Test 3: Critical Cold Chain Breach
    status, is_breach, narrative = evaluate_temperature(0.5, 4.0, 7.5)
    assert status == "critical_breach", f"Expected critical_breach, got {status}"
    assert is_breach is True
    assert "excursion" in narrative.lower()

    # Test 4: Hot Holding evaluation (<63 C is breach)
    status, is_breach, narrative = evaluate_temperature(63.0, 85.0, 56.0, is_hot_holding=True)
    assert status == "critical_breach"
    assert is_breach is True

    status, is_breach, narrative = evaluate_temperature(63.0, 85.0, 72.0, is_hot_holding=True)
    assert status == "normal"
    assert is_breach is False
    print("  ✓ evaluate_temperature passed all assertions.")


def test_degree_hours_abuse():
    print("Testing calculate_degree_hours_abuse()...")
    now = datetime.utcnow()
    # 3 logs: 2 hours at 6.0 C (safe max = 4.0 C, excursion = 2.0 C)
    logs = [
        {"recorded_at": now - timedelta(hours=2), "temperature": 6.0},
        {"recorded_at": now - timedelta(hours=1), "temperature": 6.0},
        {"recorded_at": now, "temperature": 6.0}
    ]
    # In 2 hours with 2.0 C excursion: Degree-hours = 2.0 * 2.0 = 4.0
    degree_hours = calculate_degree_hours_abuse(logs, max_safe_temp=4.0)
    assert abs(degree_hours - 4.0) < 0.1, f"Expected 4.0 degree-hours, got {degree_hours}"

    # Compliant logs
    safe_logs = [
        {"recorded_at": now - timedelta(hours=2), "temperature": 3.0},
        {"recorded_at": now, "temperature": 3.2}
    ]
    safe_dh = calculate_degree_hours_abuse(safe_logs, max_safe_temp=4.0)
    assert safe_dh == 0.0, f"Expected 0.0 degree hours for safe storage, got {safe_dh}"
    print("  ✓ calculate_degree_hours_abuse passed all assertions.")


def test_predictive_spoilage():
    print("Testing predict_spoilage_risk()...")
    now = datetime.utcnow()
    nominal_expiry = now + timedelta(days=5) # 120 hours

    # Scenario A: Stored at safe temperature (3.0 C)
    result_safe = predict_spoilage_risk(
        batch_number="AML-PAN-2026-B8",
        item_name="Fresh Malai Paneer",
        category="Dairy",
        nominal_expiry=nominal_expiry,
        current_unit_temp=3.0,
        max_safe_temp=4.0,
        cumulative_degree_hours=0.0,
        current_time=now
    )
    assert result_safe["risk_level"] == "Safe"
    assert result_safe["degradation_pct"] == 0.0
    assert result_safe["predicted_safe_hours_remaining"] >= 115.0

    # Scenario B: Stored under severe thermal abuse (8.5 C for 8 degree-hours)
    result_abused = predict_spoilage_risk(
        batch_number="AML-PAN-2026-B8",
        item_name="Fresh Malai Paneer",
        category="Dairy",
        nominal_expiry=nominal_expiry,
        current_unit_temp=8.5,
        max_safe_temp=4.0,
        cumulative_degree_hours=8.0,
        current_time=now
    )
    assert result_abused["degradation_pct"] > 60.0, f"Expected >60% degradation, got {result_abused['degradation_pct']}"
    assert result_abused["predicted_safe_hours_remaining"] < 30.0
    assert result_abused["risk_level"] in ["Warning", "Critical / Unsafe"]
    assert "quarantine" in result_abused["recommended_action"].lower() or "accelerated" in result_abused["recommended_action"].lower()
    print("  ✓ predict_spoilage_risk passed all assertions.")


def test_escalation_lifecycle():
    print("Testing advance_escalation_lifecycle()...")
    now = datetime.utcnow()

    # Case 1: Fresh breach (30 minutes ago, moderate excursion)
    detected_at_30m = now - timedelta(minutes=30)
    lvl, status, notif = advance_escalation_lifecycle(detected_at_30m, breach_temp=5.8, max_safe_temp=4.0, is_acknowledged=False, current_time=now)
    assert lvl == 1, f"Expected Level 1 for 30m unacknowledged, got {lvl}"
    assert status == "level_1_kitchen_alert"

    # Case 2: Intermediate unacknowledged breach (90 minutes ago)
    detected_at_90m = now - timedelta(minutes=90)
    lvl, status, notif = advance_escalation_lifecycle(detected_at_90m, breach_temp=6.2, max_safe_temp=4.0, is_acknowledged=False, current_time=now)
    assert lvl == 2, f"Expected Level 2 for 90m unacknowledged, got {lvl}"
    assert status == "level_2_manager_escalated"

    # Case 3: Prolonged unacknowledged breach (> 3 hours ago)
    detected_at_4h = now - timedelta(hours=4)
    lvl, status, notif = advance_escalation_lifecycle(detected_at_4h, breach_temp=7.0, max_safe_temp=4.0, is_acknowledged=False, current_time=now)
    assert lvl == 3, f"Expected Level 3 for 4h unacknowledged, got {lvl}"
    assert status == "level_3_officer_escalated"

    # Case 4: Acknowledged breach
    lvl, status, notif = advance_escalation_lifecycle(detected_at_4h, breach_temp=7.0, max_safe_temp=4.0, is_acknowledged=True, current_time=now)
    assert lvl == 0
    assert status == "resolved_acknowledged"
    print("  ✓ advance_escalation_lifecycle passed all assertions.")


def test_simulation_stream():
    print("Testing generate_simulation_stream()...")
    stream = generate_simulation_stream("Walk-in Chiller", "walk_in_chiller", scenario="door_ajar", count=8)
    assert len(stream) == 8
    for item in stream:
        assert item["is_simulation"] is True
        assert "[Simulated Hardware Stream" in item["simulation_label"]
    # Check that temperature climbed in door_ajar scenario
    assert stream[-1]["temperature"] > stream[0]["temperature"]
    print("  ✓ generate_simulation_stream passed all assertions.")


def test_compliance_engine_cold_chain_penalty():
    print("Testing calculate_restaurant_compliance() with cold-chain penalties...")
    # Baseline compliant score with 0 cold chain breaches
    res_clean = calculate_restaurant_compliance(
        hygiene_completion_rate=95.0,
        expired_stock_count=0,
        total_stock_count=10,
        valid_docs_count=3,
        total_required_docs=3,
        days_since_pest_control=10,
        pest_control_frequency_days=30,
        certified_staff_ratio=1.0,
        pending_corrective_actions=0,
        overdue_corrective_actions=0,
        active_cold_chain_breaches=0
    )

    # Compliant score with 2 active cold-chain breaches
    res_breach = calculate_restaurant_compliance(
        hygiene_completion_rate=95.0,
        expired_stock_count=0,
        total_stock_count=10,
        valid_docs_count=3,
        total_required_docs=3,
        days_since_pest_control=10,
        pest_control_frequency_days=30,
        certified_staff_ratio=1.0,
        pending_corrective_actions=0,
        overdue_corrective_actions=0,
        active_cold_chain_breaches=2
    )

    diff = res_clean["overall_score"] - res_breach["overall_score"]
    assert diff == 7.0, f"Expected 7.0 score deduction (2 * 3.5), got {diff}"
    assert any("Cold-Chain" in a["title"] for a in res_breach["alerts"]), "Expected Cold-Chain alert in alerts list"
    print("  ✓ calculate_restaurant_compliance cold-chain penalty passed all assertions.")


if __name__ == "__main__":
    print("\n=======================================================")
    print("  FOODSHIELD CHALLENGE 2 — AUTOMATED TEST SUITE")
    print("=======================================================\n")
    test_temperature_evaluation()
    test_degree_hours_abuse()
    test_predictive_spoilage()
    test_escalation_lifecycle()
    test_simulation_stream()
    test_compliance_engine_cold_chain_penalty()
    print("\n=======================================================")
    print("  ALL 6 CHALLENGE 2 TEST SUITES PASSED SUCCESSFULLY!")
    print("=======================================================\n")
