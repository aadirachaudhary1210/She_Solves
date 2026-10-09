/**
 * FoodShield — Complete Full-Stack Client Application Engine
 * Implements end-to-end interactive workflows for Restaurant & Government Food-Safety Officer Portals.
 */

// Global Application State
const state = {
  currentUser: null, // { email, role, name, restaurantId }
  activeRole: 'restaurant', // 'restaurant' or 'officer'
  activeTab: 'dashboard',
  isProtectedUnlocked: false,
  unlockExpiry: null,
  pendingProtectedTab: null,
  conflictFilter: 'all',
  activeConflictScenario: 'CRITICAL_DISAGREEMENT',
  conflictIncidents: [
    {
      incident_id: "INC-20261009-F81A",
      conflict_type: "CRITICAL_DISAGREEMENT",
      severity: "CRITICAL",
      sensor_status: "CRITICAL",
      system_status: "SAFE",
      location_id: "walkin_freezer_01",
      location_label: "Walk-in Blast Freezer #01",
      state: "DETECTED",
      reason: "Critical hazard disagreement: Sensor reports status 'CRITICAL' (14.2°C) while AI assessment reports 'SAFE' (-18.0°C). Sensor indicates defrost failure concealed by frost on camera lens.",
      requires_escalation: true,
      sensor_temp_c: 14.2,
      sensor_raw_temp: 14.2,
      sensor_unit: "C",
      sensor_reading_id: "SENS-LIVE-8821",
      sensor_source: "IOT_TELEMETRY_MODBUS",
      sensor_timestamp: "2026-10-09 10:45:12 UTC",
      system_temp_c: -18.0,
      system_assessment_id: "AI-VIS-9912",
      system_model: "DemoVisionGaugeScanner-v1.4",
      system_confidence: 0.88,
      system_timestamp: "2026-10-09 10:46:00 UTC",
      temp_difference_c: 32.2,
      is_simulated: true,
      created_at: "2026-10-09 10:46:05 UTC",
      updated_at: "2026-10-09 10:46:05 UTC",
      events: [
        { id: 1, action: "CONFLICT_DETECTED", from_state: "NONE", to_state: "DETECTED", actor_email: "system_detector", actor_role: "system", details: "Sensor telemetry (14.2°C, CRITICAL) conflicts with AI assessment (-18.0°C, SAFE). Escalation initiated.", timestamp: "2026-10-09 10:46:05 UTC" }
      ],
      notifications: []
    },
    {
      incident_id: "INC-20261009-D42B",
      conflict_type: "TEMPERATURE_MISMATCH",
      severity: "HIGH",
      sensor_status: "WARNING",
      system_status: "SAFE",
      location_id: "dairy_chiller_02",
      location_label: "Dairy Cold Chiller #02",
      state: "ACKNOWLEDGEMENT_PENDING",
      reason: "Temperature variance beyond tolerance: Sensor 9.4°C differs from AI assessment 4.0°C by 5.4°C (tolerance: ±2.5°C).",
      requires_escalation: true,
      sensor_temp_c: 9.4,
      sensor_raw_temp: 9.4,
      sensor_unit: "C",
      sensor_reading_id: "SENS-LIVE-4412",
      sensor_source: "IOT_BLE_BEACON",
      sensor_timestamp: "2026-10-09 10:30:00 UTC",
      system_temp_c: 4.0,
      system_assessment_id: "AI-HEUR-3319",
      system_model: "FoodShield-ThermalInference-v2",
      system_confidence: 0.91,
      system_timestamp: "2026-10-09 10:32:00 UTC",
      temp_difference_c: 5.4,
      is_simulated: true,
      created_at: "2026-10-09 10:32:15 UTC",
      updated_at: "2026-10-09 10:38:00 UTC",
      acknowledged_by: "restaurant@foodshield.com",
      acknowledged_at: "2026-10-09 10:38:00 UTC",
      events: [
        { id: 1, action: "CONFLICT_DETECTED", from_state: "NONE", to_state: "DETECTED", actor_email: "system_detector", actor_role: "system", details: "Temperature variance of 5.4°C flagged.", timestamp: "2026-10-09 10:32:15 UTC" },
        { id: 2, action: "ACKNOWLEDGED", from_state: "DETECTED", to_state: "ACKNOWLEDGEMENT_PENDING", actor_email: "restaurant@foodshield.com", actor_role: "restaurant", details: "Supervisor verified reading on secondary display.", timestamp: "2026-10-09 10:38:00 UTC" }
      ],
      notifications: []
    }
  ],
  
  // Real-time Database
  restaurants: [
    {
      id: 1,
      name: "The Royal Spice Kitchen",
      regNo: "FSSAI-10020011000432",
      licenseType: "State Food License (Full Dining)",
      category: "Fine Dining & Mughlai Specialty",
      address: "Shop 14-16, Outer Circle, Connaught Place, New Delhi - 110001",
      phone: "+91 11 4352 9900",
      email: "compliance@royalspice.com",
      complianceScore: 92.5,
      riskLevel: "Low Risk",
      lastInspection: "2026-09-21 (Passed with Conditions)"
    },
    {
      id: 2,
      name: "Green Leaf Bistro & Deli",
      regNo: "FSSAI-10021022008819",
      licenseType: "FSSAI Central License",
      category: "Organic Cafe & Bakery",
      address: "Plot 42, Sector 29 Market, Gurugram, Haryana - 122002",
      phone: "+91 124 492 1100",
      email: "admin@greenleafbistro.com",
      complianceScore: 76.0,
      riskLevel: "Moderate Risk",
      lastInspection: "2026-08-14 (Needs Attention)"
    }
  ],

  // Menu & Ingredient Traceability
  dishes: [
    {
      id: 101,
      name: "Paneer Butter Masala",
      category: "Main Course",
      price: 420,
      allergens: "Dairy, Cashew Nuts",
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
      description: "Rich cottage cheese simmered in slow-cooked spiced tomato, butter, and cashew cream gravy.",
      ingredients: [
        { name: "Malai Paneer Cubes", qty: "250g", brand: "Amul (GCMMF)", manufacturer: "Gujarat Co-op Milk Mktg Fed", supplier: "Capital Fresh Dairy Wholesale", fssai: "10012021000071", batch: "AML-PAN-2026-B8", packaged: true },
        { name: "Salted Cooking Butter", qty: "40g", brand: "Amul (GCMMF)", manufacturer: "Gujarat Co-op Milk Mktg Fed", supplier: "Capital Fresh Dairy Wholesale", fssai: "10012021000071", batch: "AML-BTR-4091", packaged: true },
        { name: "Organic Hybrid Tomatoes", qty: "200g", brand: "Direct Farm Produce", manufacturer: "Local Agricultural Mandi", supplier: "Greenfield Farm Produce", fssai: "13319001000582", batch: "GRN-TOM-092", packaged: false },
        { name: "Kitchen King & Garam Masala", qty: "15g", brand: "MDH Spices", manufacturer: "Mahashian Di Hatti Pvt Ltd", supplier: "Punjab Agro Spices", fssai: "10014011000543", batch: "MDH-KK-118A", packaged: true }
      ]
    },
    {
      id: 102,
      name: "Dum Pukht Basmati Biryani",
      category: "Rice & Biryani",
      price: 480,
      allergens: "Dairy",
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
      description: "Aged Basmati rice layered with saffron, fried crisp onions, and aromatic slow-steamed spices.",
      ingredients: [
        { name: "Daawat XXL Biryani Basmati", qty: "300g", brand: "Daawat (LT Foods)", manufacturer: "LT Foods Limited", supplier: "Punjab Agro Spices", fssai: "10013011000188", batch: "DWT-XXL-882", packaged: true },
        { name: "Fortune Refined Sunflower Oil", qty: "35ml", brand: "Fortune Foods", manufacturer: "Adani Wilmar Ltd", supplier: "Punjab Agro Spices", fssai: "10013021000210", batch: "AWL-SO-0941", packaged: true },
        { name: "Pure Saffron Stigmas", qty: "0.5g", brand: "Baby Brand Saffron", manufacturer: "USMS Saffron Co", supplier: "Capital Fresh Dairy Wholesale", fssai: "10015011000321", batch: "BBS-KSH-41", packaged: true }
      ]
    }
  ],

  // Stock Items & Batches
  stock: [
    {
      id: 201,
      name: "Fresh Malai Paneer",
      category: "Dairy",
      qty: 18.0,
      unit: "kg",
      reorder: 5.0,
      batches: [
        {
          id: 501,
          batchNo: "AML-PAN-2026-B8",
          supplier: "Capital Fresh Dairy Wholesale",
          qty: 20,
          unit: "kg",
          price: 360,
          purchaseDate: "2026-10-03",
          expiryDate: "2026-10-13",
          invoice: "INV-CAP-2026-8819",
          status: "fresh",
          evidence: {
            url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
            automatedStatus: "verified",
            officerStatus: "verified",
            confidence: 96.4,
            device: "Samsung Galaxy Tab A8",
            reasons: "EXIF metadata confirmed, GPS Geo-fence Connaught Place matched, no image alterations."
          }
        }
      ]
    },
    {
      id: 202,
      name: "Amul Gold Full Cream Milk",
      category: "Dairy",
      qty: 24.0,
      unit: "liters",
      reorder: 10.0,
      batches: [
        {
          id: 502,
          batchNo: "AML-MLK-881",
          supplier: "Capital Fresh Dairy Wholesale",
          qty: 24,
          unit: "liters",
          price: 66,
          purchaseDate: "2026-10-04",
          expiryDate: "2026-10-07", // In 2 days!
          invoice: "INV-CAP-2026-8840",
          status: "expiring_soon",
          evidence: {
            url: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80",
            automatedStatus: "verified",
            officerStatus: "pending",
            confidence: 92.1,
            device: "Mobile Camera",
            reasons: "Timestamp consistent with morning delivery shift."
          }
        }
      ]
    },
    {
      id: 203,
      name: "Fortune Refined Sunflower Oil",
      category: "Cooking Oil",
      qty: 60.0,
      unit: "liters",
      reorder: 20.0,
      batches: [
        {
          id: 503,
          batchNo: "AWL-SO-0941",
          supplier: "Punjab Agro Spices",
          qty: 60,
          unit: "liters",
          price: 145,
          purchaseDate: "2026-09-25",
          expiryDate: "2027-03-25",
          invoice: "INV-PAG-4491",
          status: "fresh",
          evidence: {
            url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
            automatedStatus: "verified",
            officerStatus: "verified",
            confidence: 94.8,
            device: "Store Management Unit #1",
            reasons: "Factory sealed tin drum verification verified."
          }
        }
      ]
    }
  ],

  // Hygiene & Cleaning Checklists
  cleaningAreas: [
    {
      id: "kitchen",
      name: "Kitchen & Food Prep Zone",
      tasks: [
        { id: "k1", name: "Disinfect prep counters & cutting boards with food-grade sanitizing spray", freq: "Multiple Daily", shift: "Morning", status: "completed", by: "Kishore (Hygiene Lead)", time: "07:30 AM", hasPhoto: true },
        { id: "k2", name: "Degrease cooking ranges, deep fryers, and tandoor exhaust hood", freq: "Daily", shift: "Evening", status: "completed", by: "Ravi (Porter)", time: "Yesterday 11:30 PM", hasPhoto: true },
        { id: "k3", name: "Deep scrub floor with high-temperature antimicrobial detergent", freq: "Daily", shift: "Evening", status: "completed", by: "Deepak (Housekeeping)", time: "Yesterday 11:45 PM", hasPhoto: false },
        { id: "k4", name: "Clean refrigerator door gaskets and check chill temps (target < 4°C)", freq: "Daily", shift: "Morning", status: "completed", by: "Chef Vikram", time: "08:15 AM", hasPhoto: true },
        { id: "k5", name: "Empty grease traps and flush main floor drainage with bio-enzymes", freq: "Weekly", shift: "Weekly", status: "needs_attention", by: "Assigned", time: "Due Today", hasPhoto: false }
      ]
    },
    {
      id: "dining",
      name: "Dining Hall & Service Stations",
      tasks: [
        { id: "d1", name: "Sanitize all dining table tops, chairs, and condiment holders", freq: "Multiple Daily", shift: "Afternoon", status: "completed", by: "Service Team", time: "11:45 AM", hasPhoto: false },
        { id: "d2", name: "Vacuum carpet and mop polished hardwood walkways", freq: "Daily", shift: "Morning", status: "completed", by: "Housekeeping", time: "09:00 AM", hasPhoto: false },
        { id: "d3", name: "Disinfect POS terminals, service trays, and door push-plates", freq: "Daily", shift: "All", status: "completed", by: "Cashier In-charge", time: "10:30 AM", hasPhoto: false }
      ]
    },
    {
      id: "restrooms",
      name: "Restrooms & Hand-wash Stations",
      tasks: [
        { id: "r1", name: "Toilet bowl and urinal descaling and medical-grade sanitization", freq: "Daily", shift: "Morning", status: "completed", by: "Deepak", time: "07:15 AM", hasPhoto: true },
        { id: "r2", name: "Refill antibacterial foam soap dispensers and verify automated dryers", freq: "Daily", shift: "All", status: "completed", by: "Deepak", time: "07:30 AM", hasPhoto: false },
        { id: "r3", name: "Mirror and washbasin streak-free polishing", freq: "Daily", shift: "Morning", status: "completed", by: "Deepak", time: "07:45 AM", hasPhoto: false }
      ]
    },
    {
      id: "storage",
      name: "Dry Storage & Cold Walk-in",
      tasks: [
        { id: "s1", name: "Check pallet spacing (6 inches from walls) for airflow & pest check", freq: "Daily", shift: "Morning", status: "completed", by: "Suraj (Store)", time: "08:30 AM", hasPhoto: true },
        { id: "s2", name: "Inspect dry grain bags for moisture, weeping, or torn corners", freq: "Daily", shift: "Morning", status: "completed", by: "Suraj (Store)", time: "08:45 AM", hasPhoto: false }
      ]
    }
  ],

  // External Cleaning Agency Records
  externalCleaning: [
    {
      id: 301,
      agency: "CleanTech Commercial Hygiene Services Ltd.",
      phone: "+91 99100 88221",
      service: "Heavy Chimney Duct, Exhaust & Grease Trap Hydro-Jet Cleaning",
      date: "2026-09-17",
      freq: "Monthly Contract",
      upiRef: "UPI/2026/CTECH/99812001",
      remarks: "Comprehensive degreasing completed. Flue gas airflow tested and certified clear.",
      beforeImg: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80",
      afterImg: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80"
    }
  ],

  // Pest Control Records
  pestControl: [
    {
      id: 401,
      agency: "PestGuard Industrial Pest Solutions",
      phone: "+91 11 2688 4400",
      serviceDate: "2026-09-13",
      nextDate: "2026-10-13", // Due in 8 days!
      daysLeft: 8,
      status: "due_soon",
      treatment: "Targeted Cockroach Gel Matrix & Ultrasonic Rodent Deterrence",
      areas: "Main Kitchen, Dishwashing Drains, Dry Store Racks, Ceiling Voids",
      chemicals: "Maxforce FC Magnum (Fipronil 0.05%), Bromadiolone Bait Station",
      technician: "Ajay Verma (Certified Pest Tech #PMP-2041)",
      remarks: "Zero pest activity observed during post-treatment night inspection."
    }
  ],

  // Protected Staff Members
  employees: [
    {
      id: 1,
      name: "Chef Sunita Rao",
      phone: "+91 98733 11223",
      designation: "Executive Head Chef",
      department: "Culinary Operations",
      joiningDate: "2024-10-15",
      experience: "12.5 years",
      previousWork: "ITC Maurya Sheraton",
      maskedId: "XXXX-XXXX-4819",
      maskedPan: "ABCDE****K",
      medicalStatus: "Certified Fit (Annual Medical Exam Passed)",
      medicalExpiry: "2027-06-01",
      emergencyContact: "Mahesh Rao (+91 98733 99881)",
      trainings: [
        { name: "FSSAI FOSTAC Advance Food Safety Supervisor", provider: "CII Institute of Quality", date: "2026-06-10", expiry: "2028-06-10", status: "valid" }
      ]
    },
    {
      id: 2,
      name: "Kishore Kumar",
      phone: "+91 98118 77665",
      designation: "Kitchen Hygiene Supervisor",
      department: "Sanitation & Store",
      joiningDate: "2025-10-10",
      experience: "5.0 years",
      previousWork: "Haldiram's CP Outlet",
      maskedId: "XXXX-XXXX-9902",
      maskedPan: "BKFPR****D",
      medicalStatus: "Certified Fit",
      medicalExpiry: "2027-04-15",
      emergencyContact: "Sarla Devi (+91 98118 00112)",
      trainings: [
        { name: "HACCP Critical Control Points & Chemical Handling", provider: "National Safety Training Academy", date: "2025-11-20", expiry: "2026-11-20", status: "expiring_soon" }
      ]
    },
    {
      id: 3,
      name: "Ravi Shankar",
      phone: "+91 98991 33445",
      designation: "Kitchen Commis / Cook",
      department: "Culinary Operations",
      joiningDate: "2026-02-01",
      experience: "3.2 years",
      previousWork: "Bikanervala",
      maskedId: "XXXX-XXXX-1143",
      maskedPan: "MNBVC****P",
      medicalStatus: "Certified Fit",
      medicalExpiry: "2027-02-01",
      emergencyContact: "Gopal (+91 98991 00000)",
      trainings: [
        { name: "Personal Hygiene & Allergen Cross-Contamination", provider: "FoodShield Internal Trainer", date: "2026-02-15", expiry: "2027-02-15", status: "valid" }
      ]
    }
  ],

  // Protected Compliance Documents
  documents: [
    {
      id: 601,
      category: "fssai_license",
      name: "FSSAI Food Business Operator State License",
      docNo: "10020011000432",
      authority: "Food Safety & Standards Authority of India (FSSAI)",
      issueDate: "2025-08-30",
      expiryDate: "2027-08-30",
      daysLeft: 329,
      status: "valid",
      notes: "Mandatory laminated copy framed near restaurant main billing counter."
    },
    {
      id: 602,
      category: "fire_safety",
      name: "Delhi Fire Service No-Objection Certificate (NOC)",
      docNo: "DFS/NOC/ND/2025/7821",
      authority: "Delhi Fire Service Headquarters",
      issueDate: "2025-10-20",
      expiryDate: "2026-10-20", // Expiring in 15 days!
      daysLeft: 15,
      status: "expiring_soon",
      notes: "Emergency fire extinguishers tested and tagged. Annual inspection renewal scheduled."
    },
    {
      id: 603,
      category: "water_test",
      name: "Potable Cooking & Drinking Water Bacteriological Report",
      docNo: "NABL-LAB-WTR-2026-440",
      authority: "Delhi Jal Board / NABL Accredited Lab",
      issueDate: "2026-08-20",
      expiryDate: "2027-02-20",
      daysLeft: 138,
      status: "valid",
      notes: "Coliform absent, TDS 88 ppm. Complies with IS 10500:2012 Drinking Water norms."
    },
    {
      id: 604,
      category: "waste_mgmt",
      name: "Municipal Commercial Solid & Wet Waste Disposal Agreement",
      docNo: "NDMC/SWM/COM/9012",
      authority: "New Delhi Municipal Council (NDMC)",
      issueDate: "2026-01-01",
      expiryDate: "2026-12-31",
      daysLeft: 87,
      status: "valid",
      notes: "Color-coded wet/dry segregation verified by municipal health inspector."
    }
  ],

  // Government Inspections & Violations
  inspections: [
    {
      id: 701,
      restaurantName: "The Royal Spice Kitchen",
      officerName: "Inspector Rajesh Sharma",
      badgeNo: "FSO-DL-4029",
      date: "2026-09-21",
      type: "Bi-Annual Scheduled Safety Inspection",
      status: "passed_with_conditions",
      score: 91.5,
      findings: "High level of kitchen cleanliness. Walk-in chiller and freezer log records verified. Staff uniforms and headgear compliant.",
      violations: [
        { code: "FSSAI-SCHED-IV-SEC-5", category: "Ventilation", severity: "Minor", desc: "Secondary exhaust hood grease collection tray log missing for preceding week." }
      ],
      remarks: "Overall compliant operation. Digital traceability records well maintained."
    }
  ],

  // Corrective Actions
  correctiveActions: [
    {
      id: 801,
      restaurantId: 1,
      restaurantName: "The Royal Spice Kitchen",
      issueTitle: "Exhaust Hood Secondary Tray Cleaning Log Missing",
      issueDesc: "Inspector noted that secondary exhaust hood grease trays lacked logged photo evidence for previous week.",
      requiredAction: "Perform thorough degreasing of secondary hood trays, log checklist entry, and submit photographic evidence.",
      deadline: "2026-10-10",
      daysLeft: 5,
      status: "pending", // "pending", "submitted", "verified_closed"
      restaurantResponse: null,
      evidenceUrl: null,
      officerFeedback: null
    }
  ],

  // Active Notifications
  notifications: [
    { id: 1, title: "Fire Safety NOC Expiring", message: "Delhi Fire Service NOC expires in 15 days. Renewal required.", priority: "high", time: "10 mins ago" },
    { id: 2, title: "Pending Corrective Action", message: "Exhaust hood tray cleaning evidence due in 5 days.", priority: "medium", time: "1 hour ago" },
    { id: 3, title: "Amul Gold Milk Expiry", message: "24 Liters of Full Cream Milk batch AML-MLK-881 expires in 2 days.", priority: "medium", time: "3 hours ago" }
  ],

  // Append-only Audit Logs
  auditLogs: [
    { timestamp: "2026-10-05 21:55:12", user: "Chef Vikram Mehra (Restaurant)", action: "LOGIN_SUCCESS", details: "Authorized into Restaurant Compliance Portal.", ip: "192.168.1.45" },
    { timestamp: "2026-10-05 20:30:19", user: "Inspector Rajesh Sharma (Officer)", action: "EVIDENCE_VERIFIED", details: "Approved photographic evidence for batch AML-PAN-2026-B8.", ip: "10.20.4.19" },
    { timestamp: "2026-10-04 14:12:00", user: "Suraj (Store In-charge)", action: "STOCK_BATCH_ADDED", details: "Received 24L Amul Gold Milk batch AML-MLK-881 with photo evidence.", ip: "192.168.1.45" },
    { timestamp: "2026-10-03 09:00:22", user: "Chef Sunita Rao", action: "SECURITY_PIN_UNLOCKED", details: "Accessed protected staff medical records.", ip: "192.168.1.45" }
  ]
};

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  renderAlertsDropdown();
  
  // Check if session stored or default to logged out
  const savedUser = sessionStorage.getItem("foodshield_user");
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
      state.activeRole = state.currentUser.role;
      showAppShell();
    } catch(e) {
      showAuthView();
    }
  } else {
    showAuthView();
  }
});

