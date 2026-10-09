"""
FoodShield - Pydantic Request & Response Schemas
Provides strict validation, serialization, and type checking for all API payloads.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "restaurant" # "restaurant" or "officer"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    restaurant_id: Optional[int] = None
    officer_id: Optional[int] = None

class SecurityPinVerify(BaseModel):
    pin: str
    purpose: str = "access_protected_module" # "staff_records" or "secure_documents"

class SecurityPinResponse(BaseModel):
    authenticated: bool
    temp_unlock_token: str
    expires_in_minutes: int = 15

# ----------------- Menu & Traceability Schemas -----------------
class IngredientCreate(BaseModel):
    name: str
    quantity: float
    unit: str = "grams"
    is_packaged: bool = False
    brand_name: Optional[str] = None
    supplier_name: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None

class MenuDishCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    selling_price: float
    allergens: Optional[str] = None
    image_url: Optional[str] = None
    ingredients: List[IngredientCreate] = []

class TraceabilityNode(BaseModel):
    dish: str
    ingredients: List[dict]

# ----------------- Stock & Evidence Schemas -----------------
class StockItemCreate(BaseModel):
    name: str
    category: str
    current_quantity: float = 0.0
    unit: str = "kg"
    reorder_level: float = 5.0

class StockBatchCreate(BaseModel):
    stock_item_name: str
    category: str
    quantity: float
    unit: str = "kg"
    purchase_price: float
    purchase_date: datetime
    expiry_date: datetime
    batch_number: str
    supplier_name: str
    supplier_phone: str
    supplier_address: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

class EvidenceVerificationResult(BaseModel):
    status: str # "verified", "requires_review", "rejected"
    confidence_score: float
    reasons: List[str]
    metadata_extracted: dict
    recommended_action: str

# ----------------- Hygiene & Cleaning Schemas -----------------
class CleaningLogSubmit(BaseModel):
    task_id: int
    shift: str = "morning"
    status: str = "completed" # completed, not_completed, needs_attention
    notes: Optional[str] = None
    photo_evidence_url: Optional[str] = None

class CleaningAgencyCreate(BaseModel):
    agency_name: str
    contact_number: str
    address: Optional[str] = None
    service_type: str
    service_date: datetime
    service_frequency: str = "Monthly"
    upi_reference: Optional[str] = None
    remarks: Optional[str] = None

# ----------------- Pest Control Schemas -----------------
class PestControlCreate(BaseModel):
    agency_name: str
    agency_contact: str
    agency_address: Optional[str] = None
    service_date: datetime
    next_service_date: datetime
    treatment_type: str
    areas_treated: str
    chemicals_used: str
    technician_name: str
    remarks: Optional[str] = None

# ----------------- Staff & Training Schemas -----------------
class EmployeeCreate(BaseModel):
    full_name: str
    phone: str
    address: Optional[str] = None
    date_of_joining: datetime
    designation: str
    department: str = "Kitchen Operations"
    previous_workplace: Optional[str] = None
    total_experience_years: float = 0.0
    government_id_number: str # Raw input will be masked automatically before saving
    pan_number: Optional[str] = None
    medical_fitness_status: str = "Certified Fit"
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class StaffTrainingCreate(BaseModel):
    employee_id: int
    training_name: str
    provider: str
    training_date: datetime
    certificate_expiry: datetime

# ----------------- Compliance Document Schemas -----------------
class ComplianceDocumentCreate(BaseModel):
    category: str
    document_name: str
    document_number: str
    issuing_authority: str
    issue_date: datetime
    expiry_date: datetime
    notes: Optional[str] = None
    is_sensitive: bool = True

# ----------------- Inspection & Corrective Action Schemas -----------------
class ViolationCreate(BaseModel):
    category: str
    severity: str = "Minor" # Minor, Moderate, Major, Critical
    description: str
    reference_code: str = "FSSAI-REG-2024"

class InspectionCreate(BaseModel):
    restaurant_id: int
    inspection_type: str = "Routine Annual Audit"
    score: float = 90.0
    status: str = "passed"
    findings: str
    remarks: Optional[str] = None
    violations: List[ViolationCreate] = []

class CorrectiveActionCreate(BaseModel):
    restaurant_id: int
    inspection_id: Optional[int] = None
    issue_title: str
    issue_description: str
    required_action: str
    deadline: datetime

class CorrectiveActionResponseSubmit(BaseModel):
    restaurant_response: str
    evidence_url: Optional[str] = None

class CorrectiveActionOfficerReview(BaseModel):
    status: str # "verified_closed" or "pending"
    officer_feedback: str

# ----------------- Officer Review Queue Schemas -----------------
class OfficerEvidenceReview(BaseModel):
    evidence_id: int
    evidence_type: str # "stock" or "cleaning"
    decision: str # "verified" or "rejected"
    reviewer_notes: str

# ----------------- Dynamic Compliance Score Response -----------------
class ComplianceBreakdown(BaseModel):
    overall_score: float
    grade: str # "Excellent", "Good", "Needs Attention", "Non-Compliant"
    status_label: str # 🟢 Compliant, 🟡 Attention Required, 🔴 Action Required
    hygiene_score: float
    stock_traceability_score: float
    document_validity_score: float
    pest_control_score: float
    staff_training_score: float
    corrective_actions_penalty: float
    pending_actions_count: int
    expiring_docs_count: int
    missed_checklists_count: int

# ----------------- Cold-Chain Telemetry & Storage Schemas (Challenge 2) -----------------
class StorageUnitCreate(BaseModel):
    name: str = Field(..., description="e.g. Walk-in Dairy & Cold Chiller #1")
    unit_type: str = Field(..., description="walk_in_chiller, deep_freezer, prep_refrigerator, display_counter, hot_holding")
    location_area: Optional[str] = "Main Kitchen Storage"
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    target_temp: Optional[float] = None

class StorageUnitResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    unit_type: str
    location_area: str
    min_temp: float
    max_temp: float
    target_temp: float
    current_temp: float
    current_humidity: float
    status: str
    last_ping: str
    active_breaches_count: int = 0
    linked_batches_count: int = 0

class TelemetryLogCreate(BaseModel):
    unit_id: int
    temperature: float
    humidity: Optional[float] = 70.0
    sensor_battery_pct: Optional[float] = 100.0
    recorded_at: Optional[datetime] = None
    is_simulation: bool = False

class TelemetryLogResponse(BaseModel):
    id: int
    unit_id: int
    temperature: float
    humidity: Optional[float]
    sensor_battery_pct: float
    recorded_at: str
    is_breach: bool
    is_simulation: bool

class TemperatureAlertResponse(BaseModel):
    id: int
    unit_id: int
    unit_name: str
    restaurant_id: int
    breach_temp: float
    threshold_temp: float
    severity: str
    escalation_level: int
    status: str
    narrative: Optional[str]
    detected_at: str
    acknowledged_at: Optional[str] = None
    acknowledged_by: Optional[str] = None
    corrective_action_notes: Optional[str] = None

class AlertAcknowledgeRequest(BaseModel):
    action_notes: str = Field(..., min_length=5, description="Action taken by kitchen/manager staff to rectify breach")
    actor_name: Optional[str] = None

class SpoilageBatchPrediction(BaseModel):
    batch_id: int
    batch_number: str
    item_name: str
    category: str
    current_unit_name: str
    current_temp: float
    max_safe_temp: float
    nominal_expiry: str
    cumulative_degree_hours: float
    degradation_pct: float
    predicted_safe_hours_remaining: float
    risk_level: str
    badge_class: str
    recommended_action: str

class SimulationTriggerRequest(BaseModel):
    unit_id: int
    scenario: str = Field("door_ajar", description="normal, door_ajar, compressor_failure, restoration")
    readings_count: int = Field(6, ge=1, le=24)

# ----------------- DemandSense (AnnaKavach Challenge 2) Schemas -----------------
class SaleRecordCreate(BaseModel):
    dish_id: int
    sale_date: datetime
    quantity_sold: int
    unit_price: float
    total_revenue: Optional[float] = None
    channel: Optional[str] = "dine_in"

class SaleRecordResponse(BaseModel):
    id: int
    dish_id: int
    dish_name: str
    sale_date: str
    quantity_sold: int
    unit_price: float
    total_revenue: float
    channel: str

class IncomingStockCreate(BaseModel):
    stock_item_id: int
    supplier_id: Optional[int] = None
    po_reference: str
    quantity: float
    unit: str = "kg"
    expected_delivery_date: datetime
    status: Optional[str] = "confirmed"

class IncomingStockResponse(BaseModel):
    id: int
    stock_item_id: int
    item_name: str
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    po_reference: str
    quantity: float
    unit: str
    expected_delivery_date: str
    status: str

class DailyForecastPoint(BaseModel):
    date: str
    day_of_week: str
    predicted_quantity: float
    confidence_lower: float
    confidence_upper: float
    notes: Optional[str] = None

class DishForecastResponse(BaseModel):
    dish_id: int
    dish_name: str
    category: str
    horizon_days: int
    history_days_count: int
    methodology_used: str
    confidence_level: str
    metrics: dict
    forecast: List[DailyForecastPoint]

class IngredientDemandBreakdownDish(BaseModel):
    dish_id: int
    dish_name: str
    portion_quantity: float
    portion_unit: str
    total_dish_demand: float
    converted_ingredient_demand: float
    stock_unit: str

class DailyIngredientDemandPoint(BaseModel):
    date: str
    day_of_week: str
    daily_demand: float
    unit: str
    cumulative_demand: float

class IngredientDemandResponse(BaseModel):
    stock_item_id: int
    ingredient_name: str
    category: str
    current_stock: float
    unit: str
    total_projected_demand: float
    average_daily_demand: float
    daily_breakdown: List[DailyIngredientDemandPoint]
    dishes_breakdown: List[IngredientDemandBreakdownDish]

class DailyProjectedBalance(BaseModel):
    date: str
    day_of_week: str
    starting_balance: float
    daily_consumption: float
    incoming_delivery: float
    ending_balance: float
    is_negative: bool
    delivery_pos: List[str] = []

class StockoutRiskResponse(BaseModel):
    stock_item_id: int
    ingredient_name: str
    category: str
    current_stock: float
    reserved_stock: float
    usable_stock: float
    unit: str
    reorder_level: float
    lead_time_days: float
    safety_buffer_pct: float
    stockout_risk_score: float
    risk_category: str
    stockout_predicted: bool
    days_until_stockout: Optional[float] = None
    estimated_stockout_date: Optional[str] = None
    stockout_before_lead_time: bool
    factor_breakdown: dict
    projected_timeline: List[DailyProjectedBalance]
    narrative_warning: str

class PurchasingRecommendationResponse(BaseModel):
    stock_item_id: int
    ingredient_name: str
    category: str
    current_usable_stock: float
    unit: str
    lead_time_days: float
    safety_buffer_pct: float
    lead_time_demand: float
    safety_buffer_qty: float
    incoming_before_lead_time: float
    raw_shortfall: float
    min_order_qty: float
    pack_size: float
    suggested_order_qty: float
    urgency: str
    primary_supplier: Optional[dict] = None
    rationale: str
    calculation_steps: List[str]

class RecommendationRecalculateRequest(BaseModel):
    stock_item_id: int
    custom_lead_time_days: Optional[float] = None
    custom_safety_buffer_pct: Optional[float] = None
    demand_multiplier: Optional[float] = 1.0
    target_horizon_days: Optional[int] = 7

class BatchExpiryDemandAllocation(BaseModel):
    batch_id: int
    batch_number: str
    storage_unit_name: Optional[str] = None
    initial_quantity: float
    allocated_consumption: float
    remaining_quantity: float
    unit: str
    expiry_date: str
    days_until_expiry: int
    status: str
    spoilage_risk_alert: Optional[dict] = None

class ExpiryRiskReportResponse(BaseModel):
    stock_item_id: int
    ingredient_name: str
    category: str
    batches: List[BatchExpiryDemandAllocation]
    total_usable_stock: float
    total_demand_in_shelf_life: float
    potential_waste_quantity: float
    unit: str
    risk_summary: str
    mitigation_actions: List[str]

class ScenarioApplyRequest(BaseModel):
    scenario_id: str = Field(..., description="scenario_a, scenario_b, scenario_c, scenario_d, scenario_e")

class ScenarioApplyResponse(BaseModel):
    scenario_id: str
    title: str
    description: str
    applied_changes: List[str]
    expected_impact: str
