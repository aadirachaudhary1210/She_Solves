# FoodShield — Digital Food-Safety, Hygiene, Compliance & Transparency Platform

**FoodShield** is an enterprise-grade digital food-safety, hygiene, compliance, and traceability platform designed for restaurants and government food-safety officers (FSSAI / Municipal Health Authorities).

FoodShield transforms traditional paperwork-heavy food-safety compliance and periodic inspections into a **continuously updated, evidence-driven, auditable, and transparent digital compliance system**.

## 🚀 Live Demo

👉 **[FoodShield — Live Demo](https://shesolves-frontend-git-main-aafreenm7.vercel.app/)**

> The live deployment currently hosts the FoodShield frontend. Backend/API deployment is required for full server-side functionality.

---

## 🌟 Key Architecture & Capabilities

### 1. Dual-Portal Role-Based Authorization

FoodShield provides dedicated workflows for both restaurant management and government food-safety officers.

#### 🏪 Restaurant Compliance Portal

- Live KPI compliance score meter (**92.5% — Low Risk**)
- Recipe and ingredient provenance management establishing:
  **Dish → Ingredient → Brand → Supplier → Stock Batch → Evidence**
- Stock intake with automated multi-parameter photographic evidence analysis
- Shift-based cleaning checklists across four facility zones:
  - Kitchen
  - Dining
  - Restrooms
  - Dry & Cold Storage
- Professional external cleaning agency contracts, invoices, and UPI payment proofs
- Pest-control scheduling with:
  - Chemical verification
  - Treatment history
  - Technician information
  - Next-visit countdown
- **Secondary Security Gate** using PIN re-authentication for sensitive employee personnel files and statutory document vaults
- Corrective-action response workflow with photographic proof submission

#### 🏛️ Government Food-Safety Officer Command Center

- Registered-establishment inspection registry
- Fuzzy search and risk-level filtering
- Compliance-score sorting
- Official establishment dossier view
- Worker privacy masking for sensitive identity documents
- Photographic Evidence Review Queue
- Automated evidence checks including:
  - EXIF metadata
  - Timestamp consistency
  - Duplicate-image detection
  - Location/geofencing checks
- Official inspection filing module
- Violation checklist and statutory directive deadlines
- Corrective-action monitoring and review
- Verified corrective-action closure workflow

---

## 🔍 2. Evidence Verification Architecture

FoodShield deliberately distinguishes between **automated technical/heuristic verification** and **authorized human officer verification**.

The system does **not** claim that automated analysis alone constitutes legal or regulatory verification.

### Evidence Verification Pipeline

1. **EXIF & Camera Metadata**
   - Extracts available camera/device metadata.
   - Checks image capture information and technical properties.

2. **Timestamp Consistency**
   - Compares device capture timestamp with server receipt time.
   - Helps identify potentially stale or recycled evidence.

3. **Geo-Fencing Analysis**
   - Validates available GPS coordinates against the registered restaurant premises.

4. **SHA-256 Duplicate Image Fingerprinting**
   - Generates cryptographic image fingerprints.
   - Detects previously submitted or reused evidence.

5. **Human Officer Review**
   - Authorized officers make the final determination.
   - Evidence can be marked:
     - 🟢 **Verified**
     - 🟡 **Requires Review**
     - 🔴 **Rejected**

This separation ensures that automated checks support, rather than replace, authorized regulatory decision-making.

---

## 📊 3. Dynamic Compliance Scoring Engine

FoodShield calculates a transparent compliance score out of 100 using weighted statutory and operational factors:

$$
\text{FoodShield Score} =
S_{\text{hygiene}}(25) +
S_{\text{stock}}(20) +
S_{\text{docs}}(20) +
S_{\text{pest}}(15) +
S_{\text{staff}}(10) +
S_{\text{corrective}}(10)
$$

### Scoring Components

| Compliance Factor | Weight |
|---|---:|
| Hygiene & Sanitation | 25 |
| Stock Traceability & Freshness | 20 |
| Statutory Regulatory Documents | 20 |
| Pest Control Currency | 15 |
| Staff Food-Safety Training | 10 |
| Corrective Actions | 10 |
| **Total** | **100** |

### Factors Considered

- **Hygiene & Sanitation (25 pts)**
  - Daily and shift checklist completion
  - Cleaning compliance across facility zones

- **Stock Traceability & Freshness (20 pts)**
  - Batch tracking
  - Expiry monitoring
  - Supplier verification
  - Evidence validation

- **Statutory Regulatory Documents (20 pts)**
  - FSSAI license
  - Delhi Fire Service NOC
  - Potability/water-test documentation
  - Document expiry tracking

- **Pest Control Currency (15 pts)**
  - Treatment history
  - Certification
  - Chemical verification
  - Upcoming treatment deadlines

- **Staff Food-Safety Training (10 pts)**
  - FOSTAC / HACCP training status
  - Staff compliance percentage

- **Corrective Actions (10 pts)**
  - Open corrective actions
  - Overdue actions
  - Inspector-issued notices
  - Verified closure

---

## 🗄️ Database Relational Design

The backend uses a relational SQLAlchemy ORM architecture consisting of **20+ specialized tables**.

### Core Entities

- `users`
  - Credentials
  - Role
  - Secondary security PIN
  - Audit references

- `restaurants`
  - Business registration
  - FSSAI number
  - Geographic information
  - Compliance score
  - Risk level

- `officer_profiles`
  - Badge ID
  - Jurisdiction zone
  - Department designation

### Ingredient & Provenance Management

- `menu_dishes`
- `ingredients`
- `brands`
- `suppliers`

These entities establish the provenance chain:

**Dish → Ingredient → Brand → Supplier → Stock Batch → Evidence**

### Stock & Evidence

- `stock_items`
- `stock_batches`
- `stock_evidence`

### Cleaning & Hygiene

- `cleaning_areas`
- `cleaning_tasks`
- `cleaning_logs`
- `cleaning_agency_records`

### Pest Control

- `pest_control_records`

### Employees & Training

- `employees`
- `staff_trainings`

Sensitive personnel information supports privacy-preserving masked display, such as:

`XXXX-XXXX-4819`

### Regulatory Documentation

- `compliance_documents`

Includes document protection and expiry tracking.

### Government Inspections

- `inspections`
- `inspection_violations`
- `corrective_actions`

### Auditability

- `audit_logs`

Critical operations are recorded with:

- Actor
- Action code
- Timestamp
- IP information
- Relevant audit references

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive dashboard UI
- Role-based portal navigation

### Backend

- Python
- FastAPI
- SQLAlchemy ORM
- REST API architecture
- Pydantic schemas

### Database

- Relational database architecture
- SQLAlchemy ORM
- Structured compliance and audit entities

### Security

- Password hashing
- Secondary PIN authentication
- Role-based access control
- Privacy masking
- SHA-256 evidence fingerprinting
- Append-only audit logging

### Deployment

- **Frontend:** Vercel
- **Source Code:** GitHub
- **Backend:** Local development / API deployment configuration

---

## 🚀 Quick Start

### Prerequisites

Make sure the following are installed:

- Python 3.9+
- Git
- A modern web browser

---

### 1. Clone the Repository

```bash
git clone https://github.com/aafreenm7/she_solves.git
cd she_solves
