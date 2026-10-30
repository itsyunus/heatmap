/**
 * Bharat Fleet Safety Intel - Heatmap & Incident Command Engine (v3.0 Pro)
 * Incident data from the location-updated workbook snapshot
 * Enterprise Porcelain Light Glass UI/UX with Smooth Kinetic Map Navigation
 */

// Strategic Logistics Hotzones
const HOTZONE_CORRIDORS = [
  {
    id: "bangalore",
    name: "Bangalore Logistics Belt",
    shortName: "Bangalore",
    state: "Karnataka",
    center: [12.9716, 77.5946],
    radiusMeters: 45000,
    color: "#e11d48",
    riskLevel: "Critical Hotzone",
    description: "Electronic City, Whitefield, Peenya, Hosur & Kolar Industrial Hubs"
  },
  {
    id: "mumbai-pune",
    name: "Mumbai-Pune Expressway Belt",
    shortName: "Mumbai-Pune",
    state: "Maharashtra",
    center: [18.7500, 73.4000],
    radiusMeters: 65000,
    color: "#f97316",
    riskLevel: "Severe Hotzone",
    description: "JNPT Port, Thane, Navi Mumbai, Bhiwandi Warehousing & Pune Auto Hub"
  },
  {
    id: "delhi-ncr",
    name: "Delhi-NCR Logistics Gateway",
    shortName: "Delhi-NCR",
    state: "Delhi / Haryana / UP",
    center: [28.5500, 77.1500],
    radiusMeters: 55000,
    color: "#eab308",
    riskLevel: "High Hotzone",
    description: "Gurugram, Noida, Faridabad, Binola & NH-48 Logistics Corridor"
  },
  {
    id: "chennai-krishnagiri",
    name: "Chennai-Krishnagiri Auto Belt",
    shortName: "Chennai-Krishnagiri",
    state: "Tamil Nadu",
    center: [12.7500, 79.1500],
    radiusMeters: 80000,
    color: "#76C457",
    riskLevel: "High Hotzone",
    description: "Sriperumbudur, Oragadam, Krishnagiri & Vellore Industrial Corridor"
  },
  {
    id: "hyderabad",
    name: "Hyderabad Cyber & Logistics Belt",
    shortName: "Hyderabad",
    state: "Telangana",
    center: [17.3850, 78.4867],
    radiusMeters: 38000,
    color: "#2A7C13",
    riskLevel: "Moderate Hotzone",
    description: "ORR Logistics, Shamshabad, Medchal & Cyberabad Transport Corridors"
  },
  {
    id: "kolkata",
    name: "Kolkata & Eastern Logistics Hub",
    shortName: "Kolkata",
    state: "West Bengal",
    center: [22.5726, 88.3639],
    radiusMeters: 35000,
    color: "#a855f7",
    riskLevel: "Moderate Hotzone",
    description: "Howrah Logistics, Dankuni, Kolkata Port & NH-19 Eastern Gateway"
  },
  {
    id: "punjab-gt",
    name: "Punjab-Haryana GT Road Corridor",
    shortName: "Punjab-Haryana",
    state: "Punjab / Haryana",
    center: [30.9010, 75.8573],
    radiusMeters: 70000,
    color: "#38bdf8",
    riskLevel: "Active Corridor",
    description: "Amritsar, Ludhiana, Chandigarh, Ambala & Bathinda Transport Hubs"
  },
  {
    id: "gujarat",
    name: "Gujarat Industrial Expressway",
    shortName: "Gujarat",
    state: "Gujarat",
    center: [22.7000, 72.8500],
    radiusMeters: 65000,
    color: "#34d399",
    riskLevel: "Active Corridor",
    description: "Ahmedabad, Vadodara, Gandhinagar, Surat & Rajkot Freight Hubs"
  },
  {
    id: "central-india",
    name: "Central Logistics Grid (Nagpur-Raipur)",
    shortName: "Central Grid",
    state: "Maharashtra / CG / MP",
    center: [21.1800, 80.3000],
    radiusMeters: 90000,
    color: "#10b981",
    riskLevel: "Active Corridor",
    description: "MIHAN Nagpur, Raipur, Bhilai & Bilaspur Central Transshipment Grid"
  }
];

// Application State
const appState = {
  rawIncidents: [],
  filteredIncidents: [],
  incidentMap: new Map(),
  map: null,
  heatLayer: null,
  clusterLayer: null,
  hotzoneLayerGroup: null,
  accidentSpotlightLayer: null,
  indiaBoundaryLayer: null,
  tileLayers: {},
  currentBasemap: 'esri_streets',
  charts: {},
  activeTab: 'map',
  sidebarOpen: true,
  // Filter settings
  filters: {
    search: '',
    severity: 'all',
    hotzone: 'all',
    client: 'all',
    resolved: 'all',
    year: 'all',
    subRequest: 'all',
    gps: 'all',
    month: 'all',
    todayOnly: false
  },
  // Heatmap settings
  heatSettings: {
    mode: 'weighted', // 'weighted' or 'count'
    radius: 25,
    blur: 20,
    maxZoom: 13,
    minOpacity: 0.30
  },
  // Table pagination
  tablePage: 1,
  pageSize: 25,
  sortField: 'newest',
  sortAsc: false
};

// Classify severity: 4=Critical/Accident, 3=Hardware/Sensor, 2=Operational, 1=Routine
function classifySeverity(incidentType, subRequest, issueDetails, remarks, status) {
  const combined = `${incidentType} ${subRequest} ${issueDetails} ${remarks} ${status}`.toLowerCase();
  
  if (incidentType === 'Critical' || 
      combined.match(/accident|crash|collision|hit | hit|impact|police|fir|injury|hazard|overturn|fatal|head-on|rear-end|rollover/)) {
    return 4; // Critical Accident / Collision
  }
  if (combined.match(/damage|cable|tamper|wiring|hanging|antenna|sim card failure|camera damaged|power cable/)) {
    return 3; // Sensor / Hardware Fault
  }
  if (combined.match(/sd card corruption|offline|device status|ai video related|device offline|platform issue/)) {
    return 2; // Operational / Telemetry Issue
  }
  return 1; // Routine Video Request / Inquiries
}

// Normalize one incident from the location-updated workbook snapshot
function normalizeTuple(t, idx) {
  const id = t[0] || `ISS${String(idx + 1).padStart(5, '0')}`;
  const client = (t[1] || '').trim() || 'Unknown Fleet';
  const vehicle = t[2] || 'Unknown Plate';
  const raisedAt = t[3] || '';
  const year = String(t[4] || '');
  const month = t[5] || '';
  const raisedBy = t[6] || '';
  const subRequest = (t[7] || '').trim() || 'General Telemetry';
  const severity = classifySeverity(t[19] || '', subRequest, t[9] || '', t[10] || '', t[17] || '');
  const details = t[9] || '';
  const remarks = t[10] || '';
  const location = t[11] || '';
  const coordinates = window.TrackerCoordinates.parse(location);
  const hasCoordinates = coordinates.length > 0;
  // One point per incident keeps the heatmap from double-counting first/last GPS.
  const lat = hasCoordinates ? coordinates[0].lat : null;
  const lng = hasCoordinates ? coordinates[0].lng : null;

  const resolved = (t[14] || '').toLowerCase().includes('yes') ? 'Yes' : 'No';
  const resolvedAt = t[15] || '';
  const assignedTo = t[16] || '';
  const status = t[17] || '';
  const correction = t[18] || '';

  let hotzoneId = 'other';
  for (const z of HOTZONE_CORRIDORS) {
    const dLat = Math.abs(lat - z.center[0]);
    const dLng = Math.abs(lng - z.center[1]);
    if (hasCoordinates && dLat < 0.7 && dLng < 0.7) {
      hotzoneId = z.id;
      break;
    }
  }

  return {
    id,
    client,
    vehicle,
    raisedAt,
    year,
    month,
    raisedBy,
    subRequest,
    severity,
    details,
    remarks,
    location,
    coordinates,
    hasCoordinates,
    sourceRow: t[20],
    reportedMonth: getReportedMonth(raisedAt),
    lat,
    lng,
    resolved,
    resolvedAt,
    assignedTo,
    status,
    correction,
    hotzoneId
  };
}

