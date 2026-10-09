# FoodShield — AnnaKavach DemandSense Integration Contract
**Challenge 2: Explainable Demand Forecasting, Stockout Prevention & FEFO Replenishment Engine**

---

## 1. Executive Overview & Architecture

**FoodShield DemandSense** is an explainable decision-support engine embedded directly within the FoodShield platform. It solves the operational challenge of balancing culinary inventory availability against strict food-safety and shelf-life compliance.

```
                           [ Menu Catalog & Recipes ]
                                      │
[ 28-Day Historical Sales ] ──> [ Forecasting Engine ] (DOW / SMA / Naive)
                                      │
                                      ▼
                           [ Daily Dish Forecasts ]
                                      │
                         [ Unit Conversion Engine ] (g/kg, ml/L, density)
                                      │
                                      ▼
                      [ Ingredient Consumption Translation ]
                                      │
                                      ▼
       [ Usable Stock ] + [ Inbound Deliveries ] ──> [ Daily Projected Balance ]
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
         [ 0–100 Stockout Risk ]          [ FEFO Batch Expiry Radar ]
         (Urgency, Breach, Ratio)           (Shelf-life vs Demand)
                     │                                 │
                     ▼                                 ▼
       [ Purchasing Recommendations ]     [ Cold-Chain Telemetry Link ]
       (MOQ, Pack Size, Rationale)         (Walk-in Chiller Breaches)
```

DemandSense operates under strict safety and regulatory principles:
- **Decision Support, Not Black-Box Autonomy:** No opaque automated purchase orders are placed without human managerial authorization and step-by-step mathematical proofs.
- **Empirical Validation:** Forecasts are empirically checked using rolling holdout validation (MAE, MAPE, RMSE) rather than fabricated accuracy metrics.
- **Dimensional Safety:** Continuous dimensional analysis prevents unit mismatch errors (e.g. converting milliliters to kilograms using ingredient density).
- **Food-Safety Traceability Interlock:** Perishable ingredients are tracked using First-Expiring-First-Out (FEFO) allocation and cross-referenced with active storage unit temperatures.

---

## 2. Relational Database Schema & Data Models

All models extend SQLAlchemy ORM `Base` in `backend/models.py` and are migrated non-destructively via `backend/migrations.py`.

### 2.1 `StockItem` Extensions
```python
lead_time_days = Column(Float, default=2.0)       # Supplier delivery window in days
safety_buffer_pct = Column(Float, default=20.0)   # Safety buffer percentage (e.g. 20.0 for 20%)
min_order_qty = Column(Float, default=1.0)       # Minimum Order Quantity (MOQ)
pack_size = Column(Float, default=1.0)           # Wholesale packaging increment
reserved_quantity = Column(Float, default=0.0)   # Stock held for pending prep/catering
density_g_per_ml = Column(Float, nullable=True)  # Physical density for cross-dimension conversion
```

### 2.2 `Ingredient` Recipe Link
```python
stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=True)
stock_item = relationship("StockItem", back_populates="recipe_ingredients")
```

### 2.3 `SaleRecord` (Historical & Recorded Sales)
```python
class SaleRecord(Base):
    __tablename__ = "sale_records"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    dish_id = Column(Integer, ForeignKey("menu_dishes.id"), nullable=False)
    sale_date = Column(DateTime, nullable=False, index=True)
    quantity_sold = Column(Integer, nullable=False, default=0)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_revenue = Column(Float, nullable=False, default=0.0)
    channel = Column(String(50), default="dine_in") # dine_in, delivery, takeaway
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 2.4 `IncomingStock` (Confirmed Purchase Orders in Transit)
```python
class IncomingStock(Base):
    __tablename__ = "incoming_stock"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    po_reference = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), default="kg")
    expected_delivery_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), default="confirmed") # confirmed, in_transit, delayed, delivered
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 2.5 `InventoryMovement` (Traceability Ledger)
```python
class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=False)
    movement_type = Column(String(50), nullable=False) # sale_consumption, wastage, adjustment
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    reference_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
```

---

