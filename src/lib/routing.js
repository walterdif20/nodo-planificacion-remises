const responseCache = new Map();
const OSRM_BASE_URL = "https://router.project-osrm.org";
const MATRIX_BATCH_SIZE = 44;
const USE_DIRECT_ROUTING = import.meta.env.MODE === "pages";

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

function coordinate(point) {
  return `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
}

async function getOsrmJson(path, signal) {
  const response = await fetch(`${OSRM_BASE_URL}${path}`, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`El servicio vial respondió ${response.status}.`);
  const payload = await response.json();
  if (payload.code !== "Ok") throw new Error(payload.message || "No se encontró una ruta vial.");
  return payload;
}

async function fetchDirectRoadMatrix(sources, destinations, signal) {
  const matrix = Object.fromEntries(
    sources.map((source) => [source.id, Object.fromEntries(destinations.map((item) => [item.id, null]))]),
  );

  for (let start = 0; start < destinations.length; start += MATRIX_BATCH_SIZE) {
    const batch = destinations.slice(start, start + MATRIX_BATCH_SIZE);
    const allPoints = [...sources, ...batch];
    const sourceIndexes = sources.map((_, index) => index).join(";");
    const destinationIndexes = batch.map((_, index) => sources.length + index).join(";");
    const path = `/table/v1/driving/${allPoints.map(coordinate).join(";")}?sources=${sourceIndexes}&destinations=${destinationIndexes}&annotations=distance,duration`;
    const payload = await getOsrmJson(path, signal);

    sources.forEach((source, sourceIndex) => {
      batch.forEach((destination, destinationIndex) => {
        const distanceMeters = payload.distances?.[sourceIndex]?.[destinationIndex];
        const durationSeconds = payload.durations?.[sourceIndex]?.[destinationIndex];
        if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) return;
        matrix[source.id][destination.id] = {
          distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        };
      });
    });
  }

  return { provider: "OSRM / OpenStreetMap", matrix };
}

async function fetchDirectRoadRoutes(source, destinations, signal) {
  const routes = await Promise.all(
    destinations.map(async (destination) => {
      const path = `/route/v1/driving/${coordinate(source)};${coordinate(destination)}?overview=simplified&geometries=geojson&steps=false`;
      const payload = await getOsrmJson(path, signal);
      const route = payload.routes?.[0];
      if (!route) return null;
      return {
        id: destination.id,
        locality: destination.locality,
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      };
    }),
  );

  return { provider: "OSRM / OpenStreetMap", routes: routes.filter(Boolean) };
}

export async function fetchRoadMatrix(sources, destinations, signal) {
  if (!sources.length || !destinations.length) return { provider: "OSRM / OpenStreetMap", matrix: {} };
  const key = cacheKey("matrix", sources, destinations);
  if (responseCache.has(key)) return responseCache.get(key);
  const payload = USE_DIRECT_ROUTING
    ? await fetchDirectRoadMatrix(sources, destinations, signal)
    : await postJson(
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
  const payload = USE_DIRECT_ROUTING
    ? await fetchDirectRoadRoutes(source, destinations, signal)
    : await postJson(
        "/api/road-routes",
        { source: compactPoint(source), destinations: destinations.map(compactPoint) },
        signal,
      );
  responseCache.set(key, payload);
  return payload;
}
