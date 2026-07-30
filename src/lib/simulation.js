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

export function simulateBase(opportunities, selected, radiusKm, capturePercent) {
  if (!selected || selected.lat == null || selected.lng == null) {
    return {
      savingsKm: 0,
      reachedTrips: 0,
      coveredLocalities: [],
    };
  }

  const capture = capturePercent / 100;
  const coveredLocalities = opportunities
    .filter((opportunity) => opportunity.lat != null && opportunity.lng != null)
    .map((opportunity) => ({
      ...opportunity,
      distanceKm: distanceInKm(selected, opportunity),
    }))
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
    .sort((a, b) => b.estimatedSavingsKm - a.estimatedSavingsKm);

  return {
    savingsKm: Math.round(
      coveredLocalities.reduce((sum, opportunity) => sum + opportunity.estimatedSavingsKm, 0),
    ),
    reachedTrips: Math.round(
      coveredLocalities.reduce((sum, opportunity) => sum + opportunity.estimatedReachedTrips, 0),
    ),
    coveredLocalities,
  };
}

function makeCandidate(lat, lng) {
  return {
    id: `intermediate-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    locality: "Punto intermedio",
    province: "Ubicación libre",
    lat,
    lng,
    isIntermediate: true,
  };
}

function candidateKey(candidate) {
  return `${candidate.lat.toFixed(4)}:${candidate.lng.toFixed(4)}`;
}

export function findBestIntermediatePoint(opportunities, radiusKm, capturePercent) {
  const located = opportunities
    .filter((item) => item.lat != null && item.lng != null && item.totalTrips > 0)
    .sort((a, b) => b.totalExcessKm - a.totalExcessKm)
    .slice(0, 80);

  if (located.length < 2) return null;

  const candidates = new Map();
  const addCandidate = (candidate) => candidates.set(candidateKey(candidate), candidate);

  located.forEach((anchor) => {
    const cluster = located.filter(
      (item) => distanceInKm(anchor, item) <= radiusKm * 1.8,
    );
    if (cluster.length < 2) return;

    const totalWeight = cluster.reduce(
      (sum, item) => sum + Math.sqrt(Math.max(item.totalExcessKm, 1)),
      0,
    );
    addCandidate(
      makeCandidate(
        cluster.reduce(
          (sum, item) => sum + item.lat * Math.sqrt(Math.max(item.totalExcessKm, 1)),
          0,
        ) / totalWeight,
        cluster.reduce(
          (sum, item) => sum + item.lng * Math.sqrt(Math.max(item.totalExcessKm, 1)),
          0,
        ) / totalWeight,
      ),
    );
  });

  for (let firstIndex = 0; firstIndex < located.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < located.length; secondIndex += 1) {
      const first = located[firstIndex];
      const second = located[secondIndex];
      const separationKm = distanceInKm(first, second);
      if (separationKm < 8 || separationKm > radiusKm * 1.95) continue;

      addCandidate(
        makeCandidate(
          (first.lat + second.lat) / 2,
          (first.lng + second.lng) / 2,
        ),
      );
    }
  }

  let best = null;
  candidates.forEach((candidate) => {
    const result = simulateBase(opportunities, candidate, radiusKm, capturePercent);
    if (result.coveredLocalities.length < 2) return;

    const score = result.savingsKm + result.coveredLocalities.length * 0.01;
    if (!best || score > best.score) {
      best = { candidate, result, score };
    }
  });

  if (!best) return null;

  const leadingNodes = best.result.coveredLocalities.slice(0, 2);
  return {
    ...best.candidate,
    locality: leadingNodes.length === 2
      ? `Entre ${leadingNodes[0].locality} y ${leadingNodes[1].locality}`
      : "Punto intermedio sugerido",
    province: "Sugerencia multinodo",
    placementSource: "recommended",
    capturedNodeCount: best.result.coveredLocalities.length,
  };
}
