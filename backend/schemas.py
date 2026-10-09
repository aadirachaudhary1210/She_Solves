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
    ingredients: List[IngredientCreate] = Field(default_factory=list)

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
    violations: List[ViolationCreate] = Field(default_factory=list)

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