// Main Application Lifecycle
function startApp() {
  initUI();
  initMap();
  initCharts();
  loadInitialData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// UI Event Listeners & Tab Controller
function initUI() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Drawer Backdrop Click to Dismiss
  const backdrop = document.getElementById('drawer-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeAllDrawers);
  }

  // Keyboard shortcut: ESC closes all drawers and modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDrawers();
      closeModal();
    }
  });

  // Re-read the bundled workbook snapshot. No remote tracker connection.
  const reloadBtn = document.getElementById('btn-reload-data');
  if (reloadBtn) reloadBtn.addEventListener('click', () => loadInitialData(true));

  document.querySelectorAll('[data-gps-filter]').forEach(button => {
    button.addEventListener('click', () => setGpsFilter(button.getAttribute('data-gps-filter')));
  });
  document.querySelectorAll('[data-gps-shortcut]').forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.getAttribute('data-gps-shortcut');
      setGpsFilter(mode);
      switchTab(mode === 'unmapped' ? 'logbook' : 'map');
    });
  });
  const monthFilter = document.getElementById('filter-month');
  if (monthFilter) monthFilter.addEventListener('change', e => {
    appState.filters.month = e.target.value;
    applyFilters();
  });
  const tableSort = document.getElementById('table-sort');
  if (tableSort) tableSort.addEventListener('change', e => {
    appState.sortField = e.target.value;
    appState.tablePage = 1;
    renderTable();
  });

  // Filter Search Input
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      appState.filters.search = searchInput.value.trim().toLowerCase();
      applyFilters();
    }, 250));
  }

  // Severity Quick Filter Pills
  document.querySelectorAll('[data-sev-pill]').forEach(pill => {
    pill.addEventListener('click', () => {
      const sevVal = pill.getAttribute('data-sev-pill');
      appState.filters.severity = sevVal;
      updateSeverityFilterPills(sevVal);
      applyFilters();
    });
  });

  // Dismiss Corridor Liquid Dropdown on outside click
  document.addEventListener('click', (e) => {
    const container = document.getElementById('corridor-dropdown-container');
    const menu = document.getElementById('corridor-dropdown-menu');
    if (container && menu && !container.contains(e.target) && !menu.classList.contains('hidden')) {
      window.toggleCorridorMenu(false);
    }
  });

  // Top Bar Corridor Selector (sync state when programmatically updated)
  const barCorridorSelect = document.getElementById('bar-corridor-select');
  if (barCorridorSelect) {
    barCorridorSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const corridor = HOTZONE_CORRIDORS.find(c => c.id === val);
      const name = corridor ? corridor.name : 'All India Corridors';
      window.selectBarCorridor(val, name);
    });
  }

  // Hotzone Corridor Dropdown in Filter Drawer
  const hotzoneFilter = document.getElementById('filter-hotzone');
  if (hotzoneFilter) {
    hotzoneFilter.addEventListener('change', (e) => {
      const val = e.target.value;
      const opt = hotzoneFilter.options[hotzoneFilter.selectedIndex];
      const name = opt ? opt.text.split('(')[0].trim() : val;
      window.selectBarCorridor(val, name);
    });
  }

  // Client Fleet Dropdown
  const clientFilter = document.getElementById('filter-client');
  if (clientFilter) {
    clientFilter.addEventListener('change', (e) => {
      appState.filters.client = e.target.value;
      applyFilters();
    });
  }

  // Resolution Status
  const resFilter = document.getElementById('filter-resolved');
  if (resFilter) {
    resFilter.addEventListener('change', (e) => {
      appState.filters.resolved = e.target.value;
      applyFilters();
    });
  }

  // Sub-request Dropdown
  const subFilter = document.getElementById('filter-subrequest');
  if (subFilter) {
    subFilter.addEventListener('change', (e) => {
      appState.filters.subRequest = e.target.value;
      applyFilters();
    });
  }

  // Clear Filters Button
  const clearBtn = document.getElementById('btn-clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', resetFilters);
  }

  // Heatmap Controls Live Sliders
  const heatModeToggle = document.getElementById('heat-mode-toggle');
  if (heatModeToggle) {
    heatModeToggle.addEventListener('change', (e) => {
      appState.heatSettings.mode = e.target.checked ? 'weighted' : 'count';
      document.getElementById('heat-mode-label').textContent = e.target.checked ? 'Risk-Weighted (Accidents 5x)' : 'Raw Event Count (1x)';
      updateHeatmapLayer();
    });
  }

  const heatRadius = document.getElementById('slider-heat-radius');
  if (heatRadius) {
    heatRadius.addEventListener('input', (e) => {
      appState.heatSettings.radius = parseInt(e.target.value, 10);
      document.getElementById('val-heat-radius').textContent = e.target.value + 'px';
      updateHeatmapLayer();
    });
  }

  const heatBlur = document.getElementById('slider-heat-blur');
  if (heatBlur) {
    heatBlur.addEventListener('input', (e) => {
      appState.heatSettings.blur = parseInt(e.target.value, 10);
      document.getElementById('val-heat-blur').textContent = e.target.value + 'px';
      updateHeatmapLayer();
    });
  }

  const heatOpacity = document.getElementById('slider-heat-opacity');
  if (heatOpacity) {
    heatOpacity.addEventListener('input', (e) => {
      appState.heatSettings.minOpacity = parseFloat(e.target.value) / 100;
      document.getElementById('val-heat-opacity').textContent = e.target.value + '%';
      updateHeatmapLayer();
    });
  }

  // Layer Toggles
  const toggleHeat = document.getElementById('toggle-layer-heat');
  if (toggleHeat) {
    toggleHeat.addEventListener('change', (e) => {
      if (e.target.checked) appState.map.addLayer(appState.heatLayer);
      else appState.map.removeLayer(appState.heatLayer);
    });
  }

  const toggleClusters = document.getElementById('toggle-layer-clusters');
  if (toggleClusters) {
    toggleClusters.addEventListener('change', (e) => {
      if (e.target.checked) appState.map.addLayer(appState.clusterLayer);
      else appState.map.removeLayer(appState.clusterLayer);
    });
  }

  const toggleZones = document.getElementById('toggle-layer-zones');
  if (toggleZones) {
    toggleZones.addEventListener('change', (e) => {
      if (e.target.checked) appState.map.addLayer(appState.hotzoneLayerGroup);
      else appState.map.removeLayer(appState.hotzoneLayerGroup);
    });
  }

  const toggleSpotlight = document.getElementById('toggle-layer-spotlight');
  if (toggleSpotlight) {
    toggleSpotlight.addEventListener('change', (e) => {
      if (e.target.checked) appState.map.addLayer(appState.accidentSpotlightLayer);
      else appState.map.removeLayer(appState.accidentSpotlightLayer);
    });
  }

  const toggleBoundary = document.getElementById('toggle-layer-boundary');
  if (toggleBoundary) {
    toggleBoundary.addEventListener('change', (e) => {
      if (appState.indiaBoundaryLayer) {
        if (e.target.checked) appState.map.addLayer(appState.indiaBoundaryLayer);
        else appState.map.removeLayer(appState.indiaBoundaryLayer);
      }
    });
  }

  // Basemap Selector (NO WATERMARKS, 100% FREE & CLEAN)
  const basemapSelect = document.getElementById('select-basemap');
  if (basemapSelect) {
    basemapSelect.addEventListener('change', (e) => {
      switchBasemap(e.target.value);
    });
  }

  // Floating HUD Navigation Buttons
  const btnZoomIn = document.getElementById('hud-zoom-in');
  const btnZoomOut = document.getElementById('hud-zoom-out');
  const btnResetIndia = document.getElementById('hud-reset-india');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => appState.map.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => appState.map.zoomOut());
  if (btnResetIndia) btnResetIndia.addEventListener('click', () => flyToCorridor('all'));

  // Corridor Teleport Buttons
  document.querySelectorAll('[data-fly-corridor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const corridorId = btn.getAttribute('data-fly-corridor');
      flyToCorridor(corridorId);
    });
  });

  // Export CSV Button
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportFilteredCSV);
  }

  // Fullscreen Button
  const fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullScreen);
  }

  // Modal Close Button
  const modalClose = document.getElementById('modal-close-btn');
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  const modalBackdrop = document.getElementById('incident-modal');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Table Pagination
  const prevBtn = document.getElementById('table-prev-btn');
  const nextBtn = document.getElementById('table-next-btn');
  if (prevBtn) prevBtn.addEventListener('click', () => changeTablePage(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeTablePage(1));
}

// Switch Basemap Cleanly
function switchBasemap(mode) {
  appState.currentBasemap = mode;
  Object.values(appState.tileLayers).forEach(l => {
    if (appState.map.hasLayer(l)) appState.map.removeLayer(l);
  });

  if (appState.tileLayers[mode]) {
    appState.map.addLayer(appState.tileLayers[mode]);
    // Ensure India boundary stays crisp and above tiles
    if (appState.indiaBoundaryLayer && appState.map.hasLayer(appState.indiaBoundaryLayer)) {
      appState.indiaBoundaryLayer.bringToFront();
    }
  }
}

