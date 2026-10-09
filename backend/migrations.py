"""
FoodShield — Database Schema Migration Helper
Safely updates existing SQLite tables with new DemandSense columns and creates new tables idempotently.
"""

from sqlalchemy import inspect, text
from database import engine, Base
import models  # Ensure all models are registered

def run_demandsense_migrations(target_engine=None):
    """
    Checks the active database schema and adds any missing columns or tables
    required by the DemandSense system without wiping existing data.
    """
    db_engine = target_engine or engine
    
    # 1. Create any missing tables (sale_records, incoming_stock, inventory_movements, etc.)
    Base.metadata.create_all(bind=db_engine)
    
    with db_engine.connect() as conn:
        inspector = inspect(db_engine)
        
        # 2. Check and migrate `stock_items` columns
        if inspector.has_table("stock_items"):
            existing_cols = {c["name"] for c in inspector.get_columns("stock_items")}
            
            stock_item_alterations = [
                ("lead_time_days", "REAL DEFAULT 2.0"),
                ("safety_buffer_pct", "REAL DEFAULT 20.0"),
                ("min_order_qty", "REAL DEFAULT 1.0"),
                ("pack_size", "REAL DEFAULT 1.0"),
                ("reserved_quantity", "REAL DEFAULT 0.0"),
                ("density_g_per_ml", "REAL"),
            ]
            for col_name, col_def in stock_item_alterations:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE stock_items ADD COLUMN {col_name} {col_def}"))
        
        # 3. Check and migrate `ingredients` columns
        if inspector.has_table("ingredients"):
            existing_cols = {c["name"] for c in inspector.get_columns("ingredients")}
            if "stock_item_id" not in existing_cols:
                conn.execute(text("ALTER TABLE ingredients ADD COLUMN stock_item_id INTEGER REFERENCES stock_items(id)"))
        
        conn.commit()
    print("DemandSense database schema migrations successfully verified & applied.")

if __name__ == "__main__":
    run_demandsense_migrations()
