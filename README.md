# Cautio Fleet Incident Heatmap

An incident map and logbook using **Issue Tracker - Locations Updated.xlsx**, sheet **Issues- Realtime**. The dashboard reads the static workbook export in `data-snapshot.js`.

The former live tracker is disconnected. There is no startup synchronization, polling, browser fallback, or spreadsheet credential in the current application. `/api/sync` returns HTTP 410 without making an upstream request. Previously configured tracker environment variables are unused and can be removed from the hosting project.

## Coordinates and missing data

- The existing **Location (P)** cell is the only coordinate source.
- A cell containing first and last coordinates produces **one incident point**, at its first recorded coordinate. Both coordinates remain available in the incident inspector and the exported Location field.
- Recorded coordinates are preserved without city inference, random offsets, or coastal repositioning. N/E suffixes and legacy decimal commas are supported.
- Rows with “No data found”, blank locations, city names, or invalid coordinates remain in the logbook and overall counts. They have no map pin and cannot be located on the map.
- The map summary shows the total, mapped, and unmapped incident counts. Corridor filters and map layers use incidents with recorded GPS only.
- Pre-numbered rows with no incident content are omitted from the export. All actual issue categories and resolution states are retained.

Existing heatmap weighting, corridor navigation, marker clustering, basemap switching, filters, charts, and incident inspection remain available. A saved workbook is a snapshot: “Reported today” can be empty if it contains no entries for today.

## Dashboard views

- **Map view:** summary cards, GPS coverage, collapsible map layers and exact recorded locations.
- **Incident log:** newest/oldest/severity sorting, resolution and GPS labels, and full incident details.
- **Insights:** charts for reported months, categories, corridors, fleets and resolution. The timeline uses the same reported date as the month filter.
- Filters apply across all views, including search, GPS availability, reported month, severity, fleet and resolution. On phones, open **Filters** to reveal the sidebar.

## Update the workbook data

From the repository folder, run Python 3 with the new location-updated workbook:

```sh
python3 scripts/import-tracker.py '/path/to/Issue Tracker - Locations Updated.xlsx'
node tests/workbook-source.test.cjs
```

The importer reads the XLSX with Python's standard library and regenerates `data-snapshot.js`. It does not modify the workbook. Only dashboard fields from the incident sheet are included; other workbook tabs are not published. `window.WORKBOOK_SOURCE` records the source filename, sheet, SHA-256 checksum, and incident count.

The tests include counts for the supplied October 2026 snapshot. Adjust those expected counts when intentionally importing a newer workbook, while retaining the source, coordinate, and no-network checks.

Commit the generated file and redeploy the project to publish a future update. The dashboard's reload button re-reads the bundled data; it does not query the tracker or read files from your computer.

## Run and deploy

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. No build step or spreadsheet credentials are required. The application can use the existing Vercel project or GitHub Pages. Deploy the repository root, including `coordinates.js` and the regenerated `data-snapshot.js`.

The workbook data is served as a static asset to site visitors, with the same visibility as the project. Base maps, fonts, and UI libraries still load from their existing external providers; incident data is local to the deployed site.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard and source indicator |
| `dashboard.css` | Responsive dashboard layout and visual styles |
| `app.js` | Filtering, heatmap, charts, and incident inspection |
| `coordinates.js` | Location-cell parsing and missing-coordinate handling |
| `data-snapshot.js` | Data exported from the location-updated workbook |
| `scripts/import-tracker.py` | Repeatable read-only XLSX importer |
| `tests/workbook-source.test.cjs` | Data and connection regression checks |
| `api/sync.js` | Retired endpoint with no upstream access |
| `india-boundary.js` | Existing map boundary overlay |