// Persistent desktop filters, with an accessible drawer on smaller screens.
window.openDrawer = function(name) {
  if (name !== 'filters') return switchTab(name === 'insights' ? 'analytics' : name);
  const panel = document.getElementById('drawer-filters');
  if (panel) panel.classList.add('is-open');
  const backdrop = document.getElementById('drawer-backdrop');
  if (backdrop) backdrop.hidden = false;
  const search = document.getElementById('filter-search');
  if (search) search.focus();
};
window.closeDrawer = function(name) {
  if (name !== 'filters') return switchTab('map');
  const panel = document.getElementById('drawer-filters');
  if (panel) panel.classList.remove('is-open');
  const backdrop = document.getElementById('drawer-backdrop');
  if (backdrop) backdrop.hidden = true;
};
window.closeAllDrawers = function() { closeDrawer('filters'); };
window.toggleDrawer = function(name) {
  if (name !== 'filters') return switchTab(name === 'insights' ? 'analytics' : name);
  const panel = document.getElementById('drawer-filters');
  if (panel && panel.classList.contains('is-open')) closeDrawer('filters');
  else openDrawer('filters');
};
function switchTab(name) {
  appState.activeTab = name;
  const workspace = document.getElementById('main-workspace');
  if (workspace) workspace.setAttribute('data-view', name);
  const views = { map: 'map-view', logbook: 'drawer-logbook', analytics: 'drawer-insights' };
  const buttons = { map: 'btn-mode-map', logbook: 'btn-toggle-logbook', analytics: 'btn-toggle-insights' };
  for (const [view, id] of Object.entries(views)) {
    const panel = document.getElementById(id);
    if (panel) panel.hidden = view !== name;
    const button = document.getElementById(buttons[view]);
    if (button) {
      button.classList.toggle('active', view === name);
      if (view === name) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }
  closeDrawer('filters');
  if (name === 'map' && appState.map) requestAnimationFrame(() => {
    if (appState.activeTab !== 'map') return;
    appState.map.invalidateSize();
    updateHeatmapLayer();
  });
  if (name === 'logbook') renderTable();
  if (name === 'analytics') {
    Object.values(appState.charts).forEach(chart => chart.resize());
    updateCharts();
  }
}

// Leaflet Map Initialization with Ultra-Smooth Physics
function initMap() {
  const mapEl = document.getElementById('map-container');
  if (!mapEl) return;

  // Initialize Map with Ultra-Smooth Hardware Zoom & Kinetic Panning
  appState.map = L.map('map-container', {
    center: [22.0, 78.9],
    zoom: 5,
    minZoom: 3,
    maxZoom: 18,
    zoomControl: false,
    trackResize: false, // Hidden tab panels must not resize the heat canvas to zero.
    preferCanvas: true,
    zoomSnap: 1, // Integer snap eliminates fractional tile blur & matrix jitter
    zoomDelta: 1, // Full crisp zoom step
    wheelPxPerZoomLevel: 120, // Calibrated wheel scroll velocity for smooth glide
    wheelDebounceTime: 60, // Smooth debounce prevents wheel event queue stutter
    zoomAnimation: true,
    zoomAnimationThreshold: 18, // NEVER disable animation regardless of zoom level jump!
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 3000,
    inertiaMaxSpeed: 2000
  });

  // Branded Cautio Micro Bottom Bubble (Clean, compact, no long copyright strings)
  if (appState.map.attributionControl) {
    appState.map.attributionControl.setPrefix(
      '<a href="https://www.cautio.com/" target="_blank" rel="noopener noreferrer" class="cautio-bottom-bubble" title="Cautio Telemetry">' +
      '<img src="cautio-logo.svg?v=4" alt="Cautio" />' +
      '<span>RADAR</span>' +
      '</a>'
    );
  }

  // TILE LAYERS (100% FREE, FAST, UNBLOCKED, ZERO WATERMARKS)
  // 1. Esri High-Definition Streets
  appState.tileLayers.esri_streets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '',
    maxZoom: 22,
    maxNativeZoom: 16,
    keepBuffer: 6,
    updateWhenZooming: false,
    updateWhenIdle: true
  });

  // 2. Esri World High-Resolution Satellite
  appState.tileLayers.esri_satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '',
    maxZoom: 22,
    maxNativeZoom: 16,
    keepBuffer: 6,
    updateWhenZooming: false,
    updateWhenIdle: true
  });

  // Add Default Basemap (Esri High-Definition Streets - crisp & zero watermarks)
  for (const layer of Object.values(appState.tileLayers)) {
    layer.on('tileerror', () => {
      const notice = document.getElementById('map-tile-notice');
      if (notice) notice.hidden = false;
    });
    layer.on('load', () => {
      const notice = document.getElementById('map-tile-notice');
      if (notice) notice.hidden = true;
    });
  }
  appState.tileLayers.esri_streets.addTo(appState.map);

  // Official Illuminated India National Geographic Boundary
  if (window.INDIA_GEOJSON) {
    appState.indiaBoundaryLayer = L.geoJSON(window.INDIA_GEOJSON, {
      style: {
        color: '#7d986c', // subtle geographic context
        weight: 1.3,
        opacity: 0.65,
        fillColor: '#2A7C13',
        fillOpacity: 0.015,
        dashArray: null
      }
    }).addTo(appState.map);
  }

  // Focus precisely on India geographical bounds
  appState.map.fitBounds([[8.0, 68.0], [35.5, 97.5]]);

  // Recalibrate dimensions after mount only while the map is visible.
  setTimeout(() => {
    if (appState.activeTab !== 'map') return;
    appState.map.invalidateSize();
    appState.map.fitBounds([[8.0, 68.0], [35.5, 97.5]]);
  }, 100);
  setTimeout(() => {
    if (appState.activeTab === 'map') appState.map.invalidateSize();
  }, 400);

  // Browser Resize Handler
  window.addEventListener('resize', () => {
    if (appState.map && appState.activeTab === 'map' && mapEl.clientWidth && mapEl.clientHeight) {
      appState.map.invalidateSize();
    }
  });

  // Heatmap Layer
  appState.heatLayer = L.heatLayer([], {
    radius: appState.heatSettings.radius,
    blur: appState.heatSettings.blur,
    maxZoom: appState.heatSettings.maxZoom,
    minOpacity: appState.heatSettings.minOpacity,
    gradient: {
      0.15: '#76C457',  // Cautio Vivid Leaf Green
      0.35: '#2A7C13',  // Cautio Deep Forest Green
      0.55: '#FFF8CF',  // Cautio Warm Lemon Cream
      0.70: '#FBE6C2',  // Cautio Warm Apricot Sand
      0.85: '#f97316',  // Amber / Orange
      1.00: '#e11d48'   // Critical Collision Rose
    }
  }).addTo(appState.map);

  // 1. Collision Spotlight Pane (z-index 550: Above heat canvas 400, strictly below numbers 650)
  appState.map.createPane('spotlightPane');
  const spotlightPane = appState.map.getPane('spotlightPane');
  if (spotlightPane) {
    spotlightPane.style.zIndex = '550';
    spotlightPane.style.pointerEvents = 'auto';
  }

  // 2. Cluster Numbers Pane (z-index 650: Above collision hot dots so numbers are always on top)
  appState.map.createPane('clusterPane');
  const clusterPane = appState.map.getPane('clusterPane');
  if (clusterPane) {
    clusterPane.style.zIndex = '650';
    clusterPane.style.pointerEvents = 'auto';
  }

  // 3. Hotzone Hub Number Badges Pane (z-index 720: Highest map layer for clean visibility)
  appState.map.createPane('badgePane');
  const badgePane = appState.map.getPane('badgePane');
  if (badgePane) {
    badgePane.style.zIndex = '720';
    badgePane.style.pointerEvents = 'auto';
  }

  // Sleek Clustered Marker Layer with High-Legibility Numbers in clusterPane (z-index 650)
  appState.clusterLayer = L.markerClusterGroup({
    clusterPane: 'clusterPane',
    chunkedLoading: true,
    chunkInterval: 50,
    chunkDelay: 10,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 85,
    zoomToBoundsOnClick: false, // We control clicking to guarantee 100% responsive "Zone In"
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      let colorClass = 'bg-white/95 border-2 border-[#76C457] text-[#2A7C13] shadow-[0_4px_16px_rgba(42,124,19,0.25)]';
      if (count > 500) colorClass = 'bg-rose-50 border-2 border-rose-500 text-rose-700 shadow-[0_4px_16px_rgba(225,29,72,0.25)]';
      else if (count > 150) colorClass = 'bg-amber-50 border-2 border-amber-500 text-amber-800 shadow-[0_4px_16px_rgba(245,158,11,0.25)]';
      else if (count > 40) colorClass = 'bg-[#f0faf0] border-2 border-[#76C457] text-[#1e5a0e] shadow-[0_4px_12px_rgba(118,196,87,0.25)]';

      const displayCount = count > 999 ? (count / 1000).toFixed(1) + 'k' : count;
      const isLarge = displayCount.toString().length >= 4;
      const widthClass = isLarge ? 'min-w-[38px] px-2 h-7 rounded-full' : 'w-7 h-7 rounded-full';
      const size = isLarge ? [38, 28] : [28, 28];
      return L.divIcon({
        html: `<div class="${widthClass} flex items-center justify-center text-[10px] font-mono font-bold shadow-lg border-2 cursor-pointer hover:scale-115 transition-transform leading-none box-border select-none ${colorClass}">${displayCount}</div>`,
        className: 'custom-cluster-icon',
        iconSize: size,
        iconAnchor: [size[0] / 2, size[1] / 2]
      });
    }
  });

  // Cluster Click Handler: Guarantees Smooth "Zone In" + Instant Spiderfy
  appState.clusterLayer.on('clusterclick', function (a) {
    const cluster = a.layer;
    const currentZoom = appState.map.getZoom();
    const maxZoom = appState.map.getMaxZoom();
    const bounds = cluster.getBounds();
    const isPointBounds = bounds.getNorthEast().equals(bounds.getSouthWest());
    const boundsZoom = appState.map.getBoundsZoom(bounds);

    if (!isPointBounds && boundsZoom > currentZoom) {
      appState.map.flyToBounds(bounds, {
        maxZoom: Math.min(boundsZoom, maxZoom),
        duration: 0.55,
        easeLinearity: 0.35
      });
    } else {
      if (currentZoom < 16) {
        appState.map.flyTo(cluster.getLatLng(), Math.min(currentZoom + 3, maxZoom), {
          duration: 0.5,
          easeLinearity: 0.35
        });
      }
      cluster.spiderfy();
    }
  });

  const clusterCheckbox = document.getElementById('toggle-layer-clusters');
  if (!clusterCheckbox || clusterCheckbox.checked) {
    appState.map.addLayer(appState.clusterLayer);
  }

  // Smart Map Click: Zone into closest hotspot when clicked on heatmap areas
  appState.map.on('click', (e) => {
    if (appState.map.getZoom() >= 14) return;
    const clickLat = e.latlng.lat;
    const clickLng = e.latlng.lng;
    let closest = null;
    let minDistSq = Infinity;
    const incidents = appState.filteredIncidents;
    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      if (!window.TrackerCoordinates.hasCoordinates(inc)) continue;
      const dLat = inc.lat - clickLat;
      const dLng = inc.lng - clickLng;
      const d2 = dLat * dLat + dLng * dLng;
      if (d2 < minDistSq) {
        minDistSq = d2;
        closest = inc;
      }
    }

    if (closest && minDistSq < 0.035) {
      appState.map.flyTo([closest.lat, closest.lng], Math.min(appState.map.getZoom() + 3, 14), {
        duration: 0.6,
        easeLinearity: 0.35
      });
    }
  });

  appState.hotzoneLayerGroup = L.layerGroup();
  const zoneCheckbox = document.getElementById('toggle-layer-zones');
  if (!zoneCheckbox || zoneCheckbox.checked) {
    appState.map.addLayer(appState.hotzoneLayerGroup);
  }
  appState.accidentSpotlightLayer = L.layerGroup();
  const spotlightCheckbox = document.getElementById('toggle-layer-spotlight');
  if (!spotlightCheckbox || spotlightCheckbox.checked) appState.accidentSpotlightLayer.addTo(appState.map);

  // Auto-hide high-level hotzone numbers at street zoom levels (>= 9) so street views stay clean
  appState.map.on('zoomend', () => {
    const z = appState.map.getZoom();
    if (appState.hotzoneLayerGroup) {
      if (z >= 9) {
        if (appState.map.hasLayer(appState.hotzoneLayerGroup)) {
          appState.map.removeLayer(appState.hotzoneLayerGroup);
        }
      } else {
        const toggleZones = document.getElementById('toggle-layer-zones');
        if (!toggleZones || toggleZones.checked) {
          if (!appState.map.hasLayer(appState.hotzoneLayerGroup)) {
            appState.map.addLayer(appState.hotzoneLayerGroup);
          }
        }
      }
    }
  });

  renderHotzonePolygons();
}

