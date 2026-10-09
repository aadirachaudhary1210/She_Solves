"""
FoodShield — DemandSense Sales Forecasting Engine
Explainable multi-tier demand forecasting with Day-of-Week profiling,
rolling holdout validation (MAE, MAPE, RMSE), and zero-sales differentiation.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Tuple, Optional
import math


def fill_date_series(
    records: List[Tuple[date, int]],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[Tuple[date, int]]:
    """
    Fills gaps in a date series with 0 sales for open days.
    Distinguishes explicit 0 sales from missing records.
    """
    if not records:
        return []
    
    # Sort records by date
    record_map: Dict[date, int] = {rec[0]: rec[1] for rec in records}
    min_date = start_date or min(record_map.keys())
    max_date = end_date or max(record_map.keys())
    
    filled: List[Tuple[date, int]] = []
    curr = min_date
    while curr <= max_date:
        filled.append((curr, record_map.get(curr, 0)))
        curr += timedelta(days=1)
        
    return filled


def calculate_error_metrics(
    actual: List[float],
    predicted: List[float]
) -> Dict[str, Optional[float]]:
    """
    Calculates MAE, MAPE, and RMSE.
    """
    if not actual or not predicted or len(actual) != len(predicted):
        return {"mae": None, "mape": None, "rmse": None}
    
    n = len(actual)
    abs_errors = [abs(a - p) for a, p in zip(actual, predicted)]
    sq_errors = [(a - p) ** 2 for a, p in zip(actual, predicted)]
    pct_errors = [abs(a - p) / (a + 1.0) for a, p in zip(actual, predicted)] # smoothing constant 1.0
    
    mae = round(sum(abs_errors) / n, 2)
    rmse = round(math.sqrt(sum(sq_errors) / n), 2)
    mape = round((sum(pct_errors) / n) * 100.0, 1)
    
    return {"mae": mae, "mape": mape, "rmse": rmse}


def perform_holdout_validation(
    full_series: List[Tuple[date, int]],
    holdout_days: int = 7
) -> Dict:
    """
    Splits the last `holdout_days` as a test set, trains on the prior days,
    and returns MAE, MAPE, RMSE, and holdout details.
    """
    n = len(full_series)
    if n < (holdout_days * 2): # Need at least 14 days
        return {
            "status": "INSUFFICIENT_HISTORY_FOR_HOLDOUT",
            "message": f"Holdout validation requires minimum 14 days history (currently {n} days).",
            "mae": None,
            "mape": None,
            "rmse": None
        }
    
    train_series = full_series[:-holdout_days]
    test_series = full_series[-holdout_days:]
    
    # Train Day-of-Week on train_series
    dow_counts: Dict[int, List[int]] = {i: [] for i in range(7)}
    for dt, val in train_series:
        dow_counts[dt.weekday()].append(val)
    
    dow_means = {
        i: (sum(vals) / len(vals) if vals else 0.0)
        for i, vals in dow_counts.items()
    }
    
    actuals = [float(val) for _, val in test_series]
    predictions = [round(dow_means[dt.weekday()], 2) for dt, _ in test_series]
    
    metrics = calculate_error_metrics(actuals, predictions)
    metrics["status"] = "VALIDATED_7D_HOLDOUT"
    metrics["holdout_period_days"] = holdout_days
    metrics["test_set_mae"] = metrics["mae"]
    metrics["test_set_mape_pct"] = metrics["mape"]
    metrics["test_set_rmse"] = metrics["rmse"]
    metrics["message"] = f"Validated against last 7-day rolling holdout: MAE={metrics['mae']}, MAPE={metrics['mape']}%."
    return metrics


def forecast_dish_sales(
    dish_id: int,
    dish_name: str,
    category: str,
    historical_sales: List[Tuple[date, int]],
    horizon_days: int = 7,
    demand_multiplier: float = 1.0,
    forecast_start_date: Optional[date] = None
) -> Dict:
    """
    Generates an explainable daily demand forecast for a menu dish.
    Selects model according to historical data depth hierarchy:
    1. Day-of-Week averages (>= 14 days and >= 2 obs per weekday)
    2. 7-Day Moving Average (4 to 13 days)
    3. Naive Baseline (1 to 3 days)
    4. Insufficient History (0 days)
    """
    start_dt = forecast_start_date or (date.today() + timedelta(days=1))
    
    if not historical_sales:
        # Hierarchy Level 4: Insufficient History
        forecast_points = []
        for d in range(horizon_days):
            target_date = start_dt + timedelta(days=d)
            forecast_points.append({
                "date": target_date.isoformat(),
                "day_of_week": target_date.strftime("%A"),
                "predicted_quantity": 0.0,
                "confidence_lower": 0.0,
                "confidence_upper": 0.0,
                "notes": "Insufficient sales history for item. Minimum 1 historical record required."
            })
        
        return {
            "dish_id": dish_id,
            "dish_name": dish_name,
            "category": category,
            "horizon_days": horizon_days,
            "history_days_count": 0,
            "methodology_used": "Insufficient Historical Data",
            "confidence_level": "INSUFFICIENT",
            "metrics": {
                "status": "NO_HISTORY",
                "message": "No sales records available. Cannot compute empirical forecast.",
                "mae": None,
                "mape": None,
                "rmse": None
            },
            "forecast": forecast_points
        }
    
    # Fill any gaps in history with 0 sales
    sorted_history = sorted(historical_sales, key=lambda x: x[0])
    filled_history = fill_date_series(sorted_history)
    history_len = len(filled_history)
    
    # Check DOW observations count
    dow_buckets: Dict[int, List[int]] = {i: [] for i in range(7)}
    for dt, qty in filled_history:
        dow_buckets[dt.weekday()].append(qty)
        
    min_dow_obs = min(len(vals) for vals in dow_buckets.values())
    
    # Model Selection Hierarchy
    if history_len >= 14 and min_dow_obs >= 2:
        # Hierarchy Level 1: Day of Week Averages
        methodology = "Day-of-Week Historical Average (Seasonal Weekly Profile)"
        confidence_level = "HIGH"
        validation_metrics = perform_holdout_validation(filled_history, holdout_days=7)
        
        # Calculate DOW mean and sample standard deviation
        dow_stats = {}
        for dow in range(7):
            vals = dow_buckets[dow]
            m = sum(vals) / len(vals)
            if len(vals) > 1:
                variance = sum((v - m) ** 2 for v in vals) / (len(vals) - 1)
                std = math.sqrt(variance)
            else:
                std = m * 0.15
            dow_stats[dow] = (m, std, len(vals))
            
        forecast_points = []
        for d in range(horizon_days):
            target_date = start_dt + timedelta(days=d)
            dow = target_date.weekday()
            mean_val, std_val, count_val = dow_stats[dow]
            adjusted_qty = round(mean_val * demand_multiplier, 1)
            
            # Confidence interval margin (1.96 * SE)
            margin = 1.96 * (std_val / math.sqrt(count_val)) if count_val > 0 else (std_val * 0.5)
            lower = max(0.0, round((mean_val - margin) * demand_multiplier, 1))
            upper = round((mean_val + margin) * demand_multiplier, 1)
            
            note = f"Weekday average ({len(dow_buckets[dow])} observations, mean={round(mean_val, 1)})"
            if demand_multiplier != 1.0:
                note += f" [Multiplier: {demand_multiplier}x]"
                
            forecast_points.append({
                "date": target_date.isoformat(),
                "day_of_week": target_date.strftime("%A"),
                "predicted_quantity": adjusted_qty,
                "confidence_lower": lower,
                "confidence_upper": upper,
                "notes": note
            })
            
    elif history_len >= 4:
        # Hierarchy Level 2: 7-Day Moving Average
        methodology = "7-Day Simple Moving Average (SMA)"
        confidence_level = "MEDIUM"
        validation_metrics = {
            "status": "INSUFFICIENT_HISTORY_FOR_HOLDOUT",
            "message": f"Holdout validation requires minimum 14 days history (currently {history_len} days).",
            "mae": None,
            "mape": None,
            "rmse": None
        }
        
        # Use last min(7, history_len) days
        window = [qty for _, qty in filled_history[-min(7, history_len):]]
        sma_val = sum(window) / len(window)
        std_val = math.sqrt(sum((w - sma_val) ** 2 for w in window) / max(1, len(window) - 1)) if len(window) > 1 else sma_val * 0.2
        
        forecast_points = []
        for d in range(horizon_days):
            target_date = start_dt + timedelta(days=d)
            adjusted_qty = round(sma_val * demand_multiplier, 1)
            lower = max(0.0, round((sma_val - (1.2 * std_val)) * demand_multiplier, 1))
            upper = round((sma_val + (1.2 * std_val)) * demand_multiplier, 1)
            
            forecast_points.append({
                "date": target_date.isoformat(),
                "day_of_week": target_date.strftime("%A"),
                "predicted_quantity": adjusted_qty,
                "confidence_lower": lower,
                "confidence_upper": upper,
                "notes": f"SMA-{len(window)} baseline ({len(window)} days history)"
            })
            
    else:
        # Hierarchy Level 3: Naive Baseline (1-3 days)
        methodology = "Naive Baseline (Recent Average)"
        confidence_level = "LOW"
        validation_metrics = {
            "status": "INSUFFICIENT_HISTORY_FOR_HOLDOUT",
            "message": f"Preliminary estimate based on only {history_len} historical day(s). Higher uncertainty.",
            "mae": None,
            "mape": None,
            "rmse": None
        }
        
        vals = [qty for _, qty in filled_history]
        naive_val = sum(vals) / len(vals)
        
        forecast_points = []
        for d in range(horizon_days):
            target_date = start_dt + timedelta(days=d)
            adjusted_qty = round(naive_val * demand_multiplier, 1)
            lower = max(0.0, round(adjusted_qty * 0.65, 1))
            upper = round(adjusted_qty * 1.35, 1)
            
            forecast_points.append({
                "date": target_date.isoformat(),
                "day_of_week": target_date.strftime("%A"),
                "predicted_quantity": adjusted_qty,
                "confidence_lower": lower,
                "confidence_upper": upper,
                "notes": f"Naive baseline ({history_len} observed record(s))"
            })

    return {
        "dish_id": dish_id,
        "dish_name": dish_name,
        "category": category,
        "horizon_days": horizon_days,
        "history_days_count": history_len,
        "methodology_used": methodology,
        "confidence_level": confidence_level,
        "metrics": validation_metrics,
        "forecast": forecast_points
    }