## 3. Unit Conversion Engine (`backend/unit_converter.py`)

### 3.1 Supported Dimensions
- **Mass:** grams (`g`), kilograms (`kg`), milligrams (`mg`), ounces (`oz`), pounds (`lb`).
- **Volume:** milliliters (`ml`), liters (`l`), cups (`cup`), tablespoons (`tbsp`), teaspoons (`tsp`).
- **Discrete Count:** pieces (`pcs`), units (`unit`), packs (`pack`).

### 3.2 Conversion Rules & Physical Density
- Intra-dimensional conversions (e.g. grams to kilograms, milliliters to liters) scale deterministically using standard multipliers.
- Cross-dimensional conversions (mass $\leftrightarrow$ volume) require physical density $\rho$ in g/ml:
  $$\text{grams} = \text{milliliters} \times \rho$$
  $$\text{milliliters} = \frac{\text{grams}}{\rho}$$
- Default culinary density fallbacks:
  - Milk / Dairy liquids: 1.03 g/ml
  - Vegetable / Refined cooking oil: 0.92 g/ml
  - Water / Broth: 1.00 g/ml
  - Heavy cream: 1.01 g/ml
  - Honey: 1.42 g/ml
  - Curd / Yogurt: 1.06 g/ml
  - Tomato puree / Gravy: 1.05 g/ml
- Discrete count to mass conversions without a defined piece-weight factor raise an explicit `ValueError`.

---

## 4. Multi-Tier Forecasting Hierarchy (`backend/forecasting_service.py`)

DemandSense implements an explainable model selection hierarchy based on historical data depth:

| Tier | Model | Eligibility Condition | Formula | Confidence Level | Validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Day-of-Week (DOW)** | $\ge 14$ days history AND $\ge 2$ obs/weekday | $\hat{y}_{\text{dow}} = \frac{1}{N_{\text{dow}}} \sum y_{\text{dow}}$ | **HIGH** | 7-day rolling holdout validation (MAE, MAPE, RMSE) |
| **2** | **Simple Moving Avg (SMA-7)** | 4 to 13 days history | $\hat{y} = \frac{1}{k} \sum_{i=1}^k y_{t-i}$ | **MEDIUM** | Preliminary rolling window |
| **3** | **Naive Baseline** | 1 to 3 days history | $\hat{y} = \frac{1}{n} \sum y_i$ | **LOW** | Wide uncertainty bounds ($\pm 35\%$) |
| **4** | **Insufficient History** | 0 days history | $\hat{y} = 0.0$ | **INSUFFICIENT** | Warning banner; no fabricated estimates |

### Zero-Sales vs Missing Days
Continuous date filling differentiates true zero-sales operating days from unrecorded days, preventing downward bias in moving averages.

---

## 5. Recipe Consumption Translation & Stockout Risk (`backend/demandsense_service.py`)

### 5.1 Recipe-to-Ingredient Consumption
For each day $t$ in horizon $H$ and stock item $i$:
$$D_{i, t} = \sum_{d \in \text{Dishes}} \hat{y}_{d, t} \times \text{convert}(\text{recipe\_qty}_{d, i}, \text{unit}_{\text{recipe}}, \text{unit}_{\text{stock}}, \rho_i)$$

### 5.2 Daily Projected Balance Timeline
Starting with Usable Stock $Q_{\text{usable}} = \max(0, Q_{\text{on\_hand}} - Q_{\text{reserved}})$:
$$B_{i, t} = B_{i, t-1} - D_{i, t} + I_{i, t}$$
where $I_{i, t}$ represents confirmed incoming purchase orders due on date $t$.

### 5.3 0–100 Explainable Stockout Risk Score
$$\text{Score} = \min(100.0, F_{\text{lead\_time}} + F_{\text{reorder}} + F_{\text{depletion}} + F_{\text{volatility}})$$