// Render floating VisionOS Liquid Glass Hotzone Hub Count Badges on Heatmap
function renderHotzonePolygons() {
  if (!appState.hotzoneLayerGroup) return;
  appState.hotzoneLayerGroup.clearLayers();

  const incidents = appState.filteredIncidents || [];
  const counts = {};
  HOTZONE_CORRIDORS.forEach(c => { counts[c.id] = 0; });

  incidents.forEach(inc => {
    if (counts[inc.hotzoneId] !== undefined) {
      counts[inc.hotzoneId]++;
    }
  });

  HOTZONE_CORRIDORS.forEach(corridor => {
    const count = counts[corridor.id] || 0;
    if (count === 0) return;

    const formattedCount = count > 999 ? (count / 1000).toFixed(1) + 'k' : count.toLocaleString();
    const displayName = corridor.shortName || corridor.name.split(' ')[0];

    // Position offset to prevent geographical overlap in close proximity hubs
    let offsetStyle = 'transform: translate(-50%, -50%);';
    if (corridor.id === 'bangalore') {
      offsetStyle = 'transform: translate(-50%, -135%);';
    } else if (corridor.id === 'chennai-krishnagiri') {
      offsetStyle = 'transform: translate(-50%, 35%);';
    }

    const badgeIcon = L.divIcon({
      className: 'custom-hotzone-count-badge',
      html: `
        <div style="${offsetStyle}">
          <div onclick="window.selectBarCorridor('${corridor.id}', '${corridor.name}')" 
               class="hotzone-bubble-pill group" 
               title="${corridor.name}: ${count.toLocaleString()} incident reports">
            <span class="hub-title">${displayName}</span>
            <span class="hub-badge">${formattedCount}</span>
          </div>
        </div>
      `,
      iconSize: null,
      iconAnchor: null
    });

    const marker = L.marker(corridor.center, { 
      icon: badgeIcon,
      pane: 'badgePane',
      zIndexOffset: 1000
    });

    appState.hotzoneLayerGroup.addLayer(marker);
  });
}

// ==========================================================================
// THEMATIC LIQUID GLASS CORRIDOR DROPDOWN CONTROLLER
// ==========================================================================
window.toggleCorridorMenu = function(forceState) {
  const menu = document.getElementById('corridor-dropdown-menu');
  const chevron = document.getElementById('corridor-dropdown-chevron');
  if (!menu) return;

  const isHidden = menu.classList.contains('hidden');
  const shouldOpen = forceState !== undefined ? forceState : isHidden;

  if (shouldOpen) {
    menu.classList.remove('hidden');
    if (chevron) chevron.classList.add('rotate-180');
  } else {
    menu.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
  }
};

window.selectBarCorridor = function(corridorId, displayName) {
  // 1. Update top bar pill label
  const labelEl = document.getElementById('corridor-dropdown-label');
  if (labelEl) {
    labelEl.textContent = displayName || 'Freight Corridor';
  }

  // 2. Update hidden input state
  const barSelect = document.getElementById('bar-corridor-select');
  if (barSelect) {
    barSelect.value = corridorId;
  }

  // 3. Synchronize filter drawer select if present
  const hotzoneFilter = document.getElementById('filter-hotzone');
  if (hotzoneFilter && hotzoneFilter.value !== corridorId) {
    hotzoneFilter.value = corridorId;
  }

  // 4. Update active highlight & check icon in custom liquid glass dropdown
  document.querySelectorAll('#corridor-dropdown-menu .corridor-option').forEach(opt => {
    const optId = opt.getAttribute('data-corridor-id');
    const checkIcon = opt.querySelector('.corridor-check-icon');
    if (optId === corridorId) {
      opt.classList.add('active');
      opt.classList.add('text-[#0f290f]');
      opt.classList.remove('text-[#4a6e4a]');
      if (checkIcon) checkIcon.classList.remove('hidden');
    } else {
      opt.classList.remove('active');
      opt.classList.remove('text-[#0f290f]');
      opt.classList.add('text-[#4a6e4a]');
      if (checkIcon) checkIcon.classList.add('hidden');
    }
  });

  // 5. Dismiss dropdown
  window.toggleCorridorMenu(false);

  // 6. Update reactive state & map camera
  appState.filters.hotzone = corridorId;
  applyFilters();
  flyToCorridor(corridorId);

  // 7. Refresh Lucide icons for newly revealed check icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

// Global helper for corridor switching
window.filterByCorridor = function(corridorId) {
  const corridor = HOTZONE_CORRIDORS.find(c => c.id === corridorId);
  const name = corridor ? corridor.name : 'All India Corridors';
  window.selectBarCorridor(corridorId, name);
};

// Smooth Camera Fly-To Corridor (Liquid-Smooth Kinematics)
function flyToCorridor(corridorId) {
  if (!appState.map) return;
  if (corridorId === 'all') {
    const indiaBounds = [[8.0, 68.0], [35.5, 97.5]];
    appState.map.flyToBounds(indiaBounds, {
      duration: 0.85,
      easeLinearity: 0.35,
      noMoveStart: true
    });
    showToast("Focused on National India Grid");
    return;
  }
  const corridor = HOTZONE_CORRIDORS.find(c => c.id === corridorId);
  if (corridor) {
    const zoom = corridor.radiusMeters > 60000 ? 9 : 10;
    appState.map.flyTo(corridor.center, zoom, { duration: 0.8, easeLinearity: 0.35 });
    showToast(`Focused on ${corridor.name}`);
  }
}

// Load only the workbook-derived data shipped with this version of the project.
function loadInitialData(isManual = false) {
  const rows = window.INITIAL_INCIDENT_DATA;
  if (!Array.isArray(rows) || !window.WORKBOOK_SOURCE || window.WORKBOOK_SOURCE.mode !== 'workbook-snapshot') {
    const badge = document.getElementById('workbook-source-badge');
    if (badge) badge.textContent = 'Data unavailable';
    showToast('The workbook data could not be loaded. Reload this page.', 'warning');
    return;
  }
  appState.rawIncidents = rows.map(normalizeTuple);
  appState.incidentMap.clear();
  appState.rawIncidents.forEach(inc => appState.incidentMap.set(inc.id, inc));
  const mapped = appState.rawIncidents.filter(window.TrackerCoordinates.hasCoordinates).length;
  const summary = `${appState.rawIncidents.length.toLocaleString()} incidents · ${mapped.toLocaleString()} with GPS · ${(appState.rawIncidents.length - mapped).toLocaleString()} without GPS`;
  const badge = document.getElementById('workbook-source-badge');
  if (badge) badge.textContent = 'Workbook snapshot';
  const container = document.getElementById('workbook-status-container');
  if (container) container.title = `${window.WORKBOOK_SOURCE.name}: ${summary}`;
  const details = document.getElementById('workbook-source-details');
  if (details) details.textContent = summary;
  populateDropdowns();
  populateMonths();
  updateTodayBadge();
  applyFilters();
  if (isManual) showToast('Reloaded the saved workbook data.', 'success');
}

// Filter state is visible and keyboard accessible.
function updateSeverityFilterPills(activeVal) {
  document.querySelectorAll('[data-sev-pill]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.getAttribute('data-sev-pill') === activeVal));
  });
}
function updateGpsButtons() {
  document.querySelectorAll('[data-gps-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.getAttribute('data-gps-filter') === appState.filters.gps));
  });
}
function setGpsFilter(mode) {
  appState.filters.gps = mode;
  updateGpsButtons();
  applyFilters();
}
function getReportedMonth(value) {
  const date = parseIncidentDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function populateMonths() {
  const select = document.getElementById('filter-month');
  if (!select) return;
  const months = [...new Set(appState.rawIncidents.map(i => i.reportedMonth).filter(Boolean))].sort().reverse();
  select.innerHTML = '<option value="all">All months</option>';
  for (const month of months) {
    const option = document.createElement('option');
    option.value = month;
    const [year, number] = month.split('-').map(Number);
    option.textContent = new Date(year, number - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    select.appendChild(option);
  }
  select.value = appState.filters.month || 'all';
}

// Populate Dropdown Menus
function populateDropdowns() {
  const clientSet = new Set();
  const subRequestSet = new Set();

  appState.rawIncidents.forEach(inc => {
    if (inc.client && inc.client !== 'Unknown Fleet') clientSet.add(inc.client);
    if (inc.subRequest) subRequestSet.add(inc.subRequest);
  });

  const clientSelect = document.getElementById('filter-client');
  if (clientSelect) {
    const cur = clientSelect.value;
    const sortedClients = Array.from(clientSet).sort();
    clientSelect.innerHTML = '<option value="all">All Fleets & Clients</option>';
    sortedClients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      clientSelect.appendChild(opt);
    });
    clientSelect.value = cur || 'all';
  }

  const subSelect = document.getElementById('filter-subrequest');
  if (subSelect) {
    const cur = subSelect.value;
    const sortedSubs = Array.from(subRequestSet).sort();
    subSelect.innerHTML = '<option value="all">All Issue Categories</option>';
    sortedSubs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      subSelect.appendChild(opt);
    });
    subSelect.value = cur || 'all';
  }
}

