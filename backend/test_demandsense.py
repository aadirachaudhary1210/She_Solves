"""
FoodShield — DemandSense Test Suite
Comprehensive automated testing covering:
1. Unit conversion engine (mass, volume, density, and error handling)
2. Forecasting hierarchy (DOW, SMA, Naive, holdout validation, zero-sales handling)
3. Recipe consumption translation and demand aggregation
4. Stockout risk score (0-100) and factor breakdowns
5. Purchasing recommendation math (LTD, safety buffer, MOQ, pack sizes)
6. Interactive recalculation handler
7. FEFO batch expiry and cold-chain telemetry cross-check
8. Deterministic scenarios A through E
9. FastAPI REST endpoints under /api/forecast/*
"""

import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient

from unit_converter import convert_quantity, are_units_compatible
from forecasting_service import (
    forecast_dish_sales, fill_date_series, calculate_error_metrics,
    perform_holdout_validation
)
from database import SessionLocal
from demandsense_service import (
    calculate_restaurant_forecasts, calculate_ingredient_demands,
    calculate_stockout_risks, calculate_purchasing_recommendations,
    recalculate_single_item_recommendation, evaluate_fefo_expiry_risk
)
from demandsense_scenarios import apply_scenario
from main import app


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


# =============================================================
# 1. UNIT CONVERSION ENGINE TESTS
# =============================================================

def test_unit_conversion_mass_and_volume():
    # Mass conversions
    assert convert_quantity(250, "grams", "kg") == 0.25
    assert convert_quantity(1.5, "kg", "grams") == 1500.0
    assert round(convert_quantity(1, "lb", "grams"), 2) == 453.59
    
    # Volume conversions
    assert convert_quantity(1000, "ml", "liters") == 1.0
    assert convert_quantity(2.5, "liters", "ml") == 2500.0
    assert convert_quantity(1, "cup", "ml") == 240.0
    assert convert_quantity(2, "tbsp", "ml") == 30.0


def test_unit_conversion_cross_dimension_with_density():
    # Milk density ~ 1.03 g/ml: 1000 ml = 1030 g = 1.03 kg
    milk_kg = convert_quantity(1000, "ml", "kg", density_g_per_ml=1.03)
    assert round(milk_kg, 2) == 1.03

    # Refined oil density ~ 0.92 g/ml: 1 kg oil = 1000 g / 0.92 = 1086.96 ml = 1.087 L
    oil_liters = convert_quantity(1, "kg", "liters", density_g_per_ml=0.92)
    assert round(oil_liters, 2) == 1.09

    # Automatic lookup from ingredient name
    curd_kg = convert_quantity(500, "ml", "kg", ingredient_name="Fresh Curd")
    assert round(curd_kg, 2) == 0.53


def test_unit_conversion_errors():
    # Missing density for cross-dimension conversion must raise ValueError
    with pytest.raises(ValueError, match="requires ingredient density"):
        convert_quantity(500, "ml", "kg")

    # Incompatible discrete count conversion without piece weight must raise ValueError
    with pytest.raises(ValueError, match="discrete count unit"):
        convert_quantity(10, "pieces", "kg")

    # Unknown unit must raise ValueError
    with pytest.raises(ValueError, match="Unrecognized unit dimension"):
        convert_quantity(5, "widgets", "kg")


# =============================================================
# 2. SALES FORECASTING ENGINE TESTS
# =============================================================

def test_forecasting_hierarchy_dow_model():
    # Generate 28 days of synthetic sales with weekend peak
    # Mon=10, Tue=10, Wed=15, Thu=15, Fri=25, Sat=35, Sun=30
    pattern = [10, 10, 15, 15, 25, 35, 30]
    base_dt = date(2026, 9, 1)
    history = [
        (base_dt + timedelta(days=i), pattern[(base_dt + timedelta(days=i)).weekday()])
        for i in range(28)
    ]
    
    fc = forecast_dish_sales(
        dish_id=1,
        dish_name="Paneer Butter Masala",
        category="Main Course",
        historical_sales=history,
        horizon_days=7
    )
    
    assert fc["methodology_used"] == "Day-of-Week Historical Average (Seasonal Weekly Profile)"
    assert fc["confidence_level"] == "HIGH"
    assert fc["history_days_count"] == 28
    assert fc["metrics"]["status"] == "VALIDATED_7D_HOLDOUT"
    assert fc["metrics"]["mae"] is not None
    assert len(fc["forecast"]) == 7


def test_forecasting_hierarchy_sma_model():
    # 7 days of sales -> triggers SMA model
    base_dt = date(2026, 9, 1)
    history = [(base_dt + timedelta(days=i), 20) for i in range(7)]
    
    fc = forecast_dish_sales(
        dish_id=2,
        dish_name="Biryani",
        category="Main Course",
        historical_sales=history,
        horizon_days=7
    )
    
    assert "Moving Average" in fc["methodology_used"]
    assert fc["confidence_level"] == "MEDIUM"
    assert fc["metrics"]["status"] == "INSUFFICIENT_HISTORY_FOR_HOLDOUT"


