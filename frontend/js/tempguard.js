/**
 * FoodShield TempGuard — Production-Quality Client Engine
 * Intelligent Cold-Chain Monitoring, Drift Early Warning, and Safety Classification.
 */

const TempGuard = {
  // Support both development ports (8080 and 8000) and relative paths
  apiBase: 'http://127.0.0.1:8080/api/temperature',
  candidateBases: [
    'http://127.0.0.1:8080/api/temperature',
    'http://127.0.0.1:8000/api/temperature',
    '/api/temperature'
  ],
  units: [],
  alerts: [],
  selectedUnitId: null,
  isAutoSimulating: false,
  autoSimInterval: null,
  activeScenario: null, // null = live monitoring, or 'A_NORMAL', 'B_DRIFT_WARNING', etc.
  activeFilter: 'all',
  lastRefreshTime: null,
  isRefreshing: false,
  lastError: null,

  // Initialize and load data
  async init(container) {
    await this.discoverBackendAndFetch();
    this.render(container);
  },

  // Discover whether backend is running on 8080 or 8000
  async discoverBackendAndFetch() {
    this.isRefreshing = true;
    this.lastError = null;

    // Check custom override if set
    if (window.FOODSHIELD_API_BASE) {
      this.candidateBases = [window.FOODSHIELD_API_BASE, ...this.candidateBases];
    }

    let connected = false;
    for (const base of this.candidateBases) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`${base}/status`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          this.units = await res.json();
          this.apiBase = base;
          this.lastRefreshTime = new Date();
          connected = true;
          break;
        }
      } catch (e) {
        // Continue to next candidate
      }
    }

    this.isRefreshing = false;

    if (!connected) {
      if (!this.units || this.units.length === 0) {
        this.units = this.getDefaultUnits();
      }
      this.lastRefreshTime = new Date();
      this.lastError = "Backend unreachable at 127.0.0.1:8080 / 8000. Running in simulated fallback mode.";
    }
  },

  async fetchData() {
    this.isRefreshing = true;
    this.lastError = null;
    try {
      const res = await fetch(`${this.apiBase}/status`);
      if (res.ok) {
        this.units = await res.json();
        this.lastRefreshTime = new Date();
        this.isRefreshing = false;
        return;
      } else {
        this.lastError = `Server returned status ${res.status}`;
      }
    } catch (e) {
      this.lastError = "Unable to connect to backend server.";
    }
    this.isRefreshing = false;

    // Preserve existing units if fetch fails
    if (!this.units || this.units.length === 0) {
      this.units = this.getDefaultUnits();
      this.lastRefreshTime = new Date();
    }
  },

  getDefaultUnits() {
    const now = new Date();
    return [
      {
        id: 1,
        restaurant_id: 1,
        name: "Main Dairy & Pastry Chiller",
        category: "Dairy & Pastry Chiller (1-4°C)",
        description: "High-turnover milk, paneer, butter, and prepared dairy gravies.",
        sensor_id: "SEN-CHILL-01",
        sensor_source: "SIMULATED_IOT_PROBE",
        min_temp_celsius: 1.0,
        max_temp_celsius: 4.0,
        warning_low_celsius: 1.5,
        warning_high_celsius: 3.5,
        stale_threshold_minutes: 15,
        safety_status: "SAFE",
        classification_reason: "Temperature 2.3°C is within target operating range (1.0°C to 4.0°C).",
        reading_age_seconds: 5.0,
        is_stale: false,
        heartbeat_status: "CURRENT",
        latest_reading: {
          id: 101,
          temperature_celsius: 2.3,
          timestamp: now.toISOString(),
          sensor_id: "SEN-CHILL-01",
          sensor_source: "SIMULATED_IOT_PROBE",
          status: "SAFE",
          is_simulated: true,
          reading_age_seconds: 5.0,
          is_stale: false
        },
        drift_analysis: {
          has_drift: false,
          trend_direction: "stable",
          slope_celsius_per_minute: 0.003,
          volatility_sd: 0.12,
          estimated_breach_minutes: null,
          confidence: "High",
          assumptions: "Fluctuations are within normal thermostat cycling tolerances.",
          explanation: "Temperature trend is stable within normal limits (drift: +0.003°C/min)."
        },
        exposure_summary: {
          is_in_excursion: false,
          active_duration_minutes: 0.0,
          total_duration_today_minutes: 0.0,
          excursion_count_today: 0,
          current_excursion_start: null,
          peak_temp_celsius: null,
          requires_inspection: false
        },
        recent_sparkline: [2.1, 2.3, 2.4, 2.2, 2.3]
      },
      {
        id: 2,
        restaurant_id: 1,
        name: "Walk-in Deep Freezer A",
        category: "Walk-in Deep Freezer (-18°C)",
        description: "Long-term frozen meats, poultry, and blast-frozen stocks.",
        sensor_id: "SEN-FRZ-02",
        sensor_source: "BLE_COLD_BEACON",
        min_temp_celsius: -22.0,
        max_temp_celsius: -18.0,
        warning_low_celsius: -21.0,
        warning_high_celsius: -18.5,
        stale_threshold_minutes: 20,
        safety_status: "SAFE",
        classification_reason: "Temperature -19.6°C is within target operating range (-22.0°C to -18.0°C).",
        reading_age_seconds: 5.0,
        is_stale: false,
        heartbeat_status: "CURRENT",
        latest_reading: {
          id: 102,
          temperature_celsius: -19.6,
          timestamp: now.toISOString(),
          sensor_id: "SEN-FRZ-02",
          sensor_source: "BLE_COLD_BEACON",
          status: "SAFE",
          is_simulated: true,
          reading_age_seconds: 5.0,
          is_stale: false
        },
        drift_analysis: {
          has_drift: false,
          trend_direction: "stable",
          slope_celsius_per_minute: -0.002,
          volatility_sd: 0.18,
          estimated_breach_minutes: null,
          confidence: "High",
          assumptions: "Normal compressor freezing cycle.",
          explanation: "Temperature trend is stable within deep-freeze limits."
        },
        exposure_summary: {
          is_in_excursion: false,
          active_duration_minutes: 0.0,
          total_duration_today_minutes: 0.0,
          excursion_count_today: 0,
          current_excursion_start: null,
          peak_temp_celsius: null,
          requires_inspection: false
        },
        recent_sparkline: [-19.8, -19.7, -19.5, -19.6, -19.8, -19.6]
      },
      {
        id: 3,
        restaurant_id: 1,
        name: "Raw Butchery Cold Locker",
        category: "Raw Meat & Seafood Chiller (-1 to 2°C)",
        description: "Dedicated hygienic cold locker for daily fresh raw butchery.",
        sensor_id: "SEN-MEAT-03",
        sensor_source: "SIMULATED_IOT_PROBE",
        min_temp_celsius: -1.0,
        max_temp_celsius: 2.0,
        warning_low_celsius: -0.5,
        warning_high_celsius: 1.5,
        stale_threshold_minutes: 15,
        safety_status: "SAFE",
        classification_reason: "Temperature 0.8°C is within target operating range (-1.0°C to 2.0°C).",
        reading_age_seconds: 5.0,
        is_stale: false,
        heartbeat_status: "CURRENT",
        latest_reading: {
          id: 103,
          temperature_celsius: 0.8,
          timestamp: now.toISOString(),
          sensor_id: "SEN-MEAT-03",
          sensor_source: "SIMULATED_IOT_PROBE",
          status: "SAFE",
          is_simulated: true,
          reading_age_seconds: 5.0,
          is_stale: false
        },
        drift_analysis: {
          has_drift: false,
          trend_direction: "stable",
          slope_celsius_per_minute: 0.001,
          volatility_sd: 0.09,
          estimated_breach_minutes: null,
          confidence: "High",
          assumptions: "Butchery chill preserved.",
          explanation: "Temperature trend is stable within hygienic butchery limits."
        },
        exposure_summary: {
          is_in_excursion: false,
          active_duration_minutes: 0.0,
          total_duration_today_minutes: 0.0,
          excursion_count_today: 0,
          current_excursion_start: null,
          peak_temp_celsius: null,
          requires_inspection: false
        },
        recent_sparkline: [0.7, 0.8, 0.9, 0.8, 0.7, 0.8]
      },
      {
        id: 4,
        restaurant_id: 1,
        name: "Fresh Produce & Prep Walk-in",
        category: "Produce Cold Room (3-7°C)",
        description: "Fresh culinary greens, herbs, salads, and prepped vegetables.",
        sensor_id: "SEN-VEG-04",
        sensor_source: "SIMULATED_IOT_PROBE",
        min_temp_celsius: 3.0,
        max_temp_celsius: 7.0,
        warning_low_celsius: 3.5,
        warning_high_celsius: 6.5,
        stale_threshold_minutes: 15,
        safety_status: "SAFE",
        classification_reason: "Temperature 4.8°C is within target operating range (3.0°C to 7.0°C).",
        reading_age_seconds: 5.0,
        is_stale: false,
        heartbeat_status: "CURRENT",
        latest_reading: {
          id: 104,
          temperature_celsius: 4.8,
          timestamp: now.toISOString(),
          sensor_id: "SEN-VEG-04",
          sensor_source: "SIMULATED_IOT_PROBE",
          status: "SAFE",
          is_simulated: true,
          reading_age_seconds: 5.0,
          is_stale: false
        },
        drift_analysis: {
          has_drift: false,
          trend_direction: "stable",
          slope_celsius_per_minute: 0.004,
          volatility_sd: 0.15,
          estimated_breach_minutes: null,
          confidence: "High",
          assumptions: "Stable produce cooling.",
          explanation: "Temperature trend is stable within produce limits."
        },
        exposure_summary: {
          is_in_excursion: false,
          active_duration_minutes: 0.0,
          total_duration_today_minutes: 0.0,
          excursion_count_today: 0,
          current_excursion_start: null,
          peak_temp_celsius: null,
          requires_inspection: false
        },
        recent_sparkline: [4.6, 4.8, 4.9, 4.7, 4.8]
      },
      {
        id: 5,
        restaurant_id: 1,
        name: "Banquet Hot Holding Display",
        category: "Hot Holding Station (>63°C)",
        description: "Insulated temperature-regulated station for hot cooked curries.",
        sensor_id: "SEN-HOT-05",
        sensor_source: "SIMULATED_IOT_PROBE",
        min_temp_celsius: 63.0,
        max_temp_celsius: 80.0,
        warning_low_celsius: 65.0,
        warning_high_celsius: 78.0,
        stale_threshold_minutes: 15,
        safety_status: "SAFE",
        classification_reason: "Temperature 71.5°C is within target operating range (63.0°C to 80.0°C).",
        reading_age_seconds: 5.0,
        is_stale: false,
        heartbeat_status: "CURRENT",
        latest_reading: {
          id: 105,
          temperature_celsius: 71.5,
          timestamp: now.toISOString(),
          sensor_id: "SEN-HOT-05",
          sensor_source: "SIMULATED_IOT_PROBE",
          status: "SAFE",
          is_simulated: true,
          reading_age_seconds: 5.0,
          is_stale: false
        },
        drift_analysis: {
          has_drift: false,
          trend_direction: "stable",
          slope_celsius_per_minute: 0.001,
          volatility_sd: 0.15,
          estimated_breach_minutes: null,
          confidence: "High",
          assumptions: "Thermal hot holding active.",
          explanation: "Temperature trend is stable above statutory hot holding threshold (63°C)."
        },
        exposure_summary: {
          is_in_excursion: false,
          active_duration_minutes: 0.0,
          total_duration_today_minutes: 0.0,
          excursion_count_today: 0,
          current_excursion_start: null,
          peak_temp_celsius: null,
          requires_inspection: false
        },
        recent_sparkline: [71.2, 71.4, 71.6, 71.5, 71.5]
      }
    ];
  },

  render(container) {
    // Dynamic counts from current storage-unit dataset
    const counts = {
      safe: this.units.filter(u => u.safety_status === 'SAFE').length,
      warning: this.units.filter(u => u.safety_status === 'WARNING').length,
      critical: this.units.filter(u => u.safety_status === 'CRITICAL').length,
      unknown: this.units.filter(u => u.safety_status === 'UNKNOWN').length,
      total: this.units.length
    };

    // Filter units
    const filteredUnits = this.units.filter(u => {
      if (this.activeFilter === 'all') return true;
      return u.safety_status.toLowerCase() === this.activeFilter.toLowerCase();
    });

    // Priority Attention Items (Critical first, then Warning, then Unknown/Stale)
    const priorityItems = [...this.units]
      .filter(u => u.safety_status !== 'SAFE')
      .sort((a, b) => {
        const order = { 'CRITICAL': 1, 'WARNING': 2, 'UNKNOWN': 3 };
        return (order[a.safety_status] || 4) - (order[b.safety_status] || 4);
      });

    // Format last updated string
    const updatedTimeStr = this.lastRefreshTime
      ? this.lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Not yet updated';

    container.innerHTML = `
      <div class="space-y-6">

        <!-- ============================================== -->
        <!-- A. COMPACT PAGE HEADER                          -->
        <!-- ============================================== -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="text-[11px] font-semibold text-teal-700 tracking-wider uppercase flex items-center gap-1.5 mb-1">
              <span>FoodShield</span>
              <span class="text-slate-300">/</span>
              <span>TempGuard</span>
              ${this.activeScenario ? `
                <span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 rounded-full font-bold ml-2">
                  Demo Mode: ${this.getScenarioLabel(this.activeScenario)}
                </span>
              ` : ''}
            </div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Temperature Monitoring</h1>
            <p class="text-xs text-slate-500 mt-0.5">Monitor cold-chain conditions and respond to food-safety risks.</p>
          </div>

          <!-- Controls: Last refresh & Action buttons -->
          <div class="flex items-center flex-wrap gap-2.5">
            <div class="text-right mr-1 hidden md:block">
              <div class="text-[11px] font-medium text-slate-600">Dashboard Refreshed</div>
              <div class="text-[10px] text-slate-400 font-mono">${updatedTimeStr}</div>
            </div>

            <!-- Refresh Button with loading state -->
            <button onclick="TempGuard.refresh()" ${this.isRefreshing ? 'disabled' : ''} class="py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-60">
              <svg class="w-3.5 h-3.5 ${this.isRefreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>${this.isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <!-- Live Streaming Toggle -->
            <button onclick="TempGuard.toggleAutoSimulation()" class="py-2 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              this.isAutoSimulating
                ? 'bg-teal-50 border-teal-200 text-teal-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }">
              <span class="w-2 h-2 rounded-full ${this.isAutoSimulating ? 'bg-teal-600 animate-pulse' : 'bg-slate-400'}"></span>
              <span>${this.isAutoSimulating ? 'Telemetry: Active (5s)' : 'Simulate Stream'}</span>
            </button>

            <!-- Integration Contract Button -->
            <button onclick="TempGuard.viewIntegrationContract()" class="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition flex items-center gap-1.5" title="View Shared Integration Contract JSON">
              <svg class="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>API Contract</span>
            </button>
          </div>
        </div>

        ${this.lastError ? `
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span>⚠️</span>
              <span>${this.lastError}</span>
            </div>
            <button onclick="TempGuard.refresh()" class="font-bold underline text-amber-900 ml-3">Retry</button>
          </div>
        ` : ''}

        <!-- ============================================== -->
        <!-- B. OVERALL SAFETY SUMMARY                       -->
        <!-- ============================================== -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <!-- Safe Units -->
          <div onclick="TempGuard.setFilter('safe')" class="cursor-pointer bg-white rounded-2xl p-4 border transition ${
            this.activeFilter === 'safe' ? 'border-teal-600 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-slate-300'
          } shadow-sm">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Safe Units</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div class="text-2xl font-bold text-slate-900">${counts.safe} <span class="text-xs font-normal text-slate-400">/ ${counts.total}</span></div>
            <p class="text-[11px] text-emerald-700 font-medium mt-1">Within target limits</p>
          </div>

          <!-- Warning Units -->
          <div onclick="TempGuard.setFilter('warning')" class="cursor-pointer bg-white rounded-2xl p-4 border transition ${
            this.activeFilter === 'warning' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'
          } shadow-sm">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Warning Units</span>
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div class="text-2xl font-bold text-slate-900">${counts.warning}</div>
            <p class="text-[11px] text-amber-700 font-medium mt-1">Approaching limits or drift</p>
          </div>

          <!-- Critical Units -->
          <div onclick="TempGuard.setFilter('critical')" class="cursor-pointer bg-white rounded-2xl p-4 border transition ${
            this.activeFilter === 'critical' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-slate-300'
          } shadow-sm">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Critical Units</span>
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div class="text-2xl font-bold text-slate-900">${counts.critical}</div>
            <p class="text-[11px] text-rose-700 font-medium mt-1">${counts.critical > 0 ? 'Requires immediate check' : 'No active excursions'}</p>
          </div>

          <!-- Unknown / Stale -->
          <div onclick="TempGuard.setFilter('unknown')" class="cursor-pointer bg-white rounded-2xl p-4 border transition ${
            this.activeFilter === 'unknown' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-200 hover:border-slate-300'
          } shadow-sm">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Sensor Stale</span>
              <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div class="text-2xl font-bold text-slate-900">${counts.unknown}</div>
            <p class="text-[11px] text-slate-600 font-medium mt-1">${counts.unknown > 0 ? 'Telemetry interrupted' : 'All probes reporting'}</p>
          </div>
        </div>

        <!-- Filter Reset link if filtered -->
        ${this.activeFilter !== 'all' ? `
          <div class="flex items-center justify-between bg-slate-100 px-4 py-2 rounded-xl text-xs">
            <span class="text-slate-600">Showing <strong>${this.activeFilter.toUpperCase()}</strong> storage units only</span>
            <button onclick="TempGuard.setFilter('all')" class="text-teal-700 font-bold hover:underline">Show All (${counts.total})</button>
          </div>
        ` : ''}

        <!-- ============================================== -->
        <!-- C. PRIORITY ATTENTION PANEL                     -->
        <!-- ============================================== -->
        ${priorityItems.length > 0 ? `
          <div class="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <h2 class="text-sm font-bold text-slate-900">Needs Attention (${priorityItems.length})</h2>
              </div>
              <span class="text-[11px] text-slate-500 font-medium">Sorted by severity</span>
            </div>

            <div class="space-y-3">
              ${priorityItems.map(item => this.renderPriorityItem(item)).join('')}
            </div>
          </div>
        ` : `
          <!-- Reassuring Empty State -->
          <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              ✓
            </div>
            <div>
              <div class="text-xs font-bold text-slate-800">All storage units are operating within safe temperature limits.</div>
              <div class="text-[11px] text-slate-500">Continuous drift analysis and heartbeat monitoring active across 5 units.</div>
            </div>
          </div>
        `}

        <!-- ============================================== -->
        <!-- DEMONSTRATION MODE (COMPACT & SEPARATED)       -->
        <!-- ============================================== -->
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200/80">
            <div>
              <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Demonstration Scenarios</span>
                <span class="text-[10px] text-slate-500 font-normal">• Targets Main Dairy & Pastry Chiller</span>
              </div>
              <p class="text-[11px] text-slate-500">Test safety transitions, drift warnings, and exposure tracking deterministically.</p>
            </div>
            ${this.activeScenario ? `
              <button onclick="TempGuard.resetDemo()" class="text-[11px] text-teal-700 font-semibold hover:underline self-start sm:self-auto">
                Reset to Live Monitoring
              </button>
            ` : ''}
          </div>

          <!-- Compact Segmented Buttons -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button onclick="TempGuard.triggerScenario('A_NORMAL')" class="py-2 px-3 rounded-xl border text-left text-xs transition ${
              this.activeScenario === 'A_NORMAL'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold ring-1 ring-emerald-500'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }">
              <div class="font-semibold text-[11px] text-emerald-800">A: Normal Safe</div>
              <div class="text-[10px] text-slate-500 truncate">2.3°C stable in range</div>
            </button>

            <button onclick="TempGuard.triggerScenario('B_DRIFT_WARNING')" class="py-2 px-3 rounded-xl border text-left text-xs transition ${
              this.activeScenario === 'B_DRIFT_WARNING'
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-500'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }">
              <div class="font-semibold text-[11px] text-amber-800">B: Drift Warning</div>
              <div class="text-[10px] text-slate-500 truncate">+0.14°C/m rising drift</div>
            </button>

            <button onclick="TempGuard.triggerScenario('C_CRITICAL_BREACH')" class="py-2 px-3 rounded-xl border text-left text-xs transition ${
              this.activeScenario === 'C_CRITICAL_BREACH'
                ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold ring-1 ring-rose-500'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }">
              <div class="font-semibold text-[11px] text-rose-800">C: Critical Breach</div>
              <div class="text-[10px] text-slate-500 truncate">5.8°C over limit</div>
            </button>

            <button onclick="TempGuard.triggerScenario('D_SENSOR_FAILURE')" class="py-2 px-3 rounded-xl border text-left text-xs transition ${
              this.activeScenario === 'D_SENSOR_FAILURE'
                ? 'bg-slate-200 border-slate-400 text-slate-900 font-bold ring-1 ring-slate-500'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }">
              <div class="font-semibold text-[11px] text-slate-800">D: Sensor Stale</div>
              <div class="text-[10px] text-slate-500 truncate">&gt;45m heartbeat gap</div>
            </button>

            <button onclick="TempGuard.triggerScenario('E_RECOVERY')" class="py-2 px-3 rounded-xl border text-left text-xs transition ${
              this.activeScenario === 'E_RECOVERY'
                ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold ring-1 ring-teal-500'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }">
              <div class="font-semibold text-[11px] text-teal-800">E: Recovery</div>
              <div class="text-[10px] text-slate-500 truncate">Cooled to 2.3°C</div>
            </button>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- D. STORAGE UNITS LIST                           -->
        <!-- ============================================== -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-slate-900">Monitored Storage Units (${filteredUnits.length})</h2>
            <span class="text-xs text-slate-400">All temperatures displayed in Celsius (°C)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${filteredUnits.map(unit => this.renderUnitCard(unit)).join('')}
          </div>
        </div>

      </div>
    `;
  },

  renderPriorityItem(unit) {
    const status = unit.safety_status;
    const latest = unit.latest_reading || {};
    const exposure = unit.exposure_summary || {};
    const tempVal = latest.temperature_celsius;
    const isStale = status === 'UNKNOWN';

    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let badgeText = 'Sensor Not Reporting';
    let recommendedAction = 'Check sensor probe connection and inspect physical chamber temperature.';

    if (status === 'CRITICAL') {
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
      badgeText = 'Critical Risk';
      recommendedAction = 'Inspect storage unit immediately and follow restaurant food-safety corrective action procedure.';
    } else if (status === 'WARNING') {
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
      badgeText = 'Warning Margin';
      if (tempVal !== null && tempVal <= unit.warning_low_celsius) {
        recommendedAction = (unit.category && unit.category.includes('Hot'))
          ? 'Check heating element, food insulation, and ensure temperature stays safely above statutory 63°C limit.'
          : 'Check thermostat setpoint and prevent over-chilling below lower boundary.';
      } else {
        recommendedAction = 'Check unit door closure, seal integrity, and monitor for continued warming trend.';
      }
    }

    return `
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-bold text-xs text-slate-900">${unit.name}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}">${badgeText}</span>
            ${exposure.is_in_excursion ? `
              <span class="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                Active excursion: ${exposure.active_duration_minutes.toFixed(1)}m
              </span>
            ` : ''}
          </div>

          <div class="text-xs text-slate-700 mb-1">
            <strong>Observation:</strong> ${unit.classification_reason}
          </div>

          <div class="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 inline-block w-full">
            <strong class="text-slate-800">Recommended Action:</strong> ${recommendedAction}
          </div>
        </div>

        <div class="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
          <div class="text-right">
            <div class="text-lg font-black text-slate-900">
              ${isStale ? (tempVal !== null && tempVal !== undefined ? `${tempVal.toFixed(1)}°C <span class="text-[10px] font-normal text-slate-400 block">Last reading (stale)</span>` : 'Offline') : `${tempVal.toFixed(1)}°C`}
            </div>
            <div class="text-[10px] text-slate-400">Target: ${unit.min_temp_celsius}–${unit.max_temp_celsius}°C</div>
          </div>
          <button onclick="TempGuard.openDetailModal(${unit.id})" class="py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition">
            View Details
          </button>
        </div>
      </div>
    `;
  },

  renderUnitCard(unit) {
    const status = unit.safety_status;
    const latest = unit.latest_reading || {};
    const drift = unit.drift_analysis || {};
    const exposure = unit.exposure_summary || {};
    const tempVal = latest.temperature_celsius;
    const isStale = status === 'UNKNOWN';

    // Status badge styling
    let badgeHtml = '';
    let cardAccent = 'border-slate-200';
    let actionTip = '';

    if (status === 'SAFE') {
      badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Safe</span>';
    } else if (status === 'WARNING') {
      badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">⚠ Warning</span>';
      cardAccent = 'border-amber-300';
      actionTip = 'Action: Check door seal and monitor trend.';
    } else if (status === 'CRITICAL') {
      badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">✕ Critical</span>';
      cardAccent = 'border-rose-300';
      actionTip = 'Action: Inspect unit and follow food-safety protocol.';
    } else {
      badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">? Stale</span>';
      cardAccent = 'border-slate-300';
      actionTip = 'Action: Check sensor connection.';
    }

    // Sparkline SVG
    const sparklineSvg = this.generateSparklineSvg(unit.recent_sparkline || [], unit.min_temp_celsius, unit.max_temp_celsius);

    // Reading age
    const readingAgeStr = this.formatReadingAge(latest.timestamp, unit.reading_age_seconds);

    return `
      <div class="bg-white rounded-2xl p-4 border ${cardAccent} shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div>
          <!-- Header: Title and Status Badge -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 class="text-sm font-bold text-slate-900">${unit.name}</h3>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">
                ${unit.sensor_id} • ${unit.sensor_source === 'SIMULATED_IOT_PROBE' ? 'Simulated' : unit.sensor_source}
              </div>
            </div>
            ${badgeHtml}
          </div>

          <!-- Temperature Display & Operating Range -->
          <div class="bg-slate-50 rounded-xl p-3 mb-2.5 flex items-baseline justify-between">
            <div>
              <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                ${isStale ? 'Last Known Reading (Stale)' : 'Current Reading'}
              </div>
              <div class="flex items-baseline gap-1 mt-0.5">
                <span class="text-2xl font-black ${status === 'CRITICAL' ? 'text-rose-600' : 'text-slate-900'}">
                  ${tempVal !== null && tempVal !== undefined ? tempVal.toFixed(1) : 'Offline'}
                </span>
                ${tempVal !== null && tempVal !== undefined ? '<span class="text-xs font-bold text-slate-400">°C</span>' : ''}
              </div>
            </div>

            <div class="text-right">
              <div class="text-[10px] font-semibold text-slate-500">Target Range</div>
              <div class="text-xs font-bold text-slate-800">${unit.min_temp_celsius}–${unit.max_temp_celsius}°C</div>
              <div class="text-[10px] ${isStale ? 'text-amber-700 font-semibold' : 'text-slate-400'} mt-0.5">${isStale ? `⚠️ ${readingAgeStr}` : `Measured: ${readingAgeStr}`}</div>
            </div>
          </div>

          <!-- Understandable Classification Reason -->
          <div class="text-xs text-slate-700 leading-snug mb-2">
            ${unit.classification_reason}
          </div>

          <!-- Action tip when non-safe -->
          ${actionTip ? `
            <div class="text-[10px] text-slate-700 font-medium bg-slate-100 p-1.5 rounded-lg mb-2">
              ${actionTip}
            </div>
          ` : ''}

          <!-- Drift Indicator (only if active trend) -->
          ${drift.has_drift ? (() => {
            let iconLabel = '📈 Rising trend';
            let detail = drift.estimated_breach_minutes
              ? `Est. breach: ~${Math.round(drift.estimated_breach_minutes)}m`
              : (drift.slope_celsius_per_minute !== null && drift.slope_celsius_per_minute !== undefined
                  ? `${drift.slope_celsius_per_minute > 0 ? '+' : ''}${drift.slope_celsius_per_minute.toFixed(3)}°C/min`
                  : 'Active drift');

            if (drift.trend_direction === 'rising') {
              iconLabel = '📈 Rising trend';
              if (drift.estimated_breach_minutes) {
                detail = `Est. breach: ~${Math.round(drift.estimated_breach_minutes)}m`;
              } else if (drift.slope_celsius_per_minute) {
                detail = `+${drift.slope_celsius_per_minute.toFixed(3)}°C/min`;
              }
            } else if (drift.trend_direction === 'falling') {
              iconLabel = '📉 Falling trend';
              if (drift.estimated_breach_minutes) {
                detail = `Est. breach: ~${Math.round(drift.estimated_breach_minutes)}m`;
              } else if (drift.slope_celsius_per_minute) {
                detail = `${drift.slope_celsius_per_minute.toFixed(3)}°C/min`;
              }
            } else if (drift.trend_direction === 'abrupt_jump') {
              iconLabel = '⚡ Abrupt shift';
              detail = drift.explanation || 'Step change detected';
            } else if (drift.trend_direction === 'unstable_cycling') {
              iconLabel = '〰️ Fluctuating';
              detail = drift.volatility_sd ? `±${drift.volatility_sd}°C volatility` : 'High variance';
            }

            return `
              <div class="flex items-center justify-between text-[10px] bg-amber-50 text-amber-900 p-1.5 rounded-lg border border-amber-200 mb-2">
                <span class="font-semibold">${iconLabel}</span>
                <span class="truncate ml-2 text-right" title="${drift.explanation || ''}">${detail}</span>
              </div>
            `;
          })() : ''}

          <!-- Exposure indicator if active -->
          ${exposure.is_in_excursion ? `
            <div class="text-[10px] font-bold text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200 mb-2">
              ⚠️ Exposure: ${exposure.active_duration_minutes.toFixed(1)} mins outside safe limits
            </div>
          ` : ''}

          <!-- Sparkline -->
          <div class="py-1">
            <div class="text-[9px] text-slate-400 mb-0.5">Recent 5-Reading Trend</div>
            ${sparklineSvg}
          </div>
        </div>

        <!-- Footer Action -->
        <div class="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="TempGuard.openDetailModal(${unit.id})" class="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-semibold text-xs transition text-center">
            View Details
          </button>
          <button onclick="TempGuard.openConfigModal(${unit.id})" class="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs transition" title="Configure safety thresholds">
            ⚙️
          </button>
        </div>
      </div>
    `;
  },

  generateSparklineSvg(points, minLimit, maxLimit) {
    if (!points || points.length < 2) {
      return '<div class="text-[9px] text-slate-400 italic">Telemetry pending</div>';
    }

    const width = 200;
    const height = 24;
    const minVal = Math.min(...points, minLimit);
    const maxVal = Math.max(...points, maxLimit);
    const range = maxVal - minVal || 1;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * (width - 10) + 5;
      const y = height - ((val - minVal) / range) * (height - 8) - 4;
      return `${x},${y}`;
    });

    const pathD = `M ${coords.join(' L ')}`;

    return `
      <svg width="${width}" height="${height}" class="overflow-visible w-full">
        <path d="${pathD}" fill="none" stroke="#0d9488" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        ${points.map((val, idx) => {
          const [x, y] = coords[idx].split(',');
          const isBreached = val > maxLimit || val < minLimit;
          return `<circle cx="${x}" cy="${y}" r="2" fill="${isBreached ? '#e11d48' : '#0d9488'}" />`;
        }).join('')}
      </svg>
    `;
  },

  formatReadingAge(isoTimestamp, ageSeconds) {
    let diffSeconds = (ageSeconds !== undefined && ageSeconds !== null)
      ? Math.max(0, Math.round(ageSeconds))
      : null;

    if (diffSeconds === null) {
      if (!isoTimestamp) return 'No readings yet';
      const dateStr = (typeof isoTimestamp === 'string' && !isoTimestamp.endsWith('Z') && !isoTimestamp.includes('+'))
        ? isoTimestamp + 'Z'
        : isoTimestamp;
      diffSeconds = Math.max(0, Math.floor((new Date() - new Date(dateStr)) / 1000));
    }

    if (diffSeconds < 60) return 'Just now';
    const mins = Math.floor(diffSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  },

  setFilter(filter) {
    this.activeFilter = filter;
    const contentEl = document.getElementById("mainViewContent");
    if (contentEl) this.render(contentEl);
  },

  async refresh() {
    await this.fetchData();
    const contentEl = document.getElementById("mainViewContent");
    if (contentEl) this.render(contentEl);
    if (typeof showToast === 'function') {
      showToast("Temperature monitoring data refreshed", "success");
    }
  },

  async triggerScenario(scenario) {
    this.activeScenario = scenario;
    try {
      const res = await fetch(`${this.apiBase}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario })
      });
      if (res.ok) {
        const data = await res.json();
        await this.fetchData();
        const contentEl = document.getElementById("mainViewContent");
        if (contentEl) this.render(contentEl);
        if (typeof showToast === 'function') {
          showToast(`Scenario active: ${this.getScenarioLabel(scenario)}`, "info");
        }
        return;
      }
    } catch (e) {
      console.warn("Backend simulate endpoint not reachable, simulating locally", e);
    }

    // Local fallback
    this.simulateLocalScenario(scenario);
    const contentEl = document.getElementById("mainViewContent");
    if (contentEl) this.render(contentEl);
    if (typeof showToast === 'function') {
      showToast(`Demo scenario: ${this.getScenarioLabel(scenario)}`, "info");
    }
  },

  resetDemo() {
    this.activeScenario = null;
    this.triggerScenario('A_NORMAL');
  },

  getScenarioLabel(scenarioKey) {
    const map = {
      'A_NORMAL': 'Normal Safe',
      'B_DRIFT_WARNING': 'Drift Warning',
      'C_CRITICAL_BREACH': 'Critical Breach',
      'D_SENSOR_FAILURE': 'Sensor Stale',
      'E_RECOVERY': 'Recovery'
    };
    return map[scenarioKey] || scenarioKey;
  },

  simulateLocalScenario(scenario) {
    const unit1 = this.units[0];
    if (!unit1) return;
    const now = new Date();

    if (scenario === 'A_NORMAL') {
      unit1.safety_status = 'SAFE';
      unit1.reading_age_seconds = 2.0;
      unit1.is_stale = false;
      unit1.heartbeat_status = 'CURRENT';
      unit1.latest_reading.temperature_celsius = 2.3;
      unit1.latest_reading.timestamp = now.toISOString();
      unit1.latest_reading.is_stale = false;
      unit1.latest_reading.reading_age_seconds = 2.0;
      unit1.classification_reason = "Temperature 2.3°C is within target operating range (1.0°C to 4.0°C).";
      unit1.drift_analysis = {
        has_drift: false,
        trend_direction: "stable",
        slope_celsius_per_minute: 0.003,
        explanation: "Temperature trend is stable within normal limits (drift: +0.003°C/min)."
      };
      unit1.exposure_summary.is_in_excursion = false;
      unit1.exposure_summary.active_duration_minutes = 0.0;
      unit1.recent_sparkline = [2.1, 2.3, 2.4, 2.2, 2.3];
    } else if (scenario === 'B_DRIFT_WARNING') {
      unit1.safety_status = 'WARNING';
      unit1.reading_age_seconds = 2.0;
      unit1.is_stale = false;
      unit1.heartbeat_status = 'CURRENT';
      unit1.latest_reading.temperature_celsius = 3.8;
      unit1.latest_reading.timestamp = now.toISOString();
      unit1.latest_reading.is_stale = false;
      unit1.latest_reading.reading_age_seconds = 2.0;
      unit1.classification_reason = "High temperature warning: 3.8°C approaches upper limit (4.0°C). Remaining buffer: 0.2°C.";
      unit1.drift_analysis = {
        has_drift: true,
        trend_direction: "rising",
        slope_celsius_per_minute: 0.14,
        estimated_breach_minutes: 8.0,
        assumptions: "Linear trajectory based on observed +0.14°C/min rise over last 5 readings.",
        explanation: "Temperature is steadily rising (+0.140°C/min). Estimated time to breach upper limit (4.0°C): ~8 minutes."
      };
      unit1.recent_sparkline = [2.4, 2.8, 3.1, 3.5, 3.8];
    } else if (scenario === 'C_CRITICAL_BREACH') {
      unit1.safety_status = 'CRITICAL';
      unit1.reading_age_seconds = 2.0;
      unit1.is_stale = false;
      unit1.heartbeat_status = 'CURRENT';
      unit1.latest_reading.temperature_celsius = 5.8;
      unit1.latest_reading.timestamp = now.toISOString();
      unit1.latest_reading.is_stale = false;
      unit1.latest_reading.reading_age_seconds = 2.0;
      unit1.classification_reason = "Critical high temperature violation: 5.8°C exceeds safe upper limit (4.0°C) by +1.8°C.";
      unit1.exposure_summary.is_in_excursion = true;
      unit1.exposure_summary.active_duration_minutes = 18.5;
      unit1.exposure_summary.total_duration_today_minutes = 18.5;
      unit1.exposure_summary.excursion_count_today = 1;
      unit1.recent_sparkline = [3.6, 4.1, 4.8, 5.4, 5.8];
    } else if (scenario === 'D_SENSOR_FAILURE') {
      unit1.safety_status = 'UNKNOWN';
      unit1.reading_age_seconds = 46 * 60;
      unit1.is_stale = true;
      unit1.heartbeat_status = 'STALE';
      unit1.latest_reading.timestamp = new Date(Date.now() - 46 * 60 * 1000).toISOString();
      unit1.latest_reading.is_stale = true;
      unit1.latest_reading.reading_age_seconds = 46 * 60;
      unit1.classification_reason = "Sensor heartbeat stale: last reading received 46 mins ago (configured threshold is 15m). Current safety cannot be confirmed.";
      unit1.drift_analysis.explanation = "Telemetry connection interrupted.";
    } else if (scenario === 'E_RECOVERY') {
      unit1.safety_status = 'SAFE';
      unit1.reading_age_seconds = 2.0;
      unit1.is_stale = false;
      unit1.heartbeat_status = 'CURRENT';
      unit1.latest_reading.temperature_celsius = 2.3;
      unit1.latest_reading.timestamp = now.toISOString();
      unit1.latest_reading.is_stale = false;
      unit1.latest_reading.reading_age_seconds = 2.0;
      unit1.classification_reason = "Temperature 2.3°C is within target operating range (1.0°C to 4.0°C).";
      unit1.exposure_summary.is_in_excursion = false;
      unit1.exposure_summary.active_duration_minutes = 0.0;
      unit1.exposure_summary.total_duration_today_minutes = 22.0;
      unit1.recent_sparkline = [4.8, 4.0, 3.4, 2.8, 2.3];
    }
  },

  toggleAutoSimulation() {
    this.isAutoSimulating = !this.isAutoSimulating;
    if (this.isAutoSimulating) {
      this.autoSimInterval = setInterval(async () => {
        const unit = this.units[0];
        if (unit && unit.latest_reading && unit.latest_reading.temperature_celsius !== null) {
          const delta = (Math.random() - 0.48) * 0.15;
          const newTemp = Math.round((unit.latest_reading.temperature_celsius + delta) * 10) / 10;
          try {
            await fetch(`${this.apiBase}/readings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ unit_id: unit.id, temperature_celsius: newTemp })
            });
            await this.fetchData();
          } catch (e) {
            unit.latest_reading.temperature_celsius = newTemp;
            unit.recent_sparkline.push(newTemp);
            if (unit.recent_sparkline.length > 5) unit.recent_sparkline.shift();
          }
          const contentEl = document.getElementById("mainViewContent");
          if (contentEl) this.render(contentEl);
        }
      }, 5000);
      if (typeof showToast === 'function') {
        showToast("Live telemetry streaming active (5s interval)", "info");
      }
    } else {
      if (this.autoSimInterval) clearInterval(this.autoSimInterval);
      if (typeof showToast === 'function') {
        showToast("Live telemetry streaming paused", "info");
      }
    }
    const contentEl = document.getElementById("mainViewContent");
    if (contentEl) this.render(contentEl);
  },

  closeModal() {
    if (this._onModalKeydown) {
      document.removeEventListener('keydown', this._onModalKeydown);
      this._onModalKeydown = null;
    }
    if (this._onBackdropClick && this._modalBackdropEl) {
      this._modalBackdropEl.removeEventListener('click', this._onBackdropClick);
      this._onBackdropClick = null;
      this._modalBackdropEl = null;
    }
    if (typeof closeActionModal === 'function') {
      closeActionModal();
    } else {
      const modal = document.getElementById("actionModal");
      if (modal) modal.classList.add("hidden");
    }
  },

  async openDetailModal(unitId) {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit) return;

    let historyReadings = [];
    try {
      const res = await fetch(`${this.apiBase}/units/${unitId}/history?limit=25`);
      if (res.ok) {
        historyReadings = await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch remote history", e);
    }

    if (historyReadings.length === 0) {
      historyReadings = (unit.recent_sparkline || []).map((t, idx) => ({
        id: idx + 1,
        temperature_celsius: t,
        timestamp: new Date(Date.now() - (unit.recent_sparkline.length - idx) * 30 * 60 * 1000).toISOString(),
        status: t > unit.max_temp_celsius || t < unit.min_temp_celsius ? 'CRITICAL' : 'SAFE',
        classification_reason: "Recorded telemetry reading",
        sensor_id: unit.sensor_id,
        sensor_source: unit.sensor_source
      }));
    }

    const modalTitle = document.getElementById("actionModalTitle");
    const modalContent = document.getElementById("actionModalContent");
    const modalContainer = document.getElementById("actionModal");

    if (modalTitle) {
      modalTitle.innerHTML = `
        <div class="flex items-center gap-2">
          <span>${unit.name}</span>
          <span class="text-xs text-slate-400 font-normal">(${unit.category})</span>
        </div>
      `;

      // Clearly visible close button (×) in top-right corner of the modal header
      const headerEl = modalTitle.parentElement;
      if (headerEl) {
        let closeBtn = headerEl.querySelector('button[aria-label="Close details"]') || headerEl.querySelector('button');
        if (!closeBtn) {
          closeBtn = document.createElement('button');
          headerEl.appendChild(closeBtn);
        }
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close details');
        closeBtn.setAttribute('title', 'Close details');
        closeBtn.className = 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg text-xl font-bold leading-none transition flex items-center justify-center w-8 h-8 flex-shrink-0';
        closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
        closeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          TempGuard.closeModal();
        };
      }
    }

    const chartSvg = this.generateDetailedChartSvg(historyReadings, unit);

    if (modalContent) {
      modalContent.innerHTML = `
        <div class="space-y-4 text-xs">

          <!-- Key Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <div class="text-[10px] text-slate-500">Current Reading</div>
              <div class="font-bold text-sm text-slate-900">${unit.latest_reading?.temperature_celsius?.toFixed(1) ?? 'Offline'} °C</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500">Target Range</div>
              <div class="font-bold text-sm text-slate-800">${unit.min_temp_celsius}–${unit.max_temp_celsius}°C</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500">Warning Margins</div>
              <div class="font-bold text-sm text-amber-700">${unit.warning_low_celsius}°C / ${unit.warning_high_celsius}°C</div>
            </div>
            <div>
              <div class="text-[10px] text-slate-500">Sensor Timeout</div>
              <div class="font-bold text-sm text-slate-700">${unit.stale_threshold_minutes || 15} mins</div>
            </div>
          </div>

          <!-- Accessible SVG Chart -->
          <div>
            <div class="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
              <span>Temperature Trend & Safety Boundaries</span>
              <span class="text-[10px] text-slate-400 font-normal">Red: Limits • Amber: Warning • Green: Target Band</span>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto">
              ${chartSvg}
            </div>
          </div>

          <!-- Drift Analysis & Exposure -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div class="font-bold text-slate-800 text-[11px] mb-1">Temperature Drift Analysis</div>
              <div class="text-[11px] text-slate-700 leading-snug">${unit.drift_analysis?.explanation || 'Stable'}</div>
              ${unit.drift_analysis?.estimated_breach_minutes ? `
                <div class="mt-2 text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 font-semibold">
                  Est. time to boundary breach: ~${Math.round(unit.drift_analysis.estimated_breach_minutes)} minutes
                </div>
              ` : ''}
              ${unit.drift_analysis?.assumptions ? `
                <div class="mt-1 text-[9px] text-slate-500 italic">${unit.drift_analysis.assumptions}</div>
              ` : ''}
            </div>

            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div class="font-bold text-slate-800 text-[11px] mb-1">Exposure Tracking</div>
              <div class="text-[11px] text-slate-700 space-y-1">
                <div>Active excursion: <strong>${unit.exposure_summary?.active_duration_minutes > 0 ? `${unit.exposure_summary.active_duration_minutes.toFixed(1)} mins` : 'None (Safe)'}</strong></div>
                <div>Total duration today: <strong>${unit.exposure_summary?.total_duration_today_minutes > 0 ? `${unit.exposure_summary.total_duration_today_minutes.toFixed(1)} mins` : '0 mins'}</strong> (${unit.exposure_summary?.excursion_count_today || 0} events)</div>
              </div>
              ${unit.exposure_summary?.requires_inspection ? `
                <div class="mt-2 text-[10px] font-bold text-rose-800 bg-rose-50 p-1.5 rounded border border-rose-200">
                  ⚠️ Prolonged excursion exceeds 30m. Flagged for QA inspection.
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Measurement Log Table -->
          <div>
            <div class="font-bold text-slate-800 text-[11px] mb-1.5">Recent Measurement History</div>
            <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
              <table class="w-full text-left text-[11px]">
                <thead class="bg-slate-100 text-slate-600 sticky top-0 font-semibold">
                  <tr>
                    <th class="p-2">Timestamp</th>
                    <th class="p-2">Temperature</th>
                    <th class="p-2">Classification</th>
                    <th class="p-2">Observation</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${historyReadings.map(r => `
                    <tr class="hover:bg-slate-50">
                      <td class="p-2 text-slate-500">${new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td class="p-2 font-bold ${r.temperature_celsius > unit.max_temp_celsius || r.temperature_celsius < unit.min_temp_celsius ? 'text-rose-600' : 'text-slate-800'}">
                        ${r.temperature_celsius !== null && r.temperature_celsius !== undefined ? `${r.temperature_celsius.toFixed(1)}°C` : 'Offline'}
                      </td>
                      <td class="p-2">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          r.status === 'SAFE' ? 'bg-emerald-50 text-emerald-700' : r.status === 'CRITICAL' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }">${r.status}</span>
                      </td>
                      <td class="p-2 text-slate-600 truncate max-w-xs">${r.classification_reason || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Food Safety Notice -->
          <div class="p-2.5 rounded-xl bg-slate-100 text-[10px] text-slate-500 border border-slate-200">
            <strong>Food-Safety Advisory:</strong> Sensor measurements monitor ambient refrigeration air.
            Food product safety evaluation requires verification against statutory time-temperature rules for specific food items.
          </div>

          <!-- Modal Actions Footer -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button type="button" onclick="TempGuard.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition shadow-sm">
              Close Details
            </button>
          </div>
        </div>
      `;
    }

    // Support closing with Escape key (prevent duplicate listeners)
    if (this._onModalKeydown) {
      document.removeEventListener('keydown', this._onModalKeydown);
      this._onModalKeydown = null;
    }
    this._onModalKeydown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        TempGuard.closeModal();
      }
    };
    document.addEventListener('keydown', this._onModalKeydown);

    // Support closing by clicking the backdrop (clicks inside modal content do not close)
    if (modalContainer) {
      if (this._onBackdropClick && this._modalBackdropEl) {
        this._modalBackdropEl.removeEventListener('click', this._onBackdropClick);
        this._onBackdropClick = null;
        this._modalBackdropEl = null;
      }
      this._modalBackdropEl = modalContainer;
      this._onBackdropClick = (e) => {
        if (e.target === modalContainer) {
          TempGuard.closeModal();
        }
      };
      modalContainer.addEventListener('click', this._onBackdropClick);
    }

    if (typeof openActionModal === 'function') {
      openActionModal();
    }
  },

  generateDetailedChartSvg(readings, unit) {
    if (!readings || readings.length === 0) {
      return '<div class="text-center py-6 text-slate-400 text-xs">No telemetry data recorded</div>';
    }

    const width = 540;
    const height = 150;
    const padding = { top: 15, right: 15, bottom: 25, left: 45 };

    const temps = readings.map(r => r.temperature_celsius).filter(t => t !== null && t !== undefined);
    const minVal = Math.min(...temps, unit.min_temp_celsius - 1.5);
    const maxVal = Math.max(...temps, unit.max_temp_celsius + 1.5);
    const range = maxVal - minVal || 1;

    const getY = (val) => height - padding.bottom - ((val - minVal) / range) * (height - padding.top - padding.bottom);
    const getX = (idx) => padding.left + (idx / Math.max(1, readings.length - 1)) * (width - padding.left - padding.right);

    const yMaxLimit = getY(unit.max_temp_celsius);
    const yMinLimit = getY(unit.min_temp_celsius);
    const yWarnHigh = getY(unit.warning_high_celsius);
    const yWarnLow = getY(unit.warning_low_celsius);

    const sorted = [...readings].reverse();
    const points = sorted.map((r, i) => `${getX(i)},${getY(r.temperature_celsius)}`);
    const pathD = `M ${points.join(' L ')}`;

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" class="overflow-visible select-none text-xs">
        <!-- Safe Band Fill -->
        <rect x="${padding.left}" y="${yMaxLimit}" width="${width - padding.left - padding.right}" height="${Math.max(1, yMinLimit - yMaxLimit)}" fill="#10b981" fill-opacity="0.08" />

        <!-- Warning Buffer Dashed Lines -->
        <line x1="${padding.left}" y1="${yWarnHigh}" x2="${width - padding.right}" y2="${yWarnHigh}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="${padding.left}" y1="${yWarnLow}" x2="${width - padding.right}" y2="${yWarnLow}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 3" />

        <!-- Critical Upper Limit Line -->
        <line x1="${padding.left}" y1="${yMaxLimit}" x2="${width - padding.right}" y2="${yMaxLimit}" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="${padding.left - 5}" y="${yMaxLimit + 3}" text-anchor="end" font-size="9" fill="#e11d48" font-weight="bold">${unit.max_temp_celsius}°C</text>

        <!-- Critical Lower Limit Line -->
        <line x1="${padding.left}" y1="${yMinLimit}" x2="${width - padding.right}" y2="${yMinLimit}" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="${padding.left - 5}" y="${yMinLimit + 3}" text-anchor="end" font-size="9" fill="#e11d48" font-weight="bold">${unit.min_temp_celsius}°C</text>

        <!-- Baseline Axis -->
        <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#cbd5e1" stroke-width="1" />

        <!-- Time Series Path -->
        <path d="${pathD}" fill="none" stroke="#0d9488" stroke-width="2.2" stroke-linejoin="round" />

        <!-- Data Point Circles -->
        ${sorted.map((r, i) => {
          const isBreach = r.temperature_celsius > unit.max_temp_celsius || r.temperature_celsius < unit.min_temp_celsius;
          return `<circle cx="${getX(i)}" cy="${getY(r.temperature_celsius)}" r="2.8" fill="${isBreach ? '#e11d48' : '#0d9488'}" stroke="#ffffff" stroke-width="1" />`;
        }).join('')}
      </svg>
    `;
  },

  openConfigModal(unitId) {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit) return;

    const modalTitle = document.getElementById("actionModalTitle");
    const modalContent = document.getElementById("actionModalContent");

    if (modalTitle) {
      modalTitle.innerHTML = `
        <div class="flex items-center gap-2">
          <span>Configure Limits — ${unit.name}</span>
        </div>
      `;
    }

    if (modalContent) {
      modalContent.innerHTML = `
        <form onsubmit="TempGuard.handleConfigSubmit(event, ${unit.id})" class="space-y-4 text-xs">
          <p class="text-slate-500 text-[11px]">
            Adjust configured food-safety operating boundaries and telemetry timeouts.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Lower Critical Limit (°C)</label>
              <input type="number" step="0.1" id="cfg_min" value="${unit.min_temp_celsius}" required class="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Lower Warning Threshold (°C)</label>
              <input type="number" step="0.1" id="cfg_w_low" value="${unit.warning_low_celsius}" required class="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Upper Warning Threshold (°C)</label>
              <input type="number" step="0.1" id="cfg_w_high" value="${unit.warning_high_celsius}" required class="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Upper Critical Limit (°C)</label>
              <input type="number" step="0.1" id="cfg_max" value="${unit.max_temp_celsius}" required class="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600">
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Sensor Stale Heartbeat Timeout (Minutes)</label>
            <input type="number" id="cfg_stale" value="${unit.stale_threshold_minutes || 15}" min="5" max="120" required class="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600">
            <span class="text-[10px] text-slate-400">Classify telemetry as unknown if no reading is received within this window.</span>
          </div>

          <div id="cfgErrorMsg" class="hidden p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs"></div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onclick="closeActionModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-sm">Save Configuration</button>
          </div>
        </form>
      `;
    }

    if (typeof openActionModal === 'function') {
      openActionModal();
    }
  },

  async handleConfigSubmit(event, unitId) {
    event.preventDefault();
    const minVal = parseFloat(document.getElementById("cfg_min").value);
    const wLow = parseFloat(document.getElementById("cfg_w_low").value);
    const wHigh = parseFloat(document.getElementById("cfg_w_high").value);
    const maxVal = parseFloat(document.getElementById("cfg_max").value);
    const staleMin = parseInt(document.getElementById("cfg_stale").value, 10);
    const errEl = document.getElementById("cfgErrorMsg");

    if (minVal >= maxVal) {
      errEl.textContent = "Minimum limit must be strictly less than maximum limit.";
      errEl.classList.remove("hidden");
      return;
    }
    if (wLow < minVal || wHigh > maxVal) {
      errEl.textContent = "Warning thresholds must reside inside the min and max limits.";
      errEl.classList.remove("hidden");
      return;
    }
    if (wLow >= wHigh) {
      errEl.textContent = "Lower warning threshold must be less than upper warning threshold.";
      errEl.classList.remove("hidden");
      return;
    }

    try {
      const res = await fetch(`${this.apiBase}/units/${unitId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_temp_celsius: minVal,
          max_temp_celsius: maxVal,
          warning_low_celsius: wLow,
          warning_high_celsius: wHigh,
          stale_threshold_minutes: staleMin
        })
      });

      if (res.ok) {
        if (typeof showToast === 'function') showToast("Configuration saved successfully", "success");
        if (typeof closeActionModal === 'function') closeActionModal();
        await this.refresh();
        return;
      }
    } catch (e) {
      console.warn("Backend offline, updating local state", e);
    }

    // Local state fallback
    const unit = this.units.find(u => u.id === unitId);
    if (unit) {
      unit.min_temp_celsius = minVal;
      unit.max_temp_celsius = maxVal;
      unit.warning_low_celsius = wLow;
      unit.warning_high_celsius = wHigh;
      unit.stale_threshold_minutes = staleMin;
    }
    if (typeof closeActionModal === 'function') closeActionModal();
    const contentEl = document.getElementById("mainViewContent");
    if (contentEl) this.render(contentEl);
    if (typeof showToast === 'function') showToast("Configuration updated in local session", "success");
  },

  async viewIntegrationContract() {
    let contract = null;
    try {
      const res = await fetch(`${this.apiBase}/integration/latest`);
      if (res.ok) {
        contract = await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch remote integration contract", e);
    }

    if (!contract) {
      contract = {
        module: "FoodShield TempGuard (Cold-Chain Module 1)",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        units_monitored: this.units.length,
        system_health: this.units.some(u => u.safety_status === 'CRITICAL') ? "CRITICAL_HAZARD" : (this.units.some(u => u.safety_status !== 'SAFE') ? "ATTENTION_REQUIRED" : "ALL_SAFE"),
        units: this.units.map(u => ({
          unit_id: u.id,
          unit_name: u.name,
          restaurant_id: u.restaurant_id,
          storage_category: u.category,
          latest_reading: u.latest_reading,
          safety_limits: {
            min_temp_celsius: u.min_temp_celsius,
            max_temp_celsius: u.max_temp_celsius,
            warning_low_celsius: u.warning_low_celsius,
            warning_high_celsius: u.warning_high_celsius
          },
          safety_status: u.safety_status,
          classification_reason: u.classification_reason,
          drift_analysis: u.drift_analysis,
          exposure_summary: u.exposure_summary
        }))
      };
    }

    const modalTitle = document.getElementById("actionModalTitle");
    const modalContent = document.getElementById("actionModalContent");

    if (modalTitle) {
      modalTitle.innerHTML = `<span>Shared Integration Contract (Modules 2, 3, 4)</span>`;
    }

    if (modalContent) {
      modalContent.innerHTML = `
        <div class="space-y-3 text-xs">
          <p class="text-slate-600 text-[11px]">
            Standardized read-only cold-chain telemetry provided for <strong>Sales Forecasting (Module 2)</strong>, <strong>AI Conflict Detection (Module 3)</strong>, and <strong>Spoilage Risk Prediction (Module 4)</strong>.
          </p>
          <div class="bg-slate-900 text-teal-300 p-3.5 rounded-xl font-mono text-[10px] max-h-80 overflow-y-auto leading-relaxed border border-slate-800">
            <pre>${JSON.stringify(contract, null, 2)}</pre>
          </div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-slate-400 text-[10px]">Endpoint: GET /api/temperature/integration/latest</span>
            <button onclick="closeActionModal()" class="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition">Close</button>
          </div>
        </div>
      `;
    }

    if (typeof openActionModal === 'function') {
      openActionModal();
    }
  }
};

// Global hook for dashboard navigation
function renderTempGuardView(container) {
  TempGuard.init(container);
}