// ==========================================================================
// TODAY'S ENTRIES ENGINE & TIMESTAMP PARSER
// ==========================================================================
function parseIncidentDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // 1. Google Sheets GViz Date(year, month, day, [hr, min, sec])
  // Matches Date(2026,7,6) or Date(2026,7,6,14,39,26)
  const gvizMatch = str.match(/Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?/i);
  if (gvizMatch) {
    const y = parseInt(gvizMatch[1], 10);
    const m = parseInt(gvizMatch[2], 10); // GViz month is 0-indexed
    const d = parseInt(gvizMatch[3], 10);
    const hr = gvizMatch[4] ? parseInt(gvizMatch[4], 10) : 0;
    const min = gvizMatch[5] ? parseInt(gvizMatch[5], 10) : 0;
    const sec = gvizMatch[6] ? parseInt(gvizMatch[6], 10) : 0;
    return new Date(y, m, d, hr, min, sec);
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY (optionally with time)
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    const m = parseInt(ddmmyyyy[2], 10) - 1; // 0-indexed month
    const y = parseInt(ddmmyyyy[3], 10);
    const hr = ddmmyyyy[4] ? parseInt(ddmmyyyy[4], 10) : 0;
    const min = ddmmyyyy[5] ? parseInt(ddmmyyyy[5], 10) : 0;
    const sec = ddmmyyyy[6] ? parseInt(ddmmyyyy[6], 10) : 0;
    return new Date(y, m, d, hr, min, sec);
  }

  // 3. YYYY-MM-DD (optionally with time)
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10);
    const m = parseInt(yyyymmdd[2], 10) - 1;
    const d = parseInt(yyyymmdd[3], 10);
    const hr = yyyymmdd[4] ? parseInt(yyyymmdd[4], 10) : 0;
    const min = yyyymmdd[5] ? parseInt(yyyymmdd[5], 10) : 0;
    const sec = yyyymmdd[6] ? parseInt(yyyymmdd[6], 10) : 0;
    return new Date(y, m, d, hr, min, sec);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate(dateStr) {
  const dateObj = parseIncidentDate(dateStr);
  if (!dateObj) return dateStr || 'N/A'; // Fallback to raw if unparseable
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' • ' + dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function isIncidentToday(dateStr) {
  if (!dateStr) return false;
  const incDate = parseIncidentDate(dateStr);
  if (!incDate) return false;
  const today = new Date();
  return (
    incDate.getFullYear() === today.getFullYear() &&
    incDate.getMonth() === today.getMonth() &&
    incDate.getDate() === today.getDate()
  );
}

function countTodayIncidents() {
  return appState.rawIncidents.filter(inc => isIncidentToday(inc.raisedAt)).length;
}

function updateTodayBadge() {
  const count = countTodayIncidents();
  const headerBadge = document.getElementById('badge-today-count');
  const drawerBadge = document.getElementById('drawer-today-count');
  if (headerBadge) headerBadge.textContent = count.toLocaleString();
  if (drawerBadge) drawerBadge.textContent = count.toLocaleString();
}

window.toggleTodayFilter = function(forceState) {
  if (forceState !== undefined) {
    appState.filters.todayOnly = Boolean(forceState);
  } else {
    appState.filters.todayOnly = !appState.filters.todayOnly;
  }

  // Synchronize button styling
  const btn = document.getElementById('btn-toggle-today');
  const drawerCheckbox = document.getElementById('toggle-filter-today');

  if (btn) {
    if (appState.filters.todayOnly) {
      btn.classList.add('liquid-pill-active');
    } else {
      btn.classList.remove('liquid-pill-active');
    }
  }

  if (drawerCheckbox) {
    drawerCheckbox.checked = appState.filters.todayOnly;
  }

  applyFilters();

  if (appState.filters.todayOnly) {
    const count = appState.filteredIncidents.length;
    if (count > 0) {
      showToast(`Filtered: Showing ${count.toLocaleString()} incident reports logged today`, "success");
    } else {
      showToast("This workbook has no incidents reported today. Clear the Today filter to see earlier records.");
    }
  } else {
    showToast("Displaying all commercial fleet incidents across India");
  }
};

// Reset Filters
function resetFilters() {
  appState.filters = {
    search: '',
    severity: 'all',
    hotzone: 'all',
    client: 'all',
    resolved: 'all',
    year: 'all',
    subRequest: 'all',
    gps: 'all',
    month: 'all',
    todayOnly: false
  };

  const searchEl = document.getElementById('filter-search');
  if (searchEl) searchEl.value = '';

  const dropdowns = ['filter-client', 'filter-resolved', 'filter-subrequest', 'filter-month'];
  dropdowns.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });

  window.selectBarCorridor('all', 'All India Corridors');

  const todayBtn = document.getElementById('btn-toggle-today');
  if (todayBtn) {
    todayBtn.classList.remove('liquid-pill-active', 'ring-2', 'ring-[#76C457]', 'bg-[#2A7C13]', 'text-white');
    todayBtn.classList.add('text-[#143814]');
  }
  const todayToggle = document.getElementById('toggle-filter-today');
  if (todayToggle) todayToggle.checked = false;

  updateSeverityFilterPills('all');
  updateGpsButtons();

  applyFilters();
}

// Filter Engine & Reactive Update
function applyFilters() {
  const f = appState.filters;

  const filtered = appState.rawIncidents.filter(inc => {
    if (f.gps === 'mapped' && !inc.hasCoordinates) return false;
    if (f.gps === 'unmapped' && inc.hasCoordinates) return false;
    if (f.month && f.month !== 'all' && inc.reportedMonth !== f.month) return false;
    if (f.todayOnly && !isIncidentToday(inc.raisedAt)) {
      return false;
    }

    if (f.search) {
      const q = f.search;
      const match = inc.id.toLowerCase().includes(q) ||
                    inc.vehicle.toLowerCase().includes(q) ||
                    inc.client.toLowerCase().includes(q) ||
                    inc.location.toLowerCase().includes(q) ||
                    inc.details.toLowerCase().includes(q) ||
                    inc.remarks.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (f.severity !== 'all') {
      const targetSev = parseInt(f.severity, 10);
      if (inc.severity !== targetSev) return false;
    }

    if (f.hotzone !== 'all') {
      if (inc.hotzoneId !== f.hotzone) return false;
    }

    if (f.client !== 'all') {
      if (inc.client !== f.client) return false;
    }

    if (f.subRequest !== 'all') {
      if (inc.subRequest !== f.subRequest) return false;
    }

    if (f.resolved !== 'all') {
      if (inc.resolved !== f.resolved) return false;
    }

    return true;
  });

  appState.filteredIncidents = filtered;
  appState.tablePage = 1;

  updateKPICards();
  updateHeatmapLayer();
  updateClusterMarkers();
  updateAccidentSpotlight();
  renderHotzonePolygons();
  updateCharts();
  renderTable();
  updateTodayBadge();

  // Active filter badge
  let count = 0;
  if (f.gps && f.gps !== 'all') count++;
  if (f.month && f.month !== 'all') count++;
  if (f.todayOnly) count++;
  if (f.search) count++;
  if (f.severity !== 'all') count++;
  if (f.hotzone !== 'all') count++;
  if (f.client !== 'all') count++;
  if (f.resolved !== 'all') count++;
  if (f.subRequest !== 'all') count++;

  const badgeEl = document.getElementById('active-filter-badge');
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = `${count}`;
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  }
}

// Update Top KPI Scorecards
function updateKPICards() {
  const total = appState.rawIncidents.length;
  const current = appState.filteredIncidents.length;

  let accidents = 0;
  let resolvedCount = 0;
  const uniqueVehicles = new Set();
  const uniqueClients = new Set();
  const hotzoneCounts = {};

  appState.filteredIncidents.forEach(inc => {
    if (inc.severity === 4) accidents++;
    if (inc.resolved === 'Yes') resolvedCount++;
    if (inc.vehicle && inc.vehicle !== 'Unknown Plate') uniqueVehicles.add(inc.vehicle);
    if (inc.client && inc.client !== 'Unknown Fleet') uniqueClients.add(inc.client);
    hotzoneCounts[inc.hotzoneId] = (hotzoneCounts[inc.hotzoneId] || 0) + 1;
  });

  const resRate = current > 0 ? ((resolvedCount / current) * 100).toFixed(1) : 0;
  const activeZones = Object.keys(hotzoneCounts).filter(k => k !== 'other').length;

  const mapped = appState.filteredIncidents.filter(window.TrackerCoordinates.hasCoordinates).length;
  animateCounter('kpi-mapped', mapped);
  animateCounter('kpi-unmapped', current - mapped);
  const text = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  text('summary-total-caption', `${uniqueClients.size.toLocaleString()} fleets in this view`);
  text('summary-coverage', `${current ? (mapped / current * 100).toFixed(1) : '0'}%`);
  text('summary-resolution-caption', `${resolvedCount.toLocaleString()} of ${current.toLocaleString()} incidents`);
  text('map-point-count', `${mapped.toLocaleString()} locations`);
  text('logbook-summary', `${mapped.toLocaleString()} with GPS · ${(current - mapped).toLocaleString()} without coordinates`);
  const corridor = HOTZONE_CORRIDORS.find(c => c.id === appState.filters.hotzone);
  text('view-context', corridor ? corridor.shortName : 'All India');
  const empty = document.getElementById('map-empty');
  if (empty) empty.hidden = mapped > 0;
  text('map-empty-description', current ? 'These incidents are still available in the incident log.' : 'Try a different month, fleet, or reset your filters.');
  animateCounter('kpi-total-incidents', current);
  animateCounter('kpi-critical-accidents', accidents);
  animateCounter('kpi-active-hotzones', activeZones);
  animateCounter('kpi-vehicles-impacted', uniqueVehicles.size);
  animateCounter('kpi-resolution-rate', resRate, '%');
  animateCounter('kpi-active-clients', uniqueClients.size);

  const barCountEl = document.getElementById('bar-incident-count');
  if (barCountEl) {
    barCountEl.textContent = current.toLocaleString();
  }

  const subTotal = document.getElementById('kpi-total-subtext');
  if (subTotal) {
    subTotal.textContent = current === total ? `Full Fleet Telemetry (${total.toLocaleString()} total)` : `Filtered: ${current.toLocaleString()} of ${total.toLocaleString()}`;
  }
}