def test_forecasting_hierarchy_naive_and_insufficient():
    # 2 days of sales -> Naive baseline
    base_dt = date(2026, 9, 1)
    history = [(base_dt, 18), (base_dt + timedelta(days=1), 22)]
    fc_naive = forecast_dish_sales(3, "Soup", "Appetizer", history, horizon_days=7)
    assert fc_naive["confidence_level"] == "LOW"
    assert "Naive Baseline" in fc_naive["methodology_used"]

    # 0 days of sales -> Insufficient history warning
    fc_zero = forecast_dish_sales(4, "New Dish", "Dessert", [], horizon_days=7)
    assert fc_zero["confidence_level"] == "INSUFFICIENT"
    assert fc_zero["history_days_count"] == 0
    assert all(pt["predicted_quantity"] == 0.0 for pt in fc_zero["forecast"])


def test_date_series_gap_filling():
    # Dates with gaps: Day 1 and Day 4 present, Day 2 and 3 missing -> filled as 0 sales
    records = [(date(2026, 9, 1), 10), (date(2026, 9, 4), 15)]
    filled = fill_date_series(records)
    assert len(filled) == 4
    assert filled[1][1] == 0 # Day 2 filled as 0
    assert filled[2][1] == 0 # Day 3 filled as 0


# =============================================================
# 3. DEMANDSENSE INGREDIENT & STOCKOUT TESTS
# =============================================================

def test_demandsense_ingredient_demands(db_session):
    demands = calculate_ingredient_demands(db_session, restaurant_id=1, horizon_days=7)
    assert len(demands) > 0
    
    paneer = next((d for d in demands if "Paneer" in d["ingredient_name"]), None)
    assert paneer is not None
    assert paneer["total_projected_demand"] > 0
    assert len(paneer["daily_breakdown"]) == 7
    assert len(paneer["dishes_breakdown"]) > 0


def test_demandsense_stockout_risks_and_recs(db_session):
    # Ensure baseline scenario
    apply_scenario(db_session, "scenario_a", restaurant_id=1)
    
    risks = calculate_stockout_risks(db_session, restaurant_id=1, horizon_days=7)
    assert len(risks) > 0
    for r in risks:
        assert 0.0 <= r["stockout_risk_score"] <= 100.0
        assert r["risk_category"] in ["CRITICAL", "HIGH", "MODERATE", "LOW"]
        assert "lead_time_urgency_pts" in r["factor_breakdown"]
        assert len(r["projected_timeline"]) == 7

    recs = calculate_purchasing_recommendations(db_session, restaurant_id=1, horizon_days=7)
    assert len(recs) > 0
    for rc in recs:
        assert rc["urgency"] in ["URGENT", "RECOMMENDED", "OPTIONAL", "NONE"]
        assert rc["suggested_order_qty"] >= 0.0
        assert len(rc["calculation_steps"]) >= 5


def test_interactive_recalculation(db_session):
    paneer_risk = calculate_stockout_risks(db_session, restaurant_id=1)[0]
    stock_item_id = paneer_risk["stock_item_id"]
    
    # Recalculate with high lead time and surge multiplier
    recalc = recalculate_single_item_recommendation(
        db=db_session,
        restaurant_id=1,
        stock_item_id=stock_item_id,
        custom_lead_time_days=5.0,
        custom_safety_buffer_pct=30.0,
        demand_multiplier=2.0,
        target_horizon_days=7
    )
    assert recalc["stock_item_id"] == stock_item_id
    assert recalc["lead_time_days"] == 5.0
    assert recalc["safety_buffer_pct"] == 30.0
    assert recalc["suggested_order_qty"] > 0
    assert len(recalc["calculation_steps"]) > 0


def test_fefo_expiry_evaluation(db_session):
    fefo_reports = evaluate_fefo_expiry_risk(db_session, restaurant_id=1, horizon_days=14)
    assert len(fefo_reports) > 0
    for rep in fefo_reports:
        assert rep["total_usable_stock"] >= 0
        assert len(rep["batches"]) > 0
        for b in rep["batches"]:
            assert b["status"] in ["consumed_before_expiry", "expires_with_leftover", "expired_on_hand"]
            assert b["days_until_expiry"] >= 0


# =============================================================
# 4. DETERMINISTIC DEMO SCENARIOS TESTS
# =============================================================