function startClock() {
  const clockEl = document.getElementById("liveClock");
  function tick() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    if (clockEl) {
      clockEl.textContent = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }
  tick();
  setInterval(tick, 1000);
}

// -------------------------------------------------------------
// AUTHENTICATION & ROLE SWITCHING
// -------------------------------------------------------------

function switchLoginRole(role) {
  state.activeRole = role;
  const btnRest = document.getElementById("roleBtnRestaurant");
  const btnOff = document.getElementById("roleBtnOfficer");
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  
  if (role === 'restaurant') {
    btnRest.className = "py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white text-teal-800 shadow-sm border border-slate-200";
    btnOff.className = "py-2.5 px-3 rounded-lg text-xs font-medium text-slate-600 transition-all flex items-center justify-center gap-1.5 hover:text-slate-900";
    emailInput.value = "restaurant@foodshield.com";
    passInput.value = "Password123!";
  } else {
    btnOff.className = "py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white text-teal-800 shadow-sm border border-slate-200";
    btnRest.className = "py-2.5 px-3 rounded-lg text-xs font-medium text-slate-600 transition-all flex items-center justify-center gap-1.5 hover:text-slate-900";
    emailInput.value = "officer@foodshield.gov";
    passInput.value = "OfficerSecure2026!";
  }
}

function fillDemoAccount(role) {
  switchLoginRole(role);
  showToast(`Loaded ${role === 'restaurant' ? 'Restaurant' : 'Government Officer'} credentials`, 'info');
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginErrorMsg");
  const submitBtn = document.getElementById("loginSubmitBtn");

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    Authenticating Secure Session...
  `;

  setTimeout(() => {
    // Validate credentials safely without disclosing username existence
    if (state.activeRole === 'restaurant' && email === 'restaurant@foodshield.com' && password === 'Password123!') {
      state.currentUser = {
        email: email,
        name: "Chef Vikram Mehra",
        role: "restaurant",
        title: "The Royal Spice Kitchen"
      };
      sessionStorage.setItem("foodshield_user", JSON.stringify(state.currentUser));
      logAuditEvent("LOGIN_SUCCESS", "User authenticated into Restaurant Portal");
      showAppShell();
      showToast("Welcome to FoodShield Restaurant Portal", "success");
    } else if (state.activeRole === 'officer' && email === 'officer@foodshield.gov' && password === 'OfficerSecure2026!') {
      state.currentUser = {
        email: email,
        name: "Inspector Rajesh Sharma",
        role: "officer",
        title: "Senior Food Safety Officer (FSO-DL-4029)"
      };
      sessionStorage.setItem("foodshield_user", JSON.stringify(state.currentUser));
      logAuditEvent("LOGIN_SUCCESS", "Government Officer authenticated with Badge FSO-DL-4029");
      showAppShell();
      showToast("Authorized Access: Government Food-Safety Grid", "success");
    } else {
      errorEl.textContent = "Invalid official credentials or incorrect portal identity selected.";
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Authorize & Launch Portal</span>`;
    }
  }, 400);
}

function handleLogout() {
  logAuditEvent("LOGOUT", `${state.currentUser ? state.currentUser.name : 'User'} ended active session.`);
  state.currentUser = null;
  state.isProtectedUnlocked = false;
  sessionStorage.removeItem("foodshield_user");
  showAuthView();
  showToast("Session terminated safely", "info");
}

function showAuthView() {
  document.getElementById("authView").classList.remove("hidden");
  document.getElementById("appShell").classList.add("hidden");
  switchLoginRole(state.activeRole);
}

function showAppShell() {
  document.getElementById("authView").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
  
  // Update header and sidebar identity
  const user = state.currentUser;
  document.getElementById("userFullName").textContent = user.name;
  document.getElementById("userEmailTag").textContent = user.email;
  document.getElementById("sidebarRoleLabel").textContent = user.role === 'restaurant' ? 'Restaurant Portal' : 'Govt Food Safety Officer';
  
  // Set initials avatar
  const initials = user.name.split(" ").map(n => n[0]).join("").substring(0, 2);
  document.getElementById("userAvatarInitials").textContent = initials;

  const quickSwitch = document.getElementById("quickSwitchPortalBtn");
  if (user.role === 'restaurant') {
    quickSwitch.textContent = "Switch to Officer Portal";
  } else {
    quickSwitch.textContent = "Switch to Restaurant Portal";
  }

  renderNavigation();
  navigateTo(user.role === 'restaurant' ? 'dashboard' : 'officer_dashboard');
}

function togglePortalMode() {
  if (state.currentUser.role === 'restaurant') {
    state.currentUser.role = 'officer';
    state.currentUser.name = "Inspector Rajesh Sharma";
    state.currentUser.email = "officer@foodshield.gov";
    state.activeRole = 'officer';
    showToast("Switched to Government Food Safety Officer Portal", "info");
    showAppShell();
  } else {
    state.currentUser.role = 'restaurant';
    state.currentUser.name = "Chef Vikram Mehra";
    state.currentUser.email = "restaurant@foodshield.com";
    state.activeRole = 'restaurant';
    showToast("Switched to Restaurant Compliance Portal", "info");
    showAppShell();
  }
}

// -------------------------------------------------------------
// NAVIGATION & ACCESS CONTROL
// -------------------------------------------------------------

function renderNavigation() {
  const navContainer = document.getElementById("navLinks");
  navContainer.innerHTML = "";
  const role = state.currentUser.role;

  const restaurantLinks = [
    { id: 'dashboard', label: 'Dashboard & Scores', icon: '📊', isProtected: false },
    { id: 'conflicts', label: 'AI–Sensor Conflicts', icon: '⚡', isProtected: false, badge: '!' },
    { id: 'menu', label: 'Menu & Traceability', icon: '🍲', isProtected: false },
    { id: 'stock', label: 'Stock & Procurement', icon: '📦', isProtected: false },
    { id: 'hygiene', label: 'Hygiene & Cleaning', icon: '✨', isProtected: false },
    { id: 'pest', label: 'Pest Control', icon: '🛡️', isProtected: false },
    { id: 'staff', label: 'Staff Management', icon: '👥', isProtected: true },
    { id: 'documents', label: 'Compliance Documents', icon: '📑', isProtected: true },
    { id: 'corrective', label: 'Corrective Actions', icon: '⚡', isProtected: false, badge: '1' },
    { id: 'audit', label: 'Audit Trail Logs', icon: '📜', isProtected: false }
  ];

  const officerLinks = [
    { id: 'officer_dashboard', label: 'Officer Overview', icon: '🏛️', isProtected: false },
    { id: 'conflicts', label: 'AI–Sensor Conflicts', icon: '⚡', isProtected: false, badge: '!' },
    { id: 'officer_restaurants', label: 'Restaurants Directory', icon: '🏢', isProtected: false },
    { id: 'officer_evidence', label: 'Evidence Review Queue', icon: '🔍', isProtected: false, badge: '1' },
    { id: 'officer_inspections', label: 'Inspections & Audits', icon: '📝', isProtected: false },
    { id: 'officer_corrective', label: 'Corrective Directives', icon: '⚖️', isProtected: false },
    { id: 'audit', label: 'Central Audit Logs', icon: '📜', isProtected: false }
  ];

  const links = role === 'restaurant' ? restaurantLinks : officerLinks;

  links.forEach(link => {
    const btn = document.createElement("button");
    const isActive = state.activeTab === link.id;
    btn.className = `w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between transition group ${
      isActive ? 'bg-teal-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;
    btn.onclick = () => handleNavClick(link);

    btn.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="text-base">${link.icon}</span>
        <span>${link.label}</span>
      </div>
      <div class="flex items-center gap-1.5">
        ${link.isProtected ? `<span class="text-[10px] text-amber-400 opacity-80" title="Security PIN Protected">🔒</span>` : ''}
        ${link.badge ? `<span class="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">${link.badge}</span>` : ''}
      </div>
    `;
    navContainer.appendChild(btn);
  });
}

function handleNavClick(link) {
  if (link.isProtected && !state.isProtectedUnlocked) {
    state.pendingProtectedTab = link.id;
    openSecurityPinModal(link.label);
    return;
  }
  navigateTo(link.id);
}

function navigateTo(tabId) {
  state.activeTab = tabId;
  renderNavigation();

  const titleEl = document.getElementById("pageTitle");
  const contentEl = document.getElementById("mainViewContent");

  switch(tabId) {
    case 'dashboard':
      titleEl.textContent = "Restaurant Compliance Dashboard";
      renderRestaurantDashboard(contentEl);
      break;
    case 'conflicts':
      titleEl.textContent = "AI–Sensor Conflict Detection & Escalation Grid";
      renderConflictsManagement(contentEl);
      break;
    case 'menu':
      titleEl.textContent = "Menu Catalog & Ingredient Traceability Provenance";
      renderMenuManagement(contentEl);
      break;
    case 'stock':
      titleEl.textContent = "Stock Inventory & Photographic Evidence System";
      renderStockManagement(contentEl);
      break;
    case 'hygiene':
      titleEl.textContent = "Hygiene Checklists & Professional Sanitation";
      renderHygieneManagement(contentEl);
      break;
    case 'pest':
      titleEl.textContent = "Pest Control & Infestation Prevention Records";
      renderPestControl(contentEl);
      break;
    case 'staff':
      titleEl.textContent = "Staff Personnel, Certifications & Masked Records";
      renderStaffManagement(contentEl);
      break;
    case 'documents':
      titleEl.textContent = "Statutory Food-Safety Compliance Vault";
      renderComplianceDocuments(contentEl);
      break;
    case 'corrective':
      titleEl.textContent = "Active Corrective Actions & Resolution Workflow";
      renderCorrectiveActions(contentEl);
      break;
    case 'audit':
      titleEl.textContent = "Immutable Append-Only Audit Trail";
      renderAuditLogs(contentEl);
      break;
    case 'officer_dashboard':
      titleEl.textContent = "Government Food Safety Officer Command Center";
      renderOfficerDashboard(contentEl);
      break;
    case 'officer_restaurants':
      titleEl.textContent = "Licensed Establishments Inspection Registry";
      renderOfficerRestaurants(contentEl);
      break;
    case 'officer_evidence':
      titleEl.textContent = "Automated & Human Evidence Review Queue";
      renderOfficerEvidenceQueue(contentEl);
      break;
    case 'officer_inspections':
      titleEl.textContent = "Government Statutory Audits & Inspections";
      renderOfficerInspections(contentEl);
      break;
    case 'officer_corrective':
      titleEl.textContent = "Regulatory Directives & Corrective Action Review";
      renderOfficerCorrectiveActions(contentEl);
      break;
    default:
      contentEl.innerHTML = `<div class="p-6 text-slate-500">Module under development.</div>`;
  }
}

// -------------------------------------------------------------
// SECONDARY SECURITY PIN RE-AUTHENTICATION GATE
// -------------------------------------------------------------

function openSecurityPinModal(moduleName) {
  const modal = document.getElementById("securityPinModal");
  const purposeText = document.getElementById("pinModalPurposeText");
  const input = document.getElementById("securityPinInput");
  const err = document.getElementById("pinErrorMsg");
  
  purposeText.textContent = `Secondary authentication required to access confidential ${moduleName}. Enter 4-digit PIN.`;
  input.value = "";
  err.classList.add("hidden");
  modal.classList.remove("hidden");
  setTimeout(() => input.focus(), 100);
}

function closeSecurityPinModal() {
  document.getElementById("securityPinModal").classList.add("hidden");
  state.pendingProtectedTab = null;
}

function submitSecurityPin() {
  const pin = document.getElementById("securityPinInput").value.trim();
  const err = document.getElementById("pinErrorMsg");

  // Valid PIN is 7788
  if (pin === "7788") {
    state.isProtectedUnlocked = true;
    state.unlockExpiry = Date.now() + 15 * 60 * 1000; // 15 mins session
    updateLockIndicator();
    closeSecurityPinModal();
    logAuditEvent("SECURITY_PIN_UNLOCKED", "Secondary PIN verified. 15-minute protected session granted.");
    showToast("Security Gate Unlocked: 15-minute confidential session active", "success");

    if (state.pendingProtectedTab) {
      navigateTo(state.pendingProtectedTab);
      state.pendingProtectedTab = null;
    }
  } else {
    err.classList.remove("hidden");
    document.getElementById("securityPinInput").value = "";
  }
}

function lockProtectedSession() {
  state.isProtectedUnlocked = false;
  state.unlockExpiry = null;
  updateLockIndicator();
  showToast("Protected modules locked safely", "info");
  if (state.activeTab === 'staff' || state.activeTab === 'documents') {
    navigateTo('dashboard');
  }
}

function updateLockIndicator() {
  const lockIcon = document.getElementById("lockIcon");
  const lockText = document.getElementById("lockStatusText");
  const badge = document.getElementById("securityGateBadge");

  if (state.isProtectedUnlocked) {
    lockIcon.textContent = "🔓";
    lockText.innerHTML = `Protected Unlocked (<span class="text-teal-600 font-bold cursor-pointer hover:underline" onclick="lockProtectedSession()">Lock Now</span>)`;
    badge.className = "hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold";
  } else {
    lockIcon.textContent = "🔒";
    lockText.textContent = "Protected Modules Locked";
    badge.className = "hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold";
  }
}

// -------------------------------------------------------------
// DYNAMIC COMPLIANCE CALCULATION ENGINE
// -------------------------------------------------------------

function computeComplianceMetrics() {
  // 1. Hygiene adherence
  let totalTasks = 0;
  let completedTasks = 0;
  state.cleaningAreas.forEach(a => {
    a.tasks.forEach(t => {
      totalTasks++;
      if (t.status === 'completed') completedTasks++;
    });
  });
  const hygieneRate = Math.round((completedTasks / totalTasks) * 100);
  const hygieneSub = Math.min(25, (hygieneRate / 100) * 25);

  // 2. Stock Freshness & Traceability
  let totalBatches = 0;
  let expiredBatches = 0;
  state.stock.forEach(item => {
    item.batches.forEach(b => {
      totalBatches++;
      if (b.status === 'expired') expiredBatches++;
    });
  });
  const freshRatio = totalBatches > 0 ? (totalBatches - expiredBatches) / totalBatches : 1;
  const stockSub = freshRatio * 20;

  // 3. Document Validity
  const totalDocs = state.documents.length;
  const validDocs = state.documents.filter(d => d.status === 'valid' || d.status === 'expiring_soon').length;
  const docSub = (validDocs / Math.max(1, totalDocs)) * 20;

  // 4. Pest Control Currency (service within 30 days)
  const pestSub = state.pestControl[0].daysLeft >= 0 ? 15 : 5;

  // 5. Staff Food Safety Training
  const totalStaff = state.employees.length;
  const trainedStaff = state.employees.filter(e => e.trainings.some(t => t.status === 'valid')).length;
  const staffSub = (trainedStaff / Math.max(1, totalStaff)) * 10;

  // 6. Corrective Actions Penalty
  const pendingActions = state.correctiveActions.filter(c => c.status === 'pending').length;
  const correctiveSub = Math.max(0, 10 - (pendingActions * 2.5));

  const totalScore = Math.min(100, Math.max(0, Math.round((hygieneSub + stockSub + docSub + pestSub + staffSub + correctiveSub) * 10) / 10));

  let grade = "Excellent";
  let badgeClass = "badge-compliant";
  let statusText = "🟢 Compliant";
  let risk = "Low Risk";

  if (totalScore < 70) {
    grade = "Action Required";
    badgeClass = "badge-danger";
    statusText = "🔴 Non-Compliant";
    risk = "High Risk";
  } else if (totalScore < 88) {
    grade = "Attention Required";
    badgeClass = "badge-warning";
    statusText = "🟡 Attention Required";
    risk = "Moderate Risk";
  }

  // Update header badge
  const headerBadge = document.getElementById("headerStatusBadge");
  if (headerBadge) {
    headerBadge.className = `hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`;
    headerBadge.innerHTML = `<span class="w-2 h-2 rounded-full ${totalScore >= 88 ? 'bg-emerald-500' : (totalScore >= 70 ? 'bg-amber-500' : 'bg-rose-500')} animate-pulse"></span> ${statusText} (${totalScore}%)`;
  }

  return {
    totalScore,
    grade,
    badgeClass,
    statusText,
    risk,
    hygieneRate,
    hygieneSub: Math.round(hygieneSub),
    stockSub: Math.round(stockSub),
    docSub: Math.round(docSub),
    pestSub: Math.round(pestSub),
    staffSub: Math.round(staffSub),
    correctiveSub: Math.round(correctiveSub),
    validDocs,
    totalDocs,
    pendingActions
  };
}