// Smooth Number Counter Animation
function animateCounter(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const targetNum = typeof target === 'number' ? target : parseFloat(target);
  if (isNaN(targetNum)) {
    el.textContent = target + suffix;
    return;
  }
  el.textContent = (suffix === '%' ? targetNum.toLocaleString(undefined, { maximumFractionDigits: 1 }) : Math.round(targetNum).toLocaleString()) + suffix;
}

// Update Heatmap Points & Weights
function updateHeatmapLayer() {
  if (!appState.heatLayer || appState.activeTab !== 'map') return;

  const isWeighted = appState.heatSettings.mode === 'weighted';
  const points = [];

  appState.filteredIncidents.filter(window.TrackerCoordinates.hasCoordinates).forEach(inc => {
    let weight = 1.0;
    if (isWeighted) {
      if (inc.severity === 4) weight = 5.0;
      else if (inc.severity === 3) weight = 3.0;
      else if (inc.severity === 2) weight = 1.5;
      else weight = 0.6;
    }
    points.push([inc.lat, inc.lng, weight]);
  });

  appState.heatLayer.setLatLngs(points);
  appState.heatLayer.setOptions({
    radius: appState.heatSettings.radius,
    blur: appState.heatSettings.blur,
    minOpacity: appState.heatSettings.minOpacity
  });
}

// Zone In to Coordinates on Map
window.zoneInToCoordinates = function(lat, lng) {
  if (!appState.map) return;
  const currentZoom = appState.map.getZoom();
  const targetZoom = Math.min(Math.max(currentZoom + 3, 15), 18);
  appState.map.flyTo([lat, lng], targetZoom, {
    duration: 0.65,
    easeLinearity: 0.35
  });
};

// Update Marker Cluster Layer
function updateClusterMarkers() {
  if (!appState.clusterLayer) return;
  appState.clusterLayer.clearLayers();

  // Render all active incidents with chunked loading for seamless 60fps clustering
  const dataToRender = appState.filteredIncidents.filter(window.TrackerCoordinates.hasCoordinates);
  const markers = [];

  dataToRender.forEach(inc => {
    let pinColor = '#2A7C13';
    let pinBorder = '#76C457';
    let dotHtml = '<div class="w-1 h-1 rounded-full bg-white"></div>';

    if (inc.severity === 4) {
      pinColor = '#be123c';
      pinBorder = '#ffffff';
      dotHtml = '<div class="w-1 h-1 rounded-full bg-white"></div>';
    } else if (inc.severity === 3) {
      pinColor = '#c2410c';
      pinBorder = '#fed7aa';
      dotHtml = '<div class="w-1 h-1 rounded-full bg-amber-200"></div>';
    } else if (inc.severity === 2) {
      pinColor = '#2A7C13';
      pinBorder = '#76C457';
      dotHtml = '<div class="w-1 h-1 rounded-full bg-[#76C457]"></div>';
    }

    const icon = L.divIcon({
      className: 'custom-vehicle-pin',
      html: `
        <div class="relative group cursor-pointer transform hover:scale-125 transition-transform duration-200" title="${inc.vehicle} - ${getSeverityLabel(inc.severity)}">
          <div class="w-3 h-3 rounded-full flex items-center justify-center shadow-md border" style="background-color: ${pinColor}; border-color: ${pinBorder}">
            ${dotHtml}
          </div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    const marker = L.marker([inc.lat, inc.lng], { icon });

    const popupHtml = `
      <div class="p-4 bg-white/95 backdrop-blur-xl text-[#0f290f] rounded-2xl shadow-[0_12px_36px_rgba(42,124,19,0.18),0_4px_12px_rgba(0,0,0,0.06)] border-2 border-[#76C457]/60 min-w-[290px] max-w-[340px]">
        <div class="flex items-center justify-between border-b border-[#76C457]/30 pb-2 mb-2">
          <span class="font-mono font-bold text-xs text-white bg-[#2A7C13] px-2.5 py-0.5 rounded-lg border border-[#76C457]/60 shadow-sm">${inc.id}</span>
          <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${getSeverityBadgeClasses(inc.severity)}">
            ${getSeverityLabel(inc.severity)}
          </span>
        </div>
        <div class="text-xs font-bold text-[#0f290f] mb-1 flex items-center gap-1.5">
          <span class="tracking-wide font-mono">${inc.vehicle}</span>
          <span class="text-[#2d522d] text-[11px] font-semibold">(${inc.client})</span>
        </div>
        <div class="text-[11px] text-[#2d522d] mb-1.5 font-medium">
          <span class="text-[#5a805a]">Category:</span> ${inc.subRequest}
        </div>
        <div class="text-xs text-[#0f290f] bg-[#f2faf0] p-2.5 rounded-xl border border-[#76C457]/30 mb-2.5 line-clamp-3 leading-relaxed font-normal">
          ${inc.details || 'No additional issue description recorded.'}
        </div>
        <div class="flex items-center justify-between text-[11px] text-[#5a805a] mb-3">
          <span>${inc.location}</span>
          <span class="${inc.resolved === 'Yes' ? 'text-[#2A7C13] font-bold' : 'text-rose-600 font-bold'}">
            ${inc.resolved === 'Yes' ? 'Resolved' : 'Pending'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-1">
          <button onclick="window.zoneInToCoordinates(${inc.lat}, ${inc.lng})" class="py-2 px-2.5 rounded-xl bg-[#eaf7e8] hover:bg-[#d8f0d5] text-[#2A7C13] border border-[#76C457]/60 text-xs font-semibold transition shadow-sm flex items-center justify-center gap-1">
            <span>Zone In</span>
          </button>
          <button onclick="window.inspectIncident('${inc.id}')" class="py-2 px-2.5 rounded-xl bg-[#2A7C13] hover:bg-[#226610] text-white text-xs font-semibold transition shadow-md shadow-[#2A7C13]/25 border border-[#76C457]/60 flex items-center justify-center gap-1">
            <span>Inspect</span>
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    markers.push(marker);
  });

  appState.clusterLayer.addLayers(markers);
}

// Update Accident Spotlight Layer (Guaranteed High-Priority Interactive Collision Dots)
function updateAccidentSpotlight() {
  if (!appState.accidentSpotlightLayer) return;
  appState.accidentSpotlightLayer.clearLayers();

  const accidents = appState.filteredIncidents.filter(i => i.severity === 4 && window.TrackerCoordinates.hasCoordinates(i));
  accidents.forEach(acc => {
    // Subtle outer radar aura (small 12px diameter)
    const auraMarker = L.circleMarker([acc.lat, acc.lng], {
      pane: 'spotlightPane',
      radius: 6,
      color: '#f43f5e',
      fillColor: '#f43f5e',
      fillOpacity: 0.25,
      weight: 1,
      interactive: true
    });

    // Core crisp pinpoint red collision dot (7px diameter)
    const pulseMarker = L.circleMarker([acc.lat, acc.lng], {
      pane: 'spotlightPane',
      radius: 3.5,
      color: '#ffffff',
      fillColor: '#be123c',
      fillOpacity: 1.0,
      weight: 1.5,
      interactive: true
    });

    const popupHtml = `
      <div class="p-4 bg-white/95 backdrop-blur-xl text-[#0f290f] rounded-2xl shadow-[0_12px_36px_rgba(225,29,72,0.18),0_4px_12px_rgba(0,0,0,0.06)] border-2 border-rose-400/80 min-w-[290px] max-w-[340px]">
        <div class="flex items-center justify-between border-b border-rose-200 pb-2 mb-2">
          <div class="flex items-center gap-1.5">
            <i data-lucide="flame" class="w-3.5 h-3.5 text-rose-600 flex-shrink-0"></i>
            <span class="font-mono font-bold text-xs text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-lg border-2 border-rose-300 shadow-sm">${acc.id}</span>
          </div>
          <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border-2 border-rose-300">
            Critical Collision
          </span>
        </div>
        <div class="text-xs font-bold text-[#0f290f] mb-1 flex items-center gap-1.5 font-mono">
          <span class="text-sm font-bold text-[#0f290f]">${acc.vehicle}</span>
          <span class="text-[#2d522d] font-sans font-semibold">(${acc.client})</span>
        </div>
        <div class="text-[11px] text-[#2d522d] mb-1.5 font-medium">
          <span class="text-[#5a805a]">Location:</span> ${acc.location}
        </div>
        <div class="text-xs text-[#0f290f] bg-rose-50/50 p-2.5 rounded-xl border border-rose-200 mb-2.5 line-clamp-3 leading-relaxed font-normal">
          ${acc.details || acc.subRequest || 'Critical accident impact telemetry detected.'}
        </div>
        <div class="flex items-center justify-between text-[11px] text-[#5a805a] mb-3">
          <span>${acc.raisedAt ? formatDisplayDate(acc.raisedAt) : 'Live Telemetry'}</span>
          <span class="${acc.resolved === 'Yes' ? 'text-[#2A7C13] font-semibold' : 'text-rose-600 font-semibold'}">
            ${acc.resolved === 'Yes' ? 'Resolved' : 'Action Required'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="window.zoneInToCoordinates(${acc.lat}, ${acc.lng})" class="py-2 px-3 rounded-xl bg-[#eaf7e8] hover:bg-[#d8f0d5] text-[#2A7C13] border border-[#76C457]/60 text-xs font-semibold transition shadow-sm flex items-center justify-center gap-1">
            <span>Zone In</span>
          </button>
          <button onclick="window.inspectIncident('${acc.id}')" class="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-md shadow-rose-600/30 border border-rose-400/60 flex items-center justify-center gap-1">
            <span>Inspect</span>
          </button>
        </div>
      </div>
    `;

    pulseMarker.bindTooltip(`Critical Collision: ${acc.vehicle} (${acc.location})`, {
      direction: 'top',
      offset: [0, -10]
    });

    pulseMarker.bindPopup(popupHtml, { autoPan: true, closeButton: true, offset: [0, -6] });
    auraMarker.bindPopup(popupHtml, { autoPan: true, closeButton: true, offset: [0, -6] });

    const handleDotClick = function(e) {
      if (e && e.originalEvent) {
        L.DomEvent.stopPropagation(e);
      }
      window.zoneInToCoordinates(acc.lat, acc.lng);
      pulseMarker.openPopup();
    };

    pulseMarker.on('click', handleDotClick);
    auraMarker.on('click', handleDotClick);

    appState.accidentSpotlightLayer.addLayer(auraMarker);
    appState.accidentSpotlightLayer.addLayer(pulseMarker);
  });
}

// Analytical Visualizations (Chart.js)
function initCharts() {
  const ctxHotzones = document.getElementById('chart-hotzones');
  if (ctxHotzones) {
    appState.charts.hotzones = new Chart(ctxHotzones, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Total Incidents',
            data: [],
            backgroundColor: '#65834e',
            borderRadius: 6
          },
          {
            label: 'Accidents & Collisions',
            data: [],
            backgroundColor: '#c87665',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#52634a', font: { size: 11, weight: '400' } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { ticks: { color: '#75816c', font: { size: 10, weight: '400' } }, grid: { color: 'rgba(117, 133, 105, 0.10)' } },
          y: { ticks: { color: '#75816c', font: { size: 10, weight: '400' } }, grid: { color: 'rgba(117, 133, 105, 0.10)' } }
        }
      }
    });
  }

  const ctxCategories = document.getElementById('chart-categories');
  if (ctxCategories) {
    appState.charts.categories = new Chart(ctxCategories, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#65834e', '#89a576', '#93DA77', '#C4F0B0', '#1b5e0c', '#3d9e23', '#d97706', '#52634a'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#52634a', font: { size: 11, weight: '400' }, boxWidth: 12 } }
        },
        cutout: '65%'
      }
    });
  }

  const ctxTimeline = document.getElementById('chart-timeline');
  if (ctxTimeline) {
    appState.charts.timeline = new Chart(ctxTimeline, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Incidents reported',
          data: [],
          borderColor: '#65834e',
          backgroundColor: 'rgba(137, 165, 118, 0.14)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#65834e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { offset: true, ticks: { color: '#75816c', font: { size: 10, weight: '400' } }, grid: { color: 'rgba(117, 133, 105, 0.10)' } },
          y: { beginAtZero: true, ticks: { color: '#75816c', font: { size: 10, weight: '400' } }, grid: { color: 'rgba(117, 133, 105, 0.10)' } }
        }
      }
    });
  }

  const ctxClients = document.getElementById('chart-clients');
  if (ctxClients) {
    appState.charts.clients = new Chart(ctxClients, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Incidents',
          data: [],
          backgroundColor: '#89a576',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#75816c', font: { size: 10, weight: '400' } }, grid: { color: 'rgba(117, 133, 105, 0.10)' } },
          y: { ticks: { color: '#75816c', font: { size: 10, weight: '400' } }, grid: { color: 'rgba(117, 133, 105, 0.10)' } }
        }
      }
    });
  }

  const ctxResolution = document.getElementById('chart-resolution');
  if (ctxResolution) {
    appState.charts.resolution = new Chart(ctxResolution, {
      type: 'doughnut',
      data: {
        labels: ['Resolved', 'Pending'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#89a576', '#c87665'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#52634a', font: { size: 11, weight: '400' } } }
        },
        cutout: '70%'
      }
    });
  }
}

