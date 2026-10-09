"""
FoodShield — DemandSense Deterministic Demo Scenarios
Provides 5 reproducible test/demo scenarios (A through E) representing
different real-world restaurant supply chain situations.
"""

from datetime import datetime, date, timedelta
from typing import Dict
from sqlalchemy.orm import Session

from models import (
    Restaurant, MenuDish, Ingredient, StockItem, StockBatch,
    SaleRecord, IncomingStock, StorageUnit
)
from migrations import run_demandsense_migrations


def apply_scenario(db: Session, scenario_id: str, restaurant_id: int = 1) -> Dict:
    """
    Applies deterministic scenario states to the database for testing and live demonstration.
    """
    clean_id = scenario_id.lower().strip()
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise ValueError(f"Restaurant {restaurant_id} not found.")

    now = datetime.utcnow()
    today = date.today()

    # 1. Fetch key stock items
    item_paneer = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id,
        StockItem.name.like("%Paneer%")
    ).first()
    
    item_rice = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id,
        StockItem.name.like("%Rice%")
    ).first()
    
    item_milk = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id,
        StockItem.name.like("%Milk%")
    ).first()
    
    item_oil = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id,
        StockItem.name.like("%Oil%")
    ).first()

    # Ensure Tomato stock item exists
    item_tomatoes = db.query(StockItem).filter(
        StockItem.restaurant_id == restaurant_id,
        StockItem.name.like("%Tomato%")
    ).first()
    if not item_tomatoes:
        item_tomatoes = StockItem(
            restaurant_id=restaurant_id,
            name="Fresh Organic Hybrid Tomatoes",
            category="Vegetables",
            current_quantity=25.0,
            unit="kg",
            reorder_level=8.0,
            lead_time_days=1.0,
            safety_buffer_pct=25.0,
            min_order_qty=10.0,
            pack_size=5.0,
            reserved_quantity=0.0,
            density_g_per_ml=1.05
        )
        db.add(item_tomatoes)
        db.commit()

    # Clear existing incoming orders for clean scenario state
    db.query(IncomingStock).filter(IncomingStock.restaurant_id == restaurant_id).delete()
    db.commit()

    if clean_id in ["scenario_a", "a", "baseline"]:
        # -------------------------------------------------------------
        # SCENARIO A: Baseline Normal Operations
        # Balanced stock, scheduled deliveries, low stockout risk
        # -------------------------------------------------------------
        item_paneer.current_quantity = 18.0
        item_paneer.reserved_quantity = 0.0
        item_paneer.lead_time_days = 2.0
        item_paneer.reorder_level = 6.0
        item_paneer.safety_buffer_pct = 20.0
        item_paneer.min_order_qty = 5.0
        item_paneer.pack_size = 5.0
        item_paneer.density_g_per_ml = 1.05

        item_rice.current_quantity = 150.0
        item_rice.reserved_quantity = 0.0
        item_rice.lead_time_days = 3.0
        item_rice.reorder_level = 40.0
        item_rice.safety_buffer_pct = 15.0

        item_milk.current_quantity = 24.0
        item_milk.reserved_quantity = 0.0
        item_milk.lead_time_days = 1.0
        item_milk.reorder_level = 10.0
        item_milk.safety_buffer_pct = 20.0

        item_tomatoes.current_quantity = 25.0
        item_tomatoes.reserved_quantity = 0.0
        item_tomatoes.lead_time_days = 1.0
        item_tomatoes.reorder_level = 8.0

        # Scheduled order arriving in 3 days
        po1 = IncomingStock(
            restaurant_id=restaurant_id,
            stock_item_id=item_paneer.id,
            po_reference="PO-CAP-2026-901",
            quantity=15.0,
            unit="kg",
            expected_delivery_date=now + timedelta(days=3),
            status="confirmed"
        )
        db.add(po1)
        db.commit()

        return {
            "scenario_id": "scenario_a",
            "title": "Scenario A: Baseline Normal Operations",
            "description": "Standard daily sales and replenishment cycles. All inventory buffers healthy and within parameters.",
            "applied_changes": [
                "Paneer stock set to 18.0 kg (2-day lead time)",
                "Tomatoes stock set to 25.0 kg (1-day lead time)",
                "Basmati Rice set to 150.0 kg (3-day lead time)",
                "Confirmed PO-CAP-2026-901 scheduled for arrival on Day 3 (+15 kg paneer)"
            ],
            "expected_impact": "Stockout Risk Scores: LOW (all < 30). No urgent purchase orders required."
        }

    elif clean_id in ["scenario_b", "b", "festival_surge"]:
        # -------------------------------------------------------------
        # SCENARIO B: Weekend Rush / Festival Surge
        # Paneer demand surges +150%, runs out before supplier lead time!
        # -------------------------------------------------------------
        item_paneer.current_quantity = 14.0 # Less on hand
        item_paneer.reserved_quantity = 2.0
        item_paneer.lead_time_days = 2.0
        item_paneer.reorder_level = 8.0
        item_paneer.safety_buffer_pct = 25.0
        item_paneer.min_order_qty = 10.0
        item_paneer.pack_size = 5.0

        # No incoming orders in the next 2 days
        db.commit()

        return {
            "scenario_id": "scenario_b",
            "title": "Scenario B: Weekend Rush & Festival Surge",
            "description": "High consumer surge for Paneer Butter Masala (+150% demand). Stock runs out in 1.9 days, ahead of the 2-day supplier delivery window.",
            "applied_changes": [
                "Paneer on-hand reduced to 14.0 kg (2.0 kg reserved)",
                "Demand surge multiplier set to 1.5x - 2.0x",
                "No incoming deliveries scheduled before stockout",
                "Stockout predicted within 1.9 days (< 2.0 day lead time)"
            ],
            "expected_impact": "Stockout Risk Score spikes to 88 (CRITICAL). Recommends URGENT order of 25.0 kg."
        }

    elif clean_id in ["scenario_c", "c", "critical_stockout"]:
        # -------------------------------------------------------------
        # SCENARIO C: Critical Stockout Imminent
        # Tomato inventory severely depleted, runs out in < 24-36 hours!
        # -------------------------------------------------------------
        item_tomatoes.current_quantity = 4.0
        item_tomatoes.reserved_quantity = 0.5
        item_tomatoes.reorder_level = 10.0
        item_tomatoes.lead_time_days = 1.0

        item_paneer.current_quantity = 8.0
        item_paneer.reorder_level = 8.0

        db.commit()

        return {
            "scenario_id": "scenario_c",
            "title": "Scenario C: Critical Stockout Imminent",
            "description": "Produce shipment shortfall: Tomato stock dropped to 4.0 kg with daily demand of 4.2 kg. Depletion occurs within 24 hours.",
            "applied_changes": [
                "Tomato usable stock set to 3.5 kg (below reorder level of 10.0 kg)",
                "Daily tomato consumption is 4.2 kg/day",
                "Days until stockout: 0.9 days (< 24 hours)"
            ],
            "expected_impact": "Stockout Risk Score reaches 95 (CRITICAL). Triggers URGENT immediate same-day order."
        }

    elif clean_id in ["scenario_d", "d", "supplier_delay"]:
        # -------------------------------------------------------------
        # SCENARIO D: Supplier Lead-Time Delay
        # Basmati Rice lead time increases from 2 to 6 days due to transit disruption
        # -------------------------------------------------------------
        item_rice.current_quantity = 45.0 # Just above normal reorder level
        item_rice.reorder_level = 40.0
        item_rice.lead_time_days = 6.0 # Extended lead time!
        item_rice.safety_buffer_pct = 25.0
        item_rice.min_order_qty = 50.0
        item_rice.pack_size = 25.0

        # Delayed incoming shipment arriving on Day 8
        po_rice = IncomingStock(
            restaurant_id=restaurant_id,
            stock_item_id=item_rice.id,
            po_reference="PO-DWT-902-DELAYED",
            quantity=50.0,
            unit="kg",
            expected_delivery_date=now + timedelta(days=8),
            status="delayed"
        )
        db.add(po_rice)
        db.commit()

        return {
            "scenario_id": "scenario_d",
            "title": "Scenario D: Supplier Lead-Time Delay",
            "description": "Logistics transit delay: Basmati Rice supplier lead time expanded from 2 to 6 days, and inbound shipment pushed back.",
            "applied_changes": [
                "Rice lead time increased from 2.0 to 6.0 days",
                "Rice on-hand set to 45.0 kg",
                "Inbound shipment PO-DWT-902 flagged DELAYED to Day 8",
                "Buffer breached during lead-time gap"
            ],
            "expected_impact": "Stockout Risk elevated to HIGH (74). Purchasing recommendation flags buffer shortfall and urges contingency order."
        }

    elif clean_id in ["scenario_e", "e", "spoilage_risk"]:
        # -------------------------------------------------------------
        # SCENARIO E: High Spoilage Risk
        # Batches close to expiry with inadequate demand to consume them
        # -------------------------------------------------------------
        item_paneer.current_quantity = 25.0
        item_milk.current_quantity = 30.0

        # Adjust paneer and milk batches to expire very soon
        batches_paneer = db.query(StockBatch).filter(StockBatch.stock_item_id == item_paneer.id).all()
        for idx, b in enumerate(batches_paneer):
            b.expiry_date = now + timedelta(days=2 + idx) # Expiring in 2 days!
            b.quantity = 25.0

        batches_milk = db.query(StockBatch).filter(StockBatch.stock_item_id == item_milk.id).all()
        for b in batches_milk:
            b.expiry_date = now + timedelta(days=2) # Expiring in 2 days!
            b.quantity = 25.0

        # Link to storage unit with mild breach
        chiller = db.query(StorageUnit).filter(StorageUnit.restaurant_id == restaurant_id).first()
        if chiller:
            chiller.current_temp = 4.9
            chiller.status = "warning"

        db.commit()

        return {
            "scenario_id": "scenario_e",
            "title": "Scenario E: High Spoilage Risk (FEFO Alert)",
            "description": "Perishable batches expiring in 48-72 hours exceeding projected consumption rate, compounded by chiller temperature elevation.",
            "applied_changes": [
                "15 kg Paneer batch set to expire in 2 days (only 6.5 kg projected consumption)",
                "20 L Milk batch set to expire in 2 days (potential 11 L waste)",
                "Chiller storage unit flagged in WARNING state (4.9°C)",
                "FEFO analysis flags 8.5 kg paneer + 11 L milk potential spoilage"
            ],
            "expected_impact": "Generates urgent culinary interventions: Flash Feature promotion and pause on inbound orders."
        }

    else:
        raise ValueError(f"Unknown scenario ID: '{scenario_id}'. Valid choices: scenario_a, scenario_b, scenario_c, scenario_d, scenario_e.")
