"""
FoodShield TempGuard - Pydantic Schemas & Integration Contracts
Provides request validation, API output models, and stable integration contracts for other modules.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SafetyLimitsSchema(BaseModel):
    min_temp_celsius: float
    max_temp_celsius: float
    warning_low_celsius: float
    warning_high_celsius: float

class DriftAnalysisResponse(BaseModel):
    has_drift: bool
    trend_direction: str # "rising", "falling", "stable", "insufficient_data"
    slope_celsius_per_minute: Optional[float] = None
    volatility_sd: Optional[float] = None
    estimated_breach_minutes: Optional[float] = None
    confidence: str # "High", "Moderate", "Low", "None"
    assumptions: Optional[str] = None
    explanation: str

class ExposureSummaryResponse(BaseModel):
    is_in_excursion: bool
    active_duration_minutes: float = 0.0
    total_duration_today_minutes: float = 0.0
    excursion_count_today: int = 0
    current_excursion_start: Optional[datetime] = None
    peak_temp_celsius: Optional[float] = None
    requires_inspection: bool = False
    regulatory_disclaimer: str = (
        "Regulatory note: Observed exposure duration reflects sensor log continuity. "
        "Specific food spoilage assessment requires verification under applicable FSSAI/HACCP guidelines."
    )

class TemperatureReadingCreate(BaseModel):
    unit_id: int
    temperature_celsius: Optional[float] = Field(None, description="Temperature in Celsius. Null indicates probe disconnect.")
    timestamp: Optional[datetime] = None
    sensor_id: Optional[str] = None
    sensor_source: Optional[str] = "SIMULATED_IOT_PROBE"
    is_simulated: bool = True
    raw_payload: Optional[str] = None

class TemperatureReadingResponse(BaseModel):
    id: int
    unit_id: int
    unit_name: str
    storage_category: str
    temperature_celsius: Optional[float]
    timestamp: datetime
    sensor_id: str
    sensor_source: str
    status: str # "SAFE", "WARNING", "CRITICAL", "UNKNOWN"
    classification_reason: str
    is_simulated: bool
    min_temp_celsius: float
    max_temp_celsius: float
    reading_age_seconds: Optional[float] = None
    is_stale: bool = False

class StorageUnitConfigUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    min_temp_celsius: Optional[float] = None
    max_temp_celsius: Optional[float] = None
    warning_low_celsius: Optional[float] = None
    warning_high_celsius: Optional[float] = None
    stale_threshold_minutes: Optional[int] = None

class StorageUnitSummaryResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    category: str
    description: Optional[str]
    sensor_id: str
    sensor_source: str
    min_temp_celsius: float
    max_temp_celsius: float
    warning_low_celsius: float
    warning_high_celsius: float
    stale_threshold_minutes: int

    # Live evaluation metrics
    latest_reading: Optional[TemperatureReadingResponse] = None
    safety_status: str # SAFE, WARNING, CRITICAL, UNKNOWN
    classification_reason: str
    drift_analysis: DriftAnalysisResponse
    exposure_summary: ExposureSummaryResponse
    recent_sparkline: List[float] = []

    # Telemetry freshness & heartbeat
    last_measurement_time: Optional[datetime] = None
    reading_age_seconds: Optional[float] = None
    is_stale: bool = False
    heartbeat_status: str = "CURRENT" # CURRENT, STALE, DISCONNECTED

class TemperatureAlertResponse(BaseModel):
    id: int
    unit_id: int
    unit_name: str
    alert_type: str
    severity: str
    title: str
    message: str
    slope_per_min: Optional[float] = None
    estimated_breach_min: Optional[float] = None
    created_at: datetime
    is_acknowledged: bool

class SimulateScenarioRequest(BaseModel):
    scenario: str = Field(..., description="Scenario identifier: 'A_NORMAL', 'B_DRIFT_WARNING', 'C_CRITICAL_BREACH', 'D_SENSOR_FAILURE', 'E_RECOVERY'")
    unit_id: Optional[int] = Field(None, description="Specific unit ID, or defaults to primary chiller unit.")

# -------------------------------------------------------------
# SHARED INTEGRATION CONTRACT SCHEMAS (Modules 2, 3, 4)
# -------------------------------------------------------------

class UnitContractItem(BaseModel):
    unit_id: int
    unit_name: str
    restaurant_id: int
    storage_category: str
    latest_reading: Optional[Dict[str, Any]]
    safety_limits: Dict[str, float]
    safety_status: str # SAFE, WARNING, CRITICAL, UNKNOWN
    classification_reason: str
    drift_analysis: Dict[str, Any]
    exposure_summary: Dict[str, Any]

class SharedIntegrationContractResponse(BaseModel):
    module: str = "FoodShield TempGuard (Cold-Chain Module 1)"
    version: str = "1.0.0"
    timestamp: datetime
    units_monitored: int
    system_health: str # "ALL_SAFE", "ATTENTION_REQUIRED", "CRITICAL_HAZARD"
    units: List[UnitContractItem]
