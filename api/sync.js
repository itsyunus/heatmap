// Retired endpoint. Never fetch or fall back to the former live tracker.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    error: 'Live tracker disconnected. Reload the page to use the location-updated workbook.',
    source: 'workbook-snapshot'
  });
}
