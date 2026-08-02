const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function distanceInKm(from, to) {
  if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudeDistance = toRadians(to.lat - from.lat);
  const longitudeDistance = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);
  const haversine =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDistance / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function simulateBase(
  opportunities,
  selected,
  radiusKm,
  capturePercent,
  { roadDistances = null, strictRoad = false } = {},
) {
  if (!selected || selected.lat == null || selected.lng == null) {
    return { savingsKm: 0, reachedTrips: 0, coveredLocalities: [], distanceMode: "geographic" };
  }

  const capture = capturePercent / 100;
  const coveredLocalities = opportunities
    .filter((opportunity) => opportunity.lat != null && opportunity.lng != null)
    .map((opportunity) => {
      const geographicDistanceKm = distanceInKm(selected, opportunity);
      const roadDistance = roadDistances?.[opportunity.id] ?? null;
      return {
        ...opportunity,
        geographicDistanceKm,
        distanceKm: roadDistance?.distanceKm ?? (strictRoad ? Number.POSITIVE_INFINITY : geographicDistanceKm),
        durationMinutes: roadDistance?.durationMinutes ?? null,
        distanceSource: roadDistance ? "road" : "geographic",
      };
    })
    .filter((opportunity) => opportunity.distanceKm <= radiusKm)
    .map((opportunity) => {
      const distanceRatio = Math.min(opportunity.distanceKm / radiusKm, 1);
      const proximityWeight = 1 - 0.65 * distanceRatio;
      return {
        ...opportunity,
        estimatedSavingsKm: opportunity.totalExcessKm * capture * proximityWeight,
        estimatedReachedTrips: opportunity.totalTrips * capture * proximityWeight,
      };
    })
    .sort((first, second) => second.estimatedSavingsKm - first.estimatedSavingsKm);

  return {
    savingsKm: Math.round(coveredLocalities.reduce((sum, item) => sum + item.estimatedSavingsKm, 0)),
    reachedTrips: Math.round(coveredLocalities.reduce((sum, item) => sum + item.estimatedReachedTrips, 0)),
    coveredLocalities,
    distanceMode: roadDistances ? "road" : "geographic",
  };
}

function makeLocalityCandidate(locality) {
  return {
    id: `official-${locality.id}`,
    locality: locality.name,
    province: locality.province,
    lat: locality.lat,
    lng: locality.lng,
    localityId: locality.id,
    isIntermediate: true,
    validatedLocality: true,
    placementSource: "recommended",
  };
}

export function findBestIntermediatePoint(opportunities, validLocalities, radiusKm, capturePercent) {
  if (!validLocalities?.length) return null;

  let best = null;
  validLocalities.forEach((locality) => {
    const candidate = makeLocalityCandidate(locality);
    const result = simulateBase(opportunities, candidate, radiusKm, capturePercent);
    if (result.coveredLocalities.length < 2) return;

    const score = result.savingsKm + result.coveredLocalities.length * 0.01;
    if (!best || score > best.score) best = { candidate, result, score };
  });

  if (!best) return null;
  return {
    ...best.candidate,
    capturedNodeCount: best.result.coveredLocalities.length,
  };
}

export function findNearestValidLocality(validLocalities, point, maxDistanceKm = 80) {
  let nearest = null;
  validLocalities.forEach((locality) => {
    const distanceKm = distanceInKm(point, locality);
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { locality, distanceKm };
  });

  if (!nearest || nearest.distanceKm > maxDistanceKm) return null;
  return {
    ...makeLocalityCandidate(nearest.locality),
    placementSource: "manual",
    snapDistanceKm: Math.round(nearest.distanceKm * 10) / 10,
  };
}
