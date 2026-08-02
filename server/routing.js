const OSRM_BASE_URL = "https://router.project-osrm.org";
const MATRIX_BATCH_SIZE = 44;
const MAX_SOURCES = 8;
const MAX_DESTINATIONS = 260;

function isValidPoint(point) {
  return (
    point &&
    typeof point.id === "string" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -56 &&
    point.lat <= -20 &&
    point.lng >= -75 &&
    point.lng <= -52
  );
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": status === 200 ? "public, max-age=3600" : "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function coordinate(point) {
  return `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
}

async function getOsrmJson(path) {
  const response = await fetch(`${OSRM_BASE_URL}${path}`, {
    headers: { accept: "application/json", "user-agent": "Nodo/1.1 route-planning-dashboard" },
  });
  if (!response.ok) throw new Error(`El servicio vial respondió ${response.status}.`);
  const payload = await response.json();
  if (payload.code !== "Ok") throw new Error(payload.message || "No se encontró una ruta vial.");
  return payload;
}

async function buildRoadMatrix(sources, destinations) {
  const result = Object.fromEntries(
    sources.map((source) => [source.id, Object.fromEntries(destinations.map((item) => [item.id, null]))]),
  );

  for (let start = 0; start < destinations.length; start += MATRIX_BATCH_SIZE) {
    const batch = destinations.slice(start, start + MATRIX_BATCH_SIZE);
    const allPoints = [...sources, ...batch];
    const sourceIndexes = sources.map((_, index) => index).join(";");
    const destinationIndexes = batch.map((_, index) => sources.length + index).join(";");
    const path = `/table/v1/driving/${allPoints.map(coordinate).join(";")}?sources=${sourceIndexes}&destinations=${destinationIndexes}&annotations=distance,duration`;
    const payload = await getOsrmJson(path);

    sources.forEach((source, sourceIndex) => {
      batch.forEach((destination, destinationIndex) => {
        const distanceMeters = payload.distances?.[sourceIndex]?.[destinationIndex];
        const durationSeconds = payload.durations?.[sourceIndex]?.[destinationIndex];
        if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) return;
        result[source.id][destination.id] = {
          distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        };
      });
    });
  }

  return result;
}

async function buildRoadRoutes(source, destinations) {
  return Promise.all(
    destinations.map(async (destination) => {
      const path = `/route/v1/driving/${coordinate(source)};${coordinate(destination)}?overview=simplified&geometries=geojson&steps=false`;
      const payload = await getOsrmJson(path);
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
}

export async function handleRoutingRequest(pathname, payload) {
  try {
    if (pathname === "/api/road-matrix") {
      const sources = payload?.sources ?? [];
      const destinations = payload?.destinations ?? [];
      if (
        !sources.length ||
        sources.length > MAX_SOURCES ||
        destinations.length > MAX_DESTINATIONS ||
        !sources.every(isValidPoint) ||
        !destinations.every(isValidPoint)
      ) {
        return jsonResponse({ error: "Coordenadas o cantidad de puntos inválidas." }, 400);
      }
      return jsonResponse({
        provider: "OSRM / OpenStreetMap",
        matrix: await buildRoadMatrix(sources, destinations),
      });
    }

    if (pathname === "/api/road-routes") {
      const source = payload?.source;
      const destinations = payload?.destinations ?? [];
      if (!isValidPoint(source) || !destinations.length || destinations.length > 4 || !destinations.every(isValidPoint)) {
        return jsonResponse({ error: "Coordenadas o cantidad de rutas inválidas." }, 400);
      }
      return jsonResponse({
        provider: "OSRM / OpenStreetMap",
        routes: (await buildRoadRoutes(source, destinations)).filter(Boolean),
      });
    }

    return jsonResponse({ error: "Ruta de API inexistente." }, 404);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "No se pudo consultar la red vial." }, 502);
  }
}