1. **Lead-Time Urgency ($F_{\text{lead\_time}}$, 0–40 pts):**
   - 40 pts if stockout date occurs before supplier lead time ($t_{\text{stockout}} < \text{lead\_time}$).
   - Graduated penalty ($40 \times [1 - \frac{t_{\text{stockout}} - \text{lead\_time}}{\text{lead\_time}}]$) if stockout occurs between lead time and $2 \times$ lead time.
2. **Reorder Threshold Breach ($F_{\text{reorder}}$, 0–25 pts):**
   - 25 pts if stockout already breached on hand ($Q_{\text{usable}} \le 0$).
   - 20 pts if $Q_{\text{usable}} \le \text{reorder\_level}$.
   - 12 pts if $Q_{\text{usable}} \le 1.5 \times \text{reorder\_level}$.
3. **7-Day Depletion Ratio ($F_{\text{depletion}}$, 0–25 pts):**
   - $25 \times \min(1.0, \frac{\text{Total 7-day Demand}}{Q_{\text{usable}} + \sum I})$.
4. **Surge & Volatility Multiplier ($F_{\text{volatility}}$, 0–10 pts):**
   - Accounts for active festival or weekend demand sensitivity multipliers.

**Risk Classification:**
- **CRITICAL (75.0 – 100.0):** Immediate stockout imminent before or at supplier lead time. Expedited order required.
- **HIGH (50.0 – 74.9):** Depletion anticipated within operating cycle. Standard order needed.
- **MODERATE (25.0 – 49.9):** Approaching reorder boundary.
- **LOW (0.0 – 24.9):** Inventories healthy; adequate buffer.

---

## 6. Purchasing Recommendation Formula

$$\text{Lead-Time Demand (LTD)} = \text{Average Daily Demand} \times \text{lead\_time\_days}$$
$$\text{Safety Buffer (SB)} = \text{LTD} \times \frac{\text{safety\_buffer\_pct}}{100}$$
$$\text{Net Shortfall} = \max(0, \text{LTD} + \text{SB} - Q_{\text{usable}} - I_{\text{due\_before\_lead\_time}})$$

When Net Shortfall $> 0$:
1. Apply Minimum Order Quantity (MOQ): $O_1 = \max(\text{Net Shortfall}, \text{min\_order\_qty})$
2. Ceiling Round to Pack Size: $\text{Suggested Order} = \lceil \frac{O_1}{\text{pack\_size}} \rceil \times \text{pack\_size}$

---

## 7. FEFO Batch Expiry & Cold-Chain Telemetry Integration

Perishable batches are ordered by earliest expiry date ($\text{FEFO}$). Projected daily consumption is allocated chronologically against batches.

- If a batch has unconsumed leftovers upon reaching its expiration date:
  $$\text{Potential Waste} = \max(0, \text{Initial Quantity} - \text{Allocated Consumption Before Expiry})$$
  - Flagged as `expires_with_leftover` or `expired_on_hand`.
- **Cold-Chain Interlock:** If the linked storage unit is in `warning` or `critical_breach` state (via `temperature_service.py`), DemandSense elevates the spoilage risk and issues immediate culinary intervention alerts (e.g. "Run Chef Special feature to deplete 8.5 kg before expiry in 48 hours").

---

## 8. Deterministic Demo Scenarios

| Scenario ID | Name | Situation | Key Indicator | Expected Output |
| :--- | :--- | :--- | :--- | :--- |
| `scenario_a` | **Baseline Normal** | Healthy inventory buffers and scheduled inbound shipments | All stocks above reorder level | Risk scores LOW (< 30); no urgent orders |
| `scenario_b` | **Weekend Rush** | Paneer Butter Masala surge (+150% demand) | 14.0 kg usable on hand, 2-day lead time | Paneer stockout in 1.9 days; Risk = 88 (CRITICAL); URGENT order 25 kg |
| `scenario_c` | **Critical Stockout** | Tomatoes dropped to 4.0 kg on hand with 0 incoming | Consumption is 4.2 kg/day | Stockout in < 24h; Risk = 95 (CRITICAL); URGENT same-day order |
| `scenario_d` | **Supplier Delay** | Basmati Rice lead time increases from 2 to 6 days | Transit disruption | Buffer breached during delay; Risk = 74 (HIGH); contingency order |
| `scenario_e` | **High Spoilage Risk** | Fresh Paneer & Milk expiring in 48h exceeding demand | 25 kg paneer expiring in 2 days | FEFO flags 9.55 kg potential waste; culinary special promotion |

