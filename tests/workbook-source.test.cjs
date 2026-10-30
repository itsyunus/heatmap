const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', appendChild(child) { this.innerHTML += child.innerHTML; }, querySelector: () => element(Symbol()), addEventListener() {}, setAttribute() {}, removeAttribute() {}, title: '', className: '', style: {}, disabled: false, hidden: false, classList: { add() {}, remove() {}, toggle() {} } });
  return elements.get(id);
};
const requests = [], markers = [], heat = [], spotlights = [];
const context = vm.createContext({
  console,
  document: { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [], createElement: () => element(Symbol()), getElementById: element, body: { style: {} } },
  fetch: (...args) => { requests.push(args); throw new Error('Unexpected network request'); },
  setInterval: () => { throw new Error('Unexpected automatic synchronization'); },
  setTimeout: () => { throw new Error('Unexpected background callback'); },
  L: {
    divIcon: options => options,
    marker: point => { markers.push(point); return { bindPopup() {} }; },
    circleMarker: point => { spotlights.push(point); return { bindTooltip() {}, bindPopup() {}, on() {} }; },
  },
});
context.window = context;
for (const name of ['coordinates.js', 'data-snapshot.js', 'app.js']) vm.runInContext(read(name), context, { filename: name });
const run = js => vm.runInContext(js, context);
const realApplyFilters = run('applyFilters');
const parse = text => JSON.parse(JSON.stringify(context.TrackerCoordinates.parse(text)));
assert.deepEqual(parse('12.800433,77.714004\n12.810000,77.720000'), [{ lat: 12.800433, lng: 77.714004 }, { lat: 12.81, lng: 77.72 }]);
assert.deepEqual(parse('30.3254026 N,77.9347331 E'), [{ lat: 30.3254026, lng: 77.9347331 }]);
assert.deepEqual(parse('20,697622, 76,996852'), [{ lat: 20.697622, lng: 76.996852 }]);
assert.deepEqual(parse('12.5S,77.2W'), [{ lat: -12.5, lng: -77.2 }]);
for (const text of ['No data found', '', 'Bangalore', '91,77', '12,181', '0,0', '12.3,77.2 extra']) assert.deepEqual(parse(text), []);
// A point the old coastal clamp moved must remain exactly as recorded.
assert.deepEqual(parse('19.000001,72.800001'), [{ lat: 19.000001, lng: 72.800001 }]);
run(`
  populateDropdowns = () => {};
  updateTodayBadge = () => {};
  showToast = message => { window.lastToast = message; };
  applyFilters = () => { appState.filteredIncidents = appState.rawIncidents.slice(); };
  loadInitialData();
`);
const incidents = run('appState.rawIncidents');
assert.equal(incidents.length, context.WORKBOOK_SOURCE.incidentCount);
assert.equal(incidents.length, 13448);
assert.equal(new Set(incidents.map(i => i.id)).size, incidents.length);
const mapped = incidents.filter(context.TrackerCoordinates.hasCoordinates);
assert.ok(mapped.length >= 1891);
const requested = incidents.filter(i => i.subRequest.trim() === 'Customer request for video');
// Includes source row 13216 (issue ID "0.0"), excluded from the earlier lookup queue.
assert.equal(requested.length, 4869);
// The workbook also retains a valid decimal-comma GPS cell at row 11721.
assert.equal(requested.filter(context.TrackerCoordinates.hasCoordinates).length, 1892);
assert.equal(requested.filter(i => i.location === 'No data found').length, 505);
assert.ok(incidents.every(i => !i.hasCoordinates || (i.lat === i.coordinates[0].lat && i.lng === i.coordinates[0].lng)));
assert.ok(incidents.every(i => i.hasCoordinates || (i.lat === null && i.lng === null)));
assert.equal(incidents.find(i => i.sourceRow === 13327).lat, 30.3254026);
assert.equal(incidents.find(i => i.sourceRow === 13327).lng, 77.9347331);
context.testHeat = heat;
run(`
  appState.heatLayer = { setLatLngs(points) { window.testHeat.push(...points); }, setOptions() {} };
  appState.clusterLayer = { clearLayers() {}, addLayers() {} };
  appState.accidentSpotlightLayer = { clearLayers() {}, addLayer() {} };
  updateHeatmapLayer(); updateClusterMarkers(); updateAccidentSpotlight();
`);
assert.equal(heat.length, mapped.length);
run('appState.activeTab = "analytics"; updateHeatmapLayer();');
assert.equal(heat.length, mapped.length, 'Hidden map must not redraw its heat canvas');
run('appState.activeTab = "map";');
assert.equal(markers.length, mapped.length);
assert.equal(spotlights.length, mapped.filter(i => i.severity === 4).length * 2);
assert.ok(heat.every(point => Number.isFinite(point[0]) && Number.isFinite(point[1])));
assert.equal(heat.filter(point => point[0] === 30.3254026 && point[1] === 77.9347331).length, 1);
const missing = requested.find(i => i.location === 'No data found');
context.inspectIncident(missing.id);
assert.equal(element('modal-coords').textContent, 'No data found');
assert.equal(element('modal-locate-btn').disabled, true);
context.locateOnMap(missing.id);
assert.match(context.lastToast, /no coordinates/);
const both = mapped.find(i => i.coordinates.length > 1);
context.inspectIncident(both.id);
assert.match(element('modal-coords').textContent, /First:.*Last:/);
assert.equal(element('modal-locate-btn').disabled, false);
run('loadInitialData(true);');
assert.equal(requests.length, 0);
assert.equal(run('appState.rawIncidents.length'), incidents.length);
// Exercise actual filtering, KPI and table rendering with unmapped rows retained.
context.applyFilters = realApplyFilters;
run('appState.heatLayer = null; appState.clusterLayer = null; appState.accidentSpotlightLayer = null; applyFilters();');
assert.equal(element('bar-incident-count').textContent, '13,448');
run('appState.filters.search = "no data found"; applyFilters();');
assert.equal(run('appState.filteredIncidents.length'), 505);
assert.match(element('table-body').innerHTML, /No data found/);
run('appState.filters.search = ""; appState.filters.hotzone = "bangalore"; applyFilters();');
assert.ok(run('appState.filteredIncidents.length') > 0);
assert.ok(run('appState.filteredIncidents.every(i => i.hasCoordinates)'));
run('appState.filters.hotzone = "all"; loadInitialData(true);');
assert.equal(run('appState.rawIncidents.length'), incidents.length);
const html = read('index.html');
for (const name of ['data-snapshot.js', 'coordinates.js', 'app.js']) assert.ok(html.includes(`src="${name}?v=workbook-20261029`));
// New GPS/month filters and empty states keep unknown coordinates out of the map.
run('setGpsFilter("mapped");');
assert.equal(run('appState.filteredIncidents.length'), 1892);
assert.equal(element('map-empty').hidden, true);
run('setGpsFilter("unmapped");');
assert.equal(run('appState.filteredIncidents.length'), 11556);
assert.equal(element('map-empty').hidden, false);
run('appState.filters.gps = "all"; appState.filters.month = "2026-09"; applyFilters();');
assert.ok(run('appState.filteredIncidents.length') > 0);
assert.ok(run('appState.filteredIncidents.every(i => i.reportedMonth === "2026-09")'));
run('appState.filters.search = "no such vehicle xyz"; appState.tablePage = 20; applyFilters();');
assert.equal(run('appState.filteredIncidents.length'), 0);
assert.equal(run('appState.tablePage'), 1);
assert.match(element('table-body').innerHTML, /No incidents match/);
assert.equal(element('kpi-resolution-rate').textContent, '0%');
run('appState.filters.search = ""; appState.filters.month = "all"; applyFilters();');
const newest = run('sortedIncidents()');
assert.ok(newest.length === 13448);
assert.ok(run('parseIncidentDate(sortedIncidents()[0].raisedAt).getTime() >= parseIncidentDate(sortedIncidents()[100].raisedAt).getTime()'));
run('switchTab("logbook");');
assert.equal(element('drawer-logbook').hidden, false);
assert.equal(element('map-view').hidden, true);
run('switchTab("map");');
assert.equal(element('map-view').hidden, false);
assert.equal(element('drawer-logbook').hidden, true);
// Trend counts use the reported date, in chronological order, including a single-month filter.
context.Chart = function(canvas, config) { this.data = config.data; this.update = () => {}; this.resize = () => {}; };
run('initCharts(); appState.filters.month = "2026-09"; applyFilters();');
assert.deepEqual(Array.from(run('appState.charts.timeline.data.labels')), ['Sept 26']);
assert.equal(run('appState.charts.timeline.data.datasets[0].data[0]'), run('appState.filteredIncidents.length'));
run('appState.filters.month = "all"; applyFilters();');
assert.equal(run('appState.charts.timeline.data.datasets[0].data.reduce((a, b) => a + b, 0)'), incidents.filter(i => i.reportedMonth).length);
assert.equal(run('appState.charts.timeline.data.labels[0]'), 'Apr 25');
assert.equal(run('appState.charts.timeline.data.labels.at(-1)'), 'Oct 26');
for (const name of ['app.js', 'index.html', 'api/sync.js', '.env.example']) {
  assert.doesNotMatch(read(name), /docs\.google\.com|gviz\/tq|SHEET_ID|SHEET_GID|resolveEncryptedStream|syncWithGoogleSheet|syncViaEncryptedStream|setInterval\(/);
}
vm.runInContext(read('api/sync.js').replace('export default function handler', 'function retiredHandler'), context);
const response = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(v) { this.body = v; return this; } };
context.retiredHandler({}, response);
assert.equal(response.statusCode, 410);
assert.equal(response.headers['Cache-Control'], 'no-store');
assert.equal(requests.length, 0);
console.log(`PASS: ${incidents.length} workbook incidents, ${mapped.length} mapped; ${requested.length} customer requests, 1892 with GPS and 505 no data. No live-tracker calls or timers. Retired API returns 410.`);
