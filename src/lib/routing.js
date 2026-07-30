const responseCache = new Map();

function compactPoint(point) {
  return { id: point.id, lat: point.lat, lng: point.lng, locality: point.locality ?? point.name };
}

function cacheKey(prefix, sources, destinations) {
  return [
    prefix,
    ...sources.map((item) => `${item.id}:${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`),
    "to",
    ...destinations.map((item) => item.id),
  ].join("|");
}

async function postJson(path, body, signal) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No se pudo calcular la ruta vial.");
  return payload;
}

export async function fetchRoadMatrix(sources, destinations, signal) {
  if (!sources.length || !destinations.length) return { provider: "OSRM / OpenStreetMap", matrix: {} };
  const key = cacheKey("matrix", sources, destinations);
  if (responseCache.has(key)) return responseCache.get(key);
  const payload = await postJson(
    "/api/road-matrix",
    { sources: sources.map(compactPoint), destinations: destinations.map(compactPoint) },
    signal,
  );
  responseCache.set(key, payload);
  return payload;
}

export async function fetchRoadRoutes(source, destinations, signal) {
  if (!source || !destinations.length) return { provider: "OSRM / OpenStreetMap", routes: [] };
  const key = cacheKey("routes", [source], destinations);
  if (responseCache.has(key)) return responseCache.get(key);
  const payload = await postJson(
    "/api/road-routes",
    { source: compactPoint(source), destinations: destinations.map(compactPoint) },
    signal,
  );
  responseCache.set(key, payload);
  return payload;
}