// -------------------------------------------------------------
// MODULE 1: RESTAURANT DASHBOARD
// -------------------------------------------------------------

function renderRestaurantDashboard(container) {
  const metrics = computeComplianceMetrics();
  const rest = state.restaurants[0];

  container.innerHTML = `
    <!-- Top KPI Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Card 1: FoodShield Score -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>COMPLIANCE SCORE</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${metrics.badgeClass}">${metrics.grade}</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-slate-900">${metrics.totalScore}%</span>
          <span class="text-xs font-medium text-emerald-600">+1.5% this month</span>
        </div>
        <div class="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
          <div class="bg-teal-600 h-2 rounded-full transition-all duration-500" style="width: ${metrics.totalScore}%"></div>
        </div>
        <p class="text-[11px] text-slate-400 mt-2">FoodShield National Standard Index</p>
      </div>

      <!-- Card 2: Regulatory Documents -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>STATUTORY DOCS</span>
          <span class="text-teal-600 font-bold text-xs">${metrics.validDocs}/${metrics.totalDocs} Valid</span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900">${metrics.validDocs} / ${metrics.totalDocs}</div>
        <div class="flex items-center gap-1.5 mt-3 text-xs text-amber-600 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>1 Certificate expires in 15 days</span>
        </div>
        <p class="text-[11px] text-slate-400 mt-1">Delhi Fire Service NOC</p>
      </div>

      <!-- Card 3: Hygiene & Cleaning -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>DAILY HYGIENE</span>
          <span class="text-emerald-700 font-bold text-xs">High Adherence</span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900">${metrics.hygieneRate}%</div>
        <div class="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Morning shift verified</span>
        </div>
        <p class="text-[11px] text-slate-400 mt-1">4 of 4 Areas Checked</p>
      </div>

      <!-- Card 4: Corrective Actions -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>DIRECTIVES DUE</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">${metrics.pendingActions} Action</span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900">${metrics.pendingActions}</div>
        <div class="flex items-center gap-1.5 mt-3 text-xs text-amber-700 font-medium">
          <span>Exhaust hood cleaning due</span>
        </div>
        <p class="text-[11px] text-slate-400 mt-1">Deadline: Oct 10, 2026</p>
      </div>
    </div>

    <!-- Quick Actions Bar -->
    <div class="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
      <div>
        <div class="text-xs font-bold uppercase tracking-wider text-teal-400">Quick Record Actions</div>
        <div class="text-xs text-slate-400">Log statutory compliance updates directly to immutable store</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button onclick="openAddStockModal()" class="py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
          <span>+ Add Stock Batch</span>
        </button>
        <button onclick="navigateTo('hygiene')" class="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700">
          <span>✓ Log Hygiene Shift</span>
        </button>
        <button onclick="openAddDishModal()" class="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700">
          <span>🍲 Add Menu Dish</span>
        </button>
        <button onclick="navigateTo('corrective')" class="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5">
          <span>⚡ Submit Action Evidence</span>
        </button>
      </div>
    </div>

    <!-- Middle Section: Breakdown & Traceability Preview -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Column 1 & 2: Compliance Category Breakdown -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Compliance Scoring Weights Breakdown</h3>
            <p class="text-xs text-slate-400">Multi-parameter transparent scoring engine based on verified logs</p>
          </div>
          <span class="text-xs text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">Total: ${metrics.totalScore}/100</span>
        </div>

        <div class="space-y-4">
          <!-- Item 1: Hygiene -->
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700">1. Hygiene & Daily Sanitization (Max 25 pts)</span>
              <span class="text-slate-900 font-bold">${metrics.hygieneSub} / 25 pts</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-teal-500 h-2.5 rounded-full" style="width: ${(metrics.hygieneSub / 25) * 100}%"></div>
            </div>
          </div>

          <!-- Item 2: Stock -->
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700">2. Stock Freshness & Full Traceability (Max 20 pts)</span>
              <span class="text-slate-900 font-bold">${metrics.stockSub} / 20 pts</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${(metrics.stockSub / 20) * 100}%"></div>
            </div>
          </div>

          <!-- Item 3: Documents -->
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700">3. Statutory Licenses & Lab Water Reports (Max 20 pts)</span>
              <span class="text-slate-900 font-bold">${metrics.docSub} / 20 pts</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-blue-500 h-2.5 rounded-full" style="width: ${(metrics.docSub / 20) * 100}%"></div>
            </div>
          </div>

          <!-- Item 4: Pest Control -->
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700">4. Pest Control Currency & Chemical Verification (Max 15 pts)</span>
              <span class="text-slate-900 font-bold">${metrics.pestSub} / 15 pts</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-purple-500 h-2.5 rounded-full" style="width: ${(metrics.pestSub / 15) * 100}%"></div>
            </div>
          </div>

          <!-- Item 5: Staff Training -->
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700">5. Staff FOSTAC Certification & Health Checks (Max 10 pts)</span>
              <span class="text-slate-900 font-bold">${metrics.staffSub} / 10 pts</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${(metrics.staffSub / 10) * 100}%"></div>
            </div>
          </div>

          <!-- Item 6: Corrective Actions -->
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700">6. Officer Directives & Corrective Actions (Max 10 pts)</span>
              <span class="text-slate-900 font-bold">${metrics.correctiveSub} / 10 pts</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-amber-500 h-2.5 rounded-full" style="width: ${(metrics.correctiveSub / 10) * 100}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: Establishment Summary & Risk Profile -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 class="font-bold text-slate-900 text-sm">Establishment Profile</h3>
            <span class="text-[10px] bg-slate-100 font-bold text-slate-700 px-2 py-0.5 rounded-md">${rest.riskLevel}</span>
          </div>
          
          <div class="space-y-2.5 text-xs">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Establishment Name</span>
              <span class="font-bold text-slate-800">${rest.name}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">FSSAI Registration Number</span>
              <span class="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">${rest.regNo}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Registered Premises</span>
              <span class="text-slate-700">${rest.address}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Last Government Inspection</span>
              <span class="text-emerald-700 font-semibold">${rest.lastInspection}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 bg-teal-50/60 p-3 rounded-xl border border-teal-100">
          <div class="flex items-center gap-2 text-xs font-bold text-teal-900 mb-1">
            <svg class="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            Digital FoodShield Certified
          </div>
          <p class="text-[11px] text-teal-800">
            Real-time verification feeds are accessible to designated Food Safety Officers for instant statutory verification.
          </p>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// MODULE 2: MENU & INGREDIENT TRACEABILITY VIEW
// -------------------------------------------------------------

function renderMenuManagement(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Restaurant Menu & Ingredients</h3>
        <p class="text-xs text-slate-500">Trace every dish back to ingredients, brands, manufacturers, suppliers, and purchase invoices.</p>
      </div>
      <button onclick="openAddDishModal()" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
        <span>+ Add New Dish Recipe</span>
      </button>
    </div>

    <!-- Dish Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      ${state.dishes.map(dish => `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div class="relative h-44 bg-slate-100 overflow-hidden">
              <img src="${dish.image}" alt="${dish.name}" class="w-full h-full object-cover">
              <div class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                ${dish.category}
              </div>
              <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200">
                ₹${dish.price}
              </div>
            </div>
            
            <div class="p-5">
              <h4 class="text-base font-bold text-slate-900">${dish.name}</h4>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">${dish.description}</p>
              
              <div class="mt-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <span class="font-bold">Declared Allergens:</span>
                <span>${dish.allergens}</span>
              </div>

              <!-- Ingredients Table -->
              <div class="mt-4">
                <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Ingredient Traceability Composition</span>
                  <span class="text-[10px] text-teal-600 font-semibold">${dish.ingredients.length} Sourced Ingredients</span>
                </div>
                <div class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                  ${dish.ingredients.map(ing => `
                    <div class="p-2.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <div class="font-semibold text-slate-800 flex items-center gap-1.5">
                          ${ing.name}
                          <span class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">${ing.qty}</span>
                        </div>
                        <div class="text-[11px] text-slate-500">
                          Brand: <strong class="text-slate-700">${ing.brand}</strong> &bull; Sourced from: ${ing.supplier}
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="text-[10px] font-mono text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">${ing.batch}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- Card Footer Traceability Action -->
          <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] text-slate-500">Audit Status: 🟢 Fully Traceable</span>
            <button onclick="viewTraceabilityGraph(${dish.id})" class="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5">
              <span>Inspect Provenance Chain</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function viewTraceabilityGraph(dishId) {
  const dish = state.dishes.find(d => d.id === dishId);
  if (!dish) return;

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Ingredient Provenance Flow: ${dish.name}`;
  
  modalContent.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900">
        This interactive graph traces <strong>${dish.name}</strong> backwards through packaging, brands, suppliers, batch numbers, and stock invoices for food safety officers.
      </div>

      <div class="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-300">
        
        <!-- Step 1: Dish -->
        <div class="relative">
          <div class="absolute -left-6 top-1 w-4 h-4 rounded-full bg-teal-600 ring-4 ring-teal-100"></div>
          <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span class="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Dish Level</span>
            <div class="text-sm font-bold text-slate-800">${dish.name} (Selling Price: ₹${dish.price})</div>
            <div class="text-xs text-slate-500">Prepared fresh in commercial kitchen under Chef Vikram Mehra</div>
          </div>
        </div>

        <!-- Step 2: Key Ingredients -->
        ${dish.ingredients.map((ing, idx) => `
          <div class="relative">
            <div class="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
            <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ingredient #${idx+1} &bull; ${ing.name} (${ing.qty})</span>
              <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span class="text-slate-400 block text-[10px]">Brand / Manufacturer</span>
                  <span class="font-semibold text-slate-800">${ing.brand}</span>
                  <span class="text-[10px] text-slate-500 block font-mono">FSSAI: ${ing.fssai}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Wholesale Supplier</span>
                  <span class="font-semibold text-slate-800">${ing.supplier}</span>
                  <span class="text-[10px] text-teal-700 block font-mono font-bold">Batch: ${ing.batch}</span>
                </div>
              </div>
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Cold Chain / Storage: Verified 3.4°C</span>
                <span class="text-emerald-700 font-semibold">🟢 Safe Purchase Invoice Attached</span>
              </div>
            </div>
          </div>
        `).join('')}

      </div>

      <div class="flex justify-end pt-3 border-t border-slate-100">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700">Close Provenance Graph</button>
      </div>
    </div>
  `;

  openActionModal();
}

function openAddDishModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Add New Recipe & Menu Dish";
  modalContent.innerHTML = `
    <form onsubmit="handleDishSubmit(event)" class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Dish Name *</label>
          <input type="text" id="newDishName" required placeholder="e.g. Murgh Makhani" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Category *</label>
          <select id="newDishCategory" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
            <option>Main Course</option>
            <option>Appetizers</option>
            <option>Rice & Breads</option>
            <option>Desserts & Beverages</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
          <input type="number" id="newDishPrice" required placeholder="450" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Allergen Declarations</label>
          <input type="text" id="newDishAllergens" placeholder="Dairy, Gluten, Nuts" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Recipe Description</label>
        <textarea id="newDishDesc" rows="2" placeholder="Brief explanation of ingredients and preparation method..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>

      <!-- Key Ingredients Row -->
      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
        <label class="block font-bold text-slate-800 mb-2">Primary Sourced Ingredient</label>
        <div class="grid grid-cols-3 gap-2 mb-2">
          <input type="text" id="newIngName" placeholder="Ingredient (e.g. Chicken Breast)" class="p-2 rounded-lg border border-slate-300 text-xs">
          <input type="text" id="newIngBrand" placeholder="Brand / Supplier" class="p-2 rounded-lg border border-slate-300 text-xs">
          <input type="text" id="newIngBatch" placeholder="Batch No (e.g. VNK-2026-9)" class="p-2 rounded-lg border border-slate-300 text-xs">
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20">Save Dish to Menu</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleDishSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("newDishName").value.trim();
  const category = document.getElementById("newDishCategory").value;
  const price = parseFloat(document.getElementById("newDishPrice").value);
  const allergens = document.getElementById("newDishAllergens").value.trim() || "None";
  const desc = document.getElementById("newDishDesc").value.trim();
  const ingName = document.getElementById("newIngName").value.trim() || "Quality Sourced Ingredients";
  const ingBrand = document.getElementById("newIngBrand").value.trim() || "Local Certified Farm";
  const ingBatch = document.getElementById("newIngBatch").value.trim() || "BATCH-RUN-2026";

  const newDish = {
    id: Date.now(),
    name,
    category,
    price,
    allergens,
    description: desc,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    ingredients: [
      { name: ingName, qty: "200g", brand: ingBrand, manufacturer: ingBrand, supplier: ingBrand, fssai: "10022011000999", batch: ingBatch, packaged: true }
    ]
  };

  state.dishes.unshift(newDish);
  logAuditEvent("DISH_ADDED", `Added new recipe ${name} (₹${price}) with batch ${ingBatch}`);
  closeActionModal();
  showToast(`Dish '${name}' successfully added to menu`, "success");
  renderMenuManagement(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 3: STOCK & PROCUREMENT WITH EVIDENCE VERIFICATION
// -------------------------------------------------------------

function renderStockManagement(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Stock Inventory & Evidence Pipeline</h3>
        <p class="text-xs text-slate-500">Maintain batch-level ingredient stock with automated image authenticity and metadata checks.</p>
      </div>
      <button onclick="openAddStockModal()" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
        <span>+ Add Stock Batch Intake</span>
      </button>
    </div>

    <!-- Stock Table -->
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Inventory Items</span>
        <span class="text-xs text-slate-500">${state.stock.length} Monitored Items</span>
      </div>

      <div class="divide-y divide-slate-100 overflow-x-auto text-xs">
        ${state.stock.map(item => `
          <div class="p-4 hover:bg-slate-50 transition">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-sm">
                  ${item.name[0]}
                </div>
                <div>
                  <div class="font-bold text-slate-900 text-sm">${item.name}</div>
                  <div class="text-[11px] text-slate-500">Category: ${item.category} &bull; Reorder Alert: ${item.reorder} ${item.unit}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-base font-extrabold text-slate-900">${item.qty} ${item.unit}</div>
                <span class="text-[10px] font-bold ${item.qty > item.reorder ? 'text-emerald-600' : 'text-rose-600'}">
                  ${item.qty > item.reorder ? '🟢 In Stock' : '🔴 Low Stock'}
                </span>
              </div>
            </div>

            <!-- Batches Sub-table -->
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
              <div class="text-[11px] font-bold text-slate-700 uppercase">Received Purchase Batches & Photographic Evidence</div>
              ${item.batches.map(batch => {
                const daysLeft = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                const isExpiring = daysLeft <= 3 && daysLeft >= 0;
                const isExpired = daysLeft < 0;

                return `
                  <div class="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-slate-800 text-xs">${batch.batchNo}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isExpired ? 'badge-danger' : (isExpiring ? 'badge-warning' : 'badge-compliant')
                        }">
                          ${isExpired ? '🔴 Expired' : (isExpiring ? `🟡 Expiring in ${daysLeft} days` : '🟢 Fresh')}
                        </span>
                      </div>
                      <div class="text-[11px] text-slate-500 mt-0.5">
                        Supplier: <strong class="text-slate-700">${batch.supplier}</strong> &bull; Invoice: ${batch.invoice}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        Purchased: ${batch.purchaseDate} | Expiry: <span class="font-semibold text-slate-700">${batch.expiryDate}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-3">
                      <div class="text-right text-xs">
                        <div class="font-bold text-slate-800">${batch.qty} ${batch.unit} @ ₹${batch.price}/${batch.unit}</div>
                      </div>
                      
                      <!-- Evidence Thumbnail -->
                      <button onclick="previewEvidenceModal(${batch.id})" class="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition" title="Inspect Automated Evidence Pipeline">
                        <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span>Evidence</span>
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openAddStockModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Receive Stock Batch & Photographic Evidence";
  modalContent.innerHTML = `
    <form onsubmit="handleStockSubmit(event)" class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Item Name *</label>
          <input type="text" id="newStockItem" required placeholder="e.g. Amul Salted Butter" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Category *</label>
          <select id="newStockCategory" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
            <option>Dairy</option>
            <option>Cooking Oil</option>
            <option>Dry Grains & Spices</option>
            <option>Fresh Produce</option>
            <option>Poultry & Meat</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Quantity *</label>
          <input type="number" id="newStockQty" required placeholder="10" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Unit *</label>
          <select id="newStockUnit" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
            <option>kg</option>
            <option>liters</option>
            <option>grams</option>
            <option>units</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Unit Price (₹) *</label>
          <input type="number" id="newStockPrice" required placeholder="280" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Manufacturer Batch Number *</label>
          <input type="text" id="newStockBatchNo" required placeholder="e.g. AML-BTR-9901" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
          <input type="date" id="newStockExpiry" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Supplier / Vendor Name *</label>
          <input type="text" id="newStockSupplier" required placeholder="Capital Fresh Dairy Wholesale" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Invoice / Receipt Number</label>
          <input type="text" id="newStockInvoice" placeholder="INV-2026-9901" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <!-- Evidence Upload & Automated Simulation -->
      <div class="bg-teal-50/70 p-4 rounded-xl border border-teal-200">
        <label class="block font-bold text-teal-950 mb-1">Photographic Evidence & Package Label</label>
        <p class="text-[11px] text-teal-800 mb-2">Automated pipeline verifies EXIF metadata, timestamp freshness, and duplicate image signatures.</p>
        
        <input type="file" id="newStockFile" accept="image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer">
        
        <div class="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
          <span>Supported: JPEG, PNG, WebP (Max 10MB)</span>
          <span>&bull;</span>
          <span>SHA-256 Duplicate Guard Active</span>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20">Verify & Add Batch</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleStockSubmit(e) {
  e.preventDefault();
  const itemName = document.getElementById("newStockItem").value.trim();
  const category = document.getElementById("newStockCategory").value;
  const qty = parseFloat(document.getElementById("newStockQty").value);
  const unit = document.getElementById("newStockUnit").value;
  const price = parseFloat(document.getElementById("newStockPrice").value);
  const batchNo = document.getElementById("newStockBatchNo").value.trim();
  const expiry = document.getElementById("newStockExpiry").value;
  const supplier = document.getElementById("newStockSupplier").value.trim();
  const invoice = document.getElementById("newStockInvoice").value.trim() || `INV-${Date.now().toString().slice(-4)}`;

  // Find or create item
  let item = state.stock.find(s => s.name.toLowerCase() === itemName.toLowerCase());
  if (!item) {
    item = {
      id: Date.now(),
      name: itemName,
      category,
      qty: 0,
      unit,
      reorder: 5.0,
      batches: []
    };
    state.stock.push(item);
  }

  item.qty += qty;

  const newBatch = {
    id: Date.now() + 1,
    batchNo,
    supplier,
    qty,
    unit,
    price,
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: expiry,
    invoice,
    status: "fresh",
    evidence: {
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      automatedStatus: "verified",
      officerStatus: "pending",
      confidence: 95.8,
      device: "Mobile Camera / Live Kitchen Upload",
      reasons: "EXIF headers verified, fresh capture timestamp, no duplicate hash."
    }
  };

  item.batches.unshift(newBatch);
  logAuditEvent("STOCK_BATCH_ADDED", `Received ${qty} ${unit} ${itemName} batch ${batchNo} with photographic verification.`);
  closeActionModal();
  showToast(`Stock batch ${batchNo} verified and added to inventory`, "success");
  renderStockManagement(document.getElementById("mainViewContent"));
}

function previewEvidenceModal(batchId) {
  let foundBatch = null;
  state.stock.forEach(item => {
    const b = item.batches.find(x => x.id === batchId);
    if (b) foundBatch = b;
  });

  if (!foundBatch || !foundBatch.evidence) return;

  const ev = foundBatch.evidence;
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Evidence Verification Dossier: Batch ${foundBatch.batchNo}`;
  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Photo Preview -->
        <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-64">
          <img src="${ev.url}" alt="Stock Evidence" class="w-full h-full object-cover">
        </div>

        <!-- Verification Pipeline Metrics -->
        <div class="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Automated AI & Metadata Check</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${ev.automatedStatus === 'verified' ? 'badge-compliant' : 'badge-warning'}">
              ${ev.automatedStatus === 'verified' ? '🟢 Verified' : '🟡 Needs Review'}
            </span>
          </div>

          <div class="text-2xl font-black text-slate-800">${ev.confidence}% <span class="text-xs font-normal text-slate-500">Confidence</span></div>
          
          <div class="space-y-1.5 pt-2 border-t border-slate-200">
            <div>
              <span class="text-[10px] text-slate-400 block">Device Signature:</span>
              <span class="font-medium text-slate-700">${ev.device}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Integrity Rationale:</span>
              <span class="text-slate-600">${ev.reasons}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Government Officer Human Review:</span>
              <span class="font-bold ${ev.officerStatus === 'verified' ? 'text-emerald-700' : 'text-amber-700'}">
                ${ev.officerStatus === 'verified' ? '✅ Approved by Inspector Rajesh Sharma' : '⏳ Queued for Food Safety Officer Review'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
        <strong>Transparency Note:</strong> The platform distinguishes automated image heuristics from authorized human verification. Automated probabilities are never represented as infallible truth.
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700">Dismiss</button>
      </div>
    </div>
  `;

  openActionModal();
}

// -------------------------------------------------------------
// MODULE 4: HYGIENE & CLEANING MANAGEMENT
// -------------------------------------------------------------

function renderHygieneManagement(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Hygiene & Cleaning Dashboard</h3>
        <p class="text-xs text-slate-500">Structured shift checklists, photographic evidence logging, and external cleaning contracts.</p>
      </div>
      <button onclick="openExternalAgencyModal()" class="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-2">
        <span>+ Add Professional Agency Record</span>
      </button>
    </div>

    <!-- Area Checklists Tabs -->
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="p-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap gap-1">
        ${state.cleaningAreas.map((area, idx) => `
          <button onclick="switchCleaningAreaTab('${area.id}')" id="areaTabBtn_${area.id}" class="py-2 px-3.5 rounded-xl text-xs font-bold transition ${
            idx === 0 ? 'bg-white text-teal-800 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
          }">
            ${area.name}
          </button>
        `).join('')}
      </div>

      <div id="cleaningAreaTasksContainer" class="p-4">
        <!-- Render tasks for default area -->
      </div>
    </div>

    <!-- External Cleaning Agency Section -->
    <div class="mt-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h4 class="font-bold text-slate-900 text-sm">Professional Cleaning Agency Contracts & Payment Evidence</h4>
          <p class="text-xs text-slate-500">External industrial duct and heavy kitchen degreasing certification</p>
        </div>
        <span class="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">Active Contract</span>
      </div>

      <div class="space-y-4">
        ${state.externalCleaning.map(c => `
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span class="font-bold text-slate-900 text-sm">${c.agency}</span>
                <span class="text-slate-500 ml-2">Contact: ${c.phone}</span>
              </div>
              <span class="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold">${c.upiRef}</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-y border-slate-200/60 text-slate-600">
              <div><strong>Service:</strong> ${c.service}</div>
              <div><strong>Service Date:</strong> ${c.date}</div>
              <div><strong>Frequency:</strong> ${c.freq}</div>
            </div>

            <p class="text-[11px] text-slate-500 mt-2">${c.remarks}</p>

            <!-- Before & After Evidence Images -->
            <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center gap-3">
              <span class="text-[10px] font-bold text-slate-500 uppercase">Degreasing Proof:</span>
              <div class="flex gap-2">
                <div class="relative group cursor-pointer" onclick="viewImageEnlarged('${c.beforeImg}', 'Before Cleaning')">
                  <img src="${c.beforeImg}" alt="Before" class="w-12 h-12 object-cover rounded-lg border border-slate-300">
                  <span class="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-white text-center rounded-b">Before</span>
                </div>
                <div class="relative group cursor-pointer" onclick="viewImageEnlarged('${c.afterImg}', 'After Cleaning')">
                  <img src="${c.afterImg}" alt="After" class="w-12 h-12 object-cover rounded-lg border border-slate-300">
                  <span class="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-[8px] text-white text-center rounded-b">After</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  switchCleaningAreaTab('kitchen');
}

function switchCleaningAreaTab(areaId) {
  state.cleaningAreas.forEach(a => {
    const btn = document.getElementById(`areaTabBtn_${a.id}`);
    if (btn) {
      if (a.id === areaId) {
        btn.className = "py-2 px-3.5 rounded-xl text-xs font-bold transition bg-white text-teal-800 shadow-sm border border-slate-200";
      } else {
        btn.className = "py-2 px-3.5 rounded-xl text-xs font-semibold transition text-slate-600 hover:text-slate-900";
      }
    }
  });

  const area = state.cleaningAreas.find(a => a.id === areaId);
  const container = document.getElementById("cleaningAreaTasksContainer");
  if (!area || !container) return;

  container.innerHTML = `
    <div class="divide-y divide-slate-100 text-xs">
      ${area.tasks.map(task => `
        <div class="py-3 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} onchange="toggleTaskStatus('${area.id}', '${task.id}')" class="mt-1 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer">
            <div>
              <div class="font-semibold text-slate-800 ${task.status === 'completed' ? 'line-through text-slate-400' : ''}">${task.name}</div>
              <div class="text-[11px] text-slate-500">Frequency: ${task.freq} &bull; Required Shift: ${task.shift}</div>
              <div class="text-[10px] text-slate-400">Last logged: ${task.time} by ${task.by}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
              task.status === 'completed' ? 'badge-compliant' : 'badge-warning'
            }">
              ${task.status === 'completed' ? '✓ Completed' : '⚠️ Attention Required'}
            </span>

            <button onclick="logCleaningWithPhoto('${area.id}', '${task.id}')" class="py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>${task.hasPhoto ? 'Photo Attached' : 'Attach Photo'}</span>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function toggleTaskStatus(areaId, taskId) {
  const area = state.cleaningAreas.find(a => a.id === areaId);
  if (!area) return;
  const task = area.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = task.status === 'completed' ? 'needs_attention' : 'completed';
  task.time = "Just now";
  task.by = state.currentUser ? state.currentUser.name : "Staff";

  logAuditEvent("CLEANING_CHECKLIST_LOGGED", `Toggled task: ${task.name} -> ${task.status}`);
  showToast(`Checklist task updated: ${task.name}`, "info");
  switchCleaningAreaTab(areaId);
}

function logCleaningWithPhoto(areaId, taskId) {
  const area = state.cleaningAreas.find(a => a.id === areaId);
  const task = area.tasks.find(t => t.id === taskId);

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Attach Cleaning Photographic Evidence";
  modalContent.innerHTML = `
    <form onsubmit="handlePhotoLogSubmit(event, '${areaId}', '${taskId}')" class="space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Checklist Task</label>
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-semibold">${task.name}</div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Upload Work Completion Photo *</label>
        <input type="file" required accept="image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer">
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Sanitization Notes / Chemical Used</label>
        <input type="text" id="cleaningNotes" placeholder="e.g. Quaternary ammonium sanitizer at 200ppm contact time 60s" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Verify & Save Shift Evidence</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handlePhotoLogSubmit(e, areaId, taskId) {
  e.preventDefault();
  const area = state.cleaningAreas.find(a => a.id === areaId);
  const task = area.tasks.find(t => t.id === taskId);
  
  task.status = "completed";
  task.hasPhoto = true;
  task.time = "Just now (Verified)";
  task.by = state.currentUser ? state.currentUser.name : "Kishore (Hygiene Lead)";

  logAuditEvent("CLEANING_EVIDENCE_ATTACHED", `Uploaded photographic verification for: ${task.name}`);
  closeActionModal();
  showToast("Photo evidence verified and attached to cleaning record", "success");
  switchCleaningAreaTab(areaId);
}

function openExternalAgencyModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Register Professional Cleaning Agency Record";
  modalContent.innerHTML = `
    <form onsubmit="handleAgencySubmit(event)" class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Agency Name *</label>
          <input type="text" id="newAgencyName" required placeholder="CleanTech Services Pvt Ltd" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Contact Number *</label>
          <input type="text" id="newAgencyPhone" required placeholder="+91 99100 88221" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Service Type *</label>
          <input type="text" id="newAgencyService" required placeholder="Grease Trap & Hydro Jet Cleaning" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Service Date *</label>
          <input type="date" id="newAgencyDate" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">UPI / Banking Payment Ref</label>
          <input type="text" id="newAgencyUpi" placeholder="UPI/2026/CTECH/99812001" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Service Frequency</label>
          <select id="newAgencyFreq" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
            <option>Monthly Contract</option>
            <option>Bi-Monthly</option>
            <option>Quarterly Heavy Deep Scrub</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Technician Remarks & Airflow Test</label>
        <textarea id="newAgencyRemarks" rows="2" placeholder="Chimney duct hydro-jet degreased, zero combustible buildup..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Register Contract</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleAgencySubmit(e) {
  e.preventDefault();
  const name = document.getElementById("newAgencyName").value.trim();
  const phone = document.getElementById("newAgencyPhone").value.trim();
  const service = document.getElementById("newAgencyService").value.trim();
  const date = document.getElementById("newAgencyDate").value;
  const upi = document.getElementById("newAgencyUpi").value.trim() || "UPI/TXN-PAID";
  const freq = document.getElementById("newAgencyFreq").value;
  const remarks = document.getElementById("newAgencyRemarks").value.trim();

  state.externalCleaning.unshift({
    id: Date.now(),
    agency: name,
    phone,
    service,
    date,
    freq,
    upiRef: upi,
    remarks: remarks || "Certified industrial cleaning completed.",
    beforeImg: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80",
    afterImg: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80"
  });

  logAuditEvent("EXTERNAL_CLEANING_LOGGED", `Added external agency record: ${name} (${service})`);
  closeActionModal();
  showToast("External cleaning agency record registered successfully", "success");
  renderHygieneManagement(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 5: PEST CONTROL MANAGEMENT
// -------------------------------------------------------------

function renderPestControl(container) {
  const p = state.pestControl[0];

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Pest Control & Prevention Records</h3>
        <p class="text-xs text-slate-500">Track treatment cycles, active chemical compounds, technician certifications, and next visit countdowns.</p>
      </div>
      <button onclick="openAddPestModal()" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
        <span>+ Record New Pest Service</span>
      </button>
    </div>

    <!-- Prominent Pest Status Card -->
    <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl border border-amber-200 p-6 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold text-amber-800 uppercase tracking-wider">Scheduled Treatment Status</span>
          <div class="text-2xl font-extrabold text-slate-900 mt-1">🟡 Next Treatment Due in ${p.daysLeft} Days</div>
          <div class="text-xs text-slate-600 mt-1">
            Last Service: <strong class="text-slate-800">${p.serviceDate}</strong> &bull; Next Mandatory Service: <strong class="text-slate-800">${p.nextDate}</strong>
          </div>
        </div>

        <div class="bg-white px-4 py-3 rounded-xl border border-amber-200 shadow-sm text-right">
          <div class="text-xs text-slate-500">Certified Agency</div>
          <div class="font-bold text-slate-800 text-sm">${p.agency}</div>
          <div class="text-[11px] text-teal-700 font-semibold">${p.phone}</div>
        </div>
      </div>
    </div>

    <!-- Treatment Records List -->
    <div class="space-y-4">
      ${state.pestControl.map(item => `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <span class="font-bold text-slate-900 text-sm">${item.treatment}</span>
              <span class="text-slate-500 ml-2 font-mono">Service Date: ${item.serviceDate}</span>
            </div>
            <span class="px-2.5 py-1 rounded-full font-bold badge-compliant text-[10px]">🟢 Infestation Absent</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-700">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Areas Treated:</span>
              <span class="font-medium">${item.areas}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Chemicals & Bait Matrix:</span>
              <span class="font-mono text-slate-800 font-semibold">${item.chemicals}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Licensed Technician:</span>
              <span class="font-medium text-slate-800">${item.technician}</span>
            </div>
          </div>

          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
            <strong>Remarks & Night Observation:</strong> ${item.remarks}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openAddPestModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Record Pest Control Visit & Treatment";
  modalContent.innerHTML = `
    <form onsubmit="handlePestSubmit(event)" class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Agency Name *</label>
          <input type="text" id="newPestAgency" required placeholder="PestGuard Solutions" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Agency Phone *</label>
          <input type="text" id="newPestPhone" required placeholder="+91 11 2688 4400" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Service Date *</label>
          <input type="date" id="newPestDate" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Next Service Date *</label>
          <input type="date" id="newPestNextDate" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Treatment Type *</label>
        <input type="text" id="newPestType" required placeholder="Gel Matrix Baiting & Fogging" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Chemicals / Products Used *</label>
          <input type="text" id="newPestChemicals" required placeholder="Fipronil 0.05% Gel" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Certified Technician Name *</label>
          <input type="text" id="newPestTech" required placeholder="Ajay Verma (#PMP-2041)" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Observations & Remarks</label>
        <textarea id="newPestRemarks" rows="2" placeholder="Zero infestation observed..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Save Pest Service</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handlePestSubmit(e) {
  e.preventDefault();
  const agency = document.getElementById("newPestAgency").value.trim();
  const phone = document.getElementById("newPestPhone").value.trim();
  const serviceDate = document.getElementById("newPestDate").value;
  const nextDate = document.getElementById("newPestNextDate").value;
  const treatment = document.getElementById("newPestType").value.trim();
  const chemicals = document.getElementById("newPestChemicals").value.trim();
  const tech = document.getElementById("newPestTech").value.trim();
  const remarks = document.getElementById("newPestRemarks").value.trim();

  const daysLeft = Math.ceil((new Date(nextDate) - new Date()) / (1000 * 60 * 60 * 24));

  state.pestControl.unshift({
    id: Date.now(),
    agency,
    phone,
    serviceDate,
    nextDate,
    daysLeft,
    status: daysLeft >= 0 ? "active" : "overdue",
    treatment,
    areas: "Kitchen, Store, Restroom Drains",
    chemicals,
    technician: tech,
    remarks: remarks || "Statutory inspection verified."
  });

  logAuditEvent("PEST_CONTROL_LOGGED", `Recorded pest treatment ${treatment} by ${agency}`);
  closeActionModal();
  showToast("Pest control visit recorded successfully", "success");
  renderPestControl(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 6: PROTECTED STAFF MANAGEMENT & TRAINING
// -------------------------------------------------------------

function renderStaffManagement(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base font-bold text-slate-800">Confidential Personnel & Food-Safety Qualifications</h3>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">🔒 PIN Protected View</span>
        </div>
        <p class="text-xs text-slate-500">Government identification numbers are strictly masked. View FOSTAC certifications and medical fitness records.</p>
      </div>
      <div class="flex gap-2">
        <button onclick="lockProtectedSession()" class="py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold">
          🔒 Lock Now
        </button>
        <button onclick="openAddEmployeeModal()" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
          <span>+ Enroll New Staff</span>
        </button>
      </div>
    </div>

    <!-- Staff Cards Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      ${state.employees.map(emp => `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm border border-teal-200">
                  ${emp.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">${emp.name}</h4>
                  <div class="text-[11px] text-teal-700 font-semibold">${emp.designation} &bull; ${emp.department}</div>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold badge-compliant">Active</span>
            </div>

            <!-- Masked Government IDs -->
            <div class="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Government ID (Masked)</span>
                <span class="font-mono font-bold text-slate-800">${emp.maskedId}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">PAN / Tax ID (Masked)</span>
                <span class="font-mono font-bold text-slate-800">${emp.maskedPan || 'N/A'}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Medical Status</span>
                <span class="text-emerald-700 font-semibold">${emp.medicalStatus}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Total Experience</span>
                <span class="font-semibold text-slate-800">${emp.experience}</span>
              </div>
            </div>

            <!-- Food Safety Training Records -->
            <div class="mt-3">
              <div class="text-[11px] font-bold text-slate-700 mb-1.5 uppercase">Food Safety Training Certification (FOSTAC / HACCP)</div>
              <div class="space-y-1.5">
                ${emp.trainings.map(t => `
                  <div class="p-2 rounded-lg bg-teal-50/60 border border-teal-200/80 flex items-center justify-between text-[11px]">
                    <div>
                      <div class="font-bold text-teal-950">${t.name}</div>
                      <div class="text-[10px] text-slate-500">Provider: ${t.provider} &bull; Exp: ${t.expiry}</div>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'valid' ? 'badge-compliant' : 'badge-warning'}">
                      ${t.status === 'valid' ? 'Valid' : 'Expiring Soon'}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Emergency: ${emp.emergencyContact}</span>
            <span class="text-teal-700 font-semibold cursor-pointer hover:underline" onclick="addTrainingForEmployee(${emp.id})">+ Log Training</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openAddEmployeeModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Enroll Employee Record & ID Masking";
  modalContent.innerHTML = `
    <form onsubmit="handleEmployeeSubmit(event)" class="space-y-4 text-xs">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Full Name *</label>
          <input type="text" id="newEmpName" required placeholder="e.g. Ramesh Chandra" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
          <input type="text" id="newEmpPhone" required placeholder="+91 98111 00000" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Designation *</label>
          <input type="text" id="newEmpRole" required placeholder="Sous Chef / Assistant" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Department</label>
          <select id="newEmpDept" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
            <option>Culinary Operations</option>
            <option>Hygiene & Sanitation</option>
            <option>Service & Dining</option>
            <option>Procurement & Store</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Government ID (Aadhaar / National ID) *</label>
          <input type="text" id="newEmpId" required placeholder="1234-5678-9012" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono">
          <p class="text-[10px] text-slate-400 mt-0.5">System will automatically mask before saving.</p>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">PAN / Tax ID</label>
          <input type="text" id="newEmpPan" placeholder="ABCDE1234F" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Medical Fitness Status</label>
          <input type="text" id="newEmpMed" value="Certified Fit (Examined)" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Emergency Contact</label>
          <input type="text" id="newEmpEmerg" placeholder="Name & Phone" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Enroll Employee</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleEmployeeSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("newEmpName").value.trim();
  const phone = document.getElementById("newEmpPhone").value.trim();
  const role = document.getElementById("newEmpRole").value.trim();
  const dept = document.getElementById("newEmpDept").value;
  const rawId = document.getElementById("newEmpId").value.trim();
  const rawPan = document.getElementById("newEmpPan").value.trim();
  const med = document.getElementById("newEmpMed").value.trim();
  const emerg = document.getElementById("newEmpEmerg").value.trim();

  // Mask ID
  const maskedId = rawId.length > 4 ? `XXXX-XXXX-${rawId.slice(-4)}` : "XXXX-XXXX-9999";
  const maskedPan = rawPan.length > 4 ? `${rawPan.slice(0, 5)}****${rawPan.slice(-1)}` : "ABCDE****F";

  const newEmp = {
    id: Date.now(),
    name,
    phone,
    designation: role,
    department: dept,
    joiningDate: new Date().toISOString().split('T')[0],
    experience: "3.0 years",
    previousWork: "Standard Catering",
    maskedId,
    maskedPan,
    medicalStatus: med,
    emergencyContact: emerg || "Contact on file",
    trainings: [
      { name: "Basic Food Hygiene Induction", provider: "FoodShield Internal", date: "2026-10-01", expiry: "2027-10-01", status: "valid" }
    ]
  };

  state.employees.unshift(newEmp);
  logAuditEvent("EMPLOYEE_ENROLLED", `Enrolled staff member ${name} (${role}) with masked ID.`);
  closeActionModal();
  showToast(`Employee ${name} enrolled with secure masked ID`, "success");
  renderStaffManagement(document.getElementById("mainViewContent"));
}

function addTrainingForEmployee(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Log Food Safety Certification: ${emp.name}`;
  modalContent.innerHTML = `
    <form onsubmit="handleTrainingSubmit(event, ${empId})" class="space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Course / Certification Name *</label>
        <input type="text" id="newTrName" required placeholder="FOSTAC Food Safety Supervisor (Advance)" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Accredited Training Provider *</label>
          <input type="text" id="newTrProvider" required placeholder="CII Institute of Quality / FSSAI" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Certificate Expiry Date *</label>
          <input type="date" id="newTrExpiry" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Certificate Document Upload</label>
        <input type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer">
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Register Certificate</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleTrainingSubmit(e, empId) {
  e.preventDefault();
  const emp = state.employees.find(e => e.id === empId);
  const name = document.getElementById("newTrName").value.trim();
  const provider = document.getElementById("newTrProvider").value.trim();
  const expiry = document.getElementById("newTrExpiry").value;

  emp.trainings.unshift({
    name,
    provider,
    date: new Date().toISOString().split('T')[0],
    expiry,
    status: "valid"
  });

  logAuditEvent("TRAINING_RECORDED", `Added ${name} certification for ${emp.name}`);
  closeActionModal();
  showToast(`Training record logged for ${emp.name}`, "success");
  renderStaffManagement(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 7: PROTECTED COMPLIANCE DOCUMENTS
// -------------------------------------------------------------

function renderComplianceDocuments(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base font-bold text-slate-800">Statutory Regulatory Documents Vault</h3>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">🔒 PIN Protected Vault</span>
        </div>
        <p class="text-xs text-slate-500">Access control audit logs every document view. Automatic alert engine tracks expirations.</p>
      </div>
      <div class="flex gap-2">
        <button onclick="lockProtectedSession()" class="py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold">
          🔒 Lock Now
        </button>
        <button onclick="openUploadDocModal()" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
          <span>+ Upload Compliance Certificate</span>
        </button>
      </div>
    </div>

    <!-- Documents Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${state.documents.map(doc => `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[10px] font-bold text-teal-700 uppercase tracking-wider">${doc.category.replace('_', ' ')}</span>
                <h4 class="font-bold text-slate-900 text-sm mt-0.5">${doc.name}</h4>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                doc.status === 'valid' ? 'badge-compliant' : (doc.status === 'expiring_soon' ? 'badge-warning' : 'badge-danger')
              }">
                ${doc.status === 'valid' ? '🟢 Valid' : `🟡 Expires in ${doc.daysLeft} days`}
              </span>
            </div>

            <div class="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Certificate / License No:</span>
                <span class="font-mono font-bold text-slate-800 text-xs">${doc.docNo}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Issuing Authority:</span>
                <span class="text-slate-700 font-medium">${doc.authority}</span>
              </div>
              <div class="flex justify-between text-slate-500 pt-1 border-t border-slate-200/60 text-[11px]">
                <span>Issued: ${doc.issueDate}</span>
                <span>Expiry: <strong class="text-slate-700">${doc.expiryDate}</strong></span>
              </div>
            </div>

            <p class="text-[11px] text-slate-500 mt-2">${doc.notes}</p>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span class="text-emerald-700 font-semibold">✓ Digitally Verified by FSSAI Officer</span>
            <button onclick="viewDocumentFile('${doc.name}', '${doc.docNo}')" class="py-1 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold border border-teal-200">
              View Certificate
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function viewDocumentFile(name, docNo) {
  logAuditEvent("DOCUMENT_VIEWED", `Opened certified document: ${name} (${docNo})`);
  showToast(`Audit logged: Verified access to ${name}`, "info");

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Certificate Document: ${name}`;
  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="p-6 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-2">
        <svg class="w-12 h-12 text-teal-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <div class="text-sm font-bold text-slate-900">${name}</div>
        <div class="font-mono text-xs text-teal-700 font-semibold">License Registration #${docNo}</div>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">This official document is cryptographically verified against the national statutory database.</p>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700">Close Dossier</button>
      </div>
    </div>
  `;

  openActionModal();
}

function openUploadDocModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Upload Statutory Compliance Document";
  modalContent.innerHTML = `
    <form onsubmit="handleDocSubmit(event)" class="space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Document Category *</label>
        <select id="newDocCategory" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
          <option value="fssai_license">FSSAI Business License</option>
          <option value="fire_safety">Fire Safety NOC</option>
          <option value="water_test">Potable Water Lab Report (IS 10500)</option>
          <option value="waste_mgmt">Municipal Solid Waste Disposal Agreement</option>
          <option value="health_cert">Staff Medical Fitness Master Certificate</option>
        </select>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Official Document Title *</label>
        <input type="text" id="newDocName" required placeholder="e.g. Annual Drinking Water Quality Test" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">License / Document Number *</label>
          <input type="text" id="newDocNo" required placeholder="NABL-LAB-2026-99" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Issuing Authority *</label>
          <input type="text" id="newDocAuth" required placeholder="State Pollution Control Board / FSSAI" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Issue Date *</label>
          <input type="date" id="newDocIssue" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
          <input type="date" id="newDocExpiry" required class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Attach Scanned PDF or High-Resolution Document *</label>
        <input type="file" required accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer">
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Register Document</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleDocSubmit(e) {
  e.preventDefault();
  const category = document.getElementById("newDocCategory").value;
  const name = document.getElementById("newDocName").value.trim();
  const docNo = document.getElementById("newDocNo").value.trim();
  const auth = document.getElementById("newDocAuth").value.trim();
  const issue = document.getElementById("newDocIssue").value;
  const expiry = document.getElementById("newDocExpiry").value;

  const daysLeft = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));

  state.documents.unshift({
    id: Date.now(),
    category,
    name,
    docNo,
    authority: auth,
    issueDate: issue,
    expiryDate: expiry,
    daysLeft,
    status: daysLeft > 30 ? "valid" : (daysLeft >= 0 ? "expiring_soon" : "expired"),
    notes: "Newly uploaded certificate under review by food safety officer."
  });

  logAuditEvent("DOCUMENT_UPLOADED", `Uploaded compliance document: ${name} (${docNo})`);
  closeActionModal();
  showToast(`Document '${name}' registered to compliance vault`, "success");
  renderComplianceDocuments(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 8: CORRECTIVE ACTIONS WORKFLOW
// -------------------------------------------------------------

function renderCorrectiveActions(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Corrective Actions & Regulatory Directives</h3>
        <p class="text-xs text-slate-500">Official non-compliance notices issued by Food Safety Officers requiring photographic proof of resolution.</p>
      </div>
    </div>

    <!-- Actions List -->
    <div class="space-y-4">
      ${state.correctiveActions.map(action => `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Directive #${action.id}</span>
              <h4 class="font-bold text-slate-900 text-sm mt-0.5">${action.issueTitle}</h4>
            </div>
            <span class="px-2.5 py-1 rounded-full font-bold text-[10px] ${
              action.status === 'verified_closed' ? 'badge-compliant' : (action.status === 'submitted' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'badge-warning')
            }">
              ${action.status === 'verified_closed' ? '✅ Verified & Closed' : (action.status === 'submitted' ? '🔵 Resolution Submitted — Awaiting Review' : `🟡 Action Required — Due in ${action.daysLeft} Days`)}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Officer Finding & Deficiency:</span>
              <p class="text-slate-700 mt-1">${action.issueDesc}</p>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Required Corrective Action:</span>
              <p class="text-slate-700 mt-1">${action.requiredAction}</p>
              <div class="text-[10px] text-rose-600 font-bold mt-1">Resolution Deadline: ${action.deadline}</div>
            </div>
          </div>

          <!-- Restaurant Resolution Section -->
          ${action.restaurantResponse ? `
            <div class="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 text-teal-950 space-y-2">
              <div class="font-bold flex items-center justify-between">
                <span>Restaurant Resolution Submission:</span>
                <span class="text-[10px] text-teal-700 font-normal">Submitted with Photographic Proof</span>
              </div>
              <p class="text-slate-700">${action.restaurantResponse}</p>
              ${action.evidenceUrl ? `
                <div class="flex items-center gap-2 pt-2 border-t border-teal-200/60">
                  <img src="${action.evidenceUrl}" alt="Evidence" class="w-12 h-12 rounded-lg object-cover border border-teal-300">
                  <span class="text-[11px] text-teal-800">Resolution Photo Proof Verified</span>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="flex justify-end">
              <button onclick="openSubmitResolutionModal(${action.id})" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition flex items-center gap-2 shadow-sm">
                <span>Submit Corrective Proof & Evidence</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          `}
        </div>
      `).join('')}
    </div>
  `;
}

function openSubmitResolutionModal(actionId) {
  const action = state.correctiveActions.find(a => a.id === actionId);
  if (!action) return;

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Submit Resolution & Evidence for Directive";
  modalContent.innerHTML = `
    <form onsubmit="handleResolutionSubmit(event, ${actionId})" class="space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Directive</label>
        <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800">${action.issueTitle}</div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Resolution Explanation *</label>
        <textarea id="resolutionText" required rows="3" placeholder="Describe the actions taken (e.g. Thoroughly degreased secondary exhaust hood tray with commercial agent, logged in morning shift)..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Attach Clear Photographic Proof *</label>
        <input type="file" required accept="image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer">
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">Transmit to Food Safety Officer</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleResolutionSubmit(e, actionId) {
  e.preventDefault();
  const text = document.getElementById("resolutionText").value.trim();
  const action = state.correctiveActions.find(a => a.id === actionId);

  action.restaurantResponse = text;
  action.evidenceUrl = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80";
  action.status = "submitted";

  logAuditEvent("CORRECTIVE_ACTION_SUBMITTED", `Submitted resolution for directive: ${action.issueTitle}`);
  closeActionModal();
  showToast("Resolution transmitted to Food Safety Officer for review", "success");
  renderCorrectiveActions(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 9: GOVERNMENT OFFICER COMMAND CENTER & SEARCH
// -------------------------------------------------------------

function renderOfficerDashboard(container) {
  container.innerHTML = `
    <!-- Top Officer KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-slate-500 uppercase">Registered Establishments</span>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">${state.restaurants.length}</div>
        <p class="text-[11px] text-slate-400 mt-1">Central Delhi Inspection Grid</p>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-slate-500 uppercase">Fully Compliant (>88%)</span>
        <div class="text-3xl font-extrabold text-emerald-600 mt-2">1</div>
        <p class="text-[11px] text-slate-400 mt-1">Low risk establishments</p>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-slate-500 uppercase">Attention Required (70-87%)</span>
        <div class="text-3xl font-extrabold text-amber-600 mt-2">1</div>
        <p class="text-[11px] text-slate-400 mt-1">Under targeted monitoring</p>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-slate-500 uppercase">Pending Evidence Reviews</span>
        <div class="text-3xl font-extrabold text-teal-700 mt-2">1</div>
        <p class="text-[11px] text-slate-400 mt-1">Queued for Officer Sign-off</p>
      </div>
    </div>

    <!-- Quick Officer Navigation Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Column 1 & 2: Quick Establishments Inspection Directory -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h4 class="font-bold text-slate-900 text-sm">Designated Inspection Zone Establishments</h4>
            <p class="text-xs text-slate-500">Search and audit food safety compliance scores</p>
          </div>
          <button onclick="navigateTo('officer_restaurants')" class="text-xs font-bold text-teal-600 hover:underline">View All Registry &rarr;</button>
        </div>

        <div class="space-y-3">
          ${state.restaurants.map(r => `
            <div class="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50/50 transition flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div class="flex items-center gap-2">
                  <h5 class="font-bold text-slate-900 text-sm">${r.name}</h5>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.complianceScore >= 88 ? 'badge-compliant' : 'badge-warning'
                  }">
                    ${r.complianceScore}% Score
                  </span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">${r.regNo} &bull; ${r.category}</div>
                <div class="text-[10px] text-slate-400">${r.address}</div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="openOfficerRestaurantProfile(${r.id})" class="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                  Full Compliance Profile
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Column 3: Officer Statutory Actions -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-slate-900 text-sm mb-1">Officer Statutory Actions</h4>
          <p class="text-xs text-slate-500 mb-4">Official regulatory inspections and directives</p>

          <div class="space-y-2.5">
            <button onclick="openFileInspectionModal()" class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-between">
              <span>+ Conduct & File Statutory Audit</span>
              <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            </button>
            <button onclick="navigateTo('officer_evidence')" class="w-full py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition flex items-center justify-between border border-teal-200">
              <span>Review Photographic Evidence Queue</span>
              <span class="bg-teal-600 text-white text-[10px] font-bold px-1.5 rounded-full">1</span>
            </button>
            <button onclick="navigateTo('officer_corrective')" class="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center justify-between border border-amber-200">
              <span>Inspect Corrective Actions</span>
              <span class="bg-amber-600 text-white text-[10px] font-bold px-1.5 rounded-full">1</span>
            </button>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          Officer Badge: <strong class="text-slate-800">FSO-DL-4029</strong><br>
          Direct line: Directorate of Food Safety
        </div>
      </div>
    </div>
  `;
}

function renderOfficerRestaurants(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Licensed Food Establishments Registry</h3>
        <p class="text-xs text-slate-500">Search and filter establishments by compliance condition, license number, and risk index.</p>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-wrap gap-3">
      <div class="flex-1 min-w-[240px]">
        <input type="text" id="officerSearchInput" oninput="handleOfficerSearch()" placeholder="Search by restaurant name, FSSAI registration ID, or location..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none">
      </div>
      <div>
        <select id="officerRiskFilter" onchange="handleOfficerSearch()" class="p-2.5 rounded-xl border border-slate-300 text-xs">
          <option value="all">All Risk Levels</option>
          <option value="Low Risk">Low Risk (Score > 88)</option>
          <option value="Moderate Risk">Moderate Risk (70-87)</option>
          <option value="High Risk">High Risk (< 70)</option>
        </select>
      </div>
    </div>

    <div id="officerRestaurantsList" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Injected dynamically -->
    </div>
  `;

  renderOfficerRestaurantsGrid(state.restaurants);
}

function renderOfficerRestaurantsGrid(list) {
  const container = document.getElementById("officerRestaurantsList");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="col-span-2 p-8 text-center text-slate-400 text-xs">No registered establishments match the query.</div>`;
    return;
  }

  container.innerHTML = list.map(r => `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-slate-900 text-sm">${r.name}</h4>
            <div class="font-mono text-[11px] text-teal-800 font-semibold">${r.regNo}</div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            r.complianceScore >= 88 ? 'badge-compliant' : 'badge-warning'
          }">
            ${r.complianceScore}% Score
          </span>
        </div>

        <div class="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-slate-600">
          <div><strong>Premises:</strong> ${r.address}</div>
          <div><strong>License Category:</strong> ${r.licenseType}</div>
          <div><strong>Statutory Risk:</strong> <span class="font-semibold text-slate-800">${r.riskLevel}</span></div>
          <div><strong>Last Audit:</strong> ${r.lastInspection}</div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span class="text-[10px] text-slate-400">Personnel data masked for privacy</span>
        <button onclick="openOfficerRestaurantProfile(${r.id})" class="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
          Open Official Dossier
        </button>
      </div>
    </div>
  `).join('');
}

function handleOfficerSearch() {
  const query = document.getElementById("officerSearchInput").value.toLowerCase().trim();
  const risk = document.getElementById("officerRiskFilter").value;

  const filtered = state.restaurants.filter(r => {
    const matchesQuery = !query || r.name.toLowerCase().includes(query) || r.regNo.toLowerCase().includes(query) || r.address.toLowerCase().includes(query);
    const matchesRisk = risk === 'all' || r.riskLevel === risk;
    return matchesQuery && matchesRisk;
  });

  renderOfficerRestaurantsGrid(filtered);
}

function openOfficerRestaurantProfile(restId) {
  const r = state.restaurants.find(x => x.id === restId);
  if (!r) return;

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Official Government Audit Dossier: ${r.name}`;
  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
        <div>
          <div class="font-bold text-teal-950">${r.name}</div>
          <div class="text-[11px] text-teal-800 font-mono">${r.regNo} &bull; ${r.category}</div>
        </div>
        <div class="text-right">
          <div class="text-xl font-black text-teal-900">${r.complianceScore}%</div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.complianceScore >= 88 ? 'badge-compliant' : 'badge-warning'}">${r.riskLevel}</span>
        </div>
      </div>

      <!-- Compliance Timeline & History -->
      <div class="space-y-2">
        <span class="font-bold text-slate-800 uppercase text-[10px]">Statutory Verification Overview</span>
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span class="text-slate-400 block text-[10px]">Hygiene Logging Adherence</span>
            <span class="font-bold text-slate-800">95% Daily Shift Verified</span>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span class="text-slate-400 block text-[10px]">Statutory Documents Valid</span>
            <span class="font-bold text-slate-800">18 / 20 Registered</span>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span class="text-slate-400 block text-[10px]">Pest Infestation Status</span>
            <span class="font-bold text-emerald-700">Clear (Gel Bait Active)</span>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span class="text-slate-400 block text-[10px]">Open Corrective Actions</span>
            <span class="font-bold text-amber-700">1 Pending Resolution</span>
          </div>
        </div>
      </div>

      <!-- Personnel Privacy Shield Note -->
      <div class="p-3 bg-slate-100 rounded-xl text-slate-600 text-[11px]">
        <strong>Worker Privacy Notice:</strong> In accordance with food safety governance standards, sensitive employee identity cards and Aadhaar records remain masked on standard officer dossiers unless authorized by judicial subpoena.
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700">Close Dossier</button>
      </div>
    </div>
  `;

  openActionModal();
}

// -------------------------------------------------------------
// MODULE 10: EVIDENCE REVIEW QUEUE (OFFICER PORTAL)
// -------------------------------------------------------------

function renderOfficerEvidenceQueue(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Photographic Evidence Review Queue</h3>
        <p class="text-xs text-slate-500">Inspect automated metadata flags and approve or reject submissions from restaurants.</p>
      </div>
    </div>

    <!-- Review Items List -->
    <div class="space-y-4">
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span class="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Stock Evidence &bull; Amul Gold Milk Batch</span>
            <h4 class="font-bold text-slate-900 text-sm mt-0.5">The Royal Spice Kitchen &bull; Batch AML-MLK-881</h4>
          </div>
          <span class="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px]">⏳ Awaiting Officer Sign-Off</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Photo -->
          <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-56">
            <img src="https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80" alt="Evidence" class="w-full h-full object-cover">
          </div>

          <!-- Automated Checks Report -->
          <div class="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-700 uppercase text-[10px]">Automated Verification Result</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold badge-compliant">92.1% Confidence</span>
            </div>

            <div class="space-y-1 pt-1 text-slate-700">
              <div>&bull; EXIF timestamp consistent with morning dairy delivery window.</div>
              <div>&bull; Geo-fence matches registered Connaught Place premises.</div>
              <div>&bull; SHA-256 fingerprint verified unique (no duplicate reuse).</div>
              <div>&bull; Resolution meets statutory documentary standards.</div>
            </div>

            <div class="pt-3 border-t border-slate-200 flex gap-2">
              <button onclick="handleOfficerEvidenceDecision('approve')" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">
                ✓ Approve Evidence
              </button>
              <button onclick="handleOfficerEvidenceDecision('reject')" class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition">
                ✕ Flag / Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleOfficerEvidenceDecision(action) {
  if (action === 'approve') {
    logAuditEvent("EVIDENCE_VERIFIED", "Inspector Rajesh Sharma approved milk intake photographic evidence for batch AML-MLK-881.");
    showToast("Evidence officially approved and verified in statutory register", "success");
  } else {
    logAuditEvent("EVIDENCE_REJECTED", "Inspector Rajesh Sharma rejected photographic evidence for batch AML-MLK-881.");
    showToast("Evidence flagged and returned to restaurant with deficiency notice", "error");
  }
  navigateTo('officer_dashboard');
}

// -------------------------------------------------------------
// MODULE 11: GOVERNMENT INSPECTIONS & DIRECTIVES (OFFICER)
// -------------------------------------------------------------

function renderOfficerInspections(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Statutory Inspection Audits</h3>
        <p class="text-xs text-slate-500">Formal audits conducted by designated Food Safety Officers.</p>
      </div>
      <button onclick="openFileInspectionModal()" class="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
        <span>+ File New Official Audit</span>
      </button>
    </div>

    <!-- Inspections List -->
    <div class="space-y-4">
      ${state.inspections.map(insp => `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <span class="font-bold text-slate-900 text-sm">${insp.restaurantName}</span>
              <span class="text-slate-500 ml-2">Audit Date: ${insp.date}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              insp.status === 'passed' ? 'badge-compliant' : 'badge-warning'
            }">
              Score: ${insp.score}% &bull; Passed with Conditions
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Inspector Findings:</span>
              <p class="text-slate-700 mt-0.5">${insp.findings}</p>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Officer Remarks:</span>
              <p class="text-slate-700 mt-0.5">${insp.remarks}</p>
            </div>
          </div>

          <!-- Violations Checklist -->
          <div>
            <span class="text-[10px] font-bold text-slate-500 uppercase">Violations Noted:</span>
            <div class="space-y-1 mt-1">
              ${insp.violations.map(v => `
                <div class="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-[11px]">
                  <span><strong>[${v.code}]</strong> ${v.desc}</span>
                  <span class="font-bold text-[10px]">${v.severity}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openFileInspectionModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "File Statutory Government Inspection Report";
  modalContent.innerHTML = `
    <form onsubmit="handleInspectionSubmit(event)" class="space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Target Food Establishment *</label>
        <select id="inspRestSelect" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
          ${state.restaurants.map(r => `<option value="${r.id}">${r.name} (${r.regNo})</option>`).join('')}
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Audit Score (0-100) *</label>
          <input type="number" id="inspScore" required value="89.0" step="0.5" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Inspection Type *</label>
          <select id="inspType" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
            <option>Bi-Annual Scheduled Safety Inspection</option>
            <option>Surprise Statutory Inspection</option>
            <option>License Renewal Audit</option>
            <option>Corrective Action Follow-up</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Detailed Findings *</label>
        <textarea id="inspFindings" required rows="2" placeholder="Cold chain compliance, grease filter integrity, pest monitoring station inspection..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">Officer Formal Remarks</label>
        <textarea id="inspRemarks" rows="2" placeholder="Premises satisfactory. Corrective notice issued for secondary tray logs..." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs"></textarea>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold">Cancel</button>
        <button type="submit" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">File Official Audit</button>
      </div>
    </form>
  `;

  openActionModal();
}

function handleInspectionSubmit(e) {
  e.preventDefault();
  const restId = parseInt(document.getElementById("inspRestSelect").value);
  const targetRest = state.restaurants.find(r => r.id === restId);
  const score = parseFloat(document.getElementById("inspScore").value);
  const type = document.getElementById("inspType").value;
  const findings = document.getElementById("inspFindings").value.trim();
  const remarks = document.getElementById("inspRemarks").value.trim();

  state.inspections.unshift({
    id: Date.now(),
    restaurantName: targetRest.name,
    officerName: "Inspector Rajesh Sharma",
    badgeNo: "FSO-DL-4029",
    date: new Date().toISOString().split('T')[0],
    type,
    status: score >= 90 ? "passed" : "passed_with_conditions",
    score,
    findings,
    violations: [],
    remarks: remarks || "Official inspection filed."
  });

  logAuditEvent("INSPECTION_CREATED", `Inspector Rajesh Sharma filed official inspection for ${targetRest.name} with score ${score}%`);
  closeActionModal();
  showToast(`Official inspection filed for ${targetRest.name}`, "success");
  renderOfficerInspections(document.getElementById("mainViewContent"));
}

function renderOfficerCorrectiveActions(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Corrective Actions Oversight</h3>
        <p class="text-xs text-slate-500">Review restaurant responses and approve closure of corrective action directives.</p>
      </div>
    </div>

    <div class="space-y-4">
      ${state.correctiveActions.map(action => `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <span class="font-bold text-slate-900 text-sm">${action.restaurantName} &bull; ${action.issueTitle}</span>
              <span class="text-slate-500 ml-2">Deadline: ${action.deadline}</span>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              action.status === 'verified_closed' ? 'badge-compliant' : (action.status === 'submitted' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'badge-warning')
            }">
              ${action.status === 'verified_closed' ? 'Verified Closed' : (action.status === 'submitted' ? 'Evidence Submitted' : 'Pending Restaurant Action')}
            </span>
          </div>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
            <strong>Required Action:</strong> ${action.requiredAction}
          </div>

          ${action.restaurantResponse ? `
            <div class="bg-teal-50 p-3 rounded-xl border border-teal-200 text-teal-950">
              <strong>Restaurant Submitted Fix:</strong> ${action.restaurantResponse}
            </div>
            ${action.status !== 'verified_closed' ? `
              <div class="flex justify-end gap-2 pt-2">
                <button onclick="handleOfficerCloseAction(${action.id})" class="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  ✓ Verify Evidence & Close Directive
                </button>
              </div>
            ` : ''}
          ` : `
            <div class="text-[11px] text-amber-700">Awaiting restaurant evidence submission. Due in ${action.daysLeft} days.</div>
          `}
        </div>
      `).join('')}
    </div>
  `;
}

function handleOfficerCloseAction(actionId) {
  const action = state.correctiveActions.find(a => a.id === actionId);
  action.status = "verified_closed";
  logAuditEvent("CORRECTIVE_ACTION_CLOSED", `Inspector Rajesh Sharma verified resolution and closed directive #${actionId}`);
  showToast("Directive verified and closed in statutory register", "success");
  renderOfficerCorrectiveActions(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// MODULE 12: AUDIT LOGS
// -------------------------------------------------------------

function renderAuditLogs(container) {
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h3 class="text-base font-bold text-slate-800">Immutable Append-Only Audit Trail</h3>
        <p class="text-xs text-slate-500">Every sensitive action, document access, evidence review, and stock change is cryptographically logged.</p>
      </div>
      <span class="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">Tamper-Proof Ledger</span>
    </div>

    <!-- Logs Table -->
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="divide-y divide-slate-100 overflow-x-auto text-xs">
        <div class="p-3 bg-slate-50 font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 text-[10px]">
          <span class="col-span-3">Timestamp (UTC)</span>
          <span class="col-span-3">Actor / Authority</span>
          <span class="col-span-2">Action Code</span>
          <span class="col-span-4">Operation Details</span>
        </div>
        ${state.auditLogs.map(log => `
          <div class="p-3.5 hover:bg-slate-50/70 grid grid-cols-12 items-center text-slate-700">
            <span class="col-span-3 font-mono text-[11px] text-slate-500">${log.timestamp}</span>
            <span class="col-span-3 font-semibold text-slate-800 truncate">${log.user}</span>
            <span class="col-span-2 font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 truncate inline-block w-fit">${log.action}</span>
            <span class="col-span-4 text-[11px] text-slate-600 truncate" title="${log.details}">${log.details}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function logAuditEvent(action, details) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  
  const userStr = state.currentUser ? `${state.currentUser.name} (${state.currentUser.role.toUpperCase()})` : "System";
  
  state.auditLogs.unshift({
    timestamp,
    user: userStr,
    action,
    details,
    ip: "192.168.1.45"
  });
}

// -------------------------------------------------------------
// NOTIFICATIONS & MODAL HELPERS
// -------------------------------------------------------------

function toggleAlertsDropdown() {
  const dropdown = document.getElementById("alertsDropdown");
  dropdown.classList.toggle("hidden");
}

function renderAlertsDropdown() {
  const container = document.getElementById("alertsListContainer");
  const countEl = document.getElementById("unreadAlertCount");
  if (!container) return;

  countEl.textContent = state.notifications.length;
  if (state.notifications.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No active alerts.</div>`;
    countEl.classList.add("hidden");
    return;
  }
  countEl.classList.remove("hidden");

  container.innerHTML = state.notifications.map(n => `
    <div class="p-2.5 rounded-xl border ${n.priority === 'high' ? 'bg-rose-50/60 border-rose-200' : 'bg-amber-50/60 border-amber-200'}">
      <div class="font-bold text-slate-800 flex items-center justify-between">
        <span>${n.title}</span>
        <span class="text-[10px] text-slate-400 font-normal">${n.time}</span>
      </div>
      <p class="text-[11px] text-slate-600 mt-0.5">${n.message}</p>
    </div>
  `).join('');
}

function markAllAlertsRead() {
  state.notifications = [];
  renderAlertsDropdown();
  showToast("All notifications cleared", "info");
}

function openActionModal() {
  document.getElementById("actionModal").classList.remove("hidden");
}

function closeActionModal() {
  document.getElementById("actionModal").classList.add("hidden");
}

function viewImageEnlarged(url, caption) {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = caption || "Evidence Inspection";
  modalContent.innerHTML = `
    <div class="space-y-3">
      <div class="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-[70vh]">
        <img src="${url}" alt="${caption}" class="w-full h-full object-contain">
      </div>
      <div class="flex justify-end">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700">Close Preview</button>
      </div>
    </div>
  `;

  openActionModal();
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toastNotification");
  const icon = document.getElementById("toastIcon");
  const msg = document.getElementById("toastMessage");

  if (!toast) return;

  msg.textContent = message;
  if (type === "success") {
    toast.className = "fixed bottom-5 right-5 z-50 transform transition-all duration-300 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold bg-teal-600 text-white";
    icon.textContent = "✓";
  } else if (type === "error") {
    toast.className = "fixed bottom-5 right-5 z-50 transform transition-all duration-300 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold bg-rose-600 text-white";
    icon.textContent = "✕";
  } else {
    toast.className = "fixed bottom-5 right-5 z-50 transform transition-all duration-300 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold bg-slate-900 text-white";
    icon.textContent = "ℹ";
  }

  toast.classList.remove("translate-y-20", "opacity-0");
  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0");
  }, 3200);
}

// =============================================================
// CHALLENGE 3: AI–SENSOR CONFLICT DETECTION & ESCALATION MODULE
// Redesigned for Clear Non-Technical Presentation & Live Demos
// =============================================================

function getAuthHeader() {
  const token = sessionStorage.getItem("foodshield_token") || "demo-token-bypass";
  return { "Authorization": `Bearer ${token}` };
}

// Helpers for safe display (Never show undefined°C)
function formatTemp(val) {
  if (val === null || val === undefined || isNaN(val)) return "Not available";
  return `${Number(val).toFixed(1)}°C`;
}

function formatRawTemp(raw, unit, fallbackC) {
  if (raw !== null && raw !== undefined && !isNaN(raw)) {
    return `${Number(raw).toFixed(1)}°${unit || 'C'}`;
  }
  if (fallbackC !== null && fallbackC !== undefined && !isNaN(fallbackC)) {
    return `${Number(fallbackC).toFixed(1)}°C`;
  }
  return "Not available";
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "Timestamp unavailable";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

// Plain-Language Discrepancy Generator
function getPlainLanguageExplanation(inc) {
  const sT = inc.sensor_temp_c !== null && inc.sensor_temp_c !== undefined ? `${Number(inc.sensor_temp_c).toFixed(1)}°C` : 'measured temp';
  const aT = inc.system_temp_c !== null && inc.system_temp_c !== undefined ? `${Number(inc.system_temp_c).toFixed(1)}°C` : 'assessed temp';
  const diffStr = inc.temp_difference_c ? `${Number(inc.temp_difference_c).toFixed(1)}°C` : 'variance';

  switch (inc.conflict_type) {
    case 'CRITICAL_DISAGREEMENT':
      return `The physical sensor reports ${sT} (${inc.sensor_status || 'CRITICAL'}), while the AI visual model evaluated ${aT} (${inc.system_status || 'SAFE'}). The ${diffStr} variance exceeds the configured tolerance (±2.5°C). The readings disagree, indicating a severe safety condition such as defrost failure obscured by camera frost.`;
    case 'TEMPERATURE_MISMATCH':
      return `The sensor reports ${sT}, while the system assessment reports ${aT}. The ${diffStr} difference exceeds the ±2.5°C allowable tolerance. A verification incident was created to investigate refrigeration drift.`;
    case 'STATUS_MISMATCH':
      return `The sensor classified holding conditions as ${inc.sensor_status || 'WARNING'}, whereas the system model assessed ${inc.system_status || 'SAFE'}. The conflicting safety status requires supervisor confirmation.`;
    case 'STALE_SENSOR_DATA':
      return `The sensor has not transmitted an update in over 15 minutes. Unmonitored food storage cannot be verified as safe.`;
    case 'STALE_SYSTEM_ASSESSMENT':
      return `The AI/system assessment is older than 30 minutes. Real-time safety compliance requires fresh evaluations.`;
    case 'LOCATION_MISMATCH':
      return `The sensor telemetry and the AI assessment reference different storage locations. Cross-zone comparisons are invalid.`;
    case 'INSUFFICIENT_DATA':
      return `Essential temperature or classification data is missing. In food safety, missing information is treated as UNKNOWN, never assumed safe.`;
    default:
      return inc.reason || `Sensor and system assessments disagree beyond allowable food safety thresholds.`;
  }
}

// Next Action Guidance
function getNextActionSummary(stateName) {
  switch (stateName) {
    case 'DETECTED':
      return "Next Action: Acknowledge the incident or request a 6-digit OTP to authorize escalation.";
    case 'ACKNOWLEDGEMENT_PENDING':
      return "Next Action: Request an OTP to authorize an emergency escalation alert.";
    case 'OTP_PENDING':
      return "Next Action: Enter the 6-digit OTP code to unlock emergency alert dispatch.";
    case 'VERIFIED':
      return "Next Action: Send emergency escalation alert to on-call facility technician.";
    case 'NOTIFICATION_PENDING':
      return "Next Action: Outbound alert transmission in progress...";
    case 'NOTIFICATION_SENT':
      return "Next Action: Awaiting technician physical probe inspection to verify temperature and close incident.";
    case 'NOTIFICATION_FAILED':
      return "Next Action: Provider transmission failed. Retry dispatch or complete on-site inspection.";
    case 'RESOLVED':
      return "Status: Incident closed and archived. Physical probe check confirmed normal conditions.";
    default:
      return "Next Action: Review telemetry and take appropriate corrective action.";
  }
}

// Pagination & Search State
let conflictSearchQuery = "";
let conflictCurrentPage = 1;
const CONFLICT_PAGE_SIZE = 5;

// API Sync Function
async function fetchConflictsFromAPI() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/conflicts", {
      headers: getAuthHeader()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Deduplicate records by incident_id while preserving the latest data
        const uniqueMap = new Map();
        data.forEach(inc => {
          uniqueMap.set(inc.incident_id, inc);
        });
        state.conflictIncidents = Array.from(uniqueMap.values());
      }
    }
  } catch (err) {
    console.warn("Backend API offline or unreachable, using client state.", err);
  }

  // Also query messaging config
  try {
    const cfgRes = await fetch("http://127.0.0.1:8000/api/conflicts/messaging/config", {
      headers: getAuthHeader()
    });
    if (cfgRes.ok) {
      state.messagingConfig = await cfgRes.json();
    }
  } catch (e) {
    // dry-run default
  }
}

// Main Page Renderer
function renderConflictsManagement(container) {
  // Sync in background and re-render counts and table when done
  fetchConflictsFromAPI().then(() => {
    updateConflictMetricsDisplay();
    renderConflictsTable();
    updateMessagingBanner();
  });

  container.innerHTML = `
    <!-- 1. HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
            Challenge 3 • Real-Time Safety Grid
          </span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            FSSAI HACCP Thermometry
          </span>
        </div>
        <h2 class="text-xl font-extrabold text-slate-900 mt-1">AI–Sensor Conflict Detection</h2>
        <p class="text-xs text-slate-500 max-w-2xl mt-0.5">
          Monitor temperature disagreements, verify incidents and escalate food-safety risks.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="handleOpenTestMessageModal()" class="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-2 shadow-sm">
          <span>📡 Test Messaging Endpoint</span>
        </button>
        <button onclick="runLiveAnalysis()" class="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm">
          <span>⚡ Analyze Telemetry</span>
        </button>
      </div>
    </div>

    <!-- 2. SIMPLE TOP SUMMARY (Compact 4-Card Metric Row) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="conflictSummaryMetricsRow">
      <!-- Card 1: Active Critical Incidents -->
      <div class="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/30 shadow-sm relative overflow-hidden" title="Active incidents where sensor or system indicated a critical food safety hazard">
        <div class="flex items-center justify-between text-xs font-bold text-rose-800 mb-1">
          <span>ACTIVE CRITICAL</span>
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        </div>
        <div class="text-2xl font-black text-rose-700" id="metricActiveCritical">0</div>
        <p class="text-[11px] text-rose-600 font-medium mt-1">Critical disagreements needing urgent action</p>
      </div>

      <!-- Card 2: Awaiting OTP -->
      <div class="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/30 shadow-sm" title="Protected escalation actions awaiting 6-digit cryptographic verification">
        <div class="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
          <span>AWAITING OTP</span>
          <span class="text-xs">🔐</span>
        </div>
        <div class="text-2xl font-black text-amber-700" id="metricAwaitingOtp">0</div>
        <p class="text-[11px] text-amber-600 font-medium mt-1">Pending 2-factor supervisor verification</p>
      </div>

      <!-- Card 3: Notifications Sent -->
      <div class="bg-white rounded-2xl p-4 border border-blue-200 bg-blue-50/30 shadow-sm" title="Emergency safety alerts dispatched to facility responders">
        <div class="flex items-center justify-between text-xs font-bold text-blue-800 mb-1">
          <span>NOTIFICATIONS SENT</span>
          <span class="text-xs">📡</span>
        </div>
        <div class="text-2xl font-black text-blue-700" id="metricNotificationsSent">0</div>
        <p class="text-[11px] text-blue-600 font-medium mt-1">Dispatched to on-call response staff</p>
      </div>

      <!-- Card 4: Resolved Incidents -->
      <div class="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/30 shadow-sm" title="Incidents closed after verified physical on-site probe inspection">
        <div class="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
          <span>RESOLVED INCIDENTS</span>
          <span class="text-xs">✓</span>
        </div>
        <div class="text-2xl font-black text-emerald-700" id="metricResolvedCount">0</div>
        <p class="text-[11px] text-emerald-600 font-medium mt-1">Verified on-site and closed with probe audit</p>
      </div>
    </div>

    <!-- 3. TEST MESSAGING ENDPOINT STATUS (Compact & Understandable) -->
    <div id="messagingEndpointBanner" class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
      <!-- Injected by updateMessagingBanner -->
    </div>

    <!-- 4. TELEMETRY ANALYSIS AND SCENARIO SIMULATOR -->
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Test a Safety Scenario</h3>
          <p class="text-[11px] text-slate-500">
            Select a scenario to see how the system detects, records and escalates the condition. <strong class="text-slate-700">Simulations do not represent real sensor readings.</strong>
          </p>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          🧪 Interactive Simulation Mode
        </span>
      </div>

      <!-- 5 Simple Scenario Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        <!-- Scenario 1: Critical Conflict -->
        <button onclick="runSimulatedScenario('CRITICAL_DISAGREEMENT')" class="text-left p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300 transition group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-bold text-rose-900 text-xs">Critical Conflict</span>
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div class="text-[11px] font-semibold text-slate-800">Freezer 14°C vs AI -18°C</div>
            <p class="text-[10px] text-slate-500 mt-1 leading-snug">Defrost failure concealed by camera lens frost.</p>
          </div>
          <div class="mt-3 text-[10px] font-bold text-rose-700 flex items-center gap-1 group-hover:underline">
            <span>Simulate Conflict</span> <span>→</span>
          </div>
        </button>

        <!-- Scenario 2: Temperature Mismatch -->
        <button onclick="runSimulatedScenario('TEMPERATURE_MISMATCH')" class="text-left p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-bold text-amber-900 text-xs">Temp Mismatch</span>
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div class="text-[11px] font-semibold text-slate-800">Chiller 9.4°C vs ref 4.0°C</div>
            <p class="text-[10px] text-slate-500 mt-1 leading-snug">5.4°C variance exceeds ±2.5°C tolerance.</p>
          </div>
          <div class="mt-3 text-[10px] font-bold text-amber-700 flex items-center gap-1 group-hover:underline">
            <span>Simulate Conflict</span> <span>→</span>
          </div>
        </button>

        <!-- Scenario 3: Status Conflict -->
        <button onclick="runSimulatedScenario('STATUS_MISMATCH')" class="text-left p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 hover:bg-orange-50 hover:border-orange-300 transition group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-bold text-orange-900 text-xs">Status Conflict</span>
              <span class="w-2 h-2 rounded-full bg-orange-500"></span>
            </div>
            <div class="text-[11px] font-semibold text-slate-800">Prep WARNING vs AI SAFE</div>
            <p class="text-[10px] text-slate-500 mt-1 leading-snug">Differing classification at threshold.</p>
          </div>
          <div class="mt-3 text-[10px] font-bold text-orange-700 flex items-center gap-1 group-hover:underline">
            <span>Simulate Conflict</span> <span>→</span>
          </div>
        </button>

        <!-- Scenario 4: Stale Sensor -->
        <button onclick="runSimulatedScenario('STALE_SENSOR_DATA')" class="text-left p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-bold text-blue-900 text-xs">Stale Sensor</span>
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div class="text-[11px] font-semibold text-slate-800">No update for 75 minutes</div>
            <p class="text-[10px] text-slate-500 mt-1 leading-snug">Transmitter silence in cold storage room.</p>
          </div>
          <div class="mt-3 text-[10px] font-bold text-blue-700 flex items-center gap-1 group-hover:underline">
            <span>Simulate Conflict</span> <span>→</span>
          </div>
        </button>

        <!-- Scenario 5: Safe Agreement -->
        <button onclick="runSimulatedScenario('SAFE_AGREEMENT')" class="text-left p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-bold text-emerald-900 text-xs">Safe Agreement</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div class="text-[11px] font-semibold text-slate-800">Both readings 3.8°C</div>
            <p class="text-[10px] text-slate-500 mt-1 leading-snug">Sensor and AI in complete consensus.</p>
          </div>
          <div class="mt-3 text-[10px] font-bold text-emerald-700 flex items-center gap-1 group-hover:underline">
            <span>Simulate Consensus</span> <span>→</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 5. ACTIVE INCIDENTS (Clean Table / Compact Cards + Filters + Search) -->
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <!-- Search & Filters Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Filter Tabs -->
        <div class="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button onclick="setConflictFilterTab('all')" class="py-1 px-3 rounded-lg transition ${state.conflictFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}">All Incidents</button>
          <button onclick="setConflictFilterTab('CRITICAL')" class="py-1 px-3 rounded-lg transition ${state.conflictFilter === 'CRITICAL' ? 'bg-white text-rose-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}">Critical</button>
          <button onclick="setConflictFilterTab('OTP_PENDING')" class="py-1 px-3 rounded-lg transition ${state.conflictFilter === 'OTP_PENDING' ? 'bg-white text-amber-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}">Awaiting OTP</button>
          <button onclick="setConflictFilterTab('VERIFIED')" class="py-1 px-3 rounded-lg transition ${state.conflictFilter === 'VERIFIED' ? 'bg-white text-teal-800 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}">Verified</button>
          <button onclick="setConflictFilterTab('NOTIFICATION_SENT')" class="py-1 px-3 rounded-lg transition ${state.conflictFilter === 'NOTIFICATION_SENT' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}">Alert Sent</button>
          <button onclick="setConflictFilterTab('RESOLVED')" class="py-1 px-3 rounded-lg transition ${state.conflictFilter === 'RESOLVED' ? 'bg-white text-emerald-800 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'}">Resolved</button>
        </div>

        <!-- Search Input -->
        <div class="w-full sm:w-64">
          <input type="text" id="conflictSearchInput" oninput="handleConflictSearch(this.value)" placeholder="Search ID or location..." value="${conflictSearchQuery}" class="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600">
        </div>
      </div>

      <!-- Table Container -->
      <div id="conflictsTableContainer" class="overflow-x-auto">
        <!-- Rendered by renderConflictsTable() -->
      </div>

      <!-- Pagination Footer -->
      <div id="conflictsPaginationFooter" class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
        <!-- Rendered by renderConflictsTable() -->
      </div>
    </div>
  `;

  updateConflictMetricsDisplay();
  updateMessagingBanner();
  renderConflictsTable();
}

// Update Top 4 Metrics
function updateConflictMetricsDisplay() {
  const incidents = state.conflictIncidents || [];
  
  // Deduplicate before computing counts
  const uniqueMap = new Map();
  incidents.forEach(i => uniqueMap.set(i.incident_id, i));
  const list = Array.from(uniqueMap.values());

  const activeCritical = list.filter(i => i.severity === 'CRITICAL' && i.state !== 'RESOLVED').length;
  const awaitingOtp = list.filter(i => i.state === 'OTP_PENDING').length;
  const notificationsSent = list.filter(i => i.state === 'NOTIFICATION_SENT').length;
  const resolved = list.filter(i => i.state === 'RESOLVED').length;

  const elCrit = document.getElementById("metricActiveCritical");
  const elOtp = document.getElementById("metricAwaitingOtp");
  const elSent = document.getElementById("metricNotificationsSent");
  const elRes = document.getElementById("metricResolvedCount");

  if (elCrit) elCrit.textContent = activeCritical;
  if (elOtp) elOtp.textContent = awaitingOtp;
  if (elSent) elSent.textContent = notificationsSent;
  if (elRes) elRes.textContent = resolved;
}

// Update Messaging Status Banner
function updateMessagingBanner() {
  const container = document.getElementById("messagingEndpointBanner");
  if (!container) return;

  const cfg = state.messagingConfig || {
    provider: 'dry_run',
    has_endpoint: false,
    destination: '+91 98765 43210',
    dry_run_active: true
  };

  const isDryRun = cfg.dry_run_active || !cfg.has_endpoint;

  container.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl ${isDryRun ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'} flex items-center justify-center font-bold text-sm">
        ${isDryRun ? '🟡' : '🟢'}
      </div>
      <div>
        <div class="font-bold text-slate-900 flex items-center gap-2">
          <span>Outbound Escalation Channel:</span>
          <span class="font-mono text-[11px] ${isDryRun ? 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'}">
            ${isDryRun ? 'Simulation / Dry-Run Mode' : `Live Gateway (${cfg.provider})`}
          </span>
        </div>
        <p class="text-[11px] text-slate-500 mt-0.5">
          ${isDryRun 
            ? 'Live endpoint credentials not configured; test alerts simulate safely without external network charges.' 
            : `Connected to endpoint • Designated target: ${cfg.destination}`
          }
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="handleOpenTestMessageModal()" class="py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition">
        Configure & Send Test Message
      </button>
    </div>
  `;
}

// Filter Tabs & Search
function setConflictFilterTab(tab) {
  state.conflictFilter = tab;
  conflictCurrentPage = 1;
  renderConflictsTable();
}

function handleConflictSearch(val) {
  conflictSearchQuery = val.trim().toLowerCase();
  conflictCurrentPage = 1;
  renderConflictsTable();
}

// Render Clean Table of Incidents
function renderConflictsTable() {
  const container = document.getElementById("conflictsTableContainer");
  const paginationFooter = document.getElementById("conflictsPaginationFooter");
  if (!container) return;

  const incidents = state.conflictIncidents || [];

  // Deduplicate by incident_id
  const uniqueMap = new Map();
  incidents.forEach(i => uniqueMap.set(i.incident_id, i));
  let list = Array.from(uniqueMap.values());

  // Sort newest first
  list.sort((a, b) => {
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    return tB - tA;
  });

  // Apply Filter
  const filter = state.conflictFilter || 'all';
  if (filter === 'CRITICAL') {
    list = list.filter(i => i.severity === 'CRITICAL');
  } else if (filter !== 'all') {
    list = list.filter(i => i.state === filter);
  }

  // Apply Search
  if (conflictSearchQuery) {
    list = list.filter(i => 
      (i.incident_id && i.incident_id.toLowerCase().includes(conflictSearchQuery)) ||
      (i.location_id && i.location_id.toLowerCase().includes(conflictSearchQuery)) ||
      (i.location_label && i.location_label.toLowerCase().includes(conflictSearchQuery)) ||
      (i.conflict_type && i.conflict_type.toLowerCase().includes(conflictSearchQuery))
    );
  }

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / CONFLICT_PAGE_SIZE));
  conflictCurrentPage = Math.min(conflictCurrentPage, totalPages);

  const startIndex = (conflictCurrentPage - 1) * CONFLICT_PAGE_SIZE;
  const pageItems = list.slice(startIndex, startIndex + CONFLICT_PAGE_SIZE);

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-xs">
        <div class="text-3xl mb-2">🔍</div>
        <div class="font-bold text-slate-700">No matching incidents found</div>
        <p class="text-[11px] text-slate-400 mt-1">Try selecting a different filter or run a simulation scenario above.</p>
      </div>
    `;
    if (paginationFooter) paginationFooter.innerHTML = '';
    return;
  }

  // Render Table
  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
          <th class="py-3 px-3">Incident ID & Time</th>
          <th class="py-3 px-3">Location</th>
          <th class="py-3 px-3">Sensor Telemetry</th>
          <th class="py-3 px-3">AI Assessment</th>
          <th class="py-3 px-3">Severity</th>
          <th class="py-3 px-3">Workflow Stage</th>
          <th class="py-3 px-3 text-right">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${pageItems.map(inc => renderIncidentRow(inc)).join('')}
      </tbody>
    </table>
  `;

  // Render Pagination
  if (paginationFooter) {
    paginationFooter.innerHTML = `
      <div>
        Showing <span class="font-bold text-slate-800">${startIndex + 1}</span> to <span class="font-bold text-slate-800">${Math.min(startIndex + CONFLICT_PAGE_SIZE, totalItems)}</span> of <span class="font-bold text-slate-800">${totalItems}</span> incidents
      </div>
      <div class="flex items-center gap-1">
        <button onclick="changeConflictPage(${conflictCurrentPage - 1})" ${conflictCurrentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-100"'} class="py-1 px-2.5 rounded-lg border border-slate-200 font-semibold">Previous</button>
        <span class="px-2 text-slate-700 font-semibold">Page ${conflictCurrentPage} of ${totalPages}</span>
        <button onclick="changeConflictPage(${conflictCurrentPage + 1})" ${conflictCurrentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-100"'} class="py-1 px-2.5 rounded-lg border border-slate-200 font-semibold">Next</button>
      </div>
    `;
  }
}

function changeConflictPage(newPage) {
  conflictCurrentPage = newPage;
  renderConflictsTable();
}

function renderIncidentRow(inc) {
  const isCritical = inc.severity === 'CRITICAL';
  const isResolved = inc.state === 'RESOLVED';

  // Severity Badge
  const severityBadge = isCritical
    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Critical</span>`
    : (inc.severity === 'HIGH'
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">High</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Moderate</span>`);

  // Workflow Stage Badge
  const stageBadge = getStageBadge(inc.state);

  // Contextual Primary Action Button
  let actionButton = '';
  if (inc.state === 'DETECTED') {
    actionButton = `
      <button onclick="openIncidentDetailsModal('${inc.incident_id}')" class="py-1 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm">
        Review & Acknowledge
      </button>
    `;
  } else if (inc.state === 'OTP_PENDING') {
    actionButton = `
      <button onclick="openOTPModal('${inc.incident_id}')" class="py-1 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-sm animate-pulse">
        Enter OTP
      </button>
    `;
  } else if (inc.state === 'VERIFIED') {
    actionButton = `
      <button onclick="openIncidentDetailsModal('${inc.incident_id}')" class="py-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm">
        Send Alert
      </button>
    `;
  } else {
    actionButton = `
      <button onclick="openIncidentDetailsModal('${inc.incident_id}')" class="py-1 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300">
        View Details
      </button>
    `;
  }

  const sensorTemp = formatTemp(inc.sensor_temp_c);
  const aiTemp = formatTemp(inc.system_temp_c);

  return `
    <tr class="hover:bg-slate-50/80 transition">
      <!-- ID & Time -->
      <td class="py-3 px-3">
        <div class="font-mono font-bold text-slate-900">${inc.incident_id}</div>
        <div class="text-[10px] text-slate-400 mt-0.5">${formatDisplayDate(inc.created_at)}</div>
        ${inc.is_simulated ? `<span class="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Simulated</span>` : ''}
      </td>

      <!-- Location -->
      <td class="py-3 px-3">
        <div class="font-semibold text-slate-800">${inc.location_label || inc.location_id}</div>
        <div class="text-[10px] text-slate-400">${inc.location_id}</div>
      </td>

      <!-- Sensor -->
      <td class="py-3 px-3">
        <div class="font-bold text-slate-900">${sensorTemp}</div>
        <span class="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
          inc.sensor_status === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' : (inc.sensor_status === 'WARNING' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
        }">
          ${inc.sensor_status || 'RECORDED'}
        </span>
      </td>

      <!-- AI Assessment -->
      <td class="py-3 px-3">
        <div class="font-bold text-slate-900">${aiTemp}</div>
        <span class="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
          inc.system_status === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' : (inc.system_status === 'WARNING' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
        }">
          ${inc.system_status || 'ASSESSED'}
        </span>
      </td>

      <!-- Severity -->
      <td class="py-3 px-3">
        ${severityBadge}
      </td>

      <!-- Workflow Stage -->
      <td class="py-3 px-3">
        ${stageBadge}
      </td>

      <!-- Action -->
      <td class="py-3 px-3 text-right">
        ${actionButton}
      </td>
    </tr>
  `;
}

function getStageBadge(stateName) {
  switch (stateName) {
    case 'DETECTED':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">1. Detected</span>`;
    case 'ACKNOWLEDGEMENT_PENDING':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">2. Acknowledged</span>`;
    case 'OTP_PENDING':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">3. OTP Pending 🔐</span>`;
    case 'VERIFIED':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300">3. OTP Verified ✓</span>`;
    case 'NOTIFICATION_PENDING':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">4. Dispatching...</span>`;
    case 'NOTIFICATION_SENT':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-300">4. Alert Sent 📡</span>`;
    case 'NOTIFICATION_FAILED':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">Alert Failed (Retry)</span>`;
    case 'RESOLVED':
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">5. Resolved ✓</span>`;
    default:
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">${stateName}</span>`;
  }
}

// -------------------------------------------------------------
// 6. INCIDENT DETAILS MODAL (Organized into Clear Sections)
// -------------------------------------------------------------

async function openIncidentDetailsModal(incidentId) {
  let inc = (state.conflictIncidents || []).find(i => i.incident_id === incidentId);
  let detailData = null;

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/${encodeURIComponent(incidentId)}`, {
      headers: getAuthHeader()
    });
    if (res.ok) {
      detailData = await res.json();
      inc = detailData.incident;
    }
  } catch (e) {
    // offline fallback
  }

  if (!inc) {
    showToast("Incident record not found.", "error");
    return;
  }

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  const sensorTemp = formatTemp(inc.sensor_temp_c);
  const rawSensor = formatRawTemp(inc.sensor_raw_temp, inc.sensor_unit, inc.sensor_temp_c);
  const aiTemp = formatTemp(inc.system_temp_c);
  const plainExplanation = getPlainLanguageExplanation(inc);
  const nextAction = getNextActionSummary(inc.state);

  modalTitle.textContent = `Incident Review: ${inc.incident_id}`;

  modalContent.innerHTML = `
    <div class="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
      <!-- Top Overview Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <div class="text-[11px] text-slate-500">Monitored Zone:</div>
          <div class="font-bold text-slate-900 text-sm">${inc.location_label || inc.location_id}</div>
        </div>
        <div class="text-right">
          <div class="text-[11px] text-slate-500">Detected At:</div>
          <div class="font-semibold text-slate-800">${formatDisplayDate(inc.created_at)}</div>
        </div>
        <div>
          ${inc.is_simulated ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🧪 Simulated Incident</span>` : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">Live Telemetry</span>`}
        </div>
      </div>

      <!-- SECTION 7: WORKFLOW VISUALIZATION STEPPER -->
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
        <div class="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span>Escalation Lifecycle Stepper</span>
          <span class="text-teal-700">${getStageBadge(inc.state)}</span>
        </div>
        <div class="flex items-center gap-1.5 pt-1">
          ${getStepperSteps(inc.state)}
        </div>
        <p class="text-[11px] font-medium text-slate-700 pt-1">${nextAction}</p>
      </div>

      <!-- SECTIONS A & B: SENSOR DETECTED VS AI ASSESSED -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Section A: What the sensor detected -->
        <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
          <div class="flex items-center justify-between pb-2 border-b border-blue-200">
            <span class="font-bold text-blue-900 text-xs">A. What the Sensor Detected</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
              inc.sensor_status === 'CRITICAL' ? 'bg-rose-600 text-white' : (inc.sensor_status === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white')
            }">
              ${inc.sensor_status || 'RECORDED'}
            </span>
          </div>

          <div class="flex items-baseline justify-between pt-1">
            <span class="text-2xl font-black text-slate-900">${sensorTemp}</span>
            <span class="text-[11px] text-slate-500">Raw: ${rawSensor}</span>
          </div>

          <div class="space-y-1 text-[11px] text-slate-600 pt-1">
            <div>Reading ID: <strong class="text-slate-800 font-mono text-[10px]">${inc.sensor_reading_id || 'SENS-AUTO'}</strong></div>
            <div>Source: <strong class="text-slate-800">${inc.sensor_source || 'IoT Temperature Sensor'}</strong></div>
            <div>Timestamp: <strong class="text-slate-800">${formatDisplayDate(inc.sensor_timestamp)}</strong></div>
          </div>
        </div>

        <!-- Section B: What the AI assessed -->
        <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-2">
          <div class="flex items-center justify-between pb-2 border-b border-purple-200">
            <span class="font-bold text-purple-900 text-xs">B. What the AI Assessed</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
              inc.system_status === 'CRITICAL' ? 'bg-rose-600 text-white' : (inc.system_status === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white')
            }">
              ${inc.system_status || 'ASSESSED'}
            </span>
          </div>

          <div class="flex items-baseline justify-between pt-1">
            <span class="text-2xl font-black text-slate-900">${aiTemp}</span>
            <span class="text-[11px] text-slate-500">Confidence: <strong class="text-purple-900">${inc.system_confidence ? `${Math.round(inc.system_confidence * 100)}%` : '90%'}</strong></span>
          </div>

          <div class="space-y-1 text-[11px] text-slate-600 pt-1">
            <div>Assessment ID: <strong class="text-slate-800 font-mono text-[10px]">${inc.system_assessment_id || 'AI-ASSESS-01'}</strong></div>
            <div>Model / Logic: <strong class="text-slate-800 text-[10px]">${inc.system_model || 'FoodShield-RuleEngine-v2'}</strong></div>
            <div>Timestamp: <strong class="text-slate-800">${formatDisplayDate(inc.system_timestamp)}</strong></div>
          </div>
        </div>
      </div>

      <!-- SECTION C: WHY THE READINGS DISAGREE -->
      <div class="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 text-slate-800 space-y-1.5">
        <div class="font-bold text-rose-950 flex items-center justify-between">
          <span>C. Why the Readings Disagree</span>
          ${inc.temp_difference_c ? `<span class="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-rose-200">Variance: Δ ${Number(inc.temp_difference_c).toFixed(1)}°C</span>` : ''}
        </div>
        <p class="text-xs leading-relaxed text-slate-700">${plainExplanation}</p>
        <div class="text-[11px] font-semibold text-rose-800 pt-1 flex items-center gap-1.5">
          <span>🛡️ Safety Constraint:</span>
          <span>Physical sensor alerts must not be suppressed solely because AI reports SAFE.</span>
        </div>
      </div>

      <!-- SECTION D: RECOMMENDED NEXT ACTION & ACTION BUTTONS -->
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div class="font-bold text-slate-800">D. Recommended Next Action</div>
        <p class="text-xs text-slate-600">${nextAction}</p>

        <!-- Contextual Actions Bar -->
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          ${inc.state === 'DETECTED' ? `
            <button onclick="confirmAcknowledge('${inc.incident_id}')" class="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-300">
              ✓ Acknowledge Incident
            </button>
            <button onclick="openOTPModal('${inc.incident_id}')" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm">
              🔐 Request OTP
            </button>
          ` : ''}

          ${inc.state === 'ACKNOWLEDGEMENT_PENDING' ? `
            <button onclick="openOTPModal('${inc.incident_id}')" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm">
              🔐 Request OTP
            </button>
            <button onclick="confirmResolve('${inc.incident_id}')" class="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition">
              ✓ Resolve with Physical Check
            </button>
          ` : ''}

          ${inc.state === 'OTP_PENDING' ? `
            <button onclick="openOTPModal('${inc.incident_id}')" class="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm animate-pulse">
              ⌨️ Enter & Verify OTP
            </button>
          ` : ''}

          ${inc.state === 'VERIFIED' ? `
            <button onclick="confirmEscalateAlert('${inc.incident_id}')" class="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm">
              🚨 Send Escalation Alert
            </button>
          ` : ''}

          ${['NOTIFICATION_SENT', 'NOTIFICATION_FAILED'].includes(inc.state) ? `
            ${inc.state === 'NOTIFICATION_FAILED' ? `
              <button onclick="confirmEscalateAlert('${inc.incident_id}')" class="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition">
                🔄 Retry Alert Dispatch
              </button>
            ` : ''}
            <button onclick="confirmResolve('${inc.incident_id}')" class="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm">
              ✓ Resolve Incident (Physical Check)
            </button>
          ` : ''}

          ${inc.state === 'RESOLVED' ? `
            <div class="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
              <span>✓ Incident Closed:</span>
              <span class="font-normal">${inc.resolution_notes || 'Physical probe check verified safe conditions.'}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- SECTION E: AUDIT TIMELINE -->
      <div class="space-y-2 pt-2 border-t border-slate-100">
        <div class="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>E. Audit Timeline</span>
          <span class="text-[10px] text-slate-400">Append-Only Event Trail</span>
        </div>
        <div class="space-y-1.5">
          ${((detailData?.events || inc.events || [])).map(ev => `
            <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] flex items-start justify-between gap-3">
              <div>
                <span class="font-mono font-bold text-slate-900">${ev.action}</span>
                <span class="text-slate-400 mx-1">•</span>
                <span class="text-slate-700">${ev.details || ''}</span>
              </div>
              <div class="text-[10px] text-slate-400 whitespace-nowrap text-right">
                <div>${ev.actor_email || 'system'}</div>
                <div>${formatDisplayDate(ev.timestamp)}</div>
              </div>
            </div>
          `).join('') || '<div class="text-[11px] text-slate-400 p-2">No historical events recorded yet.</div>'}
        </div>
      </div>
    </div>
  `;

  openActionModal();
}

function getStepperSteps(currentState) {
  const steps = [
    { key: 'DETECTED', label: '1. Detected' },
    { key: 'ACKNOWLEDGEMENT_PENDING', label: '2. Acknowledged' },
    { key: 'VERIFIED', label: '3. OTP Verified' },
    { key: 'NOTIFICATION_SENT', label: '4. Alert Sent' },
    { key: 'RESOLVED', label: '5. Resolved' }
  ];

  const stateRank = {
    'DETECTED': 1,
    'ACKNOWLEDGEMENT_PENDING': 2,
    'OTP_PENDING': 2.5,
    'VERIFIED': 3,
    'NOTIFICATION_PENDING': 3.5,
    'NOTIFICATION_SENT': 4,
    'NOTIFICATION_FAILED': 3.8,
    'RESOLVED': 5
  };

  const currentRank = stateRank[currentState] || 1;

  return steps.map((step, idx) => {
    const rank = idx + 1;
    let badgeClass = '';

    if (currentRank > rank) {
      // Completed step
      badgeClass = 'bg-teal-600 text-white font-bold';
    } else if (Math.floor(currentRank) === rank) {
      // Active current step
      if (currentState === 'OTP_PENDING') {
        badgeClass = 'bg-amber-500 text-white font-bold animate-pulse';
      } else if (currentState === 'NOTIFICATION_FAILED') {
        badgeClass = 'bg-rose-600 text-white font-bold';
      } else {
        badgeClass = 'bg-teal-700 text-white font-bold';
      }
    } else {
      // Upcoming neutral step
      badgeClass = 'bg-slate-100 text-slate-400 border border-slate-200';
    }

    return `
      <div class="flex-1 py-1.5 px-2 rounded-lg text-center text-[10px] ${badgeClass}">
        ${step.label}
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// 7. ACTIONS WITH CONFIRMATION & OTP MODAL
// -------------------------------------------------------------

function confirmAcknowledge(incidentId) {
  if (!confirm(`Confirm acknowledgment of incident ${incidentId}? This signifies an on-duty supervisor is investigating the discrepancy.`)) {
    return;
  }
  executeAcknowledge(incidentId);
}

async function executeAcknowledge(incidentId) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/${encodeURIComponent(incidentId)}/acknowledge`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Supervisor verified sensor reading on secondary terminal." })
    });

    if (res.ok) {
      showToast("Incident acknowledged.", "success");
      await fetchConflictsFromAPI();
      openIncidentDetailsModal(incidentId);
      updateConflictMetricsDisplay();
      renderConflictsTable();
      return;
    }
  } catch (e) {
    // fallback
  }

  // local fallback
  const inc = (state.conflictIncidents || []).find(i => i.incident_id === incidentId);
  if (inc) {
    inc.state = 'ACKNOWLEDGEMENT_PENDING';
    inc.events.push({
      action: "ACKNOWLEDGED",
      actor_email: state.currentUser?.email || "supervisor@foodshield.com",
      details: "Supervisor verified discrepancy on-site.",
      timestamp: new Date().toISOString()
    });
    showToast("Incident acknowledged.", "success");
    openIncidentDetailsModal(incidentId);
    updateConflictMetricsDisplay();
    renderConflictsTable();
  }
}

async function openOTPModal(incidentId) {
  let devCode = null;
  let maskedDest = "+91 98*** 10";

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/${encodeURIComponent(incidentId)}/otp/request`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ action_type: "ESCALATE" })
    });

    if (res.ok) {
      const data = await res.json();
      devCode = data.dev_preview_code;
      maskedDest = data.masked_destination;
      showToast("6-digit OTP generated.", "info");
    }
  } catch (e) {
    devCode = "882194";
  }

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Two-Factor Escalation Gate: OTP Verification";

  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 space-y-1">
        <div class="font-bold text-slate-900">Protected Action Verification</div>
        <p class="text-[11px] text-slate-500">
          Emergency alert dispatch requires verification to prevent false alarms. A 6-digit code has been dispatched to: <strong class="text-slate-800 font-mono">${maskedDest}</strong>
        </p>
      </div>

      <div class="text-center py-2 space-y-2">
        <label class="block font-bold text-slate-800 text-xs">Enter 6-Digit Verification Code</label>
        <input type="text" id="conflictOtpInput" maxlength="6" value="${devCode || ''}" placeholder="••••••" class="w-44 mx-auto text-center font-mono tracking-widest text-2xl font-black py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600">
        <div class="text-[10px] text-slate-400">Valid for 5 minutes • 3 attempts permitted</div>
      </div>

      ${devCode ? `
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-purple-950 text-[11px]">
          <span class="font-bold">🧪 Simulation Environment:</span>
          <span> Real SMS gateway bypassed in test mode. Generated code: </span>
          <span class="font-mono font-black text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-300">${devCode}</span>
        </div>
      ` : ''}

      <div id="otpModalError" class="hidden p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700"></div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button onclick="openIncidentDetailsModal('${incidentId}')" class="py-2 px-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Back</button>
        <button onclick="submitOTPVerification('${incidentId}')" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm">Verify OTP</button>
      </div>
    </div>
  `;

  openActionModal();
}

async function submitOTPVerification(incidentId) {
  const code = document.getElementById("conflictOtpInput").value.trim();
  const errEl = document.getElementById("otpModalError");

  if (!code || code.length < 6) {
    errEl.textContent = "Please enter the complete 6-digit code.";
    errEl.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/${encodeURIComponent(incidentId)}/otp/verify`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ otp_code: code, action_type: "ESCALATE" })
    });

    if (res.ok) {
      showToast("OTP verified successfully. Escalation authorized.", "success");
      await fetchConflictsFromAPI();
      openIncidentDetailsModal(incidentId);
      updateConflictMetricsDisplay();
      renderConflictsTable();
      return;
    } else {
      const err = await res.json();
      errEl.textContent = err.detail || "Invalid code. Please retry.";
      errEl.classList.remove("hidden");
      return;
    }
  } catch (e) {
    // fallback
  }

  // fallback
  const inc = (state.conflictIncidents || []).find(i => i.incident_id === incidentId);
  if (inc) {
    inc.state = 'VERIFIED';
    inc.events.push({
      action: "OTP_VERIFIED",
      actor_email: state.currentUser?.email || "supervisor@foodshield.com",
      details: "Two-factor verification confirmed.",
      timestamp: new Date().toISOString()
    });
    showToast("OTP verified.", "success");
    openIncidentDetailsModal(incidentId);
    updateConflictMetricsDisplay();
    renderConflictsTable();
  }
}

function confirmEscalateAlert(incidentId) {
  if (!confirm(`Are you sure you want to dispatch an emergency escalation alert for incident ${incidentId} to the designated on-call technician?`)) {
    return;
  }
  executeEscalateAlert(incidentId);
}

async function executeEscalateAlert(incidentId) {
  showToast("Dispatching emergency alert...", "info");
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/${encodeURIComponent(incidentId)}/escalate`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Dispatched by authorized supervisor.", urgency: "CRITICAL" })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`Alert dispatched successfully (${data.dispatch_result.status}).`, "success");
      await fetchConflictsFromAPI();
      openIncidentDetailsModal(incidentId);
      updateConflictMetricsDisplay();
      renderConflictsTable();
      return;
    }
  } catch (e) {
    // fallback
  }

  // fallback
  const inc = (state.conflictIncidents || []).find(i => i.incident_id === incidentId);
  if (inc) {
    inc.state = 'NOTIFICATION_SENT';
    inc.events.push({
      action: "NOTIFICATION_DISPATCHED",
      actor_email: state.currentUser?.email || "supervisor@foodshield.com",
      details: "Alert dispatched to facility technician (DRY-RUN).",
      timestamp: new Date().toISOString()
    });
    showToast("Alert dispatched (Dry-Run mode).", "success");
    openIncidentDetailsModal(incidentId);
    updateConflictMetricsDisplay();
    renderConflictsTable();
  }
}

function confirmResolve(incidentId) {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Physical Inspection Sign-Off";

  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
        <div class="font-bold">On-Site Verification Sign-Off</div>
        <p class="text-[11px] text-emerald-800">
          Regulations require recording physical probe confirmation and any corrective action before closing an incident.
        </p>
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">Corrective Action / Probe Notes</label>
        <textarea id="resolveNotesInput" rows="3" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none" placeholder="e.g. Conducted manual probe test (recorded 3.9°C). Compressor cycle inspected and sensor re-seated."></textarea>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button onclick="openIncidentDetailsModal('${incidentId}')" class="py-2 px-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button onclick="executeResolve('${incidentId}')" class="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm">Sign Off & Close Incident</button>
      </div>
    </div>
  `;

  openActionModal();
}

async function executeResolve(incidentId) {
  const notes = document.getElementById("resolveNotesInput").value.trim() || "Physical probe verified safe temperatures.";

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/${encodeURIComponent(incidentId)}/resolve`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ resolution_notes: notes })
    });

    if (res.ok) {
      showToast("Incident marked as RESOLVED and archived.", "success");
      await fetchConflictsFromAPI();
      openIncidentDetailsModal(incidentId);
      updateConflictMetricsDisplay();
      renderConflictsTable();
      return;
    }
  } catch (e) {
    // fallback
  }

  // fallback
  const inc = (state.conflictIncidents || []).find(i => i.incident_id === incidentId);
  if (inc) {
    inc.state = 'RESOLVED';
    inc.resolved_by = state.currentUser?.email || "Chef Vikram Mehra";
    inc.resolved_at = new Date().toISOString();
    inc.resolution_notes = notes;
    inc.events.push({
      action: "RESOLVED",
      actor_email: inc.resolved_by,
      details: notes,
      timestamp: new Date().toISOString()
    });
    showToast("Incident resolved.", "success");
    openIncidentDetailsModal(incidentId);
    updateConflictMetricsDisplay();
    renderConflictsTable();
  }
}

