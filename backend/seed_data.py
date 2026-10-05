"""
FoodShield - Realistic Database Seeding Script
Initializes sample restaurants, dishes, stock batches, cleaning checklists,
pest control records, protected staff records, compliance documents, inspections,
and audit logs for testing both Restaurant and Government Officer portals.
"""

from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from models import (
    User, UserRole, Restaurant, OfficerProfile, Brand, Supplier, MenuDish,
    Ingredient, StockItem, StockBatch, StockEvidence, CleaningArea, CleaningTask,
    CleaningLog, CleaningAgencyRecord, PestControlRecord, Employee, StaffTraining,
    ComplianceDocument, Inspection, InspectionViolation, CorrectiveAction,
    Notification, AuditLog, VerificationStatus, DocumentValidity, InspectionStatus,
    CorrectiveStatus
)
from auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    if db.query(User).filter(User.email == "restaurant@foodshield.com").first():
        print("Database already seeded with demo data.")
        db.close()
        return

    print("Seeding FoodShield production demo dataset...")

    # 1. Users
    restaurant_user = User(
        email="restaurant@foodshield.com",
        hashed_password=get_password_hash("Password123!"),
        security_pin_hash=get_password_hash("7788"), # Secondary PIN for Protected Staff & Docs
        full_name="Chef Vikram Mehra",
        phone="+91 98112 34567",
        role=UserRole.RESTAURANT
    )
    db.add(restaurant_user)

    officer_user = User(
        email="officer@foodshield.gov",
        hashed_password=get_password_hash("OfficerSecure2026!"),
        security_pin_hash=get_password_hash("9900"),
        full_name="Inspector Rajesh Sharma",
        phone="+91 98711 90022",
        role=UserRole.OFFICER
    )
    db.add(officer_user)
    db.commit()

    # 2. Officer Profile
    officer_profile = OfficerProfile(
        user_id=officer_user.id,
        badge_number="FSO-DL-4029",
        jurisdiction_zone="Central Delhi & Connaught Place Safety Division",
        designation="Senior Designated Food Safety Officer (FSO)",
        department="Food Safety & Standards Authority / Directorate of Health"
    )
    db.add(officer_profile)

    # 3. Restaurants (2 restaurants for officer search & comparison)
    restaurant_1 = Restaurant(
        owner_id=restaurant_user.id,
        name="The Royal Spice Kitchen",
        registration_number="FSSAI-10020011000432",
        license_type="FSSAI State License (Food Services / Full Dining)",
        category="Fine Dining & Mughlai Specialty",
        address="Shop 14-16, Outer Circle, Connaught Place",
        city="New Delhi",
        state="Delhi",
        pincode="110001",
        contact_phone="+91 11 4352 9900",
        contact_email="compliance@royalspice.com",
        compliance_score=92.5,
        risk_level="Low Risk",
        is_verified=True
    )
    db.add(restaurant_1)

    restaurant_2 = Restaurant(
        owner_id=restaurant_user.id,
        name="Green Leaf Bistro & Deli",
        registration_number="FSSAI-10021022008819",
        license_type="FSSAI Central License",
        category="Organic Cafe & Bakery",
        address="Plot 42, Sector 29 Market",
        city="Gurugram",
        state="Haryana",
        pincode="122002",
        contact_phone="+91 124 492 1100",
        contact_email="admin@greenleafbistro.com",
        compliance_score=76.0,
        risk_level="Moderate Risk",
        is_verified=True
    )
    db.add(restaurant_2)
    db.commit()

    # 4. Brands & Suppliers for Restaurant 1
    brand_amul = Brand(restaurant_id=restaurant_1.id, name="Amul (GCMMF)", manufacturer="Gujarat Co-operative Milk Marketing Federation", fssai_license="10012021000071")
    brand_fortune = Brand(restaurant_id=restaurant_1.id, name="Fortune Foods", manufacturer="Adani Wilmar Ltd.", fssai_license="10013021000210")
    brand_mdh = Brand(restaurant_id=restaurant_1.id, name="MDH Spices", manufacturer="Mahashian Di Hatti Pvt. Ltd.", fssai_license="10014011000543")
    brand_dawat = Brand(restaurant_id=restaurant_1.id, name="Daawat Basmati", manufacturer="LT Foods Limited", fssai_license="10013011000188")
    db.add_all([brand_amul, brand_fortune, brand_mdh, brand_dawat])
    db.commit()

    sup_dairy = Supplier(restaurant_id=restaurant_1.id, name="Capital Fresh Dairy Wholesale", contact_person="Ramesh Gupta", phone="+91 98100 12345", email="orders@capitaldairy.in", address="Khari Baoli, Old Delhi", fssai_license="23321001000341", rating=4.9)
    sup_grain = Supplier(restaurant_id=restaurant_1.id, name="Punjab Agro Spices & Grains", contact_person="Harpreet Singh", phone="+91 98111 67890", email="sales@punjabagro.com", address="Naya Bazar, Chandni Chowk", fssai_license="10019011000912", rating=4.7)
    sup_veg = Supplier(restaurant_id=restaurant_1.id, name="Greenfield Fresh Farm Produce", contact_person="Sunil Yadav", phone="+91 98990 44556", email="supply@greenfieldfarms.org", address="Azadpur Mandi, Delhi", fssai_license="13319001000582", rating=4.8)
    db.add_all([sup_dairy, sup_grain, sup_veg])
    db.commit()

    # 5. Menu Dishes & Ingredient Traceability
    dish_paneer = MenuDish(
        restaurant_id=restaurant_1.id,
        name="Paneer Butter Masala",
        category="Main Course",
        description="Rich cottage cheese cubes simmered in spiced tomato, butter, and cashew cream gravy.",
        selling_price=420.0,
        allergens="Dairy, Cashew Nuts",
        image_url="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80"
    )
    dish_biryani = MenuDish(
        restaurant_id=restaurant_1.id,
        name="Dum Pukht Basmati Biryani",
        category="Rice & Biryani",
        description="Slow-cooked aged Basmati rice layered with aromatic saffron, whole spices, and caramelized onions.",
        selling_price=480.0,
        allergens="Dairy",
        image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
    )
    db.add_all([dish_paneer, dish_biryani])
    db.commit()

    # Traceable Ingredients for Paneer Butter Masala
    ing1 = Ingredient(dish_id=dish_paneer.id, brand_id=brand_amul.id, supplier_id=sup_dairy.id, name="Malai Paneer Cubes", quantity=250.0, unit="grams", is_packaged=True, batch_number="AML-PAN-2026-B8", notes="Vacuum sealed cold chain dairy")
    ing2 = Ingredient(dish_id=dish_paneer.id, brand_id=brand_amul.id, supplier_id=sup_dairy.id, name="Salted Cooking Butter", quantity=40.0, unit="grams", is_packaged=True, batch_number="AML-BTR-4091", notes="Pasteurized butter")
    ing3 = Ingredient(dish_id=dish_paneer.id, brand_id=None, supplier_id=sup_veg.id, name="Fresh Organic Hybrid Tomatoes", quantity=200.0, unit="grams", is_packaged=False, notes="Graded Grade-A produce")
    ing4 = Ingredient(dish_id=dish_paneer.id, brand_id=brand_mdh.id, supplier_id=sup_grain.id, name="Kitchen King & Garam Masala Blend", quantity=15.0, unit="grams", is_packaged=True, batch_number="MDH-KK-118A", notes="Agmark certified")
    db.add_all([ing1, ing2, ing3, ing4])

    # 6. Stock Items & Batches with Photographic Evidence
    item_paneer = StockItem(restaurant_id=restaurant_1.id, name="Fresh Malai Paneer", category="Dairy", current_quantity=18.0, unit="kg", reorder_level=5.0)
    item_oil = StockItem(restaurant_id=restaurant_1.id, name="Fortune Refined Sunflower Oil", category="Cooking Oil", current_quantity=60.0, unit="liters", reorder_level=20.0)
    item_rice = StockItem(restaurant_id=restaurant_1.id, name="Daawat Biryani Basmati Rice (XXL)", category="Dry Grains", current_quantity=150.0, unit="kg", reorder_level=40.0)
    item_milk = StockItem(restaurant_id=restaurant_1.id, name="Amul Gold Full Cream Milk", category="Dairy", current_quantity=24.0, unit="liters", reorder_level=10.0)
    db.add_all([item_paneer, item_oil, item_rice, item_milk])
    db.commit()

    now = datetime.utcnow()
    batch_paneer = StockBatch(
        stock_item_id=item_paneer.id,
        supplier_id=sup_dairy.id,
        batch_number="AML-PAN-2026-B8",
        quantity=20.0,
        unit="kg",
        purchase_price=360.0,
        purchase_date=now - timedelta(days=2),
        expiry_date=now + timedelta(days=8),
        invoice_number="INV-CAP-2026-8819",
        status="fresh",
        notes="Stored in Walk-in Chiller Unit #2 at 3.4°C"
    )
    batch_oil = StockBatch(
        stock_item_id=item_oil.id,
        supplier_id=sup_grain.id,
        batch_number="AWL-SO-0941",
        quantity=60.0,
        unit="liters",
        purchase_price=145.0,
        purchase_date=now - timedelta(days=10),
        expiry_date=now + timedelta(days=180),
        invoice_number="INV-PAG-4491",
        status="fresh",
        notes="Factory sealed tin drums"
    )
    batch_milk = StockBatch(
        stock_item_id=item_milk.id,
        supplier_id=sup_dairy.id,
        batch_number="AML-MLK-881",
        quantity=24.0,
        unit="liters",
        purchase_price=66.0,
        purchase_date=now - timedelta(days=1),
        expiry_date=now + timedelta(days=2), # Expiring soon!
        invoice_number="INV-CAP-2026-8840",
        status="expiring_soon",
        notes="Daily morning delivery batch"
    )
    db.add_all([batch_paneer, batch_oil, batch_milk])
    db.commit()

    # Evidence for stock
    evidence_1 = StockEvidence(
        batch_id=batch_paneer.id,
        image_url="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
        upload_timestamp=now - timedelta(days=2),
        uploaded_by="Store In-charge Suraj",
        latitude=28.6315,
        longitude=77.2167,
        device_info="Samsung Galaxy Tab A8 (Kitchen Device #1)",
        automated_status=VerificationStatus.VERIFIED,
        officer_status=VerificationStatus.VERIFIED,
        confidence_score=96.4,
        verification_reasons="EXIF metadata verified, Geo-fence Connaught Place matched, no tampering detected."
    )
    db.add(evidence_1)

    # 7. Hygiene & Cleaning System: Areas, Tasks, and Logs
    area_kitchen = CleaningArea(restaurant_id=restaurant_1.id, name="Kitchen & Food Prep Zone")
    area_dining = CleaningArea(restaurant_id=restaurant_1.id, name="Dining Hall & Service Stations")
    area_restrooms = CleaningArea(restaurant_id=restaurant_1.id, name="Restrooms & Hand-wash Stations")
    area_storage = CleaningArea(restaurant_id=restaurant_1.id, name="Dry Storage & Cold Walk-in")
    db.add_all([area_kitchen, area_dining, area_restrooms, area_storage])
    db.commit()

    task_k1 = CleaningTask(area_id=area_kitchen.id, task_name="Disinfect prep counters & cutting boards with food-grade sanitizing spray", frequency="multiple_times_daily", shift="all")
    task_k2 = CleaningTask(area_id=area_kitchen.id, task_name="Degrease cooking ranges, deep fryers, and tandoor exhaust hood", frequency="daily", shift="evening")
    task_k3 = CleaningTask(area_id=area_kitchen.id, task_name="Floor deep scrub with high-temperature antimicrobial detergent", frequency="daily", shift="evening")
    task_d1 = CleaningTask(area_id=area_dining.id, task_name="Sanitize all dining table tops, chairs, and condiment holders", frequency="multiple_times_daily", shift="all")
    task_r1 = CleaningTask(area_id=area_restrooms.id, task_name="Restroom toilet sanitation, mirror wipe, refill antibacterial foam soap", frequency="daily", shift="morning")
    task_s1 = CleaningTask(area_id=area_storage.id, task_name="Inspect dry ingredient pallets for moisture or pest intrusion", frequency="daily", shift="morning")
    db.add_all([task_k1, task_k2, task_k3, task_d1, task_r1, task_s1])
    db.commit()

    # Shift cleaning logs
    log_1 = CleaningLog(task_id=task_k1.id, date=now, shift="morning", status="completed", performed_by="Kishore (Hygiene Lead)", notes="Completed at 07:30 AM before prep shift started.")
    log_2 = CleaningLog(task_id=task_k1.id, date=now, shift="afternoon", status="completed", performed_by="Kishore (Hygiene Lead)", notes="Post-lunch rush sanitization cycle.")
    log_3 = CleaningLog(task_id=task_k2.id, date=now - timedelta(days=1), shift="evening", status="completed", performed_by="Ravi (Kitchen Porter)", notes="Filter cleaned with hot degreaser.")
    log_4 = CleaningLog(task_id=task_r1.id, date=now, shift="morning", status="completed", performed_by="Deepak (Housekeeping)", notes="All soap and automated hand dryers verified operational.")
    db.add_all([log_1, log_2, log_3, log_4])

    # External Cleaning Agency
    agency_record = CleaningAgencyRecord(
        restaurant_id=restaurant_1.id,
        agency_name="CleanTech Commercial Hygiene Services Ltd.",
        contact_number="+91 99100 88221",
        address="B-41 Okhla Industrial Area Phase 2, New Delhi",
        service_type="Heavy Chimney Duct, Exhaust & Grease Trap Hydro-Jet Cleaning",
        service_date=now - timedelta(days=18),
        service_frequency="Monthly Contract",
        upi_reference="UPI/2026/CTECH/99812001",
        remarks="Certificate of compliance issued. Duct free from combustible grease deposits."
    )
    db.add(agency_record)

    # 8. Pest Control Management
    pest_record = PestControlRecord(
        restaurant_id=restaurant_1.id,
        agency_name="PestGuard Industrial Pest Solutions",
        agency_contact="+91 11 2688 4400",
        agency_address="Plot 104, Barakhamba Road, Connaught Place",
        service_date=now - timedelta(days=22),
        next_service_date=now + timedelta(days=8), # Due soon!
        treatment_type="Targeted Cockroach Gel Matrix & Ultrasonic Rodent Deterrence",
        areas_treated="Main Kitchen, Pantry, Dishwashing Drains, Dry Store Racks",
        chemicals_used="Maxforce FC Magnum (Fipronil 0.05%), Rat Glue Trap stations #1-12",
        technician_name="Ajay Verma (Certified Pest Management Professional #PMP-2041)",
        remarks="Zero pest infestation observed during comprehensive night inspection.",
        status="due_soon"
    )
    db.add(pest_record)

    # 9. Staff Management & Food Safety Training (PROTECTED SECTION)
    emp_1 = Employee(
        restaurant_id=restaurant_1.id,
        full_name="Chef Sunita Rao",
        phone="+91 98733 11223",
        address="Pocket B, Mayur Vihar Phase 1, Delhi",
        date_of_joining=now - timedelta(days=720),
        designation="Executive Head Chef",
        department="Culinary Operations",
        previous_workplace="ITC Maurya Sheraton",
        total_experience_years=12.5,
        masked_government_id="XXXX-XXXX-4819",
        masked_pan="ABCDE****K",
        medical_fitness_status="Certified Fit (Annual Medical Exam Passed)",
        medical_certificate_expiry=now + timedelta(days=240),
        emergency_contact_name="Mahesh Rao (Spouse)",
        emergency_contact_phone="+91 98733 99881",
        employment_status="active"
    )
    emp_2 = Employee(
        restaurant_id=restaurant_1.id,
        full_name="Kishore Kumar",
        phone="+91 98118 77665",
        address="Laxmi Nagar, Delhi",
        date_of_joining=now - timedelta(days=360),
        designation="Kitchen Hygiene Supervisor",
        department="Sanitation & Store",
        previous_workplace="Haldiram's CP Outlet",
        total_experience_years=5.0,
        masked_government_id="XXXX-XXXX-9902",
        masked_pan="BKFPR****D",
        medical_fitness_status="Certified Fit",
        medical_certificate_expiry=now + timedelta(days=180),
        emergency_contact_name="Sarla Devi (Mother)",
        emergency_contact_phone="+91 98118 00112",
        employment_status="active"
    )
    db.add_all([emp_1, emp_2])
    db.commit()

    training_1 = StaffTraining(
        employee_id=emp_1.id,
        training_name="FSSAI FOSTAC Advance Food Safety Supervisor (Catering)",
        provider="CII Institute of Quality / FSSAI Accredited",
        training_date=now - timedelta(days=120),
        certificate_expiry=now + timedelta(days=610),
        status="valid"
    )
    training_2 = StaffTraining(
        employee_id=emp_2.id,
        training_name="HACCP Critical Control Points & Kitchen Chemical Safety",
        provider="National Safety Training Academy",
        training_date=now - timedelta(days=300),
        certificate_expiry=now + timedelta(days=45), # Expiring soon!
        status="expiring_soon"
    )
    db.add_all([training_1, training_2])

    # 10. Compliance Documents (PROTECTED SECTION)
    doc_fssai = ComplianceDocument(
        restaurant_id=restaurant_1.id,
        category="fssai_license",
        document_name="FSSAI Food Business Operator State License",
        document_number="10020011000432",
        issuing_authority="Food Safety & Standards Authority of India (FSSAI)",
        issue_date=now - timedelta(days=400),
        expiry_date=now + timedelta(days=330),
        validity_status=DocumentValidity.VALID,
        verification_status=VerificationStatus.VERIFIED,
        notes="Mandatory display copy framed at entrance cash desk."
    )
    doc_fire = ComplianceDocument(
        restaurant_id=restaurant_1.id,
        category="fire_safety",
        document_name="Delhi Fire Service No-Objection Certificate (NOC)",
        document_number="DFS/NOC/ND/2025/7821",
        issuing_authority="Delhi Fire Service Headquarters",
        issue_date=now - timedelta(days=350),
        expiry_date=now + timedelta(days=15), # Expiring soon!
        validity_status=DocumentValidity.EXPIRING_SOON,
        verification_status=VerificationStatus.VERIFIED,
        notes="Fire suppression cylinders tested and certified."
    )
    doc_water = ComplianceDocument(
        restaurant_id=restaurant_1.id,
        category="water_test",
        document_name="Potable Drinking & Cooking Water Bacteriological Test Report",
        document_number="NABL-LAB-WTR-2026-440",
        issuing_authority="Delhi Jal Board / NABL Accredited Environmental Lab",
        issue_date=now - timedelta(days=45),
        expiry_date=now + timedelta(days=135),
        validity_status=DocumentValidity.VALID,
        verification_status=VerificationStatus.VERIFIED,
        notes="Coliform absent, TDS 88 ppm, Meets IS 10500:2012 Drinking Water standards."
    )
    db.add_all([doc_fssai, doc_fire, doc_water])

    # 11. Government Inspection & Violations
    insp_1 = Inspection(
        restaurant_id=restaurant_1.id,
        officer_id=officer_profile.id,
        inspection_date=now - timedelta(days=14),
        inspection_type="Scheduled Bi-Annual Safety Audit",
        status=InspectionStatus.PASSED_WITH_CONDITIONS,
        score=91.5,
        findings="Premises well-kept. Cold chain temperatures maintained properly. Deep cleaning records verified.",
        violations_summary="1 minor violation identified regarding ventilation duct cleaning record documentation.",
        remarks="Overall compliant restaurant with high transparency and active digital logging."
    )
    db.add(insp_1)
    db.commit()

    viol_1 = InspectionViolation(
        inspection_id=insp_1.id,
        category="Ventilation & Exhaust",
        severity="Minor",
        description="Secondary kitchen exhaust hood oil-collection tray requires more frequent cleaning logs.",
        reference_code="FSSAI-SCHED-IV-SEC-5",
        is_rectified=False
    )
    db.add(viol_1)

    # 12. Corrective Action Workflow
    corrective_1 = CorrectiveAction(
        restaurant_id=restaurant_1.id,
        inspection_id=insp_1.id,
        issue_title="Exhaust Hood Secondary Tray Cleaning Log Missing",
        issue_description="Officer noted that secondary hood tray cleaning was not logged with photo evidence for the preceding 10 days.",
        required_action="Perform thorough degreasing of secondary hood trays and submit photographic evidence with signed log.",
        deadline=now + timedelta(days=5),
        status=CorrectiveStatus.PENDING,
        restaurant_response=None
    )
    db.add(corrective_1)

    # 13. Alerts & Notifications
    notif_1 = Notification(
        user_id=restaurant_user.id,
        restaurant_id=restaurant_1.id,
        title="Fire Safety NOC Expiring Soon",
        message="Delhi Fire Service NOC (DFS/NOC/ND/2025/7821) expires in 15 days. Initiate renewal inspection immediately.",
        category="expiry",
        priority="high"
    )
    notif_2 = Notification(
        user_id=restaurant_user.id,
        restaurant_id=restaurant_1.id,
        title="Pending Corrective Action Deadline",
        message="Corrective action for Exhaust Hood Secondary Tray is due in 5 days.",
        category="corrective",
        priority="medium"
    )
    notif_3 = Notification(
        user_id=restaurant_user.id,
        restaurant_id=restaurant_1.id,
        title="Amul Gold Milk Batch Expiring",
        message="24 Liters of Full Cream Milk batch AML-MLK-881 expires in 2 days.",
        category="expiry",
        priority="medium"
    )
    db.add_all([notif_1, notif_2, notif_3])

    # 14. Audit Logs (Append-Only)
    audit_1 = AuditLog(
        user_id=restaurant_user.id,
        user_email=restaurant_user.email,
        user_role="restaurant",
        restaurant_id=restaurant_1.id,
        action="LOGIN_SUCCESS",
        entity_type="AuthSession",
        details="User logged into FoodShield Restaurant Portal via two-factor session.",
        ip_address="192.168.1.45",
        timestamp=now - timedelta(hours=3)
    )
    audit_2 = AuditLog(
        user_id=restaurant_user.id,
        user_email=restaurant_user.email,
        user_role="restaurant",
        restaurant_id=restaurant_1.id,
        action="STOCK_BATCH_ADDED",
        entity_type="StockBatch",
        entity_id=batch_paneer.id,
        details="Added 20 kg Fresh Malai Paneer batch AML-PAN-2026-B8 with photographic evidence.",
        ip_address="192.168.1.45",
        timestamp=now - timedelta(days=2)
    )
    audit_3 = AuditLog(
        user_id=officer_user.id,
        user_email=officer_user.email,
        user_role="officer",
        restaurant_id=restaurant_1.id,
        action="EVIDENCE_VERIFIED",
        entity_type="StockEvidence",
        entity_id=evidence_1.id,
        details="Inspector Rajesh Sharma reviewed and approved stock intake evidence for batch AML-PAN-2026-B8.",
        ip_address="10.20.4.19",
        timestamp=now - timedelta(days=1)
    )
    db.add_all([audit_1, audit_2, audit_3])

    db.commit()
    db.close()
    print("Demo dataset successfully seeded!")

if __name__ == "__main__":
    seed_database()
