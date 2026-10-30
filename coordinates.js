/* Coordinates come only from the tracker's Location cell, never inferred cities. */
window.TrackerCoordinates = (() => {
  function parse(location) {
    const points = [];
    for (const raw of String(location || '').split(/\r?\n/)) {
      const text = raw.trim().replace(/^(?:start|end|first|last)\s*:?\s*/i, '');
      // Legacy cells sometimes use decimal commas: 20,697622, 76,996852.
      const legacy = text.match(/^(-?\d{1,2}),(\d{3,})\s*,\s*(-?\d{1,3}),(\d{3,})$/);
      const normalized = legacy ? `${legacy[1]}.${legacy[2]},${legacy[3]}.${legacy[4]}` : text;
      const match = normalized.match(/^(-?\d+(?:\.\d+)?)\s*([NS])?\s*[,;/]\s*(-?\d+(?:\.\d+)?)\s*([EW])?$/i);
      if (!match) continue;
      let lat = Number(match[1]), lng = Number(match[3]);
      if (match[2]) lat = Math.abs(lat) * (match[2].toUpperCase() === 'S' ? -1 : 1);
      if (match[4]) lng = Math.abs(lng) * (match[4].toUpperCase() === 'W' ? -1 : 1);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) continue;
      points.push({ lat, lng });
    }
    return points;
  }
  function hasCoordinates(incident) {
    return incident.hasCoordinates === true && Number.isFinite(incident.lat) && Number.isFinite(incident.lng);
  }
  function describe(incident) {
    const points = incident.coordinates || [];
    if (!points.length) return /^no data found$/i.test(incident.location.trim()) ? 'No data found' : 'Coordinates unavailable';
    const format = point => `${point.lat}, ${point.lng}`;
    if (points.length === 1) return format(points[0]);
    return `First: ${format(points[0])} · Last: ${format(points[points.length - 1])}`;
  }
  return { parse, hasCoordinates, describe };
})();
