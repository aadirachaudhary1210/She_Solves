# FoodShield — Digital Food-Safety, Hygiene, Compliance & Transparency Platform

**FoodShield** is an enterprise-grade digital food-safety, hygiene, compliance, and traceability management platform engineered for restaurants and government food-safety officers (FSSAI / Municipal Health Authorities).

FoodShield transforms statutory food-safety compliance from static, paperwork-heavy spot checks into a **continuously updated, cryptographically auditable, and transparent digital history**.

---

## 🌟 Key Architecture & Capabilities

### 1. Dual-Portal Role-Based Authorization
- **Restaurant Compliance Portal**:
  - Live KPI compliance score meter (**92.5% - Low Risk**)
  - Recipe and ingredient provenance management (establishing **Dish → Ingredient → Brand → Supplier → Stock Batch → Evidence**)
  - Stock intake with automated multi-parameter photographic evidence analysis
  - Shift-based cleaning checklists across 4 facility zones (**Kitchen, Dining, Restrooms, Dry & Cold Storage**)
  - Professional external cleaning agency contracts, invoices, and UPI payment proofs
  - Pest control scheduling, chemical verification (Fipronil, Rodenticide), and next-visit countdown
  - **🔒 Secondary Security Gate**: PIN re-authentication (`7788`) for sensitive employee personnel files and statutory document vaults
  - Corrective action response workflow with photographic proof submission
- **Government Food-Safety Officer Command Center**:
  - Registered establishments inspection registry with fuzzy search, risk-level filters, and score sorting
  - Official establishment dossier view with worker privacy masking (sensitive identity cards and Aadhaar masked)
  - Photographic Evidence Review Queue with automated EXIF, timestamp, and duplicate check reports
  - Official inspection filing module with violation checklists and statutory directive deadlines
  - Corrective action oversight, review, and verified closure

### 2. Evidence Verification Architecture (No False AI Claims)
The system explicitly distinguishes **automated heuristic verification** from **authorized human officer verification**:
1. **EXIF & Camera Metadata**: Validates camera model, sensor resolution, and capture timestamps.
2. **Timestamp Consistency**: Compares device capture timestamp with server receipt time to detect stale or recycled photos.
3. **Geo-Fencing Analysis**: Validates GPS coordinates against registered restaurant premises.
4. **SHA-256 Duplicate Image Fingerprinting**: Detects cross-batch or previously submitted image reuse.
5. **Human Officer Review**: Flags evidence as `🟢 Verified`, `🟡 Requires Review`, or `🔴 Rejected`, leaving final legal determination to designated officers.

### 3. Dynamic Compliance Scoring Engine
The platform calculates a transparent, real-time score out of 100 based on weighted statutory factors:
$$\text{FoodShield Score} = S_{\text{hygiene}} (25) + S_{\text{stock}} (20) + S_{\text{docs}} (20) + S_{\text{pest}} (15) + S_{\text{staff}} (10) + S_{\text{corrective}} (10)$$

- **Hygiene & Sanitation (25 pts)**: Daily and shift checklist completion rate.
- **Stock Traceability & Freshness (20 pts)**: Zero expired batches, verified supplier licensing.
- **Statutory Regulatory Documents (20 pts)**: Active FSSAI license, Delhi Fire Service NOC, potability water tests.
- **Pest Control Currency (15 pts)**: Certified commercial treatment within 30 days.
- **Staff Food Safety Training (10 pts)**: Proportion of staff holding FOSTAC / HACCP certification.
- **Corrective Actions (10 pts baseline)**: Deductions for overdue or unresolved inspector notices.

---

## 🗄️ Database Relational Design (SQLAlchemy ORM)

The relational schema (`backend/models.py`) encompasses 20+ specialized tables:
- `users`: Credentials, role enum, secondary security PIN hash, audit link.
- `restaurants`: Business registration, FSSAI number, geo-location, dynamic compliance score, risk level.
- `officer_profiles`: Badge ID, jurisdiction zone, department designation.
- `menu_dishes`, `ingredients`, `brands`, `suppliers`: Four-tier ingredient provenance structure.
- `stock_items`, `stock_batches`, `stock_evidence`: Stock inventory with batch tracking and evidence metadata.
- `cleaning_areas`, `cleaning_tasks`, `cleaning_logs`, `cleaning_agency_records`: Shift cleaning logs and third-party contracts.
- `pest_control_records`: Treatment history, chemical compounds, technician licensing, next due date.
- `employees`, `staff_trainings`: Sensitive personnel records with masked IDs (`XXXX-XXXX-4819`) and FOSTAC qualifications.
- `compliance_documents`: Protected regulatory certificates with expiry tracking.
- `inspections`, `inspection_violations`, `corrective_actions`: Government audit reports and corrective workflows.
- `audit_logs`: Append-only, tamper-proof activity ledger recording actor, action code, timestamp, and IP.

---

## 🚀 Quick-Start & Testing Instructions

### Test Accounts Credentials

| Role | Email | Password | Secondary PIN |
|---|---|---|---|
| **Restaurant Manager** (The Royal Spice Kitchen) | `restaurant@foodshield.com` | `Password123!` | `7788` |
| **Government Officer** (Inspector Rajesh Sharma) | `officer@foodshield.gov` | `OfficerSecure2026!` | `9900` |

### 1. Launching the Interactive Frontend
You can immediately open `frontend/index.html` in any modern web browser, or preview the self-contained `foodshield_app.html` artifact directly inside Antigravity!

### 2. Running the Backend API Server
Ensure Python 3.9+ is installed:
```bash
cd backend
pip install -r requirements.txt
python seed_data.py
uvicorn main:app --reload --port 8000
```
API Documentation and interactive Swagger UI will be accessible at:
`http://127.0.0.1:8000/docs`

---

## 🔒 Security & Privacy Guarantees
- **No Plaintext Passwords**: Passwords hashed with salted SHA-256 / Bcrypt.
- **Worker Privacy Protection**: Aadhaar, PAN, and phone numbers are automatically masked on normal dashboard and officer views to safeguard employee privacy.
- **Dual-Layer Access Control**: Accessing employee personnel or compliance documents requires entering the secondary 4-digit Security PIN (`7788`), unlocking a temporary 15-minute session with auto-expiry.
- **Append-Only Auditing**: Critical operations (document uploads, evidence reviews, inspection filings) generate immutable audit log records.
