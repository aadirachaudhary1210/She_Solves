"""
FoodShield - Relational Database Models (SQLAlchemy ORM)
Complete schema covering restaurant compliance, traceability, hygiene, staff, inspections, and audit logs.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str, enum.Enum):
    RESTAURANT = "restaurant"
    OFFICER = "officer"

class VerificationStatus(str, enum.Enum):
    VERIFIED = "verified"
    REQUIRES_REVIEW = "requires_review"
    REJECTED = "rejected"
    PENDING = "pending"

class DocumentValidity(str, enum.Enum):
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    NEEDS_RENEWAL = "needs_renewal"

class InspectionStatus(str, enum.Enum):
    PASSED = "passed"
    PASSED_WITH_CONDITIONS = "passed_with_conditions"
    FOLLOW_UP_REQUIRED = "follow_up_required"
    NON_COMPLIANT = "non_compliant"

class CorrectiveStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    VERIFIED_CLOSED = "verified_closed"
    OVERDUE = "overdue"

# ----------------- 1. User & Authentication -----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    security_pin_hash = Column(String(255), nullable=True) # Secondary PIN for sensitive staff/docs
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.RESTAURANT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    restaurants = relationship("Restaurant", back_populates="owner", cascade="all, delete-orphan")
    officer_profile = relationship("OfficerProfile", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

# ----------------- 2. Restaurant & Officer Profiles -----------------
class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    registration_number = Column(String(100), unique=True, index=True) # FSSAI or local authority
    license_type = Column(String(100), default="State Food License")
    category = Column(String(100), default="Fine Dining / Multi-Cuisine")
    address = Column(String(500), nullable=False)
    city = Column(String(100), default="New Delhi")
    state = Column(String(100), default="Delhi")
    pincode = Column(String(20), default="110001")
    contact_phone = Column(String(50), nullable=False)
    contact_email = Column(String(255), nullable=False)
    compliance_score = Column(Float, default=92.0)
    risk_level = Column(String(50), default="Low Risk") # Low Risk, Medium Risk, High Risk
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="restaurants")
    dishes = relationship("MenuDish", back_populates="restaurant", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="restaurant", cascade="all, delete-orphan")
    brands = relationship("Brand", back_populates="restaurant", cascade="all, delete-orphan")
    stock_items = relationship("StockItem", back_populates="restaurant", cascade="all, delete-orphan")
    cleaning_areas = relationship("CleaningArea", back_populates="restaurant", cascade="all, delete-orphan")
    cleaning_agencies = relationship("CleaningAgencyRecord", back_populates="restaurant", cascade="all, delete-orphan")
    pest_control_records = relationship("PestControlRecord", back_populates="restaurant", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="restaurant", cascade="all, delete-orphan")
    compliance_documents = relationship("ComplianceDocument", back_populates="restaurant", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="restaurant", cascade="all, delete-orphan")
    corrective_actions = relationship("CorrectiveAction", back_populates="restaurant", cascade="all, delete-orphan")
    storage_units = relationship("StorageUnit", back_populates="restaurant", cascade="all, delete-orphan")
    temperature_alerts = relationship("TemperatureAlert", back_populates="restaurant", cascade="all, delete-orphan")
    sales_records = relationship("SaleRecord", back_populates="restaurant", cascade="all, delete-orphan")
    incoming_stock = relationship("IncomingStock", back_populates="restaurant", cascade="all, delete-orphan")
    inventory_movements = relationship("InventoryMovement", back_populates="restaurant", cascade="all, delete-orphan")

class OfficerProfile(Base):
    __tablename__ = "officer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    badge_number = Column(String(100), unique=True, index=True)
    jurisdiction_zone = Column(String(255), default="North Zone Food Safety Office")
    designation = Column(String(100), default="Designated Food Safety Officer (FSO)")
    department = Column(String(255), default="Food Safety & Standards Authority")

    user = relationship("User", back_populates="officer_profile")
    inspections = relationship("Inspection", back_populates="officer")

# ----------------- 3. Menu, Ingredients & Traceability -----------------
class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    manufacturer = Column(String(255), nullable=True)
    country_of_origin = Column(String(100), default="India")
    fssai_license = Column(String(100), nullable=True)

    restaurant = relationship("Restaurant", back_populates="brands")
    ingredients = relationship("Ingredient", back_populates="brand")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)
    fssai_license = Column(String(100), nullable=True)
    gstin = Column(String(50), nullable=True)
    rating = Column(Float, default=4.8)

    restaurant = relationship("Restaurant", back_populates="suppliers")
    ingredients = relationship("Ingredient", back_populates="supplier")
    stock_batches = relationship("StockBatch", back_populates="supplier")

class MenuDish(Base):
    __tablename__ = "menu_dishes"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False) # Appetizer, Main Course, Dessert, Beverage
    description = Column(Text, nullable=True)
    selling_price = Column(Float, nullable=False)
    allergens = Column(String(255), nullable=True) # Milk, Gluten, Nuts, Soy
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="dishes")
    ingredients = relationship("Ingredient", back_populates="dish", cascade="all, delete-orphan")
    sales_records = relationship("SaleRecord", back_populates="dish", cascade="all, delete-orphan")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    dish_id = Column(Integer, ForeignKey("menu_dishes.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    name = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="grams") # kg, grams, ml, liters, units
    is_packaged = Column(Boolean, default=False)
    batch_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    dish = relationship("MenuDish", back_populates="ingredients")
    brand = relationship("Brand", back_populates="ingredients")
    supplier = relationship("Supplier", back_populates="ingredients")
    stock_item = relationship("StockItem", back_populates="recipe_ingredients")

# ----------------- 4. Stock, Procurement & Evidence -----------------
class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False) # Dairy, Vegetables, Spices, Meat, Oil, Dry Goods
    current_quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="kg")
    reorder_level = Column(Float, default=5.0)
    lead_time_days = Column(Float, default=2.0)
    safety_buffer_pct = Column(Float, default=20.0)
    min_order_qty = Column(Float, default=1.0)
    pack_size = Column(Float, default=1.0)
    reserved_quantity = Column(Float, default=0.0)
    density_g_per_ml = Column(Float, nullable=True)

    restaurant = relationship("Restaurant", back_populates="stock_items")
    batches = relationship("StockBatch", back_populates="stock_item", cascade="all, delete-orphan")
    recipe_ingredients = relationship("Ingredient", back_populates="stock_item")
    incoming_stock = relationship("IncomingStock", back_populates="stock_item", cascade="all, delete-orphan")
    inventory_movements = relationship("InventoryMovement", back_populates="stock_item", cascade="all, delete-orphan")

class StockBatch(Base):
    __tablename__ = "stock_batches"

    id = Column(Integer, primary_key=True, index=True)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    batch_number = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), default="kg")
    purchase_price = Column(Float, nullable=False)
    purchase_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    invoice_number = Column(String(100), nullable=True)
    invoice_file = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="fresh") # fresh, expiring_soon, expired
    storage_unit_id = Column(Integer, ForeignKey("storage_units.id"), nullable=True)

    stock_item = relationship("StockItem", back_populates="batches")
    supplier = relationship("Supplier", back_populates="stock_batches")
    evidence = relationship("StockEvidence", back_populates="batch", cascade="all, delete-orphan")
    storage_unit = relationship("StorageUnit", back_populates="batches")

class StockEvidence(Base):
    __tablename__ = "stock_evidence"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("stock_batches.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String(255), default="Store Manager")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_info = Column(String(255), nullable=True)
    file_hash = Column(String(128), nullable=True)
    # Verification Pipeline Results
    automated_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.VERIFIED)
    officer_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.PENDING)
    confidence_score = Column(Float, default=95.0)
    verification_reasons = Column(Text, default="Valid timestamp and EXIF metadata consistency detected.")
    reviewer_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_date = Column(DateTime, nullable=True)

    batch = relationship("StockBatch", back_populates="evidence")

# ----------------- 4B. DemandSense Sales & Inbound Models -----------------
class SaleRecord(Base):
    __tablename__ = "sale_records"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    dish_id = Column(Integer, ForeignKey("menu_dishes.id"), nullable=False)
    sale_date = Column(DateTime, nullable=False, index=True)
    quantity_sold = Column(Integer, nullable=False, default=0)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_revenue = Column(Float, nullable=False, default=0.0)
    channel = Column(String(50), default="dine_in")
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="sales_records")
    dish = relationship("MenuDish", back_populates="sales_records")

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
    status = Column(String(50), default="confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="incoming_stock")
    stock_item = relationship("StockItem", back_populates="incoming_stock")
    supplier = relationship("Supplier")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=False)
    movement_type = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    reference_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    restaurant = relationship("Restaurant", back_populates="inventory_movements")
    stock_item = relationship("StockItem", back_populates="inventory_movements")

# ----------------- 5. Hygiene, Cleaning & Agency Records -----------------
class CleaningArea(Base):
    __tablename__ = "cleaning_areas"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(100), nullable=False) # Kitchen, Dining Area, Restrooms, Storage Area

    restaurant = relationship("Restaurant", back_populates="cleaning_areas")
    tasks = relationship("CleaningTask", back_populates="area", cascade="all, delete-orphan")

class CleaningTask(Base):
    __tablename__ = "cleaning_tasks"

    id = Column(Integer, primary_key=True, index=True)
    area_id = Column(Integer, ForeignKey("cleaning_areas.id"), nullable=False)
    task_name = Column(String(255), nullable=False)
    frequency = Column(String(50), default="daily") # multiple_times_daily, daily, weekly, monthly, as_required
    shift = Column(String(50), default="all") # morning, afternoon, evening, all
    is_mandatory = Column(Boolean, default=True)

    area = relationship("CleaningArea", back_populates="tasks")
    logs = relationship("CleaningLog", back_populates="task", cascade="all, delete-orphan")

class CleaningLog(Base):
    __tablename__ = "cleaning_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("cleaning_tasks.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    shift = Column(String(50), default="morning")
    status = Column(String(50), default="completed") # completed, not_completed, needs_attention
    notes = Column(Text, nullable=True)
    performed_by = Column(String(255), default="Hygiene Team")
    photo_evidence_url = Column(String(500), nullable=True)
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.VERIFIED)

    task = relationship("CleaningTask", back_populates="logs")

class CleaningAgencyRecord(Base):
    __tablename__ = "cleaning_agency_records"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    agency_name = Column(String(255), nullable=False)
    contact_number = Column(String(50), nullable=False)
    address = Column(String(500), nullable=True)
    service_type = Column(String(255), default="Deep Chimney, Exhaust & Kitchen Sanitization")
    service_date = Column(DateTime, nullable=False)
    service_frequency = Column(String(100), default="Monthly")
    invoice_file = Column(String(500), nullable=True)
    receipt_file = Column(String(500), nullable=True)
    payment_proof = Column(String(500), nullable=True)
    upi_reference = Column(String(100), nullable=True)
    before_image = Column(String(500), nullable=True)
    after_image = Column(String(500), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="cleaning_agencies")

# ----------------- 6. Pest Control Management -----------------
class PestControlRecord(Base):
    __tablename__ = "pest_control_records"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    agency_name = Column(String(255), nullable=False)
    agency_contact = Column(String(50), nullable=False)
    agency_address = Column(String(500), nullable=True)
    service_date = Column(DateTime, nullable=False)
    next_service_date = Column(DateTime, nullable=False)
    treatment_type = Column(String(255), default="Cockroach Gel Treatment & Rodent Control")
    areas_treated = Column(String(500), default="Kitchen, Pantry, Storage, Drain Outlets")
    chemicals_used = Column(String(500), default="Fipronil 0.05% Gel, Bromadiolone Bait")
    technician_name = Column(String(255), default="Vikram Patil (Certified Tech #CPT-881)")
    certificate_file = Column(String(500), nullable=True)
    invoice_file = Column(String(500), nullable=True)
    payment_receipt = Column(String(500), nullable=True)
    service_report = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    remarks = Column(Text, nullable=True)
    status = Column(String(50), default="active") # active, due_soon, overdue
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="pest_control_records")

# ----------------- 7. Staff Management & Training (Protected) -----------------
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    profile_photo = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=False)
    address = Column(String(500), nullable=True)
    date_of_joining = Column(DateTime, nullable=False)
    designation = Column(String(100), nullable=False) # Head Chef, Sous Chef, Kitchen Assistant, Waiter
    department = Column(String(100), default="Kitchen Operations")
    previous_workplace = Column(String(255), nullable=True)
    previous_experience_years = Column(Float, default=0.0)
    total_experience_years = Column(Float, default=0.0)
    masked_government_id = Column(String(100), nullable=False) # e.g. "XXXX-XXXX-4819"
    id_document_path = Column(String(500), nullable=True) # Protected/Encrypted path
    masked_pan = Column(String(50), nullable=True) # e.g. "XXXXX1234A"
    pan_document_path = Column(String(500), nullable=True)
    medical_fitness_status = Column(String(50), default="Certified Fit")
    medical_certificate_expiry = Column(DateTime, nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    employment_status = Column(String(50), default="active") # active, on_leave, resigned
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="employees")
    trainings = relationship("StaffTraining", back_populates="employee", cascade="all, delete-orphan")

class StaffTraining(Base):
    __tablename__ = "staff_trainings"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    training_name = Column(String(255), nullable=False) # FOSTAC Basic Food Safety, HACCP, Cross-Contamination
    provider = Column(String(255), default="FSSAI Certified FOSTAC Training Partner")
    training_date = Column(DateTime, nullable=False)
    certificate_file = Column(String(500), nullable=True)
    certificate_expiry = Column(DateTime, nullable=False)
    status = Column(String(50), default="valid") # valid, expiring_soon, expired
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="trainings")

# ----------------- 8. Compliance Documents (Protected) -----------------
class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    category = Column(String(100), nullable=False) # fssai_license, fire_safety, water_test, health_cert, waste_mgmt
    document_name = Column(String(255), nullable=False)
    document_number = Column(String(100), nullable=False)
    issuing_authority = Column(String(255), nullable=False)
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    file_url = Column(String(500), nullable=True)
    is_sensitive = Column(Boolean, default=True)
    validity_status = Column(SQLEnum(DocumentValidity), default=DocumentValidity.VALID)
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.VERIFIED)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="compliance_documents")

# ----------------- 9. Government Inspections & Violations -----------------
class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("officer_profiles.id"), nullable=False)
    inspection_date = Column(DateTime, default=datetime.utcnow)
    inspection_type = Column(String(100), default="Routine Annual Audit") # Routine, Surprise, Follow-up, License Renewal
    status = Column(SQLEnum(InspectionStatus), default=InspectionStatus.PASSED)
    score = Column(Float, default=94.0)
    checklist_data = Column(Text, nullable=True) # JSON checklist answers
    findings = Column(Text, nullable=True)
    violations_summary = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    report_file_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="inspections")
    officer = relationship("OfficerProfile", back_populates="inspections")
    violations = relationship("InspectionViolation", back_populates="inspection", cascade="all, delete-orphan")
    corrective_actions = relationship("CorrectiveAction", back_populates="inspection")

class InspectionViolation(Base):
    __tablename__ = "inspection_violations"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    category = Column(String(100), nullable=False) # Temperature Control, Drainage, Labeling, Pest Control
    severity = Column(String(50), default="Minor") # Minor, Moderate, Major, Critical
    description = Column(Text, nullable=False)
    reference_code = Column(String(100), default="FSSAI-SEC-14(B)")
    evidence_url = Column(String(500), nullable=True)
    is_rectified = Column(Boolean, default=False)

    inspection = relationship("Inspection", back_populates="violations")

# ----------------- 10. Corrective Actions -----------------
class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    issue_title = Column(String(255), nullable=False)
    issue_description = Column(Text, nullable=False)
    required_action = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=False)
    status = Column(SQLEnum(CorrectiveStatus), default=CorrectiveStatus.PENDING)
    restaurant_response = Column(Text, nullable=True)
    evidence_url = Column(String(500), nullable=True)
    officer_feedback = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="corrective_actions")
    inspection = relationship("Inspection", back_populates="corrective_actions")

# ----------------- 11. Alerts & Notifications -----------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(100), default="expiry") # expiry, checklist, inspection, corrective, security
    priority = Column(String(50), default="medium") # high (red), medium (yellow), info (green)
    is_read = Column(Boolean, default=False)
    link_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

# ----------------- 12. Append-Only Audit Log -----------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    action = Column(String(100), nullable=False) # LOGIN, UPLOAD_DOC, VIEW_STAFF, VERIFY_EVIDENCE, etc.
    entity_type = Column(String(100), nullable=True) # StockEvidence, ComplianceDocument, Employee
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(100), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")

# ----------------- 13. Cold Chain Telemetry, Storage Units & Escalations -----------------
class StorageUnit(Base):
    __tablename__ = "storage_units"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    unit_type = Column(String(100), nullable=False) # walk_in_chiller, deep_freezer, prep_refrigerator, display_counter, hot_holding
    location_area = Column(String(255), default="Main Kitchen Storage")
    min_temp = Column(Float, default=1.0)
    max_temp = Column(Float, default=4.0)
    target_temp = Column(Float, default=2.5)
    current_temp = Column(Float, default=3.2)
    current_humidity = Column(Float, default=70.0)
    status = Column(String(50), default="normal") # normal, warning, critical_breach, offline
    last_ping = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="storage_units")
    batches = relationship("StockBatch", back_populates="storage_unit")
    telemetry_logs = relationship("TemperatureLog", back_populates="unit", cascade="all, delete-orphan")
    alerts = relationship("TemperatureAlert", back_populates="unit", cascade="all, delete-orphan")

class TemperatureLog(Base):
    __tablename__ = "temperature_logs"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("storage_units.id"), nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=True)
    sensor_battery_pct = Column(Float, default=100.0)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_breach = Column(Boolean, default=False)
    is_simulation = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    unit = relationship("StorageUnit", back_populates="telemetry_logs")

class TemperatureAlert(Base):
    __tablename__ = "temperature_alerts"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("storage_units.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    breach_temp = Column(Float, nullable=False)
    threshold_temp = Column(Float, nullable=False)
    severity = Column(String(50), default="critical") # warning, critical
    escalation_level = Column(Integer, default=1) # 1=Kitchen, 2=Manager, 3=Officer
    status = Column(String(50), default="active") # active, acknowledged, resolved, escalated_to_officer
    narrative = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    corrective_action_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    unit = relationship("StorageUnit", back_populates="alerts")
    restaurant = relationship("Restaurant", back_populates="temperature_alerts")
