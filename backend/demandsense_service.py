"""
FoodShield — DemandSense Service Engine
Integrates recipe-to-ingredient consumption, stockout risk scoring (0-100),
explainable purchasing recommendations, live recalculations, and FEFO batch expiry.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
import math
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import (
    Restaurant, MenuDish, Ingredient, StockItem, StockBatch,
    SaleRecord, IncomingStock, Supplier, StorageUnit
)
from unit_converter import convert_quantity, are_units_compatible
from forecasting_service import forecast_dish_sales
from temperature_service import predict_spoilage_risk


def get_dish_historical_sales(
    db: Session,
    dish_id: int
) -> List[Tuple[date, int]]:
    """Fetches all past sale records for a dish sorted by date."""
    records = db.query(
        func.date(SaleRecord.sale_date).label("sale_day"),
        func.sum(SaleRecord.quantity_sold).label("total_sold")
    ).filter(
        SaleRecord.dish_id == dish_id
    ).group_by(
        func.date(SaleRecord.sale_date)
    ).all()
    
    result = []
    for r in records:
        dt = datetime.strptime(str(r.sale_day), "%Y-%m-%d").date()
        result.append((dt, int(r.total_sold)))
    return result


def calculate_restaurant_forecasts(
    db: Session,
    restaurant_id: int,
    horizon_days: int = 7,
    demand_multiplier: float = 1.0,
    forecast_start_date: Optional[date] = None
) -> List[Dict]:
    """Generates demand forecasts for all active dishes in the restaurant."""
    dishes = db.query(MenuDish).filter(
        MenuDish.restaurant_id == restaurant_id,
        MenuDish.is_active == True
    ).all()
    
    forecasts = []
    for dish in dishes:
        history = get_dish_historical_sales(db, dish.id)
        fc = forecast_dish_sales(
            dish_id=dish.id,
            dish_name=dish.name,
            category=dish.category,
            historical_sales=history,
            horizon_days=horizon_days,
            demand_multiplier=demand_multiplier,
            forecast_start_date=forecast_start_date
        )
        forecasts.append(fc)
    return forecasts


def calculate_ingredient_demands(
    db: Session,
    restaurant_id: int,
    horizon_days: int = 7,
    demand_multiplier: float = 1.0,
    forecast_start_date: Optional[date] = None
) -> List[Dict]:
    """
    Translates dish sales forecasts into required raw ingredient consumption
    using recipe mappings and unit conversion.
    """
    dish_forecasts = calculate_restaurant_forecasts(
        db, restaurant_id, horizon_days, demand_multiplier, forecast_start_date
    )
    forecast_by_dish_id = {fc["dish_id"]: fc for fc in dish_forecasts}
    
    stock_items = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id
    ).all()
    
    results = []
    
    for item in stock_items:
        # Find all recipe ingredients mapped to this stock item
        # Matching either by foreign key stock_item_id or case-insensitive name match
        matched_ingredients = db.query(Ingredient).join(MenuDish).filter(
            MenuDish.restaurant_id == restaurant_id,
            (Ingredient.stock_item_id == item.id) | (func.lower(Ingredient.name).like(f"%{item.name.lower()}%"))
        ).all()
        
        # Aggregate daily demand across all dishes using this ingredient
        daily_demand_totals: Dict[str, float] = {}
        daily_dow_map: Dict[str, str] = {}
        dishes_breakdown_map: Dict[int, Dict] = {}
        
        total_projected_demand = 0.0
        
        for ing in matched_ingredients:
            dish = ing.dish
            if not dish or not dish.is_active or dish.id not in forecast_by_dish_id:
                continue
            
            dish_fc = forecast_by_dish_id[dish.id]
            dish_points = dish_fc["forecast"]
            
            # Unit conversion: ing.quantity (in ing.unit) per single dish portion -> item.unit
            try:
                converted_qty_per_dish = convert_quantity(
                    quantity=ing.quantity,
                    from_unit=ing.unit,
                    to_unit=item.unit,
                    density_g_per_ml=item.density_g_per_ml,
                    ingredient_name=item.name
                )
            except ValueError:
                # Fallback if conversion fails
                converted_qty_per_dish = ing.quantity
                
            dish_total_qty = sum(p["predicted_quantity"] for p in dish_points)
            dish_ing_consumption = dish_total_qty * converted_qty_per_dish
            
            dishes_breakdown_map[dish.id] = {
                "dish_id": dish.id,
                "dish_name": dish.name,
                "portion_quantity": ing.quantity,
                "portion_unit": ing.unit,
                "total_dish_demand": dish_total_qty,
                "converted_ingredient_demand": round(dish_ing_consumption, 2),
                "stock_unit": item.unit
            }
            
            for pt in dish_points:
                pt_date = pt["date"]
                daily_dow_map[pt_date] = pt["day_of_week"]
                needed_for_day = pt["predicted_quantity"] * converted_qty_per_dish
                daily_demand_totals[pt_date] = daily_demand_totals.get(pt_date, 0.0) + needed_for_day
                total_projected_demand += needed_for_day
                
        # Build daily timeline breakdown
        sorted_dates = sorted(daily_demand_totals.keys())
        cumulative = 0.0
        daily_breakdown = []
        for d_str in sorted_dates:
            d_val = round(daily_demand_totals[d_str], 2)
            cumulative += d_val
            daily_breakdown.append({
                "date": d_str,
                "day_of_week": daily_dow_map.get(d_str, ""),
                "daily_demand": d_val,
                "unit": item.unit,
                "cumulative_demand": round(cumulative, 2)
            })
            
        avg_daily = round(total_projected_demand / max(1, len(sorted_dates)), 2)
        
        results.append({
            "stock_item_id": item.id,
            "ingredient_name": item.name,
            "category": item.category,
            "current_stock": item.current_quantity,
            "unit": item.unit,
            "total_projected_demand": round(total_projected_demand, 2),
            "average_daily_demand": avg_daily,
            "daily_breakdown": daily_breakdown,
            "dishes_breakdown": list(dishes_breakdown_map.values())
        })
        
    return results


def calculate_stockout_risks(
    db: Session,
    restaurant_id: int,
    horizon_days: int = 7,
    demand_multiplier: float = 1.0,
    forecast_start_date: Optional[date] = None
) -> List[Dict]:
    """
    Computes daily projected inventory balance, predicts stockout dates,
    and calculates an explainable 0-100 Stockout Risk Score.
    """
    ingredient_demands = calculate_ingredient_demands(
        db, restaurant_id, horizon_days, demand_multiplier, forecast_start_date
    )
    demand_by_item_id = {d["stock_item_id"]: d for d in ingredient_demands}
    
    stock_items = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id
    ).all()
    
    risk_results = []
    start_dt = forecast_start_date or (date.today() + timedelta(days=1))
    
    for item in stock_items:
        ing_data = demand_by_item_id.get(item.id, {})
        daily_breakdown = ing_data.get("daily_breakdown", [])
        avg_daily_demand = ing_data.get("average_daily_demand", 0.0)
        total_7d_demand = ing_data.get("total_projected_demand", 0.0)
        
        usable_stock = max(0.0, item.current_quantity - (item.reserved_quantity or 0.0))
        lead_time = item.lead_time_days or 2.0
        reorder_lvl = item.reorder_level or 5.0
        safety_buf_pct = item.safety_buffer_pct or 20.0
        
        # Query confirmed incoming purchase orders for this stock item
        incoming_orders = db.query(IncomingStock).filter(
            IncomingStock.stock_item_id == item.id,
            IncomingStock.status.in_(["confirmed", "in_transit"])
        ).all()
        
        # Index deliveries by date string
        incoming_by_date: Dict[str, Tuple[float, List[str]]] = {}
        incoming_total_before_lead_time = 0.0
        
        lead_time_target_date = start_dt + timedelta(days=math.ceil(lead_time))
        
        for inc in incoming_orders:
            inc_dt = inc.expected_delivery_date.date()
            d_key = inc_dt.isoformat()
            
            # Convert incoming unit if needed
            inc_qty = convert_quantity(inc.quantity, inc.unit, item.unit, item.density_g_per_ml, item.name)
            
            curr_qty, curr_pos = incoming_by_date.get(d_key, (0.0, []))
            curr_pos.append(inc.po_reference)
            incoming_by_date[d_key] = (curr_qty + inc_qty, curr_pos)
            
            if inc_dt <= lead_time_target_date:
                incoming_total_before_lead_time += inc_qty

        # Simulate daily projected balance timeline
        projected_timeline = []
        running_balance = usable_stock
        stockout_predicted = False
        stockout_date_str = None
        days_until_stockout = None
        stockout_before_lead_time = False

        effective_breakdown = daily_breakdown
        if not effective_breakdown or len(effective_breakdown) < horizon_days:
            existing_map = {pt["date"]: pt for pt in daily_breakdown}
            filled_breakdown = []
            for d_idx in range(horizon_days):
                target_dt = start_dt + timedelta(days=d_idx)
                d_str = target_dt.isoformat()
                if d_str in existing_map:
                    filled_breakdown.append(existing_map[d_str])
                else:
                    filled_breakdown.append({
                        "date": d_str,
                        "day_of_week": target_dt.strftime("%A"),
                        "daily_demand": 0.0,
                        "unit": item.unit,
                        "cumulative_demand": 0.0
                    })
            effective_breakdown = filled_breakdown
        
        for pt in effective_breakdown:
            d_str = pt["date"]
            dow = pt["day_of_week"]
            consumption = pt["daily_demand"]
            delivery_qty, pos = incoming_by_date.get(d_str, (0.0, []))
            
            starting_bal = running_balance
            ending_bal = starting_bal - consumption + delivery_qty
            
            if not stockout_predicted and (starting_bal - consumption) < 0:
                stockout_predicted = True
                stockout_date_str = d_str
                # Calculate fractional days
                days_passed = len(projected_timeline)
                fraction = round(max(0.0, starting_bal) / max(0.01, consumption), 2)
                days_until_stockout = round(days_passed + fraction, 1)
                
                if days_until_stockout < lead_time:
                    stockout_before_lead_time = True
                    
            projected_timeline.append({
                "date": d_str,
                "day_of_week": dow,
                "starting_balance": round(starting_bal, 2),
                "daily_consumption": round(consumption, 2),
                "incoming_delivery": round(delivery_qty, 2),
                "ending_balance": round(ending_bal, 2),
                "is_negative": ending_bal < 0,
                "delivery_pos": pos
            })
            running_balance = max(0.0, ending_bal)
            
        # -------------------------------------------------------------
        # 0–100 Explainable Stockout Risk Score Formulation
        # -------------------------------------------------------------
        # Factor 1: Lead Time Urgency (0-40 pts)
        pts_lead_time = 0.0
        if stockout_predicted and days_until_stockout is not None:
            if days_until_stockout < lead_time:
                pts_lead_time = 40.0 # Critical breach: stock depletes before new order arrives
            elif days_until_stockout <= (lead_time * 2):
                fraction_safe = (days_until_stockout - lead_time) / lead_time
                pts_lead_time = round(40.0 * (1.0 - fraction_safe), 1)
            else:
                pts_lead_time = 10.0
        elif usable_stock < (avg_daily_demand * lead_time):
            pts_lead_time = 25.0
            
        # Factor 2: Reorder Level Breach (0-25 pts)
        pts_reorder = 0.0
        if usable_stock <= 0:
            pts_reorder = 25.0
        elif usable_stock <= reorder_lvl:
            pts_reorder = 20.0
        elif usable_stock <= (reorder_lvl * 1.5):
            pts_reorder = 12.0
            
        # Factor 3: 7-Day Depletion Ratio (0-25 pts)
        total_available = usable_stock + sum(v[0] for v in incoming_by_date.values())
        depletion_ratio = min(1.0, total_7d_demand / max(0.1, total_available)) if total_available > 0 else 1.0
        pts_depletion = round(25.0 * depletion_ratio, 1)
        
        # Factor 4: Buffer & Demand Multiplier Volatility (0-10 pts)
        pts_volatility = 5.0
        if demand_multiplier > 1.2:
            pts_volatility = 10.0
        elif demand_multiplier > 1.0:
            pts_volatility = 8.0
        elif total_7d_demand == 0:
            pts_volatility = 0.0
            
        total_risk_score = round(min(100.0, pts_lead_time + pts_reorder + pts_depletion + pts_volatility), 1)
        
        # Risk Category classification
        if total_risk_score >= 75.0:
            risk_cat = "CRITICAL"
        elif total_risk_score >= 50.0:
            risk_cat = "HIGH"
        elif total_risk_score >= 25.0:
            risk_cat = "MODERATE"
        else:
            risk_cat = "LOW"
            
        # Narrative warning
        if stockout_before_lead_time:
            narrative = (
                f"CRITICAL DEFICIT: Projected to run out in {days_until_stockout} days, "
                f"which is sooner than supplier lead time ({lead_time} days). "
                f"Immediate expedited order required."
            )
        elif stockout_predicted:
            narrative = (
                f"Stockout projected on {stockout_date_str} (~{days_until_stockout} days). "
                f"Standard purchase order needed within {round(max(0.1, (days_until_stockout or 0) - lead_time), 1)} days."
            )
        elif usable_stock <= reorder_lvl:
            narrative = (
                f"On-hand inventory ({usable_stock} {item.unit}) has breached configured reorder threshold "
                f"({reorder_lvl} {item.unit}). Restock recommended."
            )
        else:
            narrative = f"Inventory levels adequate for projected 7-day demand buffer."

        risk_results.append({
            "stock_item_id": item.id,
            "ingredient_name": item.name,
            "category": item.category,
            "current_stock": item.current_quantity,
            "reserved_stock": item.reserved_quantity or 0.0,
            "usable_stock": usable_stock,
            "unit": item.unit,
            "reorder_level": reorder_lvl,
            "lead_time_days": lead_time,
            "safety_buffer_pct": safety_buf_pct,
            "stockout_risk_score": total_risk_score,
            "risk_category": risk_cat,
            "stockout_predicted": stockout_predicted,
            "days_until_stockout": days_until_stockout,
            "estimated_stockout_date": stockout_date_str,
            "stockout_before_lead_time": stockout_before_lead_time,
            "factor_breakdown": {
                "lead_time_urgency_pts": pts_lead_time,
                "reorder_level_breach_pts": pts_reorder,
                "depletion_ratio_pts": pts_depletion,
                "volatility_surge_pts": pts_volatility
            },
            "projected_timeline": projected_timeline,
            "narrative_warning": narrative
        })
        
    return risk_results


def calculate_purchasing_recommendations(
    db: Session,
    restaurant_id: int,
    horizon_days: int = 7,
    demand_multiplier: float = 1.0,
    forecast_start_date: Optional[date] = None
) -> List[Dict]:
    """
    Computes explainable purchasing recommendations with MOQ, pack size rounding,
    lead-time demand, and safety buffer calculations.
    """
    stockout_risks = calculate_stockout_risks(
        db, restaurant_id, horizon_days, demand_multiplier, forecast_start_date
    )
    risks_by_id = {r["stock_item_id"]: r for r in stockout_risks}
    
    ingredient_demands = calculate_ingredient_demands(
        db, restaurant_id, horizon_days, demand_multiplier, forecast_start_date
    )
    demands_by_id = {d["stock_item_id"]: d for d in ingredient_demands}
    
    stock_items = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id
    ).all()
    
    recommendations = []
    start_dt = forecast_start_date or (date.today() + timedelta(days=1))
    
    for item in stock_items:
        risk = risks_by_id.get(item.id, {})
        demand = demands_by_id.get(item.id, {})
        
        usable_stock = max(0.0, item.current_quantity - (item.reserved_quantity or 0.0))
        lead_time = item.lead_time_days or 2.0
        safety_buf_pct = item.safety_buffer_pct or 20.0
        min_order_qty = item.min_order_qty or 1.0
        pack_size = item.pack_size or 1.0
        avg_daily = demand.get("average_daily_demand", 0.0)
        
        # 1. Lead Time Demand
        lead_time_demand = round(avg_daily * lead_time, 2)
        
        # 2. Safety Buffer Quantity
        safety_buffer_qty = round(lead_time_demand * (safety_buf_pct / 100.0), 2)
        
        # 3. Confirmed incoming orders due before or on lead time date
        lead_time_deadline = start_dt + timedelta(days=math.ceil(lead_time))
        incoming_orders = db.query(IncomingStock).filter(
            IncomingStock.stock_item_id == item.id,
            IncomingStock.status.in_(["confirmed", "in_transit"])
        ).all()
        
        incoming_before_due = 0.0
        for inc in incoming_orders:
            if inc.expected_delivery_date.date() <= lead_time_deadline:
                inc_converted = convert_quantity(inc.quantity, inc.unit, item.unit, item.density_g_per_ml, item.name)
                incoming_before_due += inc_converted
        incoming_before_due = round(incoming_before_due, 2)
        
        # 4. Shortfall formula
        # Required buffer = Lead Time Demand + Safety Buffer
        # Shortfall = max(0, Required Buffer - Usable Stock - Incoming)
        required_buffer = lead_time_demand + safety_buffer_qty
        raw_shortfall = round(max(0.0, required_buffer - usable_stock - incoming_before_due), 2)
        
        # 5. Pack size rounding and MOQ enforcement
        suggested_order_qty = 0.0
        steps = []
        
        steps.append(f"1. Average Daily Demand: {avg_daily} {item.unit}/day over next {horizon_days} days.")
        steps.append(f"2. Lead-Time Demand (LTD): {avg_daily} × {lead_time} days = {lead_time_demand} {item.unit}.")
        steps.append(f"3. Safety Buffer ({safety_buf_pct}%): {lead_time_demand} × {safety_buf_pct/100} = {safety_buffer_qty} {item.unit}.")
        steps.append(f"4. Total Target Buffer: {lead_time_demand} + {safety_buffer_qty} = {round(required_buffer, 2)} {item.unit}.")
        steps.append(f"5. Current Available: {usable_stock} {item.unit} usable on hand + {incoming_before_due} {item.unit} incoming before due date.")
        
        if raw_shortfall > 0:
            steps.append(f"6. Net Shortfall: {round(required_buffer, 2)} - ({usable_stock} + {incoming_before_due}) = {raw_shortfall} {item.unit}.")
            
            # Apply MOQ
            moq_applied = max(raw_shortfall, min_order_qty)
            if moq_applied > raw_shortfall:
                steps.append(f"7. Minimum Order Quantity (MOQ) enforced: {raw_shortfall} → {moq_applied} {item.unit}.")
                
            # Apply Pack Size Rounding
            if pack_size > 0:
                packs_needed = math.ceil(moq_applied / pack_size)
                suggested_order_qty = round(packs_needed * pack_size, 2)
                steps.append(f"8. Pack Size ({pack_size} {item.unit}) rounding: {packs_needed} pack(s) = {suggested_order_qty} {item.unit}.")
            else:
                suggested_order_qty = round(moq_applied, 2)
        else:
            steps.append("6. Net Shortfall: 0.0 (Current usable stock + incoming shipments fully cover target buffer).")
            suggested_order_qty = 0.0
            
        # Urgency classification
        stockout_before_lead = risk.get("stockout_before_lead_time", False)
        days_to_stockout = risk.get("days_until_stockout")
        
        if suggested_order_qty > 0:
            if stockout_before_lead:
                urgency = "URGENT"
                rationale = f"CRITICAL: Stockout occurs in {days_to_stockout} days before supplier lead time ({lead_time} days). Order immediately."
            elif (days_to_stockout is not None and days_to_stockout <= lead_time + 2.0) or usable_stock <= item.reorder_level:
                urgency = "RECOMMENDED"
                rationale = f"Recommended: Inventory approaching critical replenishment threshold. Place order of {suggested_order_qty} {item.unit} today."
            else:
                urgency = "OPTIONAL"
                rationale = f"Optional / Planned: Buffer replenishment for upcoming operating cycle."
        else:
            urgency = "NONE"
            rationale = f"Sufficient Stock: Current on-hand inventory ({usable_stock} {item.unit}) and incoming orders cover demand."
            
        # Primary supplier lookup
        batch = db.query(StockBatch).filter(
            StockBatch.stock_item_id == item.id,
            StockBatch.supplier_id != None
        ).order_by(StockBatch.purchase_date.desc()).first()
        
        sup_dict = None
        if batch and batch.supplier:
            s = batch.supplier
            sup_dict = {
                "supplier_id": s.id,
                "name": s.name,
                "contact_person": s.contact_person,
                "phone": s.phone,
                "rating": s.rating
            }
            
        recommendations.append({
            "stock_item_id": item.id,
            "ingredient_name": item.name,
            "category": item.category,
            "current_usable_stock": usable_stock,
            "unit": item.unit,
            "lead_time_days": lead_time,
            "safety_buffer_pct": safety_buf_pct,
            "lead_time_demand": lead_time_demand,
            "safety_buffer_qty": safety_buffer_qty,
            "incoming_before_lead_time": incoming_before_due,
            "raw_shortfall": raw_shortfall,
            "min_order_qty": min_order_qty,
            "pack_size": pack_size,
            "suggested_order_qty": suggested_order_qty,
            "urgency": urgency,
            "primary_supplier": sup_dict,
            "rationale": rationale,
            "calculation_steps": steps
        })
        
    return recommendations


def recalculate_single_item_recommendation(
    db: Session,
    restaurant_id: int,
    stock_item_id: int,
    custom_lead_time_days: Optional[float] = None,
    custom_safety_buffer_pct: Optional[float] = None,
    demand_multiplier: float = 1.0,
    target_horizon_days: int = 7
) -> Dict:
    """
    Live recalculation of recommendation for an individual stock item with custom user parameters.
    """
    item = db.query(StockItem).filter(
        StockItem.id == stock_item_id,
        StockItem.restaurant_id == restaurant_id
    ).first()
    
    if not item:
        raise ValueError(f"Stock item {stock_item_id} not found for restaurant {restaurant_id}")
        
    # Apply temporary parameter overrides
    effective_lead_time = custom_lead_time_days if custom_lead_time_days is not None else (item.lead_time_days or 2.0)
    effective_safety_pct = custom_safety_buffer_pct if custom_safety_buffer_pct is not None else (item.safety_buffer_pct or 20.0)
    
    # Calculate demand under multiplier
    demands = calculate_ingredient_demands(
        db, restaurant_id, target_horizon_days, demand_multiplier
    )
    demand_data = next((d for d in demands if d["stock_item_id"] == stock_item_id), None)
    avg_daily = demand_data["average_daily_demand"] if demand_data else 0.0
    
    usable_stock = max(0.0, item.current_quantity - (item.reserved_quantity or 0.0))
    min_order_qty = item.min_order_qty or 1.0
    pack_size = item.pack_size or 1.0
    
    lead_time_demand = round(avg_daily * effective_lead_time, 2)
    safety_buffer_qty = round(lead_time_demand * (effective_safety_pct / 100.0), 2)
    required_buffer = lead_time_demand + safety_buffer_qty
    
    # Confirmed incoming
    now_dt = date.today() + timedelta(days=1)
    lead_time_deadline = now_dt + timedelta(days=math.ceil(effective_lead_time))
    incoming_orders = db.query(IncomingStock).filter(
        IncomingStock.stock_item_id == item.id,
        IncomingStock.status.in_(["confirmed", "in_transit"])
    ).all()
    
    incoming_before_due = 0.0
    for inc in incoming_orders:
        if inc.expected_delivery_date.date() <= lead_time_deadline:
            inc_qty = convert_quantity(inc.quantity, inc.unit, item.unit, item.density_g_per_ml, item.name)
            incoming_before_due += inc_qty
    incoming_before_due = round(incoming_before_due, 2)
    
    raw_shortfall = round(max(0.0, required_buffer - usable_stock - incoming_before_due), 2)
    
    steps = [
        f"1. Recalculated with Lead Time = {effective_lead_time} days, Safety Buffer = {effective_safety_pct}%, Demand Multiplier = {demand_multiplier}x.",
        f"2. Average Daily Demand: {avg_daily} {item.unit}/day.",
        f"3. Lead-Time Demand (LTD): {lead_time_demand} {item.unit}.",
        f"4. Safety Buffer: {safety_buffer_qty} {item.unit}.",
        f"5. Required Total: {round(required_buffer, 2)} {item.unit} vs Available: {usable_stock + incoming_before_due} {item.unit}."
    ]
    
    if raw_shortfall > 0:
        moq_applied = max(raw_shortfall, min_order_qty)
        if pack_size > 0:
            packs_needed = math.ceil(moq_applied / pack_size)
            suggested_order_qty = round(packs_needed * pack_size, 2)
        else:
            suggested_order_qty = round(moq_applied, 2)
        steps.append(f"6. Net Shortfall: {raw_shortfall} {item.unit} → Rounded Order: {suggested_order_qty} {item.unit}.")
        urgency = "RECOMMENDED"
    else:
        suggested_order_qty = 0.0
        steps.append("6. Net Shortfall: 0.0 (Stock is sufficient).")
        urgency = "NONE"
        
    return {
        "stock_item_id": item.id,
        "ingredient_name": item.name,
        "category": item.category,
        "current_usable_stock": usable_stock,
        "unit": item.unit,
        "lead_time_days": effective_lead_time,
        "safety_buffer_pct": effective_safety_pct,
        "lead_time_demand": lead_time_demand,
        "safety_buffer_qty": safety_buffer_qty,
        "incoming_before_lead_time": incoming_before_due,
        "raw_shortfall": raw_shortfall,
        "min_order_qty": min_order_qty,
        "pack_size": pack_size,
        "suggested_order_qty": suggested_order_qty,
        "urgency": urgency,
        "primary_supplier": None,
        "rationale": f"Live recalculated recommendation: Order {suggested_order_qty} {item.unit}.",
        "calculation_steps": steps
    }


def evaluate_fefo_expiry_risk(
    db: Session,
    restaurant_id: int,
    horizon_days: int = 14,
    demand_multiplier: float = 1.0
) -> List[Dict]:
    """
    Simulates inventory consumption using First-Expiring-First-Out (FEFO) order.
    Identifies batches that will expire before projected demand can consume them,
    and cross-checks cold-chain storage unit telemetry for accelerated spoilage.
    """
    demands = calculate_ingredient_demands(
        db, restaurant_id, horizon_days, demand_multiplier
    )
    demands_by_id = {d["stock_item_id"]: d for d in demands}
    
    stock_items = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id
    ).all()
    
    expiry_reports = []
    now = datetime.utcnow()
    
    for item in stock_items:
        # Get active batches sorted by earliest expiry date (FEFO)
        batches = db.query(StockBatch).filter(
            StockBatch.stock_item_id == item.id,
            StockBatch.quantity > 0
        ).order_by(StockBatch.expiry_date.asc()).all()
        
        if not batches:
            continue
            
        demand_data = demands_by_id.get(item.id, {})
        daily_breakdown = demand_data.get("daily_breakdown", [])
        
        # Build cumulative demand by day
        # Day 1 -> consumption, Day 2 -> consumption, etc.
        allocations = []
        total_usable = sum(b.quantity for b in batches)
        total_waste = 0.0
        
        # Track simulated consumption pool
        remaining_demand = sum(pt["daily_demand"] for pt in daily_breakdown)
        total_demand_in_period = remaining_demand
        
        mitigation_actions = []
        
        for batch in batches:
            days_until_exp = (batch.expiry_date - now).days
            batch_unit = batch.unit or item.unit
            batch_qty = batch.quantity
            
            # Estimate demand occurring strictly before this batch expires
            demand_before_expiry = 0.0
            for pt in daily_breakdown:
                pt_dt = datetime.strptime(pt["date"], "%Y-%m-%d")
                if pt_dt <= batch.expiry_date:
                    demand_before_expiry += pt["daily_demand"]
                    
            # Check if this batch can be absorbed
            allocated_to_batch = min(batch_qty, demand_before_expiry)
            remaining_unconsumed = round(max(0.0, batch_qty - allocated_to_batch), 2)
            
            # Check cold-chain storage unit for temperature breach
            spoilage_alert = None
            if batch.storage_unit:
                unit = batch.storage_unit
                if unit.status in ["warning", "critical_breach"]:
                    spoilage_alert = {
                        "unit_name": unit.name,
                        "current_temp": unit.current_temp,
                        "status": unit.status,
                        "note": f"Unit {unit.name} is in {unit.status} state. Spoilage risk is accelerated."
                    }
                    
            if days_until_exp <= 0:
                status_label = "expired_on_hand"
                total_waste += batch_qty
                mitigation_actions.append(f"Batch {batch.batch_number} has expired. Segregate immediately to prevent cross-contamination.")
            elif remaining_unconsumed > 0 and days_until_exp <= 4:
                status_label = "expires_with_leftover"
                total_waste += remaining_unconsumed
                mitigation_actions.append(
                    f"Batch {batch.batch_number} ({remaining_unconsumed} {batch_unit} at risk): "
                    f"Expires in {days_until_exp} days. Feature in Chef's Daily Special to accelerate consumption."
                )
            else:
                status_label = "consumed_before_expiry"
                
            allocations.append({
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "storage_unit_name": batch.storage_unit.name if batch.storage_unit else "General Pantry",
                "initial_quantity": batch_qty,
                "allocated_consumption": round(allocated_to_batch, 2),
                "remaining_quantity": remaining_unconsumed,
                "unit": batch_unit,
                "expiry_date": batch.expiry_date.strftime("%Y-%m-%d"),
                "days_until_expiry": max(0, days_until_exp),
                "status": status_label,
                "spoilage_risk_alert": spoilage_alert
            })
            
        summary_msg = (
            f"FEFO analysis: {len(batches)} batches monitored. "
            f"Potential spoilage waste: {round(total_waste, 2)} {item.unit} over {horizon_days}-day horizon."
        )
        
        expiry_reports.append({
            "stock_item_id": item.id,
            "ingredient_name": item.name,
            "category": item.category,
            "batches": allocations,
            "total_usable_stock": round(total_usable, 2),
            "total_demand_in_shelf_life": round(total_demand_in_period, 2),
            "potential_waste_quantity": round(total_waste, 2),
            "unit": item.unit,
            "risk_summary": summary_msg,
            "mitigation_actions": mitigation_actions if mitigation_actions else ["Batch rotation follows optimal FEFO schedule. No immediate spoilage detected."]
        })
        
    return expiry_reports