// Update Chart Data on Filter Changes
function updateCharts() {
  if (!appState.charts.hotzones) return;

  const zoneMap = {};
  HOTZONE_CORRIDORS.forEach(z => {
    zoneMap[z.id] = { name: z.name.replace(' Logistics Belt', '').replace(' Expressway Belt', '').replace(' Gateway', ''), total: 0, accidents: 0 };
  });

  appState.filteredIncidents.forEach(inc => {
    if (zoneMap[inc.hotzoneId]) {
      zoneMap[inc.hotzoneId].total++;
      if (inc.severity === 4) zoneMap[inc.hotzoneId].accidents++;
    }
  });

  const sortedZones = Object.values(zoneMap).sort((a, b) => b.total - a.total);
  appState.charts.hotzones.data.labels = sortedZones.map(z => z.name);
  appState.charts.hotzones.data.datasets[0].data = sortedZones.map(z => z.total);
  appState.charts.hotzones.data.datasets[1].data = sortedZones.map(z => z.accidents);
  appState.charts.hotzones.update();

  const catMap = {};
  appState.filteredIncidents.forEach(inc => {
    const sr = inc.subRequest || 'Other';
    catMap[sr] = (catMap[sr] || 0) + 1;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  appState.charts.categories.data.labels = topCats.map(c => c[0]);
  appState.charts.categories.data.datasets[0].data = topCats.map(c => c[1]);
  appState.charts.categories.update();

  const timeMap = {};
  appState.filteredIncidents.forEach(inc => {
    if (inc.reportedMonth) {
      timeMap[inc.reportedMonth] = (timeMap[inc.reportedMonth] || 0) + 1;
    }
  });
  const timeKeys = Object.keys(timeMap).sort();
  appState.charts.timeline.data.labels = timeKeys.map(key => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });
  appState.charts.timeline.data.datasets[0].data = timeKeys.map(k => timeMap[k]);
  appState.charts.timeline.update();

  const clientMap = {};
  appState.filteredIncidents.forEach(inc => {
    if (inc.client && inc.client !== 'Unknown Fleet') {
      clientMap[inc.client] = (clientMap[inc.client] || 0) + 1;
    }
  });
  const topClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  appState.charts.clients.data.labels = topClients.map(c => c[0]);
  appState.charts.clients.data.datasets[0].data = topClients.map(c => c[1]);
  appState.charts.clients.update();

  let resolved = 0, pending = 0;
  appState.filteredIncidents.forEach(inc => {
    if (inc.resolved === 'Yes') resolved++;
    else pending++;
  });
  appState.charts.resolution.data.datasets[0].data = [resolved, pending];
  appState.charts.resolution.update();
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function sortedIncidents() {
  const date = value => parseIncidentDate(value)?.getTime();
  return appState.filteredIncidents.slice().sort((a, b) => {
    if (appState.sortField === 'severity' && a.severity !== b.severity) return b.severity - a.severity;
    const da = date(a.raisedAt), db = date(b.raisedAt);
    const va = Number.isFinite(da), vb = Number.isFinite(db);
    if (va !== vb) return va ? -1 : 1;
    if (va && da !== db) return appState.sortField === 'oldest' ? da - db : db - da;
    return b.sourceRow - a.sourceRow;
  });
}
function renderTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  const total = appState.filteredIncidents.length;
  const start = (appState.tablePage - 1) * appState.pageSize;
  const end = Math.min(start + appState.pageSize, total);
  const rows = sortedIncidents().slice(start, end);
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><strong>No incidents match these filters.</strong><p>Try a different month, fleet, or reset your filters.</p></td></tr>';
    updateTablePagination(0, 0, 0);
    return;
  }
  for (const inc of rows) {
    const tr = document.createElement('tr');
    const location = inc.hasCoordinates
      ? `<span class="gps-status">Recorded GPS</span><small class="table-gps">${escapeHTML(inc.lat)}, ${escapeHTML(inc.lng)}</small>${inc.coordinates.length > 1 ? '<small>First + last point in details</small>' : ''}`
      : `<span class="gps-status missing">No GPS</span><small>${escapeHTML(inc.location || 'Location not recorded')}</small>`;
    tr.innerHTML = `
      <td class="issue-cell"><strong>${escapeHTML(inc.id)}</strong><small>${escapeHTML(inc.raisedAt ? formatDisplayDate(inc.raisedAt) : 'Date unavailable')}</small></td>
      <td><strong>${escapeHTML(inc.vehicle)}</strong><small>${escapeHTML(inc.client)}</small></td>
      <td class="description-cell"><strong>${escapeHTML(inc.subRequest)}</strong><small>${escapeHTML(inc.remarks || inc.details || 'No additional description')}</small></td>
      <td class="location-cell">${location}</td>
      <td><span class="${getSeverityBadgeClasses(inc.severity)}">${getSeverityLabel(inc.severity)}</span></td>
      <td><span class="resolution-badge ${inc.resolved === 'Yes' ? 'resolved' : 'pending'}">${inc.resolved === 'Yes' ? 'Resolved' : 'Pending'}</span></td>
      <td><div class="table-actions"></div></td>`;
    const actions = tr.querySelector('.table-actions');
    const locate = document.createElement('button');
    locate.textContent = 'Locate';
    locate.disabled = !inc.hasCoordinates;
    locate.title = inc.hasCoordinates ? 'Locate first recorded point' : 'No coordinates in workbook';
    locate.addEventListener('click', () => window.locateOnMap(inc.id));
    const inspect = document.createElement('button');
    inspect.textContent = 'Details';
    inspect.addEventListener('click', () => window.inspectIncident(inc.id));
    actions.appendChild(locate);
    actions.appendChild(inspect);
    tbody.appendChild(tr);
  }
  updateTablePagination(start + 1, end, total);
}

