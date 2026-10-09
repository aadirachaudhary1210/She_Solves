/**
 * AnnaKavach Food Safety Intelligence Center — Smart Risk Radar
 * Challenge 4 Frontend Module
 *
 * Integrates into the existing FoodShield app.js navigation system.
 * All data is fetched from the real /api/risk/* endpoints.
 * Demo mode is clearly labelled when backend is unreachable.
 */

// ─────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────

const RISK_API_BASE = "http://127.0.0.1:8000";
let RISK_DEMO_MODE_LABEL = "⚠️ DEMONSTRATION DATA — Not connected to live backend";

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", dot: "bg-red-500", hex: "#ef4444" },
  high:     { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-500", hex: "#f97316" },
  medium:   { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", dot: "bg-amber-400", hex: "#f59e0b" },
  low:      { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", dot: "bg-blue-400", hex: "#3b82f6" },
  info:     { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", dot: "bg-slate-400", hex: "#64748b" },
};

const STATUS_LABELS = {
  open:                  { label: "Open",                 cls: "bg-red-100 text-red-800 border-red-200" },
  in_progress:           { label: "In Progress",          cls: "bg-amber-100 text-amber-800 border-amber-200" },
  awaiting_verification: { label: "Awaiting Verification",cls: "bg-purple-100 text-purple-800 border-purple-200" },
  resolved:              { label: "Resolved",             cls: "bg-green-100 text-green-800 border-green-200" },
};

const CATEGORY_ICONS = {
  "Inspection Violation": "📋",
  "Recurring Violation":  "🔁",
  "Unresolved Violation": "⚠️",
  "Corrective Action":    "⚡",
  "Compliance Document":  "📑",
  "Stock Expiry":         "📦",
  "Stock Level":          "📉",
  "Pest Control":         "🛡️",
  "Hygiene & Sanitation": "✨",
  "Staff Training":       "🎓",
  "Systemic Risk":        "🚨",
};

function riskAuth() {
  const token = sessionStorage.getItem("foodshield_token");
  return token ? `Bearer ${token}` : null;
}

function riskCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem("foodshield_user") || "null"); }
  catch (_) { return null; }
}

