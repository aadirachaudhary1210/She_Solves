"""
FoodShield - Temperature & System Assessment Adapter Interface
Module for Challenge 3: AI-Sensor Conflict Detection & Escalation.

Shared Integration Contract:
- Challenge 1 owns the authoritative temperature-reading service and classification.
- This adapter consumes its latest reading through the agreed interface or an adapter.
- When Challenge 1 tables/services are not present in the runtime environment,
  this module provides a clearly labeled Demo Adapter with realistic test scenarios.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


def to_celsius(temperature: float, unit: str) -> float:
    """Normalize any temperature to Celsius."""
    cleaned_unit = unit.strip().upper()
    if cleaned_unit in ("C", "CELSIUS", "°C"):
        return round(temperature, 2)
    elif cleaned_unit in ("F", "FAHRENHEIT", "°F"):
        return round((temperature - 32.0) * (5.0 / 9.0), 2)
    elif cleaned_unit in ("K", "KELVIN"):
        return round(temperature - 273.15, 2)
    else:
        # Default assume Celsius if unparseable
        return round(temperature, 2)


def to_fahrenheit(temperature: float, unit: str) -> float:
    """Normalize any temperature to Fahrenheit."""
    cleaned_unit = unit.strip().upper()
    if cleaned_unit in ("F", "FAHRENHEIT", "°F"):
        return round(temperature, 2)
    elif cleaned_unit in ("C", "CELSIUS", "°C"):
        return round((temperature * 9.0 / 5.0) + 32.0, 2)
    elif cleaned_unit in ("K", "KELVIN"):
        c = temperature - 273.15
        return round((c * 9.0 / 5.0) + 32.0, 2)
    else:
        return round((temperature * 9.0 / 5.0) + 32.0, 2)


class SensorReading(BaseModel):
    """
    Standard Sensor Input Contract (Challenge 1 consumer).
    """
    reading_id: str
    location_id: str
    temperature: float
    unit: str = "C" # "C" or "F"
    timestamp: datetime
    source: str = "IOT_SENSOR" # "IOT_SENSOR", "DIGITAL_PROBE", "MANUAL_LOG"
    sensor_id: Optional[str] = None
    classification: Optional[str] = None # "SAFE", "WARNING", "CRITICAL", "UNKNOWN"
    is_simulated: bool = False

    def normalized_celsius(self) -> float:
        return to_celsius(self.temperature, self.unit)


class SystemAssessment(BaseModel):
    """
    AI / System Assessment Contract.
    Represents vision model, heuristic rule-set, or algorithmic safety evaluation.
    """
    assessment_id: str
    location_id: str
    estimated_temperature: Optional[float] = None
    unit: Optional[str] = "C"
    assessed_status: str # "SAFE", "WARNING", "CRITICAL", "UNKNOWN"
    timestamp: datetime
    model_version: str = "FoodShield-VisionRuleEngine-v2.1"
    confidence: float = 0.95
    explanation: str = "Automated visual and thermodynamic safety assessment."
    is_simulated: bool = False

    def normalized_celsius(self) -> Optional[float]:
        if self.estimated_temperature is None:
            return None
        return to_celsius(self.estimated_temperature, self.unit or "C")


class ITemperatureAdapter:
    """Interface for retrieving latest sensor and AI assessment pairs."""
    def get_latest_sensor_reading(self, location_id: str) -> Optional[SensorReading]:
        raise NotImplementedError

    def get_latest_system_assessment(self, location_id: str) -> Optional[SystemAssessment]:
        raise NotImplementedError


class DemoTemperatureAdapter(ITemperatureAdapter):
    """
    Explicitly labeled Demo/Simulation Adapter.
    Used when Challenge 1's live sensor database is unavailable,
    or during development, testing, and supervisor simulation drills.
    """

    SCENARIOS: Dict[str, Dict[str, Any]] = {
        "CRITICAL_DISAGREEMENT": {
            "title": "Critical Safety Disagreement",
            "description": "Sensor detects danger (14.2°C in deep freeze) but AI vision incorrectly flags safe due to frost obscuring the digital gauge.",
            "location_id": "walkin_freezer_01",
            "sensor": {
                "reading_id": "SENS-LIVE-8821",
                "temperature": 14.2,
                "unit": "C",
                "source": "IOT_TELEMETRY_MODBUS",
                "sensor_id": "FREEZER-PROBE-01",
                "classification": "CRITICAL"
            },
            "system": {
                "assessment_id": "AI-VIS-9912",
                "estimated_temperature": -18.0,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "DemoVisionGaugeScanner-v1.4",
                "confidence": 0.88,
                "explanation": "Visual assessment of freezer interior indicates closed doors and intact packaging; classified SAFE."
            }
        },
        "TEMPERATURE_MISMATCH": {
            "title": "Temperature Tolerance Mismatch",
            "description": "Sensor and AI agree condition is warning, but their temperatures differ by 5.4°C (beyond 2.5°C tolerance).",
            "location_id": "dairy_chiller_02",
            "sensor": {
                "reading_id": "SENS-LIVE-4412",
                "temperature": 9.4,
                "unit": "C",
                "source": "IOT_BLE_BEACON",
                "sensor_id": "CHILLER-PROBE-02",
                "classification": "WARNING"
            },
            "system": {
                "assessment_id": "AI-HEUR-3319",
                "estimated_temperature": 4.0,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-ThermalInference-v2",
                "confidence": 0.91,
                "explanation": "Calculated safe chill cycle based on compressor runtime data."
            }
        },
        "STATUS_MISMATCH": {
            "title": "Status Disagreement",
            "description": "Sensor reports WARNING while system assessment reports SAFE at identical temperature boundary.",
            "location_id": "prep_counter_01",
            "sensor": {
                "reading_id": "SENS-LIVE-7711",
                "temperature": 8.1,
                "unit": "C",
                "source": "IOT_SENSOR",
                "sensor_id": "PREP-SENS-01",
                "classification": "WARNING"
            },
            "system": {
                "assessment_id": "AI-SYS-6612",
                "estimated_temperature": 7.9,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-StaticRule-v1",
                "confidence": 0.90,
                "explanation": "Within allowable 2-hour prep counter threshold."
            }
        },
        "STALE_SENSOR_DATA": {
            "title": "Stale Sensor Telemetry",
            "description": "Sensor has ceased transmitting (last heartbeat 75 minutes ago), while AI assessment is fresh.",
            "location_id": "cold_room_north",
            "sensor": {
                "reading_id": "SENS-OLD-1102",
                "temperature": 3.2,
                "unit": "C",
                "source": "IOT_SENSOR",
                "sensor_id": "NORTH-COLD-01",
                "classification": "SAFE",
                "age_minutes": 75
            },
            "system": {
                "assessment_id": "AI-CURR-5520",
                "estimated_temperature": 3.5,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-RuleEngine-v2",
                "confidence": 0.96,
                "explanation": "Real-time thermal envelope assessment active."
            }
        },
        "STALE_SYSTEM_ASSESSMENT": {
            "title": "Stale System Assessment",
            "description": "Sensor is active and fresh, but AI inference pipeline has not run in over 2 hours.",
            "location_id": "meat_storage_03",
            "sensor": {
                "reading_id": "SENS-CURR-9921",
                "temperature": 2.1,
                "unit": "C",
                "source": "IOT_SENSOR",
                "sensor_id": "MEAT-PROBE-03",
                "classification": "SAFE"
            },
            "system": {
                "assessment_id": "AI-STALE-1109",
                "estimated_temperature": 2.0,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-Vision-v1",
                "confidence": 0.85,
                "explanation": "Old cached prediction.",
                "age_minutes": 130
            }
        },
        "LOCATION_MISMATCH": {
            "title": "Location Mismatch",
            "description": "Sensor reading from Meat Chiller compared with AI evaluation meant for Fish Freezer.",
            "location_id": "meat_chiller_01",
            "sensor": {
                "reading_id": "SENS-LOC-5511",
                "location_id": "meat_chiller_01",
                "temperature": 1.5,
                "unit": "C",
                "source": "IOT_SENSOR",
                "sensor_id": "MEAT-PROBE-01",
                "classification": "SAFE"
            },
            "system": {
                "assessment_id": "AI-LOC-4410",
                "location_id": "fish_freezer_02", # Differing location
                "estimated_temperature": -18.0,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-RuleEngine-v2",
                "confidence": 0.94,
                "explanation": "Assessed fish freezer zone."
            }
        },
        "UNIT_CONVERSION_MISMATCH": {
            "title": "Unit Conversion Test (Fahrenheit vs Celsius)",
            "description": "Sensor reports 50.0°F (10.0°C - WARNING), AI reports 4.0°C (SAFE). Needs proper unit normalization.",
            "location_id": "beverage_chiller_01",
            "sensor": {
                "reading_id": "SENS-FAHR-9933",
                "temperature": 50.0, # 50°F = 10°C
                "unit": "F",
                "source": "IOT_SENSOR",
                "sensor_id": "BEV-PROBE-01",
                "classification": "WARNING"
            },
            "system": {
                "assessment_id": "AI-CELS-2210",
                "estimated_temperature": 4.0,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-RuleEngine-v2",
                "confidence": 0.92,
                "explanation": "Inferred safe beverage holding temperature."
            }
        },
        "SAFE_AGREEMENT": {
            "title": "Normal Agreement (No Conflict)",
            "description": "Sensor reports 3.8°C (SAFE) and AI reports 3.9°C (SAFE) within 0.1°C tolerance. Fully aligned.",
            "location_id": "central_cold_store",
            "sensor": {
                "reading_id": "SENS-AGREE-101",
                "temperature": 3.8,
                "unit": "C",
                "source": "IOT_SENSOR",
                "sensor_id": "CENTRAL-01",
                "classification": "SAFE"
            },
            "system": {
                "assessment_id": "AI-AGREE-202",
                "estimated_temperature": 3.9,
                "unit": "C",
                "assessed_status": "SAFE",
                "model_version": "FoodShield-RuleEngine-v2",
                "confidence": 0.98,
                "explanation": "Thermally stable storage. Sensor and visual evidence in complete consensus."
            }
        }
    }

    def __init__(self, active_scenario: str = "CRITICAL_DISAGREEMENT"):
        self.active_scenario = active_scenario

    def get_scenario_data(self, scenario_name: Optional[str] = None) -> Dict[str, Any]:
        target = scenario_name or self.active_scenario
        if target not in self.SCENARIOS:
            target = "CRITICAL_DISAGREEMENT"
        sc = self.SCENARIOS[target]

        now = datetime.now(timezone.utc)
        sens_cfg = sc["sensor"]
        sys_cfg = sc["system"]

        # Calculate timestamps
        sensor_age_min = sens_cfg.get("age_minutes", 2)
        sensor_time = now - timedelta(minutes=sensor_age_min)

        system_age_min = sys_cfg.get("age_minutes", 3)
        system_time = now - timedelta(minutes=system_age_min)

        sensor_loc = sens_cfg.get("location_id", sc["location_id"])
        system_loc = sys_cfg.get("location_id", sc["location_id"])

        reading = SensorReading(
            reading_id=sens_cfg["reading_id"],
            location_id=sensor_loc,
            temperature=sens_cfg["temperature"],
            unit=sens_cfg["unit"],
            timestamp=sensor_time,
            source=sens_cfg["source"],
            sensor_id=sens_cfg.get("sensor_id"),
            classification=sens_cfg.get("classification"),
            is_simulated=True
        )

        assessment = SystemAssessment(
            assessment_id=sys_cfg["assessment_id"],
            location_id=system_loc,
            estimated_temperature=sys_cfg.get("estimated_temperature"),
            unit=sys_cfg.get("unit", "C"),
            assessed_status=sys_cfg["assessed_status"],
            timestamp=system_time,
            model_version=sys_cfg["model_version"],
            confidence=sys_cfg["confidence"],
            explanation=sys_cfg["explanation"],
            is_simulated=True
        )

        return {
            "scenario_key": target,
            "title": sc["title"],
            "description": sc["description"],
            "sensor": reading,
            "system": assessment
        }

    def get_latest_sensor_reading(self, location_id: str) -> Optional[SensorReading]:
        sc = self.get_scenario_data()
        reading = sc["sensor"]
        reading.location_id = location_id
        return reading

    def get_latest_system_assessment(self, location_id: str) -> Optional[SystemAssessment]:
        sc = self.get_scenario_data()
        assessment = sc["system"]
        assessment.location_id = location_id
        return assessment


# Singleton active adapter
temperature_adapter = DemoTemperatureAdapter()