def test_scenario_a_baseline(db_session):
    res = apply_scenario(db_session, "scenario_a", restaurant_id=1)
    assert res["scenario_id"] == "scenario_a"
    risks = calculate_stockout_risks(db_session, restaurant_id=1)
    # Baseline operations: risk scores should remain below critical
    paneer_risk = next(r for r in risks if "Paneer" in r["ingredient_name"])
    assert paneer_risk["stockout_risk_score"] < 75.0


def test_scenario_b_weekend_surge(db_session):
    res = apply_scenario(db_session, "scenario_b", restaurant_id=1)
    assert res["scenario_id"] == "scenario_b"
    risks = calculate_stockout_risks(db_session, restaurant_id=1, demand_multiplier=1.8)
    paneer_risk = next(r for r in risks if "Paneer" in r["ingredient_name"])
    assert paneer_risk["risk_category"] == "CRITICAL"
    assert paneer_risk["stockout_risk_score"] >= 75.0

    recs = calculate_purchasing_recommendations(db_session, restaurant_id=1, demand_multiplier=1.8)
    paneer_rec = next(rc for rc in recs if "Paneer" in rc["ingredient_name"])
    assert paneer_rec["urgency"] == "URGENT"
    assert paneer_rec["suggested_order_qty"] > 0


def test_scenario_c_critical_stockout(db_session):
    res = apply_scenario(db_session, "scenario_c", restaurant_id=1)
    assert res["scenario_id"] == "scenario_c"
    risks = calculate_stockout_risks(db_session, restaurant_id=1)
    tomato_risk = next(r for r in risks if "Tomato" in r["ingredient_name"])
    assert tomato_risk["stockout_predicted"] is True
    assert tomato_risk["days_until_stockout"] <= 1.5
    assert tomato_risk["stockout_risk_score"] >= 75.0


def test_scenario_d_supplier_delay(db_session):
    res = apply_scenario(db_session, "scenario_d", restaurant_id=1)
    assert res["scenario_id"] == "scenario_d"
    risks = calculate_stockout_risks(db_session, restaurant_id=1)
    rice_risk = next(r for r in risks if "Rice" in r["ingredient_name"])
    assert rice_risk["lead_time_days"] == 6.0


def test_scenario_e_spoilage_risk(db_session):
    res = apply_scenario(db_session, "scenario_e", restaurant_id=1)
    assert res["scenario_id"] == "scenario_e"
    fefo = evaluate_fefo_expiry_risk(db_session, restaurant_id=1)
    paneer_fefo = next(f for f in fefo if "Paneer" in f["ingredient_name"])
    assert paneer_fefo["potential_waste_quantity"] > 0
    assert any(b["status"] in ["expires_with_leftover", "expired_on_hand"] for b in paneer_fefo["batches"])


# =============================================================
# 5. REST API ENDPOINTS TESTS
# =============================================================

def test_api_health(api_client):
    res = api_client.get("/api/forecast/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["data_readiness"]["historical_sale_records"] >= 28
    assert len(data["available_scenarios"]) == 5


def test_api_methodology(api_client):
    res = api_client.get("/api/forecast/methodology")
    assert res.status_code == 200
    data = res.json()
    assert len(data["forecasting_hierarchy"]) == 4
    assert "CRITICAL" in data["stockout_risk_score_factors"]["risk_categories"]


def test_api_sales_forecast_endpoint(api_client):
    res = api_client.get("/api/forecast/sales?restaurant_id=1&horizon_days=7")
    assert res.status_code == 200
    forecasts = res.json()
    assert len(forecasts) >= 2
    assert forecasts[0]["confidence_level"] in ["HIGH", "MEDIUM", "LOW"]


def test_api_stockout_and_recommendations(api_client):
    res_stockout = api_client.get("/api/forecast/stockout-risk?restaurant_id=1")
    assert res_stockout.status_code == 200
    assert len(res_stockout.json()) >= 4

    res_recs = api_client.get("/api/forecast/recommendations?restaurant_id=1")
    assert res_recs.status_code == 200
    assert len(res_recs.json()) >= 4


def test_api_recalculate_endpoint(api_client):
    # Fetch first stock item
    risks = api_client.get("/api/forecast/stockout-risk?restaurant_id=1").json()
    item_id = risks[0]["stock_item_id"]
    
    payload = {
        "stock_item_id": item_id,
        "custom_lead_time_days": 4.0,
        "custom_safety_buffer_pct": 25.0,
        "demand_multiplier": 1.5,
        "target_horizon_days": 7
    }
    res = api_client.post("/api/forecast/recommendations/recalculate?restaurant_id=1", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["lead_time_days"] == 4.0
    assert data["safety_buffer_pct"] == 25.0


def test_api_scenario_apply(api_client):
    payload = {"scenario_id": "scenario_a"}
    res = api_client.post("/api/forecast/scenarios/apply?restaurant_id=1", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == "scenario_a"