async function riskFetch(path, opts = {}) {
  const auth = riskAuth();
  if (!auth) throw new Error("You are not authenticated. Log in again to connect Smart Risk Radar to live data.");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  headers["Authorization"] = auth;
  const res = await fetch(`${RISK_API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function riskFormFetch(path, formData, method = "POST") {
  const auth = riskAuth();
  if (!auth) throw new Error("You are not authenticated. Please log in again.");
  const headers = { "Authorization": auth };
  const res = await fetch(`${RISK_API_BASE}${path}`, { method, headers, body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// DEMO DATA (clearly labelled)
// Used ONLY when backend is unreachable, never silently.
// ─────────────────────────────────────────────

const DEMO_OVERVIEW = {
  _demo_mode: true,
  total_findings: 8,
  open_findings: 6,
  critical_high_count: 3,
  overdue_actions: 2,
  awaiting_verification: 1,
  resolved_findings: 1,
  recurring_risks: 1,
  top_finding: {
    rule_id: "CA-001",
    title: "Overdue Corrective Action: Exhaust Hood Tray Cleaning Log Missing",
    severity: "high",
    score: 70,
    category: "Corrective Action",
    restaurant_name: "The Royal Spice Kitchen",
    is_overdue: true,
    immediate_action: "Execute cleaning and submit photographic evidence via the Corrective Action workflow.",
  },
  by_severity: { critical: 1, high: 2, medium: 3, low: 2, info: 0 },
  by_category: {
    "Corrective Action": 2,
    "Compliance Document": 2,
    "Stock Expiry": 2,
    "Pest Control": 1,
    "Systemic Risk": 1,
  },
  data_mode: "demo",
  analysis_timestamp: new Date().toISOString(),
};

const DEMO_FINDINGS = [
  {
    rule_id: "MULTI-001", title: "Multiple Concurrent Risk Signals (6 Open Findings)",
    severity: "high", score: 63, category: "Systemic Risk", status: "open",
    restaurant_name: "The Royal Spice Kitchen", is_recurring: false, is_overdue: false,
    description: "6 open risk findings across 5 categories indicate a systemic food-safety management concern.",
    contributing_signals: ["Total open findings: 6", "Distinct categories: 5"],
    immediate_action: "Hold a management review to triage all open findings. Prioritise Critical and High severity items.",
    preventive_action: "Establish a weekly food-safety risk review meeting.",
    verification_steps: "Resolve individual findings in priority order.",
    evidence_refs: [{ type: "risk_finding", label: "See individual findings below" }],
    detected_at: new Date().toISOString(), fingerprint: "MULTI-001:1",
    limitations: "Score is additive based on signal count, not summed individual scores.",
  },
  {
    rule_id: "CA-001", title: "Overdue Corrective Action: Exhaust Hood Tray Cleaning",
    severity: "high", score: 70, category: "Corrective Action", status: "open",
    restaurant_name: "The Royal Spice Kitchen", is_recurring: false, is_overdue: true,
    description: "Corrective action was due on 2026-10-10 (overdue). Issue: Exhaust hood tray cleaning evidence was not submitted.",
    contributing_signals: ["Deadline: 2026-10-10", "Days overdue: varies", "Status: pending"],
    immediate_action: "Execute immediately: Degrease hood trays, log entry, submit photographic evidence.",
    preventive_action: "Schedule recurring review of corrective action deadlines. Assign deputy responsibility.",
    verification_steps: "Submit corrective action response with evidence. Await officer verification to close.",
    evidence_refs: [{ type: "corrective_action", id: 1, label: "CA #1 — Exhaust Hood Tray Cleaning Log" }],
    detected_at: new Date().toISOString(), fingerprint: "CA-001:1:1",
  },
  {
    rule_id: "DOC-001", title: "Expired Compliance Document: Delhi Fire Service NOC",
    severity: "high", score: 65, category: "Compliance Document", status: "open",
    restaurant_name: "The Royal Spice Kitchen", is_recurring: false, is_overdue: true,
    description: "Delhi Fire Service NOC (issued by Delhi Fire Service HQ) expired on 2026-10-20.",
    contributing_signals: ["Expiry: 2026-10-20", "Category: fire_safety"],
    immediate_action: "Contact Delhi Fire Service HQ immediately to initiate renewal.",
    preventive_action: "Set automatic reminders 30 and 14 days before expiry for all compliance documents.",
    verification_steps: "Upload renewed document in Compliance Vault. Update expiry date.",
    evidence_refs: [{ type: "compliance_document", id: 602, label: "Document #602 — fire_safety" }],
    detected_at: new Date().toISOString(), fingerprint: "DOC-001:1:602",
  },
  {
    rule_id: "STOCK-001", title: "Expired Stock Batch: Amul Gold Full Cream Milk",
    severity: "high", score: 60, category: "Stock Expiry", status: "open",
    restaurant_name: "The Royal Spice Kitchen", is_recurring: false, is_overdue: true,
    description: "Batch AML-MLK-881 (24 liters) expired on 2026-10-07. Must not be used.",
    contributing_signals: ["Expiry: 2026-10-07", "Quantity: 24 liters", "Category: Dairy"],
    immediate_action: "Immediately quarantine and label this batch. Arrange safe disposal.",
    preventive_action: "Implement FIFO stock rotation. Set expiry alerts at receipt.",
    verification_steps: "Record disposal with date and staff. Photograph disposal evidence.",
    evidence_refs: [{ type: "stock_batch", id: 502, label: "Batch AML-MLK-881 — Amul Gold Milk" }],
    detected_at: new Date().toISOString(), fingerprint: "STOCK-001:1:502",
  },
  {
    rule_id: "PEST-002", title: "Pest Control Service Due Soon",
    severity: "low", score: 20, category: "Pest Control", status: "open",
    restaurant_name: "The Royal Spice Kitchen", is_recurring: false, is_overdue: false,
    description: "Scheduled pest control service is due in 4 days on 2026-10-13.",
    contributing_signals: ["Days remaining: 4"],
    immediate_action: "Confirm appointment with PestGuard Industrial Pest Solutions.",
    preventive_action: "Keep agency contact details updated.",
    verification_steps: "Confirm service completed, upload certificate.",
    evidence_refs: [{ type: "pest_control_record", id: 401, label: "Pest Control Record #401" }],
    detected_at: new Date().toISOString(), fingerprint: "PEST-002:1:401",
  },
];

const DEMO_ANALYTICS = {
  _demo_mode: true,
  by_severity: { critical: 1, high: 3, medium: 2, low: 2, info: 0 },
  by_category: {
    "Corrective Action": 2,
    "Compliance Document": 2,
    "Stock Expiry": 2,
    "Pest Control": 1,
    "Systemic Risk": 1,
  },
  by_status: { open: 6, in_progress: 1, awaiting_verification: 0, resolved: 1 },
  recurring_vs_non_recurring: { recurring: 1, non_recurring: 7 },
  corrective_action_status: { pending: 1, submitted: 0, verified_closed: 0, overdue: 0 },
  total_findings: 8,
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

const riskState = {
  overview: null,
  findings: [],
  analytics: null,
  activeDetailFingerprint: null,
  filters: { severity: "", category: "", status: "", recurring: "" },
  isDemo: false,
  loading: false,
};

// ─────────────────────────────────────────────
// MAIN RENDER ENTRY POINT
// Called by the existing app.js navigateTo() switch
// ─────────────────────────────────────────────

async function renderRiskRadar(container) {
  container.innerHTML = `
    <div id="riskRoot" class="space-y-5">
      <div class="flex items-center justify-center py-16">
        <div class="flex flex-col items-center gap-3 text-slate-400">
          <svg class="animate-spin w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm font-medium">Analysing food-safety signals…</span>
        </div>
      </div>
    </div>
  `;
  await loadRiskData();
  renderRiskRoot();
}

async function loadRiskData() {
  try {
    const [overview, findingsResp, analytics] = await Promise.all([
      riskFetch("/api/risk/overview"),
      riskFetch("/api/risk/findings?limit=200"),
      riskFetch("/api/risk/analytics"),
    ]);
    riskState.overview = overview;
    riskState.findings = findingsResp.findings || [];
    riskState.analytics = analytics;
    riskState.isDemo = false;
    RISK_DEMO_MODE_LABEL = "⚠️ DEMONSTRATION DATA — Not connected to live backend";
  } catch (err) {
    console.warn("[SmartRiskRadar] Live API request failed; showing labelled demonstration data:", err.message);
    RISK_DEMO_MODE_LABEL = `⚠️ LIVE API UNAVAILABLE — ${err.message}`;
    riskState.overview = DEMO_OVERVIEW;
    riskState.findings = DEMO_FINDINGS;
    riskState.analytics = DEMO_ANALYTICS;
    riskState.isDemo = true;
  }
}

function renderRiskRoot() {
  const root = document.getElementById("riskRoot");
  if (!root) return;

  const ov = riskState.overview;
  const isDemo = riskState.isDemo;

  root.innerHTML = `
    <!-- Demo mode banner -->
    ${isDemo ? `
    <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
      <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      ${RISK_DEMO_MODE_LABEL} — Start the backend server to use live data.
    </div>` : `
    <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      🟢 Live Data — AnnaKavach Smart Risk Radar connected to database
      <span class="ml-auto text-emerald-600 opacity-60">${new Date(ov.analysis_timestamp).toLocaleTimeString()}</span>
    </div>`}

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">AnnaKavach Smart Risk Radar</h2>
        <p class="text-xs text-slate-500 mt-0.5">OBSERVE → DETECT → SCORE → EXPLAIN → PRIORITIZE → PREVENT → VERIFY → LEARN</p>
      </div>
      <button onclick="loadAndRefreshRisk()" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Refresh Analysis
      </button>
    </div>

    <!-- KPI Cards -->
    ${renderKpiCards(ov)}

    <!-- Top Finding Alert -->
    ${ov.top_finding ? renderTopFindingAlert(ov.top_finding) : ""}

    <!-- Filters Row -->
    ${renderFiltersBar()}

    <!-- Findings List + Charts side-by-side -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-3" id="findingsList">
        ${renderFindingsList()}
      </div>
      <div class="space-y-4" id="riskCharts">
        ${renderChartsPanel()}
      </div>
    </div>

    <!-- Corrective Action Quick-Create Panel -->
    ${renderCreateCAPanel()}

    <!-- Integration Roadmap -->
    ${renderIntegrationRoadmap()}
  `;

  // Render chart bars (simple CSS-based, no external library needed)
  renderSeverityChart();
  renderCategoryChart();
  // Render canvas charts with a short delay to ensure DOM is ready
  setTimeout(() => {
    renderActionStatusChartInDOM();
    renderRecurringChartInDOM();
  }, 60);
}

// ─────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────

function renderKpiCards(ov) {
  const cards = [
    {
      label: "Total Findings",
      value: ov.total_findings,
      sub: "All risk findings detected",
      icon: "🔍",
      color: "border-slate-300 bg-white",
      textColor: "text-slate-800",
    },
    {
      label: "Open Findings",
      value: ov.open_findings,
      sub: "Require attention",
      icon: "🔓",
      color: ov.open_findings > 0 ? "border-rose-300 bg-rose-50" : "border-green-300 bg-green-50",
      textColor: ov.open_findings > 0 ? "text-rose-700" : "text-green-700",
    },
    {
      label: "Critical & High",
      value: ov.critical_high_count,
      sub: "Highest urgency",
      icon: "🚨",
      color: ov.critical_high_count > 0 ? "border-red-400 bg-red-50" : "border-green-300 bg-green-50",
      textColor: ov.critical_high_count > 0 ? "text-red-800" : "text-green-700",
    },
    {
      label: "Overdue Actions",
      value: ov.overdue_actions,
      sub: "Past deadline",
      icon: "⏰",
      color: ov.overdue_actions > 0 ? "border-orange-400 bg-orange-50" : "border-green-300 bg-green-50",
      textColor: ov.overdue_actions > 0 ? "text-orange-800" : "text-green-700",
    },
    {
      label: "Awaiting Verification",
      value: ov.awaiting_verification,
      sub: "Pending officer review",
      icon: "🔎",
      color: "border-purple-200 bg-purple-50",
      textColor: "text-purple-800",
    },
    {
      label: "Resolved",
      value: ov.resolved_findings,
      sub: "Successfully closed",
      icon: "✅",
      color: "border-green-300 bg-green-50",
      textColor: "text-green-700",
    },
    {
      label: "Recurring Risks",
      value: ov.recurring_risks,
      sub: "Repeat patterns detected",
      icon: "🔁",
      color: ov.recurring_risks > 0 ? "border-amber-400 bg-amber-50" : "border-green-300 bg-green-50",
      textColor: ov.recurring_risks > 0 ? "text-amber-800" : "text-green-700",
    },
  ];

  return `
    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
      ${cards.map(c => `
        <div class="rounded-xl border p-3.5 ${c.color} flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-lg">${c.icon}</span>
          </div>
          <div class="text-2xl font-extrabold ${c.textColor}">${c.value}</div>
          <div class="text-xs font-bold text-slate-700">${c.label}</div>
          <div class="text-[10px] text-slate-500 leading-tight">${c.sub}</div>
        </div>
      `).join("")}
    </div>
  `;
}

// ─────────────────────────────────────────────
// TOP FINDING ALERT
// ─────────────────────────────────────────────

function renderTopFindingAlert(finding) {
  const sc = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info;
  return `
    <div class="flex items-start gap-3 p-4 rounded-xl border-2 ${sc.border} ${sc.bg}">
      <div class="flex-shrink-0 mt-0.5">
        <span class="text-2xl">🔴</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <span class="text-xs font-bold uppercase tracking-wider ${sc.text}">Most Urgent: ${finding.severity?.toUpperCase()} — Score ${finding.score}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sc.bg} ${sc.text} ${sc.border}">${finding.rule_id}</span>
          ${finding.is_overdue ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-bold">OVERDUE</span>` : ""}
        </div>
        <div class="font-bold text-slate-900 text-sm mb-1">${finding.title}</div>
        <div class="text-xs text-slate-600 mb-2">${finding.immediate_action || ""}</div>
        <div class="text-[11px] text-slate-500">${finding.restaurant_name} · Rule: ${finding.rule_id}</div>
      </div>
      <div class="flex-shrink-0 text-right">
        <div class="text-3xl font-black ${sc.text}">${finding.score}</div>
        <div class="text-[10px] text-slate-500 uppercase tracking-wide">Risk Score</div>
        <div class="text-[10px] text-slate-400 mt-1">0–100 scale</div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────

function renderFiltersBar() {
  const severities = ["", "critical", "high", "medium", "low", "info"];
  const categories = ["", ...new Set(riskState.findings.map(f => f.category))];
  const statuses   = ["", "open", "in_progress", "awaiting_verification", "resolved"];

  const selClass = "text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-700";

  return `
    <div class="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
      <span class="text-xs font-bold text-slate-600 mr-1">Filter:</span>
      <select id="filterSeverity" class="${selClass}" onchange="applyRiskFilters()">
        ${severities.map(s => `<option value="${s}" ${riskState.filters.severity === s ? "selected" : ""}>${s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Severities"}</option>`).join("")}
      </select>
      <select id="filterCategory" class="${selClass}" onchange="applyRiskFilters()">
        ${categories.map(c => `<option value="${c}" ${riskState.filters.category === c ? "selected" : ""}>${c || "All Categories"}</option>`).join("")}
      </select>
      <select id="filterStatus" class="${selClass}" onchange="applyRiskFilters()">
        ${statuses.map(s => `<option value="${s}" ${riskState.filters.status === s ? "selected" : ""}>${s ? STATUS_LABELS[s]?.label || s : "All Statuses"}</option>`).join("")}
      </select>
      <select id="filterRecurring" class="${selClass}" onchange="applyRiskFilters()">
        <option value="">Recurring & Non-Recurring</option>
        <option value="true" ${riskState.filters.recurring === "true" ? "selected" : ""}>Recurring Only</option>
        <option value="false" ${riskState.filters.recurring === "false" ? "selected" : ""}>Non-Recurring Only</option>
      </select>
      <button onclick="clearRiskFilters()" class="ml-auto text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1.5 rounded-lg hover:bg-slate-100 transition">Clear Filters</button>
      <span class="text-xs text-slate-400 font-medium" id="filterCount">${filteredFindings().length} findings</span>
    </div>
  `;
}

function filteredFindings() {
  return riskState.findings.filter(f => {
    if (riskState.filters.severity && f.severity !== riskState.filters.severity) return false;
    if (riskState.filters.category && !f.category.toLowerCase().includes(riskState.filters.category.toLowerCase())) return false;
    if (riskState.filters.status && f.status !== riskState.filters.status) return false;
    if (riskState.filters.recurring !== "") {
      const want = riskState.filters.recurring === "true";
      if (f.is_recurring !== want) return false;
    }
    return true;
  });
}

function applyRiskFilters() {
  riskState.filters.severity  = document.getElementById("filterSeverity")?.value || "";
  riskState.filters.category  = document.getElementById("filterCategory")?.value || "";
  riskState.filters.status    = document.getElementById("filterStatus")?.value || "";
  riskState.filters.recurring = document.getElementById("filterRecurring")?.value || "";
  document.getElementById("findingsList").innerHTML = renderFindingsList();
  const countEl = document.getElementById("filterCount");
  if (countEl) countEl.textContent = `${filteredFindings().length} findings`;
}

function clearRiskFilters() {
  riskState.filters = { severity: "", category: "", status: "", recurring: "" };
  document.getElementById("filterSeverity").value  = "";
  document.getElementById("filterCategory").value  = "";
  document.getElementById("filterStatus").value    = "";
  document.getElementById("filterRecurring").value = "";
  applyRiskFilters();
}

// ─────────────────────────────────────────────
// FINDINGS LIST
// ─────────────────────────────────────────────

function renderFindingsList() {
  const findings = filteredFindings();
  if (findings.length === 0) {
    return `
      <div class="flex flex-col items-center justify-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
        <span class="text-4xl mb-3">✅</span>
        <div class="font-semibold text-sm">No findings match the selected filters.</div>
        <div class="text-xs mt-1">Adjust filters or refresh the analysis.</div>
      </div>
    `;
  }

  return findings.map((f, idx) => renderFindingCard(f, idx)).join("");
}

function renderFindingCard(f, idx) {
  const sc = SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.info;
  const st = STATUS_LABELS[f.status] || { label: f.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  const icon = CATEGORY_ICONS[f.category] || "⚠️";
  const fp = f.fingerprint || `f-${idx}`;

  return `
    <div class="bg-white border border-slate-200 rounded-xl hover:shadow-md transition overflow-hidden cursor-pointer"
         onclick="openFindingDetail('${fp.replace(/'/g, "\\'")}')">
      <div class="flex items-start gap-3 p-4">
        <div class="flex-shrink-0 mt-0.5">
          <div class="w-9 h-9 rounded-lg ${sc.bg} flex items-center justify-center text-lg border ${sc.border}">${icon}</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="font-bold text-slate-900 text-sm leading-snug">${f.title}</div>
            <div class="flex-shrink-0 flex flex-col items-end gap-1">
              <div class="text-xl font-black ${sc.text}">${f.score}</div>
              <div class="text-[9px] text-slate-400 uppercase">/ 100</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 mb-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${sc.bg} ${sc.text} ${sc.border} uppercase">
              ${f.severity}
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.cls}">${st.label}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">${f.rule_id}</span>
            ${f.is_recurring ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold">🔁 Recurring</span>` : ""}
            ${f.is_overdue ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">⏰ Overdue</span>` : ""}
          </div>
          <div class="text-xs text-slate-600 line-clamp-2 mb-2">${f.description}</div>
          <div class="flex items-center gap-3 text-[10px] text-slate-400">
            <span>${f.restaurant_name}</span>
            <span>·</span>
            <span>${f.category}</span>
            <span class="ml-auto text-teal-600 font-semibold hover:underline">View Details →</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// FINDING DETAIL MODAL
// ─────────────────────────────────────────────

function openFindingDetail(fingerprint) {
  const finding = riskState.findings.find(f => f.fingerprint === fingerprint);
  if (!finding) return;
  riskState.activeDetailFingerprint = fingerprint;

  const sc = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info;
  const st = STATUS_LABELS[finding.status] || { label: finding.status, cls: "" };

  const modal = document.getElementById("actionModal");
  const title = document.getElementById("actionModalTitle");
  const content = document.getElementById("actionModalContent");

  title.textContent = "Risk Finding Detail — Smart Risk Radar";
  content.innerHTML = `
    <div class="space-y-4">
      <!-- Header bar -->
      <div class="flex items-center gap-3 p-4 rounded-xl ${sc.bg} border ${sc.border}">
        <div class="text-3xl font-black ${sc.text}">${finding.score}</div>
        <div class="flex-1">
          <div class="text-xs font-bold ${sc.text} uppercase">${finding.severity} SEVERITY · Rule ${finding.rule_id}</div>
          <div class="font-bold text-slate-900 text-sm mt-0.5">${finding.title}</div>
          <div class="flex gap-1.5 mt-1.5 flex-wrap">
            <span class="text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.cls}">${st.label}</span>
            ${finding.is_overdue ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">OVERDUE</span>` : ""}
            ${finding.is_recurring ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-bold">RECURRING</span>` : ""}
          </div>
        </div>
      </div>

      <!-- Score explanation -->
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
        <div class="font-bold text-slate-800 mb-1">📊 Score Explanation (0–100 prioritisation scale)</div>
        <div class="grid grid-cols-5 gap-1 text-[10px] text-center mb-2">
          ${[["80–100","Critical","bg-red-100 text-red-800"],["60–79","High","bg-orange-100 text-orange-800"],["35–59","Medium","bg-amber-100 text-amber-800"],["10–34","Low","bg-blue-100 text-blue-800"],["0–9","Info","bg-slate-100 text-slate-600"]].map(([r,l,c])=>`<div class="px-1 py-1 rounded ${c} font-semibold">${r}<br>${l}</div>`).join("")}
        </div>
        <div class="text-[10px] text-slate-500 italic">Score is a prioritisation aid only. It is NOT a probability of contamination and does NOT replace qualified food-safety inspections.</div>
      </div>

      <!-- Description -->
      <div>
        <div class="text-xs font-bold text-slate-700 mb-1">📄 Description</div>
        <div class="text-sm text-slate-700 leading-relaxed">${finding.description}</div>
      </div>

      <!-- Contributing Signals -->
      <div>
        <div class="text-xs font-bold text-slate-700 mb-1">📡 Contributing Signals</div>
        <div class="flex flex-wrap gap-1.5">
          ${(finding.contributing_signals || []).map(s => `<span class="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">${s}</span>`).join("")}
        </div>
      </div>

      <!-- Evidence References -->
      <div>
        <div class="text-xs font-bold text-slate-700 mb-1">🗃️ Evidence References</div>
        <div class="space-y-1">
          ${(finding.evidence_refs || []).map(r => `
            <div class="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <span class="text-slate-400">${r.type}</span>
              <span class="text-slate-300">·</span>
              <span class="text-slate-700 font-medium">${r.label}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Actions: Immediate + Preventive -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
          <div class="text-xs font-bold text-red-800 mb-1">⚡ Immediate Action Required</div>
          <div class="text-sm text-red-900">${finding.immediate_action}</div>
        </div>
        <div class="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <div class="text-xs font-bold text-teal-800 mb-1">🛡️ Preventive Follow-up</div>
          <div class="text-sm text-teal-900">${finding.preventive_action}</div>
        </div>
      </div>

      <!-- Verification Steps -->
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div class="text-xs font-bold text-purple-800 mb-1">✅ How to Verify Resolution</div>
        <div class="text-sm text-purple-900">${finding.verification_steps}</div>
      </div>

      ${finding.limitations ? `
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 italic">
        ⚠️ Limitations: ${finding.limitations}
      </div>` : ""}

      <!-- Create Corrective Action -->
      <div class="border-t border-slate-200 pt-3">
        <div class="text-xs font-bold text-slate-700 mb-2">Record Corrective Action from this Finding</div>
        <div class="grid grid-cols-1 gap-2">
          <input type="text" id="caTitle" value="${finding.title.substring(0, 120)}"
            class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Issue title">
          <textarea id="caDesc" rows="2" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Description">${finding.description}</textarea>
          <textarea id="caAction" rows="2" class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Required action">${finding.immediate_action}</textarea>
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-600">Deadline (days):</label>
            <input type="number" id="caDays" value="7" min="1" max="90" class="w-20 text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500">
            <button onclick="submitCAFromFinding()" class="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Create Corrective Action
            </button>
          </div>
          <div id="caFeedback" class="hidden text-xs font-semibold"></div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

// ─────────────────────────────────────────────
// CHARTS (CSS-based bar charts, no external library)
// ─────────────────────────────────────────────

function renderChartsPanel() {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div class="font-bold text-sm text-slate-800">Risk by Severity</div>
      <div id="severityChart" class="space-y-2"></div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div class="font-bold text-sm text-slate-800">Risk by Category</div>
      <div id="categoryChart" class="space-y-2"></div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div class="font-bold text-sm text-slate-800">Action Status</div>
      <div id="actionStatusChart" class="space-y-2"></div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="font-bold text-sm text-slate-800 mb-3">Recurring vs Non-Recurring</div>
      <div id="recurringChart"></div>
    </div>
  `;
}

function renderSeverityChart() {
  const el = document.getElementById("severityChart");
  if (!el || !riskState.analytics) return;
  const data = riskState.analytics.by_severity;
  const max = Math.max(1, ...Object.values(data));
  const order = ["critical", "high", "medium", "low", "info"];
  el.innerHTML = order.map(sev => {
    const count = data[sev] || 0;
    const pct = Math.round((count / max) * 100);
    const sc = SEVERITY_COLORS[sev];
    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-14 text-right text-slate-600 font-medium capitalize">${sev}</span>
        <div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
          <div class="h-4 rounded-full ${sc.dot} transition-all duration-700" style="width:${pct}%"></div>
        </div>
        <span class="w-6 text-right font-bold ${sc.text}">${count}</span>
      </div>
    `;
  }).join("");
}

function renderCategoryChart() {
  const el = document.getElementById("categoryChart");
  if (!el || !riskState.analytics) return;
  const data = riskState.analytics.by_category;
  if (!Object.keys(data).length) {
    el.innerHTML = `<div class="text-xs text-slate-400 text-center py-4">No category data</div>`;
    return;
  }
  const max = Math.max(1, ...Object.values(data));
  el.innerHTML = Object.entries(data).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => {
    const pct = Math.round((cnt / max) * 100);
    const icon = CATEGORY_ICONS[cat] || "⚠️";
    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="text-base w-5 flex-shrink-0">${icon}</span>
        <span class="w-28 truncate text-slate-600" title="${cat}">${cat}</span>
        <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div class="h-3 rounded-full bg-teal-500 transition-all duration-700" style="width:${pct}%"></div>
        </div>
        <span class="w-5 text-right font-bold text-teal-700">${cnt}</span>
      </div>
    `;
  }).join("");
}

// Corrective action status chart
function renderActionStatusChartInDOM() {
  const el = document.getElementById("actionStatusChart");
  if (!el || !riskState.analytics) return;
  const data = riskState.analytics.corrective_action_status;
  const statusMeta = {
    pending: { label: "Pending", color: "bg-amber-400" },
    submitted: { label: "Submitted", color: "bg-blue-400" },
    verified_closed: { label: "Verified Closed", color: "bg-green-500" },
    overdue: { label: "Overdue", color: "bg-red-500" },
  };
  const max = Math.max(1, ...Object.values(data));
  el.innerHTML = Object.entries(statusMeta).map(([k, meta]) => {
    const cnt = data[k] || 0;
    const pct = Math.round((cnt / max) * 100);
    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-28 text-slate-600">${meta.label}</span>
        <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div class="h-3 rounded-full ${meta.color}" style="width:${pct}%"></div>
        </div>
        <span class="w-5 text-right font-bold text-slate-700">${cnt}</span>
      </div>
    `;
  }).join("");
}

// Recurring donut (simple two-segment CSS)
function renderRecurringChartInDOM() {
  const el = document.getElementById("recurringChart");
  if (!el || !riskState.analytics) return;
  const d = riskState.analytics.recurring_vs_non_recurring;
  const total = (d.recurring || 0) + (d.non_recurring || 0);
  const recurPct = total ? Math.round((d.recurring / total) * 100) : 0;
  el.innerHTML = `
    <div class="flex items-center gap-4">
      <div class="relative w-16 h-16 flex-shrink-0">
        <svg viewBox="0 0 36 36" class="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" stroke-width="3.5"/>
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f59e0b" stroke-width="3.5"
            stroke-dasharray="${recurPct} ${100 - recurPct}" stroke-linecap="round"/>
        </svg>
        <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-700">${recurPct}%</div>
      </div>
      <div class="text-xs space-y-1.5">
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0"></span> Recurring: <strong class="text-amber-700">${d.recurring}</strong></div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0"></span> Non-recurring: <strong class="text-slate-600">${d.non_recurring}</strong></div>
        <div class="text-[10px] text-slate-400 italic">Recurring = same category, ≥2 violations in 90-day window</div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// QUICK CREATE CORRECTIVE ACTION PANEL
// ─────────────────────────────────────────────

function renderCreateCAPanel() {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="font-bold text-sm text-slate-800">⚡ Create Corrective Action</div>
        <span class="text-[10px] text-slate-400">Records are persisted in the database</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="space-y-2">
          <input type="text" id="quickCATitle" placeholder="Issue title (required)"
            class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500">
          <textarea id="quickCADesc" rows="2" placeholder="Description"
            class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"></textarea>
        </div>
        <div class="space-y-2">
          <textarea id="quickCAAction" rows="2" placeholder="Required action (required)"
            class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"></textarea>
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-600 whitespace-nowrap">Due in (days):</label>
            <input type="number" id="quickCADays" value="7" min="1" max="90"
              class="w-20 text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500">
            <button onclick="submitQuickCA()" class="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition">
              Create Action
            </button>
          </div>
        </div>
      </div>
      <div id="quickCAFeedback" class="hidden mt-2 text-xs font-semibold"></div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// INTEGRATION ROADMAP
// ─────────────────────────────────────────────

function renderIntegrationRoadmap() {
  const dormant = riskState.overview?.dormant_rules || [];
  const depMap = {
    "dormant_pending_ch1": { label: "CH1 · Temperature Monitoring", color: "bg-blue-100 text-blue-800 border-blue-200" },
    "dormant_pending_ch2": { label: "CH2 · Sales Forecasting",      color: "bg-purple-100 text-purple-800 border-purple-200" },
    "dormant_pending_ch3": { label: "CH3 · Conflict Detection",      color: "bg-orange-100 text-orange-800 border-orange-200" },
  };

  return `
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-base">🔗</span>
        <div class="font-bold text-sm text-slate-800">Integration Roadmap — Dormant Rules Awaiting Other Challenges</div>
      </div>
      <p class="text-xs text-slate-500 mb-3">The following rules are documented, tested, and ready to activate. They require data models from teammate challenges to be merged into the shared database.</p>
      <div class="space-y-2">
        ${dormant.map(r => {
          const dep = depMap[r.status] || { label: r.status, color: "bg-slate-100 text-slate-600 border-slate-200" };
          return `
            <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span class="text-[10px] px-2 py-0.5 rounded-full border font-bold ${dep.color} flex-shrink-0 mt-0.5">${dep.label}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-slate-800">${r.rule_id}</div>
                <div class="text-xs text-slate-600">${r.description}</div>
                <div class="text-[10px] text-slate-400 mt-0.5 italic">Dependency: ${r.depends_on}</div>
              </div>
            </div>
          `;
        }).join("")}
        ${dormant.length === 0 ? `<div class="text-xs text-slate-400 text-center py-3">Dormant rules will appear here when backend is connected.</div>` : ""}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// SUBMIT CORRECTIVE ACTIONS
// ─────────────────────────────────────────────

async function submitCAFromFinding() {
  const title  = document.getElementById("caTitle")?.value?.trim();
  const desc   = document.getElementById("caDesc")?.value?.trim();
  const action = document.getElementById("caAction")?.value?.trim();
  const days   = parseInt(document.getElementById("caDays")?.value || "7");
  const fb     = document.getElementById("caFeedback");

  if (!title || !action) {
    fb.textContent = "Issue title and required action are mandatory.";
    fb.className = "text-xs font-semibold text-rose-600 mt-2";
    fb.classList.remove("hidden");
    return;
  }

  if (riskState.isDemo) {
    fb.textContent = "✅ [DEMO MODE] Corrective action recorded (not persisted — backend is offline).";
    fb.className = "text-xs font-semibold text-amber-700 mt-2";
    fb.classList.remove("hidden");
    return;
  }

  fb.textContent = "Saving…";
  fb.className = "text-xs font-semibold text-slate-500 mt-2";
  fb.classList.remove("hidden");

  try {
    const form = new FormData();
    form.append("issue_title", title);
    form.append("issue_description", desc || title);
    form.append("required_action", action);
    form.append("deadline_days", days);
    const currentUser = riskCurrentUser();
    if (currentUser?.restaurant_id) form.append("restaurant_id", currentUser.restaurant_id);
    const result = await riskFormFetch("/api/risk/corrective-action", form, "POST");
    fb.textContent = `✅ Corrective action #${result.id} created. Deadline: ${result.deadline}. Persisted in database.`;
    fb.className = "text-xs font-semibold text-green-700 mt-2";
    if (typeof showToast === "function") showToast("Corrective action created", "success");
    setTimeout(() => { loadAndRefreshRisk(); }, 2000);
  } catch (err) {
    fb.textContent = `❌ Error: ${err.message}`;
    fb.className = "text-xs font-semibold text-rose-600 mt-2";
  }
}

async function submitQuickCA() {
  const title  = document.getElementById("quickCATitle")?.value?.trim();
  const desc   = document.getElementById("quickCADesc")?.value?.trim();
  const action = document.getElementById("quickCAAction")?.value?.trim();
  const days   = parseInt(document.getElementById("quickCADays")?.value || "7");
  const fb     = document.getElementById("quickCAFeedback");

  if (!title || !action) {
    fb.textContent = "Issue title and required action are mandatory.";
    fb.className = "text-xs font-semibold text-rose-600";
    fb.classList.remove("hidden");
    return;
  }

  if (riskState.isDemo) {
    fb.textContent = "✅ [DEMO MODE] Corrective action noted (not persisted — backend is offline).";
    fb.className = "text-xs font-semibold text-amber-700";
    fb.classList.remove("hidden");
    return;
  }

  fb.textContent = "Saving…";
  fb.className = "text-xs font-semibold text-slate-500";
  fb.classList.remove("hidden");

  try {
    const form = new FormData();
    form.append("issue_title", title);
    form.append("issue_description", desc || title);
    form.append("required_action", action);
    form.append("deadline_days", days);
    const currentUser = riskCurrentUser();
    if (currentUser?.restaurant_id) form.append("restaurant_id", currentUser.restaurant_id);
    const result = await riskFormFetch("/api/risk/corrective-action", form, "POST");
    fb.textContent = `✅ Action #${result.id} created. Due: ${result.deadline}`;
    fb.className = "text-xs font-semibold text-green-700";
    document.getElementById("quickCATitle").value = "";
    document.getElementById("quickCADesc").value = "";
    document.getElementById("quickCAAction").value = "";
    if (typeof showToast === "function") showToast("Corrective action created successfully", "success");
    setTimeout(() => { loadAndRefreshRisk(); }, 2000);
  } catch (err) {
    fb.textContent = `❌ ${err.message}`;
    fb.className = "text-xs font-semibold text-rose-600";
  }
}

// ─────────────────────────────────────────────
// REFRESH
// ─────────────────────────────────────────────

async function loadAndRefreshRisk() {
  await loadRiskData();
  renderRiskRoot();
}