---

## 9. REST API Contract (`/api/forecast/*`)

| Endpoint | Method | Parameters | Response Payload |
| :--- | :--- | :--- | :--- |
| `/api/forecast/history` | `GET` | `restaurant_id`, `dish_id`, `days=28` | List of historical daily sales records |
| `/api/forecast/sales` | `GET` | `restaurant_id`, `dish_id`, `horizon_days=7`, `multiplier=1.0` | Dish sales forecasts, DOW points, holdout MAE |
| `/api/forecast/ingredients` | `GET` | `restaurant_id`, `horizon_days=7`, `multiplier=1.0` | Ingredient demands, dish consumption breakdown |
| `/api/forecast/stockout-risk` | `GET` | `restaurant_id`, `horizon_days=7`, `multiplier=1.0` | 0–100 scores, factor breakdowns, projected timeline |
| `/api/forecast/recommendations` | `GET` | `restaurant_id`, `horizon_days=7`, `multiplier=1.0` | Suggested order quantities, MOQ, pack sizes, rationale |
| `/api/forecast/recommendations/recalculate` | `POST` | Body: `RecommendationRecalculateRequest` | Recalculated recommendation with custom parameters |
| `/api/forecast/expiry-risk` | `GET` | `restaurant_id`, `horizon_days=14`, `multiplier=1.0` | FEFO batch allocations, waste volumes, storage health |
| `/api/forecast/methodology` | `GET` | None | Algorithmic formulas, scoring rules, transparency specs |
| `/api/forecast/health` | `GET` | None | Engine status, table counts, active demo scenarios |
| `/api/forecast/scenarios/apply` | `POST` | Body: `ScenarioApplyRequest` | Applies scenario state (A through E) |

---

## 10. Verification & Test Results

```
test_demandsense.py::test_unit_conversion_mass_and_volume PASSED
test_demandsense.py::test_unit_conversion_cross_dimension_with_density PASSED
test_demandsense.py::test_unit_conversion_errors PASSED
test_demandsense.py::test_forecasting_hierarchy_dow_model PASSED
test_demandsense.py::test_forecasting_hierarchy_sma_model PASSED
test_demandsense.py::test_forecasting_hierarchy_naive_and_insufficient PASSED
test_demandsense.py::test_date_series_gap_filling PASSED
test_demandsense.py::test_demandsense_ingredient_demands PASSED
test_demandsense.py::test_demandsense_stockout_risks_and_recs PASSED
test_demandsense.py::test_interactive_recalculation PASSED
test_demandsense.py::test_fefo_expiry_evaluation PASSED
test_demandsense.py::test_scenario_a_baseline PASSED
test_demandsense.py::test_scenario_b_weekend_surge PASSED
test_demandsense.py::test_scenario_c_critical_stockout PASSED
test_demandsense.py::test_scenario_d_supplier_delay PASSED
test_demandsense.py::test_scenario_e_spoilage_risk PASSED
test_demandsense.py::test_api_health PASSED
test_demandsense.py::test_api_methodology PASSED
test_demandsense.py::test_api_sales_forecast_endpoint PASSED
test_demandsense.py::test_api_stockout_and_recommendations PASSED
test_demandsense.py::test_api_recalculate_endpoint PASSED
test_demandsense.py::test_api_scenario_apply PASSED
test_temperature_service.py::test_temperature_evaluation PASSED
test_temperature_service.py::test_degree_hours_abuse PASSED
test_temperature_service.py::test_predictive_spoilage PASSED
test_temperature_service.py::test_escalation_lifecycle PASSED
test_temperature_service.py::test_simulation_stream PASSED
test_temperature_service.py::test_compliance_engine_cold_chain_penalty PASSED

Result: 28 passed in 1.38s (100% Passing Rate)
```
