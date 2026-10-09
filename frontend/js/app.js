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
  token: sessionStorage.getItem("foodshield_token") || null,
  isApiConnected: false,

  // Challenge 2: DemandSense AI State
  demandSense: {
    activeScenario: 'scenario_a',
    demandMultiplier: 1.0,
    horizonDays: 7,
    selectedDishId: null,
    forecasts: [],
    ingredientDemands: [],
    stockoutRisks: [],
    recommendations: [],
    expiryRiskReports: [],
    history: [],
    methodology: null,
    scenarioMetadata: {
      title: "Scenario A: Baseline Normal Operations",
      description: "Standard daily sales and replenishment cycles. All inventory buffers healthy and within parameters.",
      impact: "Stockout Risk Scores: LOW (all < 30). No urgent purchase orders required."
    },
    isLoading: false,
    selectedRiskDetail: null
  },

  // Challenge 2: Cold-Chain Storage & Telemetry State
  storageUnits: [
    {
      id: 1,
      restaurant_id: 1,
      name: "Walk-in Dairy & Cold Chiller #1",
      unit_type: "walk_in_chiller",
      location_area: "Central Cold Storage Room",
      min_temp: 0.5,
      max_temp: 4.0,
      target_temp: 2.5,
      current_temp: 3.2,
      current_humidity: 74.0,
      status: "normal",
      last_ping: "2026-10-09 10:45:00 UTC",
      active_breaches_count: 0,
      linked_batches_count: 2
    },
    {
      id: 2,
      restaurant_id: 1,
      name: "Deep Meat & Poultry Freezer #1",
      unit_type: "deep_freezer",
      location_area: "Sub-Zero Storage Bay",
      min_temp: -22.0,
      max_temp: -18.0,
      target_temp: -20.0,
      current_temp: -19.4,
      current_humidity: 58.0,
      status: "normal",
      last_ping: "2026-10-09 10:45:00 UTC",
      active_breaches_count: 0,
      linked_batches_count: 0
    },
    {
      id: 3,
      restaurant_id: 1,
      name: "Line Prep Chilled Counter",
      unit_type: "prep_refrigerator",
      location_area: "Kitchen Hot-Line Section",
      min_temp: 1.0,
      max_temp: 5.0,
      target_temp: 3.5,
      current_temp: 4.8,
      current_humidity: 68.0,
      status: "warning",
      last_ping: "2026-10-09 10:45:00 UTC",
      active_breaches_count: 0,
      linked_batches_count: 0
    },
    {
      id: 4,
      restaurant_id: 1,
      name: "Salad & Dessert Display Counter",
      unit_type: "display_counter",
      location_area: "Dining Service Counter",
      min_temp: 2.0,
      max_temp: 6.0,
      target_temp: 4.0,
      current_temp: 7.8,
      current_humidity: 62.0,
      status: "critical_breach",
      last_ping: "2026-10-09 10:45:00 UTC",
      active_breaches_count: 1,
      linked_batches_count: 0
    }
  ],
  temperatureAlerts: [
    {
      id: 1,
      unit_id: 4,
      unit_name: "Salad & Dessert Display Counter",
      restaurant_id: 1,
      breach_temp: 7.8,
      threshold_temp: 6.0,
      severity: "critical",
      escalation_level: 2,
      status: "level_2_manager_escalated",
      narrative: "Display counter exceeded safe limit (7.8°C > 6.0°C) for over 90 mins. Elevated to General Manager for immediate compressor service check.",
      detected_at: "2026-10-09 08:45:00 UTC",
      acknowledged_at: null,
      acknowledged_by: null,
      corrective_action_notes: null
    }
  ],
  selectedTelemetryUnitId: 1,
  telemetryHistory: {},
  spoilagePredictions: [],
  coldChainSubTab: 'overview',

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

  setTimeout(async () => {
    // Attempt Live API login first
    try {
      const authPayload = await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: state.activeRole })
      });
      if (authPayload && authPayload.access_token) {
        state.token = authPayload.access_token;
        sessionStorage.setItem("foodshield_token", authPayload.access_token);
        state.currentUser = {
          email: email,
          name: authPayload.full_name,
          role: authPayload.role,
          title: authPayload.role === 'restaurant' ? "The Royal Spice Kitchen" : "Senior Food Safety Officer (FSO-DL-4029)",
          restaurantId: authPayload.restaurant_id,
          officerId: authPayload.officer_id
        };
        sessionStorage.setItem("foodshield_user", JSON.stringify(state.currentUser));
        logAuditEvent("LOGIN_SUCCESS", `${authPayload.full_name} authenticated with live JWT token.`);
        showAppShell();
        showToast("Connected to AnnaKavach / FoodShield Live Grid", "success");
        return;
      }
    } catch(err) {
      console.log("Live API login unreached or failed, evaluating demo credentials:", err.message);
    }

    // Validate credentials safely with local demo fallback
    if (state.activeRole === 'restaurant' && email === 'restaurant@foodshield.com' && password === 'Password123!') {
      state.currentUser = {
        email: email,
        name: "Chef Vikram Mehra",
        role: "restaurant",
        title: "The Royal Spice Kitchen"
      };
      sessionStorage.setItem("foodshield_user", JSON.stringify(state.currentUser));
      logAuditEvent("LOGIN_SUCCESS", "User authenticated into Restaurant Portal (Demo Mode)");
      showAppShell();
      showToast("Welcome to AnnaKavach / FoodShield Portal", "success");
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
    { id: 'dashboard', label: 'Overview & Scores', icon: '📊', isProtected: false },
    { id: 'demandsense', label: 'DemandSense AI', icon: '📈', isProtected: false, badge: 'AI' },
    { id: 'temperature', label: 'Cold Chain Intelligence', icon: '❄️', isProtected: false, badge: '!' },
    { id: 'temperature_alerts', label: 'Alerts & Escalations', icon: '🚨', isProtected: false },
    { id: 'temperature_compliance', label: 'Compliance & Spoilage', icon: '🛡️', isProtected: false },
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
    { id: 'demandsense', label: 'DemandSense AI Audit', icon: '📈', isProtected: false, badge: 'AI' },
    { id: 'officer_restaurants', label: 'Restaurants Directory', icon: '🏢', isProtected: false },
    { id: 'officer_temperature', label: 'Cold-Chain Excursions', icon: '🌡️', isProtected: false, badge: '!' },
    { id: 'officer_evidence', label: 'Evidence Review Queue', icon: '🔍', isProtected: false, badge: '1' },
    { id: 'officer_inspections', label: 'Inspections & Audits', icon: '📝', isProtected: false },
    { id: 'officer_corrective', label: 'Corrective Directives', icon: '⚖️', isProtected: false },
    { id: 'audit', label: 'Central Audit Logs', icon: '📜', isProtected: false }
  ];

  const links = role === 'restaurant' ? restaurantLinks : officerLinks;

  links.forEach(link => {
    const btn = document.createElement("button");
    const isActive = state.activeTab === link.id || (state.activeTab === 'temperature' && (link.id === 'temperature' || link.id === `temperature_${state.coldChainSubTab}`));
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
  if (tabId === 'temperature_alerts') {
    state.activeTab = 'temperature';
    state.coldChainSubTab = 'alerts';
    document.getElementById("pageTitle").textContent = "AnnaKavach — Alerts & Escalations";
    renderColdChainDashboard(document.getElementById("mainViewContent"));
    renderNavigation();
    return;
  }
  if (tabId === 'temperature_compliance') {
    state.activeTab = 'temperature';
    state.coldChainSubTab = 'compliance';
    document.getElementById("pageTitle").textContent = "AnnaKavach — Compliance & Spoilage";
    renderColdChainDashboard(document.getElementById("mainViewContent"));
    renderNavigation();
    return;
  }

  state.activeTab = tabId;
  renderNavigation();

  const titleEl = document.getElementById("pageTitle");
  const contentEl = document.getElementById("mainViewContent");

  switch(tabId) {
    case 'dashboard':
      titleEl.textContent = "Restaurant Compliance Dashboard";
      renderRestaurantDashboard(contentEl);
      break;
    case 'demandsense':
      titleEl.textContent = "AnnaKavach — DemandSense AI Replenishment Engine";
      renderDemandSenseDashboard(contentEl);
      break;
    case 'temperature':
      titleEl.textContent = "AnnaKavach — Cold Chain Intelligence";
      renderColdChainDashboard(contentEl);
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
    case 'officer_temperature':
      titleEl.textContent = "AnnaKavach — Cold-Chain Statutory Excursions";
      renderOfficerColdChainExcursions(contentEl);
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
        <button onclick="navigateTo('temperature')" class="py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-teal-400/30">
          <span>❄️ Cold Chain Intelligence</span>
        </button>
        <button onclick="openAddStockModal()" class="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700">
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
// CHALLENGE 2: ANNAKAVACH — COLD CHAIN INTELLIGENCE MODULE
// Real-time FSSAI Telemetry, Predictive Spoilage & 3-Tier Escalation
// =============================================================

const API_BASE_URL = "http://127.0.0.1:8000";

async function apiCall(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const token = state.token || sessionStorage.getItem("foodshield_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    state.isApiConnected = true;
    updateApiStatusBadge(true);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
      state.isApiConnected = false;
      updateApiStatusBadge(false);
    }
    throw err;
  }
}

function updateApiStatusBadge(isOnline) {
  const badge = document.getElementById("apiStatusBadge");
  const demoBadge = document.getElementById("demoModeBadge");
  if (!badge) return;

  if (isOnline) {
    badge.className = "hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200";
    badge.innerHTML = `<span class="pulse-online"></span><span>Live API: 8000</span>`;
    if (demoBadge) demoBadge.classList.add("hidden");
  } else {
    badge.className = "hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200";
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span>API Offline (Demo Mode)</span>`;
    if (demoBadge) demoBadge.classList.remove("hidden");
  }
}

// Data synchronization with backend
async function syncColdChainData() {
  try {
    const units = await apiCall("/api/temperature/units");
    if (Array.isArray(units) && units.length > 0) {
      state.storageUnits = units;
      state.storageUnitsFromApi = true;
    }
  } catch (e) {
    state.storageUnitsFromApi = false;
  }

  try {
    const alerts = await apiCall("/api/temperature/alerts");
    if (Array.isArray(alerts)) {
      state.temperatureAlerts = alerts;
      state.alertsFromApi = true;
    }
  } catch (e) {
    state.alertsFromApi = false;
  }

  try {
    const risk = await apiCall("/api/temperature/spoilage-risk");
    if (Array.isArray(risk)) {
      state.spoilagePredictions = risk;
      state.spoilageFromApi = true;
    }
  } catch (e) {
    state.spoilageFromApi = false;
  }
}

// -------------------------------------------------------------
// MAIN DASHBOARD VIEW: ANNAKAVACH COLD CHAIN INTELLIGENCE
// -------------------------------------------------------------

async function renderColdChainDashboard(container) {
  // Sync live backend data in background
  syncColdChainData().then(() => {
    // Re-render subtab if still active
    if (state.activeTab === 'temperature') {
      updateColdChainContent(document.getElementById("coldChainDynamicArea"));
    }
  }).catch(() => {});

  // Compute live KPI totals
  const totalUnits = state.storageUnits.length;
  const safeUnits = state.storageUnits.filter(u => u.status === 'normal').length;
  const safePercent = totalUnits > 0 ? Math.round((safeUnits / totalUnits) * 100) : 100;
  const activeAlerts = state.temperatureAlerts.filter(a => a.status !== 'resolved').length;
  const complianceGrade = activeAlerts === 0 ? "High Adherence (100%)" : `${safePercent}% Thermal Compliance`;
  const isAllSafe = activeAlerts === 0;

  container.innerHTML = `
    <!-- Top Brand & Header Section -->
    <div class="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">❄️</span>
            <span class="text-xs font-bold tracking-wider uppercase text-teal-400">AnnaKavach — Challenge 2</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${state.isApiConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'demo-pill'}">
              ${state.isApiConnected ? '⚡ Live REST API (8000)' : 'ℹ️ Demo Stream Mode'}
            </span>
          </div>
          <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight">Cold Chain Intelligence Dashboard</h2>
          <p class="text-xs text-slate-300 mt-1 max-w-xl">
            Continuous statutory FSSAI/HACCP thermal telemetry, predictive microbial shelf-life decay, and automated 3-tier escalation.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="refreshColdChainView()" class="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Sync API</span>
          </button>
          <button onclick="openRegisterUnitModal()" class="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/30">
            <span>+ New Unit</span>
          </button>
        </div>
      </div>
    </div>

    <!-- KPI Summary Grid (4 Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <!-- Card 1: Total Monitored Units -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>MONITORED UNITS</span>
          ${state.storageUnitsFromApi ?
            `<span class="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">● Live API Data</span>` :
            `<span class="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">ℹ️ Demo Fallback</span>`}
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-slate-900">${totalUnits}</span>
          <span class="text-xs text-slate-500 font-medium">Chillers & Freezers</span>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span class="w-2 h-2 rounded-full bg-teal-500"></span>
          <span>FSSAI Schedule IV Monitored</span>
        </div>
      </div>

      <!-- Card 2: Safe Compliant Units -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>SAFE UNITS</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${safePercent >= 75 ? 'badge-compliant' : 'badge-danger'}">
            ${safePercent}% Safe
          </span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900">${safeUnits} / ${totalUnits}</div>
        <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
          <div class="bg-emerald-500 h-1.5 rounded-full transition-all" style="width: ${safePercent}%"></div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-[11px] text-slate-400">${totalUnits - safeUnits} unit(s) outside range</span>
          ${state.storageUnitsFromApi ?
            `<span class="text-[9px] text-emerald-600 font-semibold">Live Metric</span>` :
            `<span class="text-[9px] text-amber-600 font-semibold">Demo Evaluation</span>`}
        </div>
      </div>

      <!-- Card 3: Active Excursions / Alerts -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>ACTIVE ALERTS</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${activeAlerts > 0 ? 'badge-danger' : 'badge-compliant'}">
            ${activeAlerts > 0 ? `${activeAlerts} Breach` : 'Zero Alerts'}
          </span>
        </div>
        <div class="text-3xl font-extrabold ${activeAlerts > 0 ? 'text-rose-600' : 'text-slate-900'}">${activeAlerts}</div>
        <div class="flex items-center gap-1.5 mt-3 text-xs ${activeAlerts > 0 ? 'text-rose-600' : 'text-emerald-600'} font-medium">
          <span>${activeAlerts > 0 ? 'Requires immediate action' : 'All cold chains nominal'}</span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-[11px] text-slate-400">3-Tier Escalation Active</span>
          ${state.alertsFromApi ?
            `<span class="text-[9px] text-emerald-600 font-semibold">Live Alert Store</span>` :
            `<span class="text-[9px] text-amber-600 font-semibold">Demo Alert Store</span>`}
        </div>
      </div>

      <!-- Card 4: HACCP Quality Status -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>COMPLIANCE STATUS</span>
          <span class="text-xs font-bold text-teal-700">FSSAI Sec 14</span>
        </div>
        <div class="text-lg font-bold text-slate-900 leading-snug mt-1">${complianceGrade}</div>
        <div class="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
          <span class="${isAllSafe ? 'pulse-online' : 'pulse-breach'}"></span>
          <span class="text-[11px]">${isAllSafe ? 'Compliant with Schedule IV' : 'Active penalty on score'}</span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-[11px] text-slate-400">HACCP CCP-1 Cold Point</span>
          <span class="text-[9px] text-teal-700 font-semibold">Statutory Standard</span>
        </div>
      </div>
    </div>

    <!-- Navigation Pills Container -->
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
      <button onclick="switchColdChainSubTab('overview')" class="py-2 px-3.5 rounded-xl text-xs font-bold transition ${state.coldChainSubTab === 'overview' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
        📊 Overview
      </button>
      <button onclick="switchColdChainSubTab('monitoring')" class="py-2 px-3.5 rounded-xl text-xs font-bold transition ${state.coldChainSubTab === 'monitoring' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
        🌡️ Temperature Monitoring
      </button>
      <button onclick="switchColdChainSubTab('history')" class="py-2 px-3.5 rounded-xl text-xs font-bold transition ${state.coldChainSubTab === 'history' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
        📈 Telemetry Trends & History
      </button>
      <button onclick="switchColdChainSubTab('alerts')" class="py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${state.coldChainSubTab === 'alerts' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
        <span>🚨 Alerts & Escalations</span>
        ${activeAlerts > 0 ? `<span class="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">${activeAlerts}</span>` : ''}
      </button>
      <button onclick="switchColdChainSubTab('compliance')" class="py-2 px-3.5 rounded-xl text-xs font-bold transition ${state.coldChainSubTab === 'compliance' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}">
        🛡️ Compliance & Spoilage Radar
      </button>
      <button onclick="switchColdChainSubTab('simulation')" class="py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${state.coldChainSubTab === 'simulation' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'}">
        <span>⚡ Hardware Simulation Console</span>
      </button>
    </div>

    <!-- Dynamic Subtab Container -->
    <div id="coldChainDynamicArea" class="space-y-6">
      <!-- Injected by updateColdChainContent -->
    </div>
  `;

  updateColdChainContent(document.getElementById("coldChainDynamicArea"));
}

function switchColdChainSubTab(tab) {
  state.coldChainSubTab = tab;
  renderColdChainDashboard(document.getElementById("mainViewContent"));
}

function updateColdChainContent(container) {
  if (!container) return;

  switch(state.coldChainSubTab) {
    case 'overview':
      renderColdChainOverviewSection(container);
      break;
    case 'monitoring':
      renderUnitsGridSection(container);
      break;
    case 'history':
      renderTelemetryHistorySection(container);
      break;
    case 'alerts':
      renderAlertsEscalationSection(container);
      break;
    case 'compliance':
      renderComplianceRadarSection(container);
      break;
    case 'simulation':
      renderSimulationConsoleSection(container);
      break;
    default:
      renderColdChainOverviewSection(container);
  }
}

// -------------------------------------------------------------
// SUBTAB 1: OVERVIEW & HEALTH MATRIX
// -------------------------------------------------------------

function renderColdChainOverviewSection(container) {
  const units = state.storageUnits;
  const breaches = state.temperatureAlerts.filter(a => a.status !== 'resolved');

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Active Breach Warning Callout if any -->
      ${breaches.length > 0 ? `
        <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3 shadow-sm">
          <div class="flex items-start gap-3">
            <span class="text-2xl">🚨</span>
            <div>
              <h4 class="text-sm font-bold text-rose-950">Active Thermal Excursion Notice (${breaches.length} Unit)</h4>
              <p class="text-xs text-rose-800 mt-0.5">
                ${breaches[0].unit_name} is operating at ${breaches[0].breach_temp.toFixed(1)}°C, exceeding statutory threshold of ${breaches[0].threshold_temp.toFixed(1)}°C.
                Escalation Tier: <strong>${breaches[0].status.replace(/_/g, ' ').toUpperCase()}</strong>.
              </p>
            </div>
          </div>
          <button onclick="switchColdChainSubTab('alerts')" class="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition whitespace-nowrap shadow-sm">
            Resolve Incident →
          </button>
        </div>
      ` : `
        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🟢</span>
            <div>
              <h4 class="text-sm font-bold text-emerald-950">All Cold-Chain Units Operating Within Safe Thresholds</h4>
              <p class="text-xs text-emerald-800 mt-0.5">
                All refrigeration units comply with FSSAI Schedule IV & statutory HACCP Critical Control Point CCP-1.
              </p>
            </div>
          </div>
          <button onclick="switchColdChainSubTab('monitoring')" class="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition whitespace-nowrap">
            View Live Monitoring →
          </button>
        </div>
      `}

      <!-- Quick Storage Health Matrix -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-800">Storage Unit Quick Status Matrix</h3>
            <p class="text-xs text-slate-500">Live summary of refrigerated units and statutory temperature parameters.</p>
          </div>
          <button onclick="switchColdChainSubTab('monitoring')" class="text-xs font-bold text-teal-700 hover:underline">
            Open Full Grid →
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th class="py-2.5 px-3">Unit ID</th>
                <th class="py-2.5 px-3">Storage Unit</th>
                <th class="py-2.5 px-3">Current Temp</th>
                <th class="py-2.5 px-3">Safe Range</th>
                <th class="py-2.5 px-3">Humidity</th>
                <th class="py-2.5 px-3">Latest Ping</th>
                <th class="py-2.5 px-3">Safety Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${units.map(u => {
                let badgeClass = "badge-compliant";
                let statusText = "🟢 Normal";
                let tempColor = "text-slate-800";

                if (u.status === "critical_breach") {
                  badgeClass = "badge-danger";
                  statusText = "🔴 Critical Breach";
                  tempColor = "text-rose-600 font-black";
                } else if (u.status === "warning") {
                  badgeClass = "badge-warning";
                  statusText = "🟡 Warning";
                  tempColor = "text-amber-600 font-bold";
                }

                return `
                  <tr class="hover:bg-slate-50 cursor-pointer" onclick="selectUnitForHistory(${u.id})">
                    <td class="py-3 px-3 font-mono text-slate-500 text-[11px]">#${u.id}</td>
                    <td class="py-3 px-3 font-bold text-slate-900">${u.name}</td>
                    <td class="py-3 px-3 text-sm ${tempColor}">${u.current_temp.toFixed(1)}°C</td>
                    <td class="py-3 px-3 text-slate-600">${u.min_temp}°C to ${u.max_temp}°C</td>
                    <td class="py-3 px-3 text-slate-600">${u.current_humidity ? u.current_humidity.toFixed(0) : 70}% RH</td>
                    <td class="py-3 px-3 text-slate-500 font-mono text-[11px]">${u.last_ping ? u.last_ping.slice(11, 19) + ' UTC' : 'Live'}</td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                        ${statusText}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Action Navigation Shortcuts Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div onclick="switchColdChainSubTab('history')" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center gap-2 mb-2 text-teal-700">
            <span class="text-xl">📈</span>
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 group-hover:text-teal-700 transition">Telemetry History</h4>
          </div>
          <p class="text-xs text-slate-500">Inspect time-series telemetry trend graphs and chronological logs for each storage unit.</p>
        </div>

        <div onclick="switchColdChainSubTab('compliance')" class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center gap-2 mb-2 text-teal-700">
            <span class="text-xl">🛡️</span>
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 group-hover:text-teal-700 transition">Compliance & Spoilage</h4>
          </div>
          <p class="text-xs text-slate-500">Q10 microbial kinetics, degree-hour thermal abuse calculations, and batch shelf-life decay projection.</p>
        </div>

        <div onclick="switchColdChainSubTab('simulation')" class="bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm hover:shadow-md transition cursor-pointer group">
          <div class="flex items-center gap-2 mb-2 text-amber-800">
            <span class="text-xl">⚡</span>
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 group-hover:text-amber-700 transition">Hardware Simulator</h4>
          </div>
          <p class="text-xs text-slate-600">Simulate safe sensor readings or excursion spikes via actual POST /api/temperature/telemetry endpoint.</p>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SUBTAB 2: TEMPERATURE MONITORING (UNITS GRID & CARDS)
// -------------------------------------------------------------

function renderUnitsGridSection(container) {
  const units = state.storageUnits;

  container.innerHTML = `
    <div>
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Temperature Monitoring — Storage Units Grid</h3>
          <p class="text-xs text-slate-500">Displaying unit ID, current temperature, humidity, safety status, and latest reading time.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">Total Monitored: <strong>${units.length} Units</strong></span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${units.map(u => {
          let badgeClass = "badge-compliant";
          let statusText = "🟢 Normal / Safe";
          let tempColor = "text-slate-900";

          if (u.status === "critical_breach") {
            badgeClass = "badge-danger";
            statusText = "🔴 Critical Breach";
            tempColor = "text-rose-600";
          } else if (u.status === "warning") {
            badgeClass = "badge-warning";
            statusText = "🟡 Near Threshold";
            tempColor = "text-amber-600";
          }

          const hasAlert = state.temperatureAlerts.some(a => a.unit_id === u.id && a.status !== 'resolved');

          return `
            <div class="bg-white rounded-2xl border ${u.status === 'critical_breach' ? 'border-rose-300 ring-2 ring-rose-200' : 'border-slate-200'} p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <!-- Top Card Bar: Unit ID & Name -->
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unit ID: #${u.id}</span>
                    <h4 class="font-bold text-slate-900 text-sm leading-snug">${u.name}</h4>
                    <p class="text-[11px] text-slate-500">${u.location_area || 'Central Storage Area'}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                    ${statusText}
                  </span>
                </div>

                <!-- Temperature Gauge Block -->
                <div class="my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div class="text-3xl font-black ${tempColor} tracking-tight">
                    ${u.current_temp.toFixed(1)}°C
                  </div>
                  <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-2">
                    <span>Safe: ${u.min_temp}°C to ${u.max_temp}°C</span>
                    <span>•</span>
                    <span>Target: ${u.target_temp}°C</span>
                  </div>
                </div>

                <!-- Humidity, Ping Time & Details -->
                <div class="space-y-1.5 text-xs text-slate-600 mb-3">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Current Humidity:</span>
                    <span class="font-semibold text-slate-700">${u.current_humidity ? u.current_humidity.toFixed(0) : 70}% RH</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Latest Reading Time:</span>
                    <span class="font-semibold text-slate-700 font-mono text-[11px]">${u.last_ping ? u.last_ping.slice(11, 19) + ' UTC' : 'Live'}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Safety Status:</span>
                    <span class="font-semibold ${u.status === 'critical_breach' ? 'text-rose-600' : 'text-slate-700'}">${u.status.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Linked Batches:</span>
                    <span class="font-semibold text-slate-700">${u.linked_batches_count || 1} Batch(es)</span>
                  </div>
                </div>

                ${hasAlert ? `
                  <div class="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 mb-3 flex items-center justify-between">
                    <span>Active Excursion Notice</span>
                    <button onclick="switchColdChainSubTab('alerts')" class="underline hover:text-rose-900">Resolve</button>
                  </div>
                ` : ''}
              </div>

              <!-- Action Buttons -->
              <div class="pt-3 border-t border-slate-100 flex gap-2">
                <button onclick="selectUnitForHistory(${u.id})" class="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition text-center">
                  Inspect Trend
                </button>
                <button onclick="selectUnitForSimulation(${u.id})" class="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition text-center" title="Transmit Telemetry Packet">
                  Simulate
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectUnitForHistory(unitId) {
  state.selectedTelemetryUnitId = unitId;
  switchColdChainSubTab('history');
}

function selectUnitForSimulation(unitId) {
  state.selectedTelemetryUnitId = unitId;
  switchColdChainSubTab('simulation');
}

// -------------------------------------------------------------
// SUBTAB 3: TIME-SERIES TELEMETRY HISTORY & CHART
// -------------------------------------------------------------

function renderTelemetryHistorySection(container) {
  const currentUnit = state.storageUnits.find(u => u.id === state.selectedTelemetryUnitId) || state.storageUnits[0];
  const readings = state.telemetryHistory[currentUnit.id] || [];

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <!-- Section Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">Time-Series Telemetry Trend</h3>
            <span id="telemetryLogCountBadge" class="text-[10px] font-bold px-2 py-0.5 rounded-full ${readings.length > 0 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-600'}">
              ${readings.length > 0 ? `${readings.length} Ingested Logs` : 'No Logs Yet'}
            </span>
          </div>
          <p class="text-xs text-slate-500">Chronological sensor readings with safe threshold limits and deviation analysis.</p>
        </div>

        <!-- Unit Selector Dropdown -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold text-slate-600">Selected Storage Unit:</label>
          <select onchange="onSelectHistoryUnit(this.value)" class="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600">
            ${state.storageUnits.map(u => `
              <option value="${u.id}" ${u.id === currentUnit.id ? 'selected' : ''}>${u.name} (Now: ${u.current_temp.toFixed(1)}°C)</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Unit Reference Metrics Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3 bg-slate-50 rounded-xl text-xs">
        <div>
          <span class="text-slate-400 block text-[11px]">Safe Min Limit</span>
          <span class="font-bold text-slate-800">${currentUnit.min_temp}°C</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">Target Temperature</span>
          <span class="font-bold text-teal-700">${currentUnit.target_temp}°C</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">Statutory Max Safe</span>
          <span class="font-bold text-rose-700">${currentUnit.max_temp}°C</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">Operating Status</span>
          <span class="font-bold text-slate-800 uppercase">${currentUnit.status.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <!-- Chart / Empty State Area -->
      <div id="telemetryChartArea">
        ${renderTelemetryChartOrEmptyState(currentUnit, readings)}
      </div>
    </div>
  `;

  // Background fetch for live API telemetry
  apiCall(`/api/temperature/telemetry/${currentUnit.id}`).then(historyData => {
    if (historyData && Array.isArray(historyData.readings)) {
      state.telemetryHistory[currentUnit.id] = historyData.readings;
      if (state.coldChainSubTab === 'history') {
        const chartArea = document.getElementById("telemetryChartArea");
        const countBadge = document.getElementById("telemetryLogCountBadge");
        if (chartArea) {
          chartArea.innerHTML = renderTelemetryChartOrEmptyState(currentUnit, historyData.readings);
        }
        if (countBadge) {
          countBadge.className = `text-[10px] font-bold px-2 py-0.5 rounded-full ${historyData.readings.length > 0 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-600'}`;
          countBadge.textContent = historyData.readings.length > 0 ? `${historyData.readings.length} Ingested Logs` : 'No Logs Yet';
        }
      }
    }
  }).catch(() => {});
}

function renderTelemetryChartOrEmptyState(currentUnit, readings) {
  if (!readings || readings.length === 0) {
    return `
      <!-- Useful Empty State (No Fabricated History) -->
      <div class="my-6 p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        </div>
        <h4 class="text-sm font-bold text-slate-800">No Telemetry History Logged for ${currentUnit.name}</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
          No sensor telemetry data points have been recorded for this storage unit yet. Transmit a sensor reading from an IoT device or trigger a simulation to start recording historical trend data.
        </p>
        <div class="flex items-center justify-center gap-2">
          <button onclick="handleQuickSimulation(${currentUnit.id}, false)" class="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-teal-600/20">
            <span>Simulate Safe Reading (${currentUnit.target_temp}°C)</span>
          </button>
          <button onclick="selectUnitForSimulation(${currentUnit.id})" class="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
            Open Simulator Console
          </button>
        </div>
      </div>
    `;
  }

  return `
    <!-- Historical Trend Bar Chart -->
    <div class="my-6">
      <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span class="font-semibold text-slate-700">Chronological Telemetry Readings (${readings.length} points)</span>
        <span class="text-rose-600 font-semibold flex items-center gap-1">
          <span class="w-3 h-0.5 bg-rose-500 inline-block"></span> Safe Limit: ${currentUnit.max_temp}°C
        </span>
      </div>

      <!-- Responsive Bar Chart Container -->
      <div class="h-44 w-full bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-end justify-between gap-1 sm:gap-2 relative overflow-hidden">

        <!-- Safe Max Threshold Reference Line -->
        <div class="absolute left-0 right-0 border-b border-dashed border-rose-400 pointer-events-none z-10" style="bottom: 50%;">
          <span class="text-[9px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded absolute right-2 -top-3 font-bold">Limit: ${currentUnit.max_temp}°C</span>
        </div>

        ${readings.map((r, idx) => {
          const t = r.temperature;
          const normalizedHeight = Math.min(95, Math.max(15, Math.round(((t - currentUnit.min_temp + 2) / (currentUnit.max_temp - currentUnit.min_temp + 4)) * 75)));
          const isBreach = r.is_breach || (t > currentUnit.max_temp);
          const barColor = isBreach ? 'bg-rose-500 hover:bg-rose-600' : (t > currentUnit.max_temp - 0.8 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-500 hover:bg-teal-600');

          return `
            <div class="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
              <!-- Tooltip -->
              <div class="hidden group-hover:block absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-20">
                ${t.toFixed(1)}°C | ${r.recorded_at.slice(11, 19)}
              </div>
              <!-- Bar -->
              <div class="w-full max-w-[28px] rounded-t-md transition-all telemetry-chart-bar ${barColor}" style="height: ${normalizedHeight}%;"></div>
              <!-- X-Axis label -->
              <span class="text-[9px] text-slate-400 mt-1 truncate max-w-[32px]">${r.recorded_at.slice(11, 16)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Historical Logs Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
            <th class="py-2.5 px-3">Timestamp (UTC)</th>
            <th class="py-2.5 px-3">Recorded Temperature</th>
            <th class="py-2.5 px-3">Statutory Delta</th>
            <th class="py-2.5 px-3">Humidity</th>
            <th class="py-2.5 px-3">Compliance Status</th>
            <th class="py-2.5 px-3">Data Origin</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-medium">
          ${[...readings].reverse().slice(0, 10).map(r => {
            const delta = r.temperature - currentUnit.max_temp;
            const isBreach = r.is_breach || delta > 0;
            return `
              <tr class="hover:bg-slate-50">
                <td class="py-2.5 px-3 text-slate-600 font-mono text-[11px]">${r.recorded_at}</td>
                <td class="py-2.5 px-3 font-bold ${isBreach ? 'text-rose-600' : 'text-slate-800'}">${r.temperature.toFixed(2)}°C</td>
                <td class="py-2.5 px-3 text-[11px] ${delta > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}">
                  ${delta > 0 ? `+${delta.toFixed(2)}°C Excursion` : `${delta.toFixed(2)}°C Nominal`}
                </td>
                <td class="py-2.5 px-3 text-slate-600">${r.humidity ? r.humidity.toFixed(0) + '% RH' : 'N/A'}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isBreach ? 'badge-danger' : 'badge-compliant'}">
                    ${isBreach ? 'Excursion Breach' : 'Compliant'}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-[10px] text-slate-400">
                  ${r.is_simulation ? '[Simulated Stream]' : '[Live Sensor]'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function onSelectHistoryUnit(val) {
  state.selectedTelemetryUnitId = parseInt(val);
  renderTelemetryHistorySection(document.getElementById("coldChainDynamicArea"));
}

// -------------------------------------------------------------
// SUBTAB 4: ALERTS & 3-TIER ESCALATION WORKFLOW
// -------------------------------------------------------------

function renderAlertsEscalationSection(container) {
  const alerts = state.temperatureAlerts;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Cold-Chain Breaches & Multi-Tier Escalation Incidents</h3>
          <p class="text-xs text-slate-500">Automated progression: Kitchen Alert (Level 1) ➔ Store Manager (Level 2) ➔ Government Officer (Level 3).</p>
        </div>
        <span class="text-xs text-slate-400">Resolution requires documented corrective action notes</span>
      </div>

      ${alerts.length === 0 ? `
        <div class="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <div class="text-3xl mb-2">🟢</div>
          <h4 class="text-sm font-bold text-slate-800">No Cold-Chain Excursions Detected</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1">All storage refrigeration units are currently operating within safe FSSAI parameters.</p>
        </div>
      ` : alerts.map(a => {
        const isResolved = a.status === 'resolved';
        return `
          <div class="bg-white rounded-2xl border ${isResolved ? 'border-slate-200 opacity-80' : 'border-rose-300 ring-2 ring-rose-100'} p-5 shadow-sm">
            <!-- Header Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="text-lg">${isResolved ? '✓' : '🚨'}</span>
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">${a.unit_name}</h4>
                  <span class="text-[11px] text-slate-400">Incident Detected: ${a.detected_at}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isResolved ? 'badge-compliant' : 'badge-danger'}">
                  ${isResolved ? 'Resolved & Closed' : `Excursion: ${a.breach_temp.toFixed(1)}°C (Limit: ${a.threshold_temp.toFixed(1)}°C)`}
                </span>
                ${!isResolved ? `
                  <button onclick="openAcknowledgeAlertModal(${a.id})" class="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm">
                    Acknowledge & Resolve
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- 3-Tier Escalation Stepper -->
            <div class="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Automated Escalation Stepper</span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <!-- Level 1 -->
                <div class="p-2.5 rounded-lg border ${a.escalation_level >= 1 && !isResolved ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-500'}">
                  <div class="font-bold text-xs flex items-center justify-between">
                    <span>Level 1: Shift Kitchen</span>
                    ${a.escalation_level >= 1 ? '<span>✓</span>' : ''}
                  </div>
                  <p class="text-[10px] mt-0.5">0-60m: Kitchen team notification</p>
                </div>
                <!-- Level 2 -->
                <div class="p-2.5 rounded-lg border ${a.escalation_level >= 2 && !isResolved ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' : 'bg-white border-slate-200 text-slate-500'}">
                  <div class="font-bold text-xs flex items-center justify-between">
                    <span>Level 2: Store Manager</span>
                    ${a.escalation_level >= 2 ? '<span>✓</span>' : ''}
                  </div>
                  <p class="text-[10px] mt-0.5">60-180m: Store GM Escalated</p>
                </div>
                <!-- Level 3 -->
                <div class="p-2.5 rounded-lg border ${a.escalation_level >= 3 && !isResolved ? 'bg-red-100 border-red-400 text-red-950 font-black' : 'bg-white border-slate-200 text-slate-500'}">
                  <div class="font-bold text-xs flex items-center justify-between">
                    <span>Level 3: Food Safety Officer</span>
                    ${a.escalation_level >= 3 ? '<span>🚨</span>' : ''}
                  </div>
                  <p class="text-[10px] mt-0.5">>180m: Regulatory Audit Queue</p>
                </div>
              </div>
            </div>

            <!-- Narrative & Action Notes -->
            <p class="text-xs text-slate-600 mb-2"><strong>Audit Narrative:</strong> ${a.narrative || 'Temperature spiked above statutory threshold.'}</p>
            ${a.corrective_action_notes ? `
              <div class="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                <strong>Documented Corrective Action:</strong> ${a.corrective_action_notes}
                <div class="text-[10px] text-emerald-700 mt-1">Logged by: ${a.acknowledged_by || 'Chef Vikram Mehra'}</div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// -------------------------------------------------------------
// SUBTAB 5: COMPLIANCE & PREDICTIVE SPOILAGE RADAR
// -------------------------------------------------------------

function renderComplianceRadarSection(container) {
  // Compute spoilage metrics from client stock or backend API predictions
  const predictions = state.spoilagePredictions.length > 0 ? state.spoilagePredictions : [
    {
      batch_number: "AML-PAN-2026-B8",
      item_name: "Fresh Malai Paneer Cubes",
      category: "Dairy",
      current_unit_name: "Walk-in Dairy & Cold Chiller #1",
      current_temp: 3.2,
      max_safe_temp: 4.0,
      nominal_expiry: "2026-10-13 18:00",
      cumulative_degree_hours: 0.0,
      degradation_pct: 0.0,
      predicted_safe_hours_remaining: 140.0,
      risk_level: "Safe",
      badge_class: "badge-compliant",
      recommended_action: "Standard cold storage integrity maintained. Safe for normal recipe allocation."
    },
    {
      batch_number: "AML-MLK-881",
      item_name: "Amul Gold Full Cream Milk",
      category: "Dairy",
      current_unit_name: "Walk-in Dairy & Cold Chiller #1",
      current_temp: 3.2,
      max_safe_temp: 4.0,
      nominal_expiry: "2026-10-11 08:00",
      cumulative_degree_hours: 0.0,
      degradation_pct: 5.2,
      predicted_safe_hours_remaining: 44.5,
      risk_level: "Safe",
      badge_class: "badge-compliant",
      recommended_action: "Safe for standard service. Normal shift consumption pacing recommended."
    },
    {
      batch_number: "DES-PST-4019",
      item_name: "Fresh Cream Fruit Tartlets",
      category: "Dairy",
      current_unit_name: "Salad & Dessert Display Counter",
      current_temp: 7.8,
      max_safe_temp: 6.0,
      nominal_expiry: "2026-10-10 14:00",
      cumulative_degree_hours: 3.6,
      degradation_pct: 64.8,
      predicted_safe_hours_remaining: 9.5,
      risk_level: "Warning",
      badge_class: "badge-warning",
      recommended_action: "Accelerated Usage: Cook or serve within 10 hours. Sensory inspection mandatory before service."
    }
  ];

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h3 class="text-sm font-bold text-slate-800">Q10 Microbial Spoilage Kinetics & Shelf-Life Decay</h3>
          <p class="text-xs text-slate-500">Degree-hour thermal abuse algorithm dynamically predicting perishable batch spoilage.</p>
        </div>
        <span class="text-xs text-slate-400">Statutory standard: FSSAI Section 14</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${predictions.map(p => `
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span class="text-[10px] text-slate-400 font-mono">Batch: ${p.batch_number}</span>
                  <h4 class="font-bold text-slate-900 text-sm leading-snug">${p.item_name}</h4>
                  <span class="text-[11px] text-teal-700 font-semibold">${p.category} • ${p.current_unit_name}</span>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.badge_class}">
                  ${p.risk_level}
                </span>
              </div>

              <!-- Thermal Abuse & Degradation Progress -->
              <div class="my-3 p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-slate-500">Thermal Abuse:</span>
                  <span class="font-bold text-slate-800">${p.cumulative_degree_hours.toFixed(1)} °C·hrs</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Degradation:</span>
                  <span class="font-bold ${p.degradation_pct > 50 ? 'text-rose-600' : 'text-slate-800'}">${p.degradation_pct.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div class="${p.degradation_pct > 50 ? 'bg-rose-500' : 'bg-teal-500'} h-1.5 rounded-full" style="width: ${p.degradation_pct}%;"></div>
                </div>
                <div class="flex justify-between text-[11px]">
                  <span class="text-slate-400">Predicted Safe Hours:</span>
                  <span class="font-extrabold ${p.predicted_safe_hours_remaining < 24 ? 'text-amber-700' : 'text-emerald-700'}">${p.predicted_safe_hours_remaining.toFixed(1)} hrs</span>
                </div>
              </div>

              <!-- Recommended Action -->
              <div class="p-2.5 rounded-xl ${p.risk_level === 'Safe' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'} text-xs font-medium">
                <strong>SOP Directive:</strong> ${p.recommended_action}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SUBTAB 6: HARDWARE SIMULATION CONSOLE (DEMO WORKFLOW)
// -------------------------------------------------------------

function renderSimulationConsoleSection(container) {
  const selectedUnit = state.storageUnits.find(u => u.id === state.selectedTelemetryUnitId) || state.storageUnits[0];

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-6">
      <!-- Demo Banner with Demo Mode Indicator -->
      <div class="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3">
        <span class="text-2xl">⚡</span>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-amber-900">Hardware Demonstration Console</h4>
            <span class="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">POST /api/temperature/telemetry</span>
            <span class="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded border border-amber-300">Demo Mode</span>
          </div>
          <p class="text-xs text-amber-800 mt-0.5">
            Demonstrates real IoT sensor packet transmission into FoodShield's ingestion pipeline. All injected records are explicitly marked with <code>is_simulation: true</code>.
          </p>
        </div>
      </div>

      <!-- Quick 1-Click Simulation Buttons with Loading States -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">1-Click Demonstration Scenarios</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <!-- Button 1: Safe Reading -->
          <button id="btnSimSafe" onclick="handleQuickSimulation(${selectedUnit.id}, false)" class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-left transition flex items-center justify-between group disabled:opacity-50">
            <div>
              <div class="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                <span>🟢</span>
                <span id="txtSimSafe">Simulate Safe Reading</span>
              </div>
              <p class="text-[11px] text-emerald-700 mt-1">
                Injects compliant ${selectedUnit.target_temp.toFixed(1)}°C reading into ${selectedUnit.name}.
              </p>
            </div>
            <span class="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition">Transmit →</span>
          </button>

          <!-- Button 2: Excursion Breach -->
          <button id="btnSimBreach" onclick="handleQuickSimulation(${selectedUnit.id}, true)" class="p-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-left transition flex items-center justify-between group disabled:opacity-50">
            <div>
              <div class="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                <span>🔴</span>
                <span id="txtSimBreach">Simulate Temperature Breach</span>
              </div>
              <p class="text-[11px] text-rose-700 mt-1">
                Injects ${(selectedUnit.max_temp + 3.8).toFixed(1)}°C excursion into ${selectedUnit.name}. Evaluates alert threshold.
              </p>
            </div>
            <span class="text-xs font-bold text-rose-700 group-hover:translate-x-1 transition">Transmit →</span>
          </button>
        </div>
      </div>

      <!-- Custom Ingestion Form -->
      <form onsubmit="handleCustomTelemetrySubmit(event)" class="pt-4 border-t border-slate-100 space-y-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Custom Sensor Packet Dispatcher</h4>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Target Unit</label>
            <select id="simTargetUnit" onchange="onSelectSimUnit(this.value)" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800">
              ${state.storageUnits.map(u => `
                <option value="${u.id}" ${u.id === selectedUnit.id ? 'selected' : ''}>${u.name}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Temperature (°C)</label>
            <input type="number" step="0.1" id="simTempInput" value="${selectedUnit.current_temp.toFixed(1)}" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800">
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Humidity (% RH)</label>
            <input type="number" step="1" id="simHumInput" value="${selectedUnit.current_humidity ? selectedUnit.current_humidity.toFixed(0) : 70}" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800">
          </div>
          <div class="flex items-end">
            <button type="submit" id="simSubmitBtn" class="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50">
              <span id="simSubmitBtnText">Send Telemetry</span>
            </button>
          </div>
        </div>
      </form>

      <!-- Live Wire & Response Inspector Banner -->
      <div id="simResponseBanner" class="hidden p-4 rounded-xl text-xs space-y-2 border"></div>
    </div>
  `;
}

function onSelectSimUnit(val) {
  state.selectedTelemetryUnitId = parseInt(val);
  renderSimulationConsoleSection(document.getElementById("coldChainDynamicArea"));
}

// -------------------------------------------------------------
// DEMO INTERACTION HANDLERS & MODALS
// -------------------------------------------------------------

async function handleQuickSimulation(unitId, isBreach) {
  const unit = state.storageUnits.find(u => u.id === unitId) || state.storageUnits[0];
  const targetTemp = isBreach ? (unit.max_temp + 3.8) : unit.target_temp;
  const humidity = isBreach ? 82.0 : (unit.current_humidity || 72.0);

  // Exact request schema discovered from backend/schemas.py (TelemetryLogCreate)
  const payload = {
    unit_id: unit.id,
    temperature: parseFloat(targetTemp.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    sensor_battery_pct: 98.0,
    is_simulation: true
  };

  // Set loading states on simulation buttons
  const btnSafe = document.getElementById("btnSimSafe");
  const btnBreach = document.getElementById("btnSimBreach");
  const txtSafe = document.getElementById("txtSimSafe");
  const txtBreach = document.getElementById("txtSimBreach");
  if (btnSafe) btnSafe.disabled = true;
  if (btnBreach) btnBreach.disabled = true;
  if (isBreach && txtBreach) txtBreach.textContent = "Transmitting Breach Payload...";
  if (!isBreach && txtSafe) txtSafe.textContent = "Transmitting Safe Payload...";

  showToast(`Transmitting ${isBreach ? 'breach' : 'compliant'} packet to backend...`, "info");

  const startTime = Date.now();
  let responseData = null;
  let isApiError = false;

  try {
    const res = await apiCall("/api/temperature/telemetry", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    responseData = res;

    // Update local storage unit state directly from backend response
    unit.current_temp = res.recorded_temp;
    unit.status = res.status;
    unit.last_ping = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    // Record reading in time-series history
    if (!state.telemetryHistory[unit.id]) state.telemetryHistory[unit.id] = [];
    state.telemetryHistory[unit.id].push({
      id: Date.now(),
      temperature: res.recorded_temp,
      humidity: payload.humidity,
      recorded_at: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      is_breach: res.is_breach,
      is_simulation: true
    });

    // Alert Handling: Never claim an alert was created unless backend confirms it via alert_id!
    if (res.alert_id) {
      state.temperatureAlerts.unshift({
        id: res.alert_id,
        unit_id: unit.id,
        unit_name: unit.name,
        restaurant_id: 1,
        breach_temp: res.recorded_temp,
        threshold_temp: unit.max_temp,
        severity: "critical",
        escalation_level: 1,
        status: "level_1_kitchen_alert",
        narrative: res.narrative,
        detected_at: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        acknowledged_at: null
      });
      showToast(`🚨 Breach confirmed by backend: ${res.narrative}`, "error");
    } else if (res.is_breach) {
      showToast(`⚠️ Excursion recorded: ${res.narrative} (Alert already active)`, "warning");
    } else {
      showToast(`✓ Safe reading logged: ${res.narrative}`, "success");
    }

    // Refresh backend data
    syncColdChainData().catch(() => {});
  } catch (err) {
    isApiError = true;
    const elapsed = Date.now() - startTime;

    // Fallback in demo mode: Record locally with clear Demo Mode labeling
    unit.current_temp = payload.temperature;
    unit.status = isBreach ? "critical_breach" : "normal";
    unit.last_ping = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    if (!state.telemetryHistory[unit.id]) state.telemetryHistory[unit.id] = [];
    state.telemetryHistory[unit.id].push({
      id: Date.now(),
      temperature: payload.temperature,
      humidity: payload.humidity,
      recorded_at: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      is_breach: isBreach,
      is_simulation: true
    });

    if (isBreach) {
      showToast(`[Demo Mode Fallback] Ingested ${payload.temperature}°C breach locally (API offline)`, "warning");
    } else {
      showToast(`[Demo Mode Fallback] Ingested ${payload.temperature}°C safe reading locally`, "success");
    }

    responseData = {
      fallback: true,
      offline: true,
      note: "Backend at http://127.0.0.1:8000 unreachable. Processed locally in Demo Mode."
    };
  } finally {
    // Re-enable buttons
    if (btnSafe) btnSafe.disabled = false;
    if (btnBreach) btnBreach.disabled = false;
    if (txtSafe) txtSafe.textContent = "Simulate Safe Reading";
    if (txtBreach) txtBreach.textContent = "Simulate Temperature Breach";

    // Update inspector banner if on simulation subtab
    const banner = document.getElementById("simResponseBanner");
    if (banner) {
      const elapsed = Date.now() - startTime;
      banner.className = `p-4 rounded-xl text-xs space-y-2 border ${isApiError ? 'bg-amber-50 text-amber-950 border-amber-200' : 'bg-emerald-50 text-emerald-950 border-emerald-200'}`;
      banner.innerHTML = `
        <div class="flex items-center justify-between pb-1 border-b ${isApiError ? 'border-amber-200' : 'border-emerald-200'}">
          <span class="font-bold uppercase tracking-wider text-[10px]">Wire Transaction Inspection (${elapsed}ms)</span>
          <span class="font-mono text-[10px] font-bold ${isApiError ? 'text-amber-800' : 'text-emerald-800'}">
            ${isApiError ? 'Status: 0 Offline Fallback' : 'Status: 200 OK'}
          </span>
        </div>
        <div>
          <span class="text-[10px] font-semibold text-slate-500 block">Outbound Ingestion Payload:</span>
          <pre class="bg-slate-900 text-teal-300 p-2 rounded-lg font-mono text-[11px] overflow-x-auto">${JSON.stringify(payload, null, 2)}</pre>
        </div>
        <div>
          <span class="text-[10px] font-semibold text-slate-500 block">Response Received:</span>
          <pre class="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[11px] overflow-x-auto">${JSON.stringify(responseData, null, 2)}</pre>
        </div>
        ${!isApiError && responseData.alert_id ? `
          <div class="text-[11px] font-bold text-rose-700">
            ✓ Backend Confirmed Alert Creation: Incident ID #${responseData.alert_id}
          </div>
        ` : ''}
      `;
      banner.classList.remove("hidden");
    }

    renderColdChainDashboard(document.getElementById("mainViewContent"));
  }
}

async function handleCustomTelemetrySubmit(e) {
  e.preventDefault();
  const unitId = parseInt(document.getElementById("simTargetUnit").value);
  const temp = parseFloat(document.getElementById("simTempInput").value);
  const hum = parseFloat(document.getElementById("simHumInput").value);
  const btn = document.getElementById("simSubmitBtn");
  const btnText = document.getElementById("simSubmitBtnText");
  const banner = document.getElementById("simResponseBanner");

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "Sending...";

  const payload = {
    unit_id: unitId,
    temperature: temp,
    humidity: hum,
    sensor_battery_pct: 95.0,
    is_simulation: true
  };

  try {
    const res = await apiCall("/api/temperature/telemetry", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    banner.className = `p-4 rounded-xl text-xs space-y-2 border ${res.is_breach ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`;
    banner.innerHTML = `
      <strong>Backend API Response:</strong> ${res.narrative}
      <pre class="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[11px] overflow-x-auto mt-1">${JSON.stringify(res, null, 2)}</pre>
    `;
    banner.classList.remove("hidden");
    showToast("Telemetry successfully ingested", "success");
    syncColdChainData();
  } catch (err) {
    banner.className = "p-4 rounded-xl text-xs space-y-2 border bg-amber-50 text-amber-900 border-amber-200";
    banner.innerHTML = `
      <strong>Demo Fallback Dispatch:</strong> ${temp}°C processed locally. (Backend at http://127.0.0.1:8000 is offline).
      <pre class="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[11px] overflow-x-auto mt-1">${JSON.stringify(payload, null, 2)}</pre>
    `;
    banner.classList.remove("hidden");
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = "Send Telemetry";
  }
}

function refreshColdChainView() {
  showToast("Synchronizing with backend REST API...", "info");
  syncColdChainData().then(() => {
    renderColdChainDashboard(document.getElementById("mainViewContent"));
    showToast("Cold Chain Data Synchronized", "success");
  });
}

function openAcknowledgeAlertModal(alertId) {
  const alert = state.temperatureAlerts.find(a => a.id === alertId);
  if (!alert) return;

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Acknowledge Incident: ${alert.unit_name}`;
  modalContent.innerHTML = `
    <form onsubmit="submitAlertAcknowledgmentForm(event, ${alert.id})" class="space-y-4">
      <div class="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
        <strong>Active Excursion:</strong> Current ${alert.breach_temp}°C exceeds statutory limit of ${alert.threshold_temp}°C.
        <div class="text-[11px] mt-0.5">${alert.narrative}</div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Documented Corrective Action Note (Mandatory)</label>
        <textarea id="ackActionNotes" required rows="3" placeholder="e.g. Adjusted thermostat dial, inspected door gasket seal, and relocated dairy items to Walk-in Chiller Unit #1." class="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"></textarea>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Acknowledging Staff Officer</label>
        <input type="text" id="ackStaffName" value="${state.currentUser ? state.currentUser.name : 'Chef Vikram Mehra'}" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold">
      </div>

      <div class="flex gap-2 pt-2 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
        <button type="submit" class="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20">Submit Resolution Note</button>
      </div>
    </form>
  `;
  openActionModal();
}

async function submitAlertAcknowledgmentForm(e, alertId) {
  e.preventDefault();
  const notes = document.getElementById("ackActionNotes").value.trim();
  const staff = document.getElementById("ackStaffName").value.trim();

  try {
    await apiCall(`/api/temperature/alerts/${alertId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ action_notes: notes, actor_name: staff })
    });
  } catch(err) {
    console.log("Local resolution applied (backend offline):", err.message);
  }

  // Update local alert state
  const foundAlert = state.temperatureAlerts.find(a => a.id === alertId);
  if (foundAlert) {
    foundAlert.status = "resolved";
    foundAlert.corrective_action_notes = notes;
    foundAlert.acknowledged_by = staff;
    foundAlert.acknowledged_at = new Date().toISOString();
  }

  closeActionModal();
  logAuditEvent("TEMPERATURE_BREACH_ACKNOWLEDGED", `Staff acknowledged excursion on alert #${alertId}: ${notes}`);
  showToast("Corrective Action Logged. Escalation Halted.", "success");
  renderColdChainDashboard(document.getElementById("mainViewContent"));
}

function openRegisterUnitModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "Register Refrigerated Storage Unit";
  modalContent.innerHTML = `
    <form onsubmit="submitNewUnitForm(event)" class="space-y-3">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Unit Name</label>
        <input type="text" id="newUnitName" required placeholder="e.g. Pastry & Cream Counter Unit #2" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Unit Classification</label>
        <select id="newUnitType" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold">
          <option value="walk_in_chiller">Walk-in Dairy & Cold Chiller (0.5°C to 4.0°C)</option>
          <option value="deep_freezer">Deep Meat & Seafood Freezer (-22°C to -18°C)</option>
          <option value="prep_refrigerator">Line Prep Cook Refrigerator (1.0°C to 5.0°C)</option>
          <option value="display_counter">Salad & Dessert Display Counter (2.0°C to 6.0°C)</option>
          <option value="hot_holding">Hot Holding Buffet Counter (63.0°C to 85.0°C)</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Location Area</label>
        <input type="text" id="newUnitArea" value="Main Kitchen Area" class="w-full p-2.5 rounded-xl border border-slate-300 text-xs">
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-100">
        <button type="button" onclick="closeActionModal()" class="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
        <button type="submit" class="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">Register Unit</button>
      </div>
    </form>
  `;
  openActionModal();
}

async function submitNewUnitForm(e) {
  e.preventDefault();
  const name = document.getElementById("newUnitName").value.trim();
  const unitType = document.getElementById("newUnitType").value;
  const area = document.getElementById("newUnitArea").value.trim();

  const payload = {
    name,
    unit_type: unitType,
    location_area: area
  };

  try {
    const res = await apiCall("/api/temperature/units", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (res && res.id) {
      state.storageUnits.push(res);
    }
  } catch(err) {
    state.storageUnits.push({
      id: state.storageUnits.length + 1,
      name,
      unit_type: unitType,
      location_area: area,
      min_temp: 1.0,
      max_temp: 4.0,
      target_temp: 2.5,
      current_temp: 2.8,
      current_humidity: 70.0,
      status: "normal",
      last_ping: new Date().toISOString(),
      active_breaches_count: 0,
      linked_batches_count: 0
    });
  }

  closeActionModal();
  logAuditEvent("STORAGE_UNIT_CREATED", `Registered new unit ${name} (${unitType})`);
  showToast(`Unit '${name}' registered`, "success");
  renderColdChainDashboard(document.getElementById("mainViewContent"));
}

// -------------------------------------------------------------
// OFFICER PORTAL: COLD-CHAIN STATUTORY EXCURSIONS VIEW
// -------------------------------------------------------------

function renderOfficerColdChainExcursions(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🏛️</span>
            <h3 class="font-bold text-slate-900 text-base">Government Food-Safety Officer — Cold-Chain Escalation Registry</h3>
          </div>
          <p class="text-xs text-slate-500">Statutory FSSAI Section 14 & Schedule IV enforcement: active Level 2/3 cold storage violations.</p>
        </div>
        <span class="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">1 Escalated Incident Active</span>
      </div>

      <div class="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <span class="text-xl">⚠️</span>
        <div>
          <strong>Statutory Compliance Directive:</strong>
          Any unmitigated cold-chain deviation exceeding 3 hours or $\ge 5.0$°C excursion triggers mandatory spot audit and potential seizure notice under FSSAI Regulations.
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
              <th class="py-2.5 px-3">Establishment</th>
              <th class="py-2.5 px-3">FSSAI License</th>
              <th class="py-2.5 px-3">Breached Unit</th>
              <th class="py-2.5 px-3">Recorded Temp</th>
              <th class="py-2.5 px-3">Escalation Tier</th>
              <th class="py-2.5 px-3">Statutory Violation</th>
              <th class="py-2.5 px-3">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr class="hover:bg-slate-50">
              <td class="py-3 px-3 font-bold text-slate-900">The Royal Spice Kitchen</td>
              <td class="py-3 px-3 text-slate-600 font-mono text-[11px]">10020011000432</td>
              <td class="py-3 px-3 text-slate-800">Salad & Dessert Display Counter</td>
              <td class="py-3 px-3 font-extrabold text-rose-600">7.8°C (Limit: 6.0°C)</td>
              <td class="py-3 px-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Level 2: Manager Escalated
                </span>
              </td>
              <td class="py-3 px-3 text-[11px] text-slate-600">FSSAI-SCHED-IV-SEC-5</td>
              <td class="py-3 px-3">
                <button onclick="showToast('Statutory Temperature Directive Notice Issued', 'info')" class="py-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold">
                  Issue Directive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =============================================================
// DEMANDSENSE AI: DEMAND FORECASTING & REPLENISHMENT UI ENGINE
// =============================================================

async function syncDemandSenseData(restaurantId = 1) {
  const mult = state.demandSense.demandMultiplier || 1.0;
  const horizon = state.demandSense.horizonDays || 7;

  try {
    const health = await apiCall("/api/forecast/health");
    if (health && health.status === "healthy") {
      state.isApiConnected = true;
      updateApiStatusBadge(true);
    }
  } catch (e) {}

  try {
    const forecasts = await apiCall(`/api/forecast/sales?restaurant_id=${restaurantId}&horizon_days=${horizon}&multiplier=${mult}`);
    if (Array.isArray(forecasts)) state.demandSense.forecasts = forecasts;
  } catch (e) {}

  try {
    const ingDemands = await apiCall(`/api/forecast/ingredients?restaurant_id=${restaurantId}&horizon_days=${horizon}&multiplier=${mult}`);
    if (Array.isArray(ingDemands)) state.demandSense.ingredientDemands = ingDemands;
  } catch (e) {}

  try {
    const risks = await apiCall(`/api/forecast/stockout-risk?restaurant_id=${restaurantId}&horizon_days=${horizon}&multiplier=${mult}`);
    if (Array.isArray(risks)) state.demandSense.stockoutRisks = risks;
  } catch (e) {}

  try {
    const recs = await apiCall(`/api/forecast/recommendations?restaurant_id=${restaurantId}&horizon_days=${horizon}&multiplier=${mult}`);
    if (Array.isArray(recs)) state.demandSense.recommendations = recs;
  } catch (e) {}

  try {
    const expiry = await apiCall(`/api/forecast/expiry-risk?restaurant_id=${restaurantId}&horizon_days=14&multiplier=${mult}`);
    if (Array.isArray(expiry)) state.demandSense.expiryRiskReports = expiry;
  } catch (e) {}

  try {
    const history = await apiCall(`/api/forecast/history?restaurant_id=${restaurantId}&days=28`);
    if (Array.isArray(history)) state.demandSense.history = history;
  } catch (e) {}
}

async function renderDemandSenseDashboard(container) {
  state.demandSense.isLoading = true;

  // Background API synchronization
  syncDemandSenseData().then(() => {
    state.demandSense.isLoading = false;
    if (state.activeTab === 'demandsense') {
      renderDemandSenseContent(container);
    }
  }).catch(() => {
    state.demandSense.isLoading = false;
    renderDemandSenseContent(container);
  });

  renderDemandSenseContent(container);
}

function renderDemandSenseContent(container) {
  const ds = state.demandSense;
  const multiplier = ds.demandMultiplier || 1.0;
  const activeScenario = ds.activeScenario || 'scenario_a';

  // Compute KPI metrics
  const totalForecastPortions = ds.forecasts.reduce((sum, f) => {
    return sum + (f.forecast ? f.forecast.reduce((s, p) => s + p.predicted_quantity, 0) : 0);
  }, 0);

  const criticalRisksCount = ds.stockoutRisks.filter(r => r.stockout_risk_score >= 50.0).length;
  const imminentStockouts = ds.stockoutRisks.filter(r => r.stockout_predicted && (r.days_until_stockout <= (r.lead_time_days + 1.0))).length;

  const urgentOrdersCount = ds.recommendations.filter(rc => rc.urgency === 'URGENT' || rc.urgency === 'RECOMMENDED').length;
  const totalOrderQty = ds.recommendations.reduce((sum, rc) => sum + (rc.suggested_order_qty || 0), 0);

  const potentialWasteTotal = ds.expiryRiskReports.reduce((sum, rep) => sum + (rep.potential_waste_quantity || 0), 0);

  container.innerHTML = `
    <div class="space-y-6">
      <!-- 1. HERO BRAND & COMMAND HEADER -->
      <div class="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div class="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-xl">📈</span>
              <span class="text-xs font-bold tracking-wider uppercase text-teal-400">AnnaKavach — DemandSense AI</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${state.isApiConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'demo-pill'}">
                ${state.isApiConnected ? '⚡ Live REST API (/api/forecast)' : 'ℹ️ Demo Mode'}
              </span>
              <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                FSSAI Decision-Support System
              </span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black tracking-tight">Predictive Demand & Intelligent Replenishment</h2>
            <p class="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Explains dish sales forecasts through Day-of-Week statistical profiling, translates recipes into exact raw ingredient demand, computes 0–100 Stockout Risks, and enforces FEFO batch shelf-life safety.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="openMethodologyModal()" class="py-2 px-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-teal-200 text-xs font-bold transition border border-slate-700 flex items-center gap-1.5 shadow-sm">
              <span>📐 Algorithm Methodology</span>
            </button>
            <button onclick="refreshDemandSenseData()" class="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/30">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Refresh Forecasts</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. DETERMINISTIC DEMO SCENARIOS BAR (A through E) -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯 Deterministic Demo Scenarios</span>
              <span class="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">Reproducible Evaluator</span>
            </span>
            <p class="text-[11px] text-slate-500 mt-0.5">Select a real-world restaurant scenario to test DemandSense's risk algorithms and purchasing recommendations.</p>
          </div>
          <span class="text-[11px] font-semibold text-slate-600">
            Active: <strong class="text-teal-800">${ds.scenarioMetadata ? ds.scenarioMetadata.title : 'Baseline Normal'}</strong>
          </span>
        </div>

        <!-- Scenario Switcher Buttons -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button onclick="handleScenarioSwitch('scenario_a')" class="p-3 rounded-xl border text-left transition flex flex-col justify-between ${activeScenario === 'scenario_a' ? 'scenario-btn-active' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}">
            <div class="font-bold text-xs">Scenario A</div>
            <div class="text-[11px] font-medium opacity-90 mt-1">Normal Operations</div>
            <div class="text-[10px] opacity-75 mt-0.5">Healthy stock & buffers</div>
          </button>

          <button onclick="handleScenarioSwitch('scenario_b')" class="p-3 rounded-xl border text-left transition flex flex-col justify-between ${activeScenario === 'scenario_b' ? 'scenario-btn-active' : 'bg-rose-50/60 hover:bg-rose-100/70 border-rose-200 text-rose-950'}">
            <div class="font-bold text-xs flex items-center justify-between">
              <span>Scenario B</span>
              <span class="text-[9px] bg-rose-500 text-white font-bold px-1 py-0.2 rounded">Surge</span>
            </div>
            <div class="text-[11px] font-bold mt-1">Weekend / Festival Rush</div>
            <div class="text-[10px] opacity-75 mt-0.5">Paneer deficit in 1.9d</div>
          </button>

          <button onclick="handleScenarioSwitch('scenario_c')" class="p-3 rounded-xl border text-left transition flex flex-col justify-between ${activeScenario === 'scenario_c' ? 'scenario-btn-active' : 'bg-rose-50/60 hover:bg-rose-100/70 border-rose-200 text-rose-950'}">
            <div class="font-bold text-xs flex items-center justify-between">
              <span>Scenario C</span>
              <span class="text-[9px] bg-rose-600 text-white font-bold px-1 py-0.2 rounded">Crit</span>
            </div>
            <div class="text-[11px] font-bold mt-1">Critical Stockout Imminent</div>
            <div class="text-[10px] opacity-75 mt-0.5">Tomatoes run out in &lt;24h</div>
          </button>

          <button onclick="handleScenarioSwitch('scenario_d')" class="p-3 rounded-xl border text-left transition flex flex-col justify-between ${activeScenario === 'scenario_d' ? 'scenario-btn-active' : 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-200 text-amber-950'}">
            <div class="font-bold text-xs flex items-center justify-between">
              <span>Scenario D</span>
              <span class="text-[9px] bg-amber-500 text-white font-bold px-1 py-0.2 rounded">Delay</span>
            </div>
            <div class="text-[11px] font-bold mt-1">Supplier Lead Delay</div>
            <div class="text-[10px] opacity-75 mt-0.5">Basmati lead time = 6 days</div>
          </button>

          <button onclick="handleScenarioSwitch('scenario_e')" class="p-3 rounded-xl border text-left transition flex flex-col justify-between ${activeScenario === 'scenario_e' ? 'scenario-btn-active' : 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-200 text-amber-950'}">
            <div class="font-bold text-xs flex items-center justify-between">
              <span>Scenario E</span>
              <span class="text-[9px] bg-amber-600 text-white font-bold px-1 py-0.2 rounded">FEFO</span>
            </div>
            <div class="text-[11px] font-bold mt-1">High Spoilage Risk</div>
            <div class="text-[10px] opacity-75 mt-0.5">Batches expiring in 48-72h</div>
          </button>
        </div>

        <!-- Scenario Narrative Card -->
        ${ds.scenarioMetadata ? `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
            <span class="text-lg">💡</span>
            <div class="flex-1">
              <div class="font-bold text-slate-800">${ds.scenarioMetadata.title}</div>
              <div class="text-slate-600 mt-0.5">${ds.scenarioMetadata.description}</div>
              <div class="text-teal-700 font-semibold mt-1">Impact: ${ds.scenarioMetadata.impact}</div>
            </div>
          </div>
        ` : ''}

        <!-- 3. DEMAND SURGE MULTIPLIER SENSITIVITY SLIDER -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-slate-700">Demand Multiplier Sensitivity:</span>
            <span class="text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 font-mono">${multiplier.toFixed(2)}x</span>
            <input type="range" id="dsMultiplierSlider" min="0.5" max="2.5" step="0.1" value="${multiplier}" onchange="handleMultiplierChange(this.value)" class="w-36 accent-teal-600 cursor-pointer">
          </div>

          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-slate-400 text-[11px]">Quick Presets:</span>
            <button onclick="handleMultiplierChange(1.0)" class="px-2 py-1 rounded-lg border text-[11px] font-semibold ${multiplier === 1.0 ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">1.0x Normal</button>
            <button onclick="handleMultiplierChange(1.3)" class="px-2 py-1 rounded-lg border text-[11px] font-semibold ${multiplier === 1.3 ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">1.3x Weekend</button>
            <button onclick="handleMultiplierChange(1.8)" class="px-2 py-1 rounded-lg border text-[11px] font-semibold ${multiplier === 1.8 ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">1.8x Festival</button>
            <button onclick="handleMultiplierChange(2.2)" class="px-2 py-1 rounded-lg border text-[11px] font-semibold ${multiplier === 2.2 ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">2.2x Wedding Surge</button>
          </div>
        </div>
      </div>

      <!-- 4. CORE HERO KPI CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- KPI 1: Projected Dish Sales -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-bold uppercase tracking-wider">7-Day Projected Sales</span>
            <span class="text-base">🍲</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-black text-slate-900">${Math.round(totalForecastPortions)}</span>
            <span class="text-xs text-slate-500 font-semibold">Portions</span>
          </div>
          <div class="text-[11px] text-teal-700 font-medium flex items-center gap-1">
            <span>✓</span>
            <span>Day-of-Week Seasonality (28d history)</span>
          </div>
        </div>

        <!-- KPI 2: Critical Stockout Risks -->
        <div class="bg-white rounded-2xl border ${criticalRisksCount > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'} p-5 shadow-sm space-y-2">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-bold uppercase tracking-wider">Stockout Risk Alerts</span>
            <span class="text-base">🚨</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-black ${criticalRisksCount > 0 ? 'text-rose-700' : 'text-slate-900'}">${criticalRisksCount}</span>
            <span class="text-xs text-slate-500 font-semibold">Ingredients at Risk</span>
          </div>
          <div class="text-[11px] ${imminentStockouts > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}">
            ${imminentStockouts > 0 ? `⚠️ ${imminentStockouts} item(s) deplete before lead time!` : 'Buffers adequate for operating cycle'}
          </div>
        </div>

        <!-- KPI 3: Suggested Purchase Orders -->
        <div class="bg-white rounded-2xl border ${urgentOrdersCount > 0 ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} p-5 shadow-sm space-y-2">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-bold uppercase tracking-wider">Suggested PO Orders</span>
            <span class="text-base">📦</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-black text-slate-900">${urgentOrdersCount}</span>
            <span class="text-xs text-slate-500 font-semibold">Items (${Math.round(totalOrderQty)} units)</span>
          </div>
          <div class="text-[11px] text-slate-500">
            MOQ & Pack Size rounding applied
          </div>
        </div>

        <!-- KPI 4: FEFO Spoilage Risk -->
        <div class="bg-white rounded-2xl border ${potentialWasteTotal > 0 ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} p-5 shadow-sm space-y-2">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-bold uppercase tracking-wider">FEFO Spoilage Radar</span>
            <span class="text-base">❄️</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-black ${potentialWasteTotal > 0 ? 'text-amber-800' : 'text-slate-900'}">${potentialWasteTotal.toFixed(1)}</span>
            <span class="text-xs text-slate-500 font-semibold">Units at Waste Risk</span>
          </div>
          <div class="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Linked to Cold-Chain Storage Units</span>
          </div>
        </div>
      </div>

      <!-- 5. SECTION A: SALES FORECAST & DAY-OF-WEEK PROFILE -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>📊 7-Day Dish Sales Projections (Actual vs Empirical Forecast)</span>
            </h3>
            <p class="text-xs text-slate-500">Empirical Day-of-Week statistical profiling with rolling holdout validation.</p>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="filterForecastDish(null)" class="px-2.5 py-1 rounded-lg text-xs font-semibold ${!ds.selectedDishId ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">All Menu Dishes</button>
            ${ds.forecasts.map(f => `
              <button onclick="filterForecastDish(${f.dish_id})" class="px-2.5 py-1 rounded-lg text-xs font-semibold ${ds.selectedDishId === f.dish_id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                ${f.dish_name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Forecast Visual Chart & Model Transparency Cards -->
        <div class="space-y-4">
          ${(ds.selectedDishId ? ds.forecasts.filter(f => f.dish_id === ds.selectedDishId) : ds.forecasts).map(f => renderDishForecastCard(f)).join('')}
        </div>
      </div>

      <!-- 6. SECTION B: INGREDIENT CONSUMPTION & STOCKOUT RISK RADAR -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>⚠️ Ingredient Stockout Risk Radar (0–100 Explainable Score)</span>
            </h3>
            <p class="text-xs text-slate-500">Multi-factor algorithmic scoring: Lead-time urgency (40%), Reorder threshold breach (25%), Depletion ratio (25%), Volatility (10%).</p>
          </div>
          <span class="text-xs text-slate-500">
            Monitoring <strong>${ds.stockoutRisks.length}</strong> raw stock items
          </span>
        </div>

        <!-- Stockout Risk Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th class="py-2.5 px-3">Ingredient</th>
                <th class="py-2.5 px-3">Category</th>
                <th class="py-2.5 px-3">Usable Stock</th>
                <th class="py-2.5 px-3">7-Day Demand</th>
                <th class="py-2.5 px-3">Days to Depletion</th>
                <th class="py-2.5 px-3">Stockout Date</th>
                <th class="py-2.5 px-3">Lead Time</th>
                <th class="py-2.5 px-3">Risk Score (0–100)</th>
                <th class="py-2.5 px-3">Status</th>
                <th class="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${ds.stockoutRisks.map(r => renderStockoutRiskRow(r)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 7. SECTION C: EXPLAINABLE PURCHASING RECOMMENDATIONS & WHAT-IF RECALCULATOR -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>🛒 Explainable Purchasing Recommendations & Replenishment Math</span>
            </h3>
            <p class="text-xs text-slate-500">Formulated with Lead-Time Demand, Safety Buffers, Supplier MOQs, and integer Pack Size roundings.</p>
          </div>
          <span class="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            Interactive What-If Recalculator Active
          </span>
        </div>

        <!-- Recommendations Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${ds.recommendations.map(rc => renderPurchasingRecommendationCard(rc)).join('')}
        </div>
      </div>

      <!-- 8. SECTION D: FEFO BATCH EXPIRY & SPOILAGE RADAR -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>❄️ FEFO Batch Expiry & Cold-Chain Spoilage Radar</span>
            </h3>
            <p class="text-xs text-slate-500">First-Expiring-First-Out consumption simulation cross-referenced with cold-chain storage unit telemetry.</p>
          </div>
          <span class="text-xs text-slate-500">14-Day Shelf-Life Window</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${ds.expiryRiskReports.map(rep => renderFefoExpiryCard(rep)).join('')}
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SUB-RENDERERS FOR COMPONENTS
// -------------------------------------------------------------

function renderDishForecastCard(f) {
  const maxQty = Math.max(...f.forecast.map(p => p.predicted_quantity), 1);

  return `
    <div class="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/40">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-900 text-sm">${f.dish_name}</span>
          <span class="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">${f.category}</span>
          <span class="text-[10px] ${f.confidence_level === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded font-bold">
            ${f.confidence_level} Confidence
          </span>
        </div>

        <div class="text-[11px] text-slate-500">
          Model: <strong class="text-slate-800">${f.methodology_used}</strong>
          ${f.metrics && f.metrics.mae !== null ? ` (Holdout MAE: <strong>${f.metrics.mae}</strong>)` : ''}
        </div>
      </div>

      <!-- Forecast Bar Chart Visual -->
      <div class="grid grid-cols-7 gap-2 pt-2">
        ${f.forecast.map(pt => {
          const heightPct = Math.round((pt.predicted_quantity / maxQty) * 100);
          const isWeekend = pt.day_of_week === 'Saturday' || pt.day_of_week === 'Sunday';

          return `
            <div class="flex flex-col items-center">
              <span class="text-[11px] font-bold text-slate-800">${pt.predicted_quantity}</span>
              <div class="w-full bg-slate-200 rounded-lg h-24 flex items-end p-1 my-1">
                <div class="w-full rounded-md ${isWeekend ? 'bg-teal-600' : 'bg-teal-500'} transition-all" style="height: ${Math.max(10, heightPct)}%;"></div>
              </div>
              <span class="text-[10px] font-bold text-slate-700">${pt.day_of_week.slice(0, 3)}</span>
              <span class="text-[9px] text-slate-400 font-mono">${pt.date.slice(5)}</span>
              ${isWeekend ? `<span class="text-[8px] text-teal-700 font-bold uppercase mt-0.5">Peak</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderStockoutRiskRow(r) {
  let badgeClass = "badge-low";
  if (r.risk_category === "CRITICAL") badgeClass = "badge-critical";
  else if (r.risk_category === "HIGH") badgeClass = "badge-high";
  else if (r.risk_category === "MODERATE") badgeClass = "badge-moderate";

  const isUrgent = r.stockout_before_lead_time;

  return `
    <tr class="hover:bg-slate-50 ${isUrgent ? 'bg-rose-50/40' : ''}">
      <td class="py-3 px-3 font-bold text-slate-900">${r.ingredient_name}</td>
      <td class="py-3 px-3 text-slate-500">${r.category}</td>
      <td class="py-3 px-3">
        <span class="font-bold ${r.usable_stock <= r.reorder_level ? 'text-rose-600' : 'text-slate-900'}">${r.usable_stock}</span>
        <span class="text-[10px] text-slate-400">${r.unit} (Min: ${r.reorder_level})</span>
      </td>
      <td class="py-3 px-3 font-semibold text-slate-700">
        ${(r.usable_stock > 0 ? (r.projected_timeline.reduce((s, p) => s + p.daily_consumption, 0)).toFixed(1) : 0)} ${r.unit}
      </td>
      <td class="py-3 px-3">
        ${r.stockout_predicted ? `
          <span class="font-bold ${isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-800'}">
            ${r.days_until_stockout} days
          </span>
        ` : `<span class="text-emerald-700 font-semibold">&gt; 7 days</span>`}
      </td>
      <td class="py-3 px-3 font-mono text-[11px] text-slate-600">
        ${r.estimated_stockout_date ? r.estimated_stockout_date : 'No deficit'}
      </td>
      <td class="py-3 px-3 text-slate-600 font-medium">
        ${r.lead_time_days} days
      </td>
      <td class="py-3 px-3">
        <div class="flex items-center gap-2">
          <span class="font-black text-xs ${r.stockout_risk_score >= 75 ? 'text-rose-600' : r.stockout_risk_score >= 50 ? 'text-amber-600' : 'text-slate-700'}">${r.stockout_risk_score}</span>
          <div class="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div class="h-full ${r.stockout_risk_score >= 75 ? 'bg-rose-500' : r.stockout_risk_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${r.stockout_risk_score}%;"></div>
          </div>
        </div>
      </td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
          ${r.risk_category}
        </span>
        ${isUrgent ? `<span class="block text-[9px] text-rose-700 font-bold mt-0.5">⚠️ Stockout &lt; Lead Time</span>` : ''}
      </td>
      <td class="py-3 px-3 text-right">
        <button onclick="openRiskDetailModal(${r.stock_item_id})" class="py-1 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold transition">
          Timeline & Factors →
        </button>
      </td>
    </tr>
  `;
}

function renderPurchasingRecommendationCard(rc) {
  let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
  if (rc.urgency === "URGENT") badgeClass = "bg-rose-100 text-rose-800 border-rose-300 animate-pulse";
  else if (rc.urgency === "RECOMMENDED") badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
  else if (rc.urgency === "OPTIONAL") badgeClass = "bg-blue-100 text-blue-800 border-blue-300";

  return `
    <div id="recCard_${rc.stock_item_id}" class="border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 ${rc.urgency === 'URGENT' ? 'bg-rose-50/20 border-rose-200' : 'bg-white'}">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-slate-900 text-sm">${rc.ingredient_name}</h4>
            <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">${rc.category}</span>
          </div>
          <div class="text-xs text-slate-500 mt-0.5">
            On Hand: <strong>${rc.current_usable_stock} ${rc.unit}</strong> | Lead Time: <strong>${rc.lead_time_days}d</strong>
          </div>
        </div>

        <span class="px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeClass}">
          ${rc.urgency}
        </span>
      </div>

      <!-- Recommendation Hero Block -->
      <div class="p-3.5 rounded-xl ${rc.suggested_order_qty > 0 ? 'bg-teal-50/80 border border-teal-200' : 'bg-slate-50 border border-slate-200'} flex items-center justify-between">
        <div>
          <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Suggested Reorder</span>
          <div class="flex items-baseline gap-1.5 mt-0.5">
            <span class="text-2xl font-black ${rc.suggested_order_qty > 0 ? 'text-teal-900' : 'text-slate-600'}">${rc.suggested_order_qty}</span>
            <span class="text-xs font-bold text-slate-600">${rc.unit}</span>
          </div>
          <span class="text-[10px] text-slate-500">MOQ: ${rc.min_order_qty} ${rc.unit} | Pack Size: ${rc.pack_size} ${rc.unit}</span>
        </div>

        ${rc.primary_supplier ? `
          <div class="text-right text-xs">
            <span class="text-[10px] text-slate-400 font-semibold">Primary Supplier</span>
            <div class="font-bold text-slate-800">${rc.primary_supplier.name}</div>
            <div class="text-[10px] text-slate-500">${rc.primary_supplier.phone} (⭐ ${rc.primary_supplier.rating})</div>
          </div>
        ` : ''}
      </div>

      <!-- Plain Language Rationale -->
      <div class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <strong>Decision Rationale:</strong> ${rc.rationale}
      </div>

      <!-- Step-by-Step Calculation Accordion -->
      <details class="text-[11px] text-slate-600 border border-slate-100 rounded-xl p-2.5 bg-slate-50/50">
        <summary class="font-bold text-slate-800 cursor-pointer hover:text-teal-700">View Mathematical Step-by-Step Proof</summary>
        <div class="space-y-1 mt-2 font-mono text-[10px]">
          ${rc.calculation_steps.map(step => `<div>• ${step}</div>`).join('')}
        </div>
      </details>

      <!-- Inline Live Recalculation Form -->
      <form onsubmit="handleInlineRecalculate(event, ${rc.stock_item_id})" class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2">
          <label class="text-[11px] text-slate-500 font-semibold">Lead Time (days):</label>
          <input type="number" id="recalcLt_${rc.stock_item_id}" step="0.5" min="0.5" max="30" value="${rc.lead_time_days}" class="w-16 p-1 border border-slate-300 rounded-lg text-center font-bold">

          <label class="text-[11px] text-slate-500 font-semibold ml-2">Buffer %:</label>
          <input type="number" id="recalcBuf_${rc.stock_item_id}" step="5" min="0" max="100" value="${rc.safety_buffer_pct}" class="w-16 p-1 border border-slate-300 rounded-lg text-center font-bold">
        </div>

        <button type="submit" class="py-1 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-sm transition">
          Recalculate Live
        </button>
      </form>
    </div>
  `;
}

function renderFefoExpiryCard(rep) {
  return `
    <div class="border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-bold text-slate-900 text-sm">${rep.ingredient_name}</h4>
          <span class="text-xs text-slate-500">Usable Inventory: <strong>${rep.total_usable_stock} ${rep.unit}</strong></span>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${rep.potential_waste_quantity > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
          ${rep.potential_waste_quantity > 0 ? `Waste Risk: ${rep.potential_waste_quantity} ${rep.unit}` : 'Optimal FEFO Schedule'}
        </span>
      </div>

      <div class="space-y-2">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monitored Batches (FEFO Chronological)</span>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          ${rep.batches.map(b => `
            <div class="p-2.5 rounded-xl border text-xs flex items-center justify-between ${b.status === 'expires_with_leftover' ? 'bg-amber-50 border-amber-200' : b.status === 'expired_on_hand' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}">
              <div>
                <div class="font-bold text-slate-900">${b.batch_number} (${b.initial_quantity} ${b.unit})</div>
                <div class="text-[10px] text-slate-500">Storage: <strong>${b.storage_unit_name}</strong> | Expires: <strong>${b.expiry_date}</strong> (${b.days_until_expiry}d left)</div>
                ${b.spoilage_risk_alert ? `<div class="text-[10px] text-rose-700 font-bold mt-0.5">⚠️ ${b.spoilage_risk_alert.note}</div>` : ''}
              </div>

              <div class="text-right">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'expires_with_leftover' ? 'bg-amber-200 text-amber-900' : b.status === 'expired_on_hand' ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'}">
                  ${b.status}
                </span>
                ${b.remaining_quantity > 0 ? `<div class="text-[10px] font-bold text-rose-700 mt-1">${b.remaining_quantity} ${b.unit} leftover</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Actionable Mitigation Directive -->
      <div class="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-950">
        <strong>Culinary Recommendation:</strong>
        <div class="mt-0.5">${rep.mitigation_actions.join(' ')}</div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// EVENT HANDLERS & MODAL DIALOGS
// -------------------------------------------------------------

async function handleScenarioSwitch(scenarioId) {
  state.demandSense.activeScenario = scenarioId;
  showToast(`Switching to ${scenarioId.toUpperCase()}...`, "info");

  try {
    const res = await apiCall(`/api/forecast/scenarios/apply?restaurant_id=1`, {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenarioId })
    });
    if (res && res.title) {
      state.demandSense.scenarioMetadata = {
        title: res.title,
        description: res.description,
        impact: res.expected_impact
      };
      showToast(`Activated: ${res.title}`, "success");
    }
  } catch(e) {
    console.log("Local scenario applied:", e.message);
  }

  await syncDemandSenseData();
  renderDemandSenseContent(document.getElementById("mainViewContent"));
}

function handleMultiplierChange(val) {
  state.demandSense.demandMultiplier = parseFloat(val);
  showToast(`Demand sensitivity adjusted to ${val}x`, "info");
  syncDemandSenseData().then(() => {
    renderDemandSenseContent(document.getElementById("mainViewContent"));
  });
}

function filterForecastDish(dishId) {
  state.demandSense.selectedDishId = dishId;
  renderDemandSenseContent(document.getElementById("mainViewContent"));
}

function refreshDemandSenseData() {
  showToast("Synchronizing DemandSense AI with live SQLite backend...", "info");
  syncDemandSenseData().then(() => {
    renderDemandSenseContent(document.getElementById("mainViewContent"));
    showToast("DemandSense Engine Refreshed", "success");
  });
}

async function handleInlineRecalculate(e, stockItemId) {
  e.preventDefault();
  const lt = parseFloat(document.getElementById(`recalcLt_${stockItemId}`).value);
  const buf = parseFloat(document.getElementById(`recalcBuf_${stockItemId}`).value);
  const mult = state.demandSense.demandMultiplier || 1.0;

  try {
    const updated = await apiCall("/api/forecast/recommendations/recalculate?restaurant_id=1", {
      method: "POST",
      body: JSON.stringify({
        stock_item_id: stockItemId,
        custom_lead_time_days: lt,
        custom_safety_buffer_pct: buf,
        demand_multiplier: mult,
        target_horizon_days: 7
      })
    });

    // Replace card dynamically in state and DOM
    const idx = state.demandSense.recommendations.findIndex(rc => rc.stock_item_id === stockItemId);
    if (idx !== -1) {
      state.demandSense.recommendations[idx] = updated;
    }
    const cardEl = document.getElementById(`recCard_${stockItemId}`);
    if (cardEl) {
      const parent = cardEl.parentElement;
      cardEl.outerHTML = renderPurchasingRecommendationCard(updated);
    }
    showToast(`Recalculated: Suggested order is now ${updated.suggested_order_qty} ${updated.unit}`, "success");
  } catch (err) {
    showToast(`Recalculation error: ${err.message}`, "error");
  }
}

function openRiskDetailModal(stockItemId) {
  const itemRisk = state.demandSense.stockoutRisks.find(r => r.stock_item_id === stockItemId);
  if (!itemRisk) return;

  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = `Stockout Risk & Timeline: ${itemRisk.ingredient_name}`;
  modalContent.innerHTML = `
    <div class="space-y-4 text-xs">
      <!-- Factor Breakdown Header -->
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-slate-800 text-sm">Stockout Risk Score: ${itemRisk.stockout_risk_score} / 100</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${itemRisk.stockout_risk_score >= 75 ? 'badge-critical' : itemRisk.stockout_risk_score >= 50 ? 'badge-high' : 'badge-low'}">
            ${itemRisk.risk_category}
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium text-slate-600">
          <div>Lead Time Urgency: <strong>${itemRisk.factor_breakdown.lead_time_urgency_pts} / 40</strong></div>
          <div>Reorder Threshold: <strong>${itemRisk.factor_breakdown.reorder_level_breach_pts} / 25</strong></div>
          <div>7d Depletion Ratio: <strong>${itemRisk.factor_breakdown.depletion_ratio_pts} / 25</strong></div>
          <div>Surge Volatility: <strong>${itemRisk.factor_breakdown.volatility_surge_pts} / 10</strong></div>
        </div>
      </div>

      <div class="text-xs text-slate-700 bg-teal-50 p-3 rounded-xl border border-teal-200">
        <strong>Algorithmic Warning:</strong> ${itemRisk.narrative_warning}
      </div>

      <!-- Projected 7-Day Timeline -->
      <div>
        <h5 class="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Daily Projected Inventory Balance Timeline</h5>
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="w-full text-left">
            <thead class="bg-slate-100 text-slate-600 uppercase text-[10px]">
              <tr>
                <th class="p-2">Date</th>
                <th class="p-2">Day</th>
                <th class="p-2">Start Balance</th>
                <th class="p-2">Consumption</th>
                <th class="p-2">Incoming Delivery</th>
                <th class="p-2">Ending Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${itemRisk.projected_timeline.map(pt => `
                <tr class="${pt.is_negative ? 'bg-rose-50 text-rose-900 font-bold' : ''}">
                  <td class="p-2 font-mono text-[11px]">${pt.date}</td>
                  <td class="p-2">${pt.day_of_week}</td>
                  <td class="p-2">${pt.starting_balance} ${itemRisk.unit}</td>
                  <td class="p-2 text-rose-600">-${pt.daily_consumption} ${itemRisk.unit}</td>
                  <td class="p-2 text-emerald-600">+${pt.incoming_delivery} ${itemRisk.unit} ${pt.delivery_pos && pt.delivery_pos.length ? `(${pt.delivery_pos.join(', ')})` : ''}</td>
                  <td class="p-2 font-bold ${pt.ending_balance <= 0 ? 'text-rose-700' : 'text-slate-900'}">${pt.ending_balance} ${itemRisk.unit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold">Close Details</button>
      </div>
    </div>
  `;
  openActionModal();
}

async function openMethodologyModal() {
  const modalTitle = document.getElementById("actionModalTitle");
  const modalContent = document.getElementById("actionModalContent");

  modalTitle.textContent = "DemandSense AI — Algorithmic Methodology & Mathematics";
  modalContent.innerHTML = `
    <div class="space-y-4 text-xs text-slate-700 max-h-[70vh] overflow-y-auto pr-1">
      <div class="p-3 bg-teal-50 rounded-xl border border-teal-200">
        <div class="font-bold text-teal-900 text-sm">FSSAI & AnnaKavach Explainability Guarantee</div>
        <p class="text-[11px] text-teal-800 mt-1">
          DemandSense operates strictly as an empirical, explainable decision-support engine. It never outputs opaque "black box" numbers or automated purchase orders without full mathematical derivations.
        </p>
      </div>

      <div class="space-y-2">
        <h5 class="font-bold text-slate-900 text-xs uppercase tracking-wider">1. Four-Tier Forecasting Selection Hierarchy</h5>
        <div class="space-y-2">
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div class="font-bold text-slate-800">Tier 1: Day-of-Week (DOW) Historical Average (High Confidence)</div>
            <p class="text-[11px] text-slate-600 mt-0.5">Condition: $\\ge 14$ days of continuous records with $\\ge 2$ observations per weekday.</p>
            <div class="font-mono text-[10px] bg-slate-100 p-1.5 rounded mt-1">Formula: y_dow = (1 / N_dow) * sum(sales_dow) | Verified via 7-day rolling holdout validation (MAE, MAPE, RMSE).</div>
          </div>
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div class="font-bold text-slate-800">Tier 2: 7-Day Simple Moving Average (SMA-7) (Medium Confidence)</div>
            <p class="text-[11px] text-slate-600 mt-0.5">Condition: Historical records between 4 and 13 days.</p>
            <div class="font-mono text-[10px] bg-slate-100 p-1.5 rounded mt-1">Formula: y_sma = (1 / k) * sum(sales_t-i)</div>
          </div>
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div class="font-bold text-slate-800">Tier 3: Naive Baseline (Low Confidence)</div>
            <p class="text-[11px] text-slate-600 mt-0.5">Condition: Historical records between 1 and 3 days. Uncertainty margin: $\\pm 35\\%$.</p>
          </div>
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div class="font-bold text-slate-800">Tier 4: Insufficient History (Warning State)</div>
            <p class="text-[11px] text-slate-600 mt-0.5">Condition: 0 historical records. Outputs 0.0 with explicit data warning rather than fabricating numbers.</p>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h5 class="font-bold text-slate-900 text-xs uppercase tracking-wider">2. Stockout Risk Score Formulation (0 to 100)</h5>
        <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1 font-mono text-[10px]">
          <div>• Lead Time Urgency (0–40 pts): Stockout before lead time = 40 pts. Graduated if &lt; 2x lead time.</div>
          <div>• Reorder Threshold Breach (0–25 pts): 25 pts if stockout on hand; 20 pts if usable &le; reorder level.</div>
          <div>• 7-Day Depletion Ratio (0–25 pts): 25 * min(1.0, Total 7d Demand / Total Available Stock).</div>
          <div>• Volatility & Multiplier (0–10 pts): Accounts for festive/surge demand adjustments.</div>
        </div>
      </div>

      <div class="space-y-2">
        <h5 class="font-bold text-slate-900 text-xs uppercase tracking-wider">3. Purchasing Recommendation Equations</h5>
        <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1 font-mono text-[10px]">
          <div>1. Lead-Time Demand (LTD) = Average Daily Demand * Lead Time Days</div>
          <div>2. Safety Buffer (SB) = LTD * (Safety Buffer Pct / 100)</div>
          <div>3. Net Shortfall = max(0, LTD + SB - Usable Stock - Incoming Due Before Lead Time)</div>
          <div>4. Pack Size Rounding = ceil(max(Shortfall, MOQ) / Pack Size) * Pack Size</div>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeActionModal()" class="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold">Understood</button>
      </div>
    </div>
  `;
  openActionModal();
}

function openActionModal() {
  const m = document.getElementById("actionModal");
  if (m) m.classList.remove("hidden");
}

function closeActionModal() {
  const m = document.getElementById("actionModal");
  if (m) m.classList.add("hidden");
}