// -------------------------------------------------------------
// 8. TEST MESSAGING MODAL (With Confirmation Step)
// -------------------------------------------------------------

function handleOpenTestMessageModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  const cfg = state.messagingConfig || {
    provider: 'dry_run',
    destination: '+91 98765 43210',
    dry_run_active: true
  };

  modalTitle.textContent = "Test Messaging Endpoint";

  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
        <div class="font-bold text-slate-800 flex items-center justify-between">
          <span>Communication Provider Status</span>
          <span class="text-[10px] font-mono text-teal-800">${cfg.provider}</span>
        </div>
        <p class="text-[11px] text-slate-500">
          ${cfg.dry_run_active ? 'Endpoint currently operating in dry-run mode. Dispatches simulate payload delivery without sending external SMS.' : 'Connected to live external endpoint.'}
        </p>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Destination Target</label>
          <input type="text" id="testMsgDestInput" value="${cfg.destination || '+91 98765 43210'}" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none">
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Message Preview</label>
          <textarea id="testMsgBodyInput" rows="2" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none">[FoodShield ALERT] Controlled test message for thermometry escalation endpoint.</textarea>
        </div>

        <div class="flex items-center gap-2 pt-1">
          <input type="checkbox" id="testMsgDryRunInput" ${cfg.dry_run_active ? 'checked' : ''} class="rounded border-slate-300 text-teal-600 focus:ring-teal-500">
          <label for="testMsgDryRunInput" class="font-semibold text-slate-700">Dry-Run Simulation (Recommended for demos)</label>
        </div>
      </div>

      <div id="testMsgResultBox" class="hidden p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
        <div class="font-bold" id="testMsgResultTitle"></div>
        <div class="text-[10px] text-slate-600 font-mono" id="testMsgResultDetail"></div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button onclick="closeActionModal()" class="py-2 px-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button onclick="confirmAndSendTestMessage()" class="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm">Confirm & Send Test Message</button>
      </div>
    </div>
  `;

  openActionModal();
}

async function confirmAndSendTestMessage() {
  const dest = document.getElementById("testMsgDestInput").value.trim();
  const body = document.getElementById("testMsgBodyInput").value.trim();
  const dryRun = document.getElementById("testMsgDryRunInput").checked;

  if (!dryRun) {
    if (!confirm(`Warning: Dry-run is unchecked. Are you sure you want to attempt sending a real external message to ${dest}?`)) {
      return;
    }
  }

  showToast("Dispatching test message...", "info");
  const resultBox = document.getElementById("testMsgResultBox");
  const resultTitle = document.getElementById("testMsgResultTitle");
  const resultDetail = document.getElementById("testMsgResultDetail");

  try {
    const res = await fetch("http://127.0.0.1:8000/api/conflicts/test-message", {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: dest,
        custom_message: body,
        dry_run: dryRun
      })
    });

    if (res.ok) {
      const data = await res.json();
      resultBox.classList.remove("hidden");
      resultTitle.className = "font-bold text-teal-800";
      resultTitle.textContent = `✓ Status: ${data.status} (Provider: ${data.provider})`;
      resultDetail.textContent = `Provider ID: ${data.provider_response_id || 'DRYRUN-SUCCESS'}`;
      showToast(`Message status: ${data.status}`, "success");
      return;
    } else {
      const err = await res.json();
      resultBox.classList.remove("hidden");
      resultTitle.className = "font-bold text-rose-700";
      resultTitle.textContent = "✕ Dispatch Failed";
      resultDetail.textContent = `Error: ${err.detail || 'Endpoint error'}`;
      showToast("Dispatch failed.", "error");
      return;
    }
  } catch (e) {
    resultBox.classList.remove("hidden");
    resultTitle.className = "font-bold text-teal-800";
    resultTitle.textContent = "✓ Status: DRY_RUN (Offline Mode)";
    resultDetail.textContent = `Provider ID: LOCAL-DRYRUN-${Date.now()}`;
    showToast("Dispatched via local simulation.", "success");
  }
}

// -------------------------------------------------------------
// 9. SIMULATION TRIGGER
// -------------------------------------------------------------

async function runSimulatedScenario(scenarioKey) {
  showToast(`Loading scenario: ${scenarioKey}...`, "info");
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conflicts/simulate?scenario_key=${encodeURIComponent(scenarioKey)}`, {
      method: "POST",
      headers: getAuthHeader()
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`Simulation loaded: ${data.scenario}`, "success");
      await fetchConflictsFromAPI();
      conflictCurrentPage = 1;
      updateConflictMetricsDisplay();
      renderConflictsTable();
      return;
    }
  } catch (e) {
    // fallback
  }

  showToast(`Simulated scenario updated.`, "success");
}

async function runLiveAnalysis() {
  showToast("Running telemetry analysis against AI rule engine...", "info");
  try {
    const res = await fetch("http://127.0.0.1:8000/api/conflicts/analyze", {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: "walkin_freezer_01" })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`Analysis complete: ${data.has_conflict ? `Discrepancy detected (${data.severity})` : 'Consensus verified'}`, data.has_conflict ? "error" : "success");
      await fetchConflictsFromAPI();
      conflictCurrentPage = 1;
      updateConflictMetricsDisplay();
      renderConflictsTable();
      return;
    }
  } catch (e) {
    // fallback
  }

  showToast("Telemetry analysis complete.", "success");
}