// Table Pagination Controls
function updateTablePagination(start, end, total) {
  const pageInfo = document.getElementById('table-page-info');
  const prevBtn = document.getElementById('table-prev-btn');
  const nextBtn = document.getElementById('table-next-btn');

  if (pageInfo) {
    pageInfo.textContent = total > 0 ? `Showing ${start.toLocaleString()} - ${end.toLocaleString()} of ${total.toLocaleString()}` : '0 incidents';
  }
  if (prevBtn) prevBtn.disabled = appState.tablePage <= 1;
  if (nextBtn) nextBtn.disabled = end >= total;
}

function changeTablePage(delta) {
  const maxPage = Math.ceil(appState.filteredIncidents.length / appState.pageSize);
  const newPage = appState.tablePage + delta;
  if (newPage >= 1 && newPage <= maxPage) {
    appState.tablePage = newPage;
    renderTable();
  }
}

// Locate Incident on Map
window.locateOnMap = function(issueId) {
  const inc = appState.incidentMap.get(issueId);
  if (!inc) return;
  if (!window.TrackerCoordinates.hasCoordinates(inc)) {
    showToast('This incident has no coordinates in the workbook.', 'warning');
    return;
  }

  switchTab('map');
  appState.map.flyTo([inc.lat, inc.lng], 14, { duration: 0.75, easeLinearity: 0.5 });

  setTimeout(() => {
    L.popup()
      .setLatLng([inc.lat, inc.lng])
      .setContent(`
        <div class="p-4 bg-white/95 backdrop-blur-xl text-[#0f290f] rounded-2xl shadow-[0_12px_36px_rgba(42,124,19,0.18),0_4px_12px_rgba(0,0,0,0.06)] border-2 border-[#76C457]/60 min-w-[280px]">
          <div class="flex items-center justify-between border-b border-[#76C457]/30 pb-1.5 mb-2">
            <span class="font-mono text-white text-xs font-bold bg-[#2A7C13] px-2 py-0.5 rounded-lg border border-[#76C457]/50 shadow-sm">${inc.id}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityBadgeClasses(inc.severity)}">${getSeverityLabel(inc.severity)}</span>
          </div>
          <div class="font-bold text-[#0f290f] text-xs mb-1 font-mono">${inc.vehicle} <span class="text-[#2d522d] font-sans font-semibold">(${inc.client})</span></div>
          <div class="text-xs text-[#2d522d] mb-2 leading-relaxed font-normal">${inc.details || inc.subRequest}</div>
          <div class="text-[11px] text-[#5a805a] mb-2.5 font-medium">${inc.location}</div>
          <button onclick="window.inspectIncident('${inc.id}')" class="w-full py-2 bg-[#2A7C13] hover:bg-[#226610] text-white rounded-xl text-xs font-semibold transition shadow-md shadow-[#2A7C13]/25 border border-[#76C457]/60">Inspect Full Forensic Log</button>
        </div>
      `)
      .openOn(appState.map);
  }, 800);
};

// Open Forensic Incident Inspector Modal
let currentInspectedIssueId = null;

// Open Forensic Incident Inspector Modal (VisionOS Liquid Glass)
window.inspectIncident = function(issueId) {
  const inc = appState.incidentMap.get(issueId);
  if (!inc) return;
  currentInspectedIssueId = issueId;

  // Crucial: close any open Leaflet popup
  if (appState.map) {
    appState.map.closePopup();
  }

  const elId = document.getElementById('modal-issue-id');
  if (elId) elId.textContent = inc.id;

  const elVeh = document.getElementById('modal-vehicle');
  if (elVeh) elVeh.textContent = inc.vehicle;

  const elCli = document.getElementById('modal-client');
  if (elCli) elCli.textContent = inc.client;

  const elLoc = document.getElementById('modal-location');
  if (elLoc) elLoc.textContent = inc.location;

  const elRaised = document.getElementById('modal-raised-at');
  if (elRaised) elRaised.textContent = inc.raisedAt ? formatDisplayDate(inc.raisedAt) : 'N/A';

  const elResolved = document.getElementById('modal-resolved-at');
  if (elResolved) elResolved.textContent = inc.resolvedAt ? formatDisplayDate(inc.resolvedAt) : 'Pending Action';

  const elAssigned = document.getElementById('modal-assigned-to');
  if (elAssigned) elAssigned.textContent = inc.assignedTo || 'Unassigned';

  const elSub = document.getElementById('modal-subrequest');
  if (elSub) elSub.textContent = inc.subRequest;

  const elDet = document.getElementById('modal-details');
  if (elDet) elDet.textContent = inc.details || 'No description recorded.';

  const elRem = document.getElementById('modal-remarks');
  if (elRem) elRem.textContent = inc.remarks || 'No field notes recorded.';

  const elCorr = document.getElementById('modal-correction');
  if (elCorr) elCorr.textContent = inc.correction || 'Pending resolution verification.';

  const elCoords = document.getElementById('modal-coords');
  if (elCoords) elCoords.textContent = window.TrackerCoordinates.describe(inc);
  const locateButton = document.getElementById('modal-locate-btn');
  if (locateButton) {
    locateButton.disabled = !window.TrackerCoordinates.hasCoordinates(inc);
    locateButton.title = locateButton.disabled ? 'No coordinates in this workbook row' : 'Focus map on the first recorded coordinate';
  }

  const sevBadge = document.getElementById('modal-severity-badge');
  if (sevBadge) {
    sevBadge.className = getSeverityBadgeClasses(inc.severity);
    sevBadge.textContent = getSeverityLabel(inc.severity);
  }

  const resBadge = document.getElementById('modal-status-badge');
  if (resBadge) {
    resBadge.className = `resolution-badge ${inc.resolved === 'Yes' ? 'resolved' : 'pending'}`;
    resBadge.textContent = inc.resolved === 'Yes' ? 'Resolved' : 'Pending';
  }


  const modal = document.getElementById('incident-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

window.closeModal = function() {
  const modal = document.getElementById('incident-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// Locate Current Incident from Modal on Map
window.locateCurrentModalIncident = function() {
  if (!currentInspectedIssueId) return;
  const issueId = currentInspectedIssueId;
  closeModal();
  setTimeout(() => {
    window.locateOnMap(issueId);
  }, 120);
};

// Export Filtered CSV
function exportFilteredCSV() {
  const data = appState.filteredIncidents;
  if (data.length === 0) {
    showToast("No data to export", "warning");
    return;
  }

  const headers = ["Issue Id", "Vehicle Number", "Clients", "Location", "Severity", "Sub-request", "Issue Details", "Remarks", "Raised At", "Resolved Status", "Resolved At", "Assigned To", "Latitude", "Longitude"];
  const rows = data.map(i => [
    `"${i.id}"`,
    `"${i.vehicle}"`,
    `"${i.client}"`,
    `"${i.location}"`,
    `"${getSeverityLabel(i.severity)}"`,
    `"${i.subRequest}"`,
    `"${(i.details || '').replace(/"/g, '""')}"`,
    `"${(i.remarks || '').replace(/"/g, '""')}"`,
    `"${i.raisedAt}"`,
    `"${i.resolved}"`,
    `"${i.resolvedAt}"`,
    `"${i.assignedTo}"`,
    i.lat,
    i.lng
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `fleet_incidents_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Exported ${data.length.toLocaleString()} incidents to CSV!`, "success");
}

// Fullscreen Toggle
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn(`Error attempting fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Helpers
function getSeverityLabel(sev) {
  return ({ 4: 'Accident', 3: 'Hardware', 2: 'Operational', 1: 'Routine' })[sev] || 'Routine';
}
function getSeverityBadgeClasses(sev) {
  return `severity-badge sev-${sev}`;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Toast Notifications in Cautio Palette
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let borderClass = 'border-[#76C457] text-[#0f290f]';
  let iconHtml = '<i data-lucide="check-circle-2" class="w-4 h-4 text-[#2A7C13] flex-shrink-0"></i>';

  if (type === 'success') {
    borderClass = 'border-[#76C457] text-[#0f290f]';
    iconHtml = '<i data-lucide="check-circle-2" class="w-4 h-4 text-[#2A7C13] flex-shrink-0"></i>';
  } else if (type === 'warning') {
    borderClass = 'border-amber-400 text-[#0f290f]';
    iconHtml = '<i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 flex-shrink-0"></i>';
  } else if (type === 'error') {
    borderClass = 'border-rose-400 text-rose-900';
    iconHtml = '<i data-lucide="alert-circle" class="w-4 h-4 text-rose-600 flex-shrink-0"></i>';
  } else {
    iconHtml = '<i data-lucide="info" class="w-4 h-4 text-[#2A7C13] flex-shrink-0"></i>';
  }

  toast.className = `px-4 py-3 bg-white/95 backdrop-blur-xl border-2 ${borderClass} rounded-2xl shadow-[0_12px_36px_rgba(42,124,19,0.18),0_4px_12px_rgba(0,0,0,0.06)] text-xs font-semibold flex items-center gap-2.5 transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `${iconHtml}<span class="font-medium">${message}</span>`;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

// Modal Backdrop Click & Escape Key Handlers
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('incident-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
});
