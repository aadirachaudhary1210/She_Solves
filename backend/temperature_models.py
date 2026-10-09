"""
FoodShield TempGuard - Cold-Chain Database Models
Relational schema for storage units, temperature readings, drift alerts, and excursion intervals.
"""

from datetime import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from database import Base

class SafetyStatus(str, enum.Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"

class StorageUnit(Base):
    __tablename__ = "storage_units"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False) # e.g. "Dairy & Pastry Chiller (1-4Â°C)"
    description = Column(Text, nullable=True)
    sensor_id = Column(String(100), nullable=False)
    sensor_source = Column(String(100), default="SIMULATED_IOT_PROBE") # SIMULATED_IOT_PROBE, BLE_COLD_BEACON, REAL_HARDWARE_MODBUS

    # Configurable safety boundaries (Celsius)
    min_temp_celsius = Column(Float, nullable=False, default=1.0)
    max_temp_celsius = Column(Float, nullable=False, default=4.0)
    warning_low_celsius = Column(Float, nullable=False, default=1.5)
    warning_high_celsius = Column(Float, nullable=False, default=3.5)

    # Heartbeat & Stale Threshold
    stale_threshold_minutes = Column(Integer, default=15)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    readings = relationship("TemperatureReading", back_populates="unit", cascade="all, delete-orphan", order_by="desc(TemperatureReading.timestamp)")
    excursions = relationship("TemperatureExcursion", back_populates="unit", cascade="all, delete-orphan", order_by="desc(TemperatureExcursion.start_time)")
    alerts = relationship("TemperatureAlert", back_populates="unit", cascade="all, delete-orphan", order_by="desc(TemperatureAlert.created_at)")


class TemperatureReading(Base):
    __tablename__ = "temperature_readings"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("storage_units.id"), nullable=False, index=True)
    temperature_celsius = Column(Float, nullable=True) # Null represents disconnected probe
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sensor_id = Column(String(100), nullable=False)
    sensor_source = Column(String(100), default="SIMULATED_IOT_PROBE")

    status = Column(SQLEnum(SafetyStatus), nullable=False, default=SafetyStatus.UNKNOWN)
    classification_reason = Column(Text, nullable=False)
    is_simulated = Column(Boolean, default=True)
    raw_payload = Column(Text, nullable=True)

    # Relationship
    unit = relationship("StorageUnit", back_populates="readings")


class TemperatureExcursion(Base):
    """
    Tracks contiguous out-of-boundary events without double counting intervals.
    """
    __tablename__ = "temperature_excursions"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("storage_units.id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True) # Null if excursion is actively ongoing
    duration_seconds = Column(Float, nullable=True)
    peak_temp_celsius = Column(Float, nullable=False)
    excursion_type = Column(String(50), default="HIGH_TEMP_BREACH") # HIGH_TEMP_BREACH, LOW_TEMP_BREACH, RAPID_DRIFT
    is_resolved = Column(Boolean, default=False)
    resolution_notes = Column(Text, nullable=True)

    # Relationship
    unit = relationship("StorageUnit", back_populates="excursions")


class TemperatureAlert(Base):
    __tablename__ = "temperature_alerts"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("storage_units.id"), nullable=False, index=True)
    alert_type = Column(String(100), nullable=False) # DRIFT_EARLY_WARNING, CRITICAL_EXCURSION, SENSOR_STALE, RECOVERY_NORMALIZED
    severity = Column(String(50), default="WARNING") # WARNING, CRITICAL, INFO
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    slope_per_min = Column(Float, nullable=True)
    estimated_breach_min = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_acknowledged = Column(Boolean, default=False)

    # Relationship
    unit = relationship("StorageUnit", back_populates="alerts")
