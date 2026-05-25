export const EARTH_RADIUS_KM = 6371;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const degToRad = (value: number) => (value * Math.PI) / 180;
export const radToDeg = (value: number) => (value * 180) / Math.PI;
export const roundToNearest = (value: number, nearest: number) => Math.round(value / nearest) * nearest;

export function destinationPoint(lat: number, lon: number, bearingDeg: number, distanceKm: number): [number, number] {
  const lat1 = degToRad(lat);
  const lon1 = degToRad(lon);
  const theta = degToRad(bearingDeg);
  const delta = distanceKm / EARTH_RADIUS_KM;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(theta));
  const lon2 = lon1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(lat1), Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2));
  let lonDeg = radToDeg(lon2);
  if (lonDeg > 180) lonDeg -= 360;
  if (lonDeg < -180) lonDeg += 360;
  return [radToDeg(lat2), lonDeg];
}

export function makeGeodesicCircleLine(center: { lat: number; lon: number }, radiusKm: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let b = 0; b <= 360; b += 2) pts.push(destinationPoint(center.lat, center.lon, b, radiusKm));
  return pts;
}

export function splitPolylineAtAntimeridian(points: [number, number][]): [number, number][][] {
  if (points.length < 2) return [points];
  const normalizeLon = (lon: number) => {
    if (lon > 180) return lon - 360;
    if (lon < -180) return lon + 360;
    return lon;
  };
  const segments: [number, number][][] = [[points[0]]];
  for (let i = 1; i < points.length; i += 1) {
    const [prevLat, prevLonNorm] = points[i - 1];
    const [currLat, currLonNorm] = points[i];
    let prevLon = prevLonNorm;
    let currLon = currLonNorm;
    const rawDeltaLon = currLon - prevLon;
    const crossesDateline = Math.abs(rawDeltaLon) > 180;
    if (rawDeltaLon > 180) currLon -= 360;
    else if (rawDeltaLon < -180) currLon += 360;

    const currentSegment = segments[segments.length - 1];
    if (!crossesDateline) {
      currentSegment.push([currLat, currLonNorm]);
      continue;
    }

    const crossingLon = currLon > prevLon ? 180 : -180;
    const t = (crossingLon - prevLon) / (currLon - prevLon);
    const crossingLat = prevLat + (currLat - prevLat) * t;
    currentSegment.push([crossingLat, crossingLon]);

    const wrappedCrossingLon = crossingLon === 180 ? -180 : 180;
    segments.push([
      [crossingLat, wrappedCrossingLon],
      [currLat, normalizeLon(currLon)],
    ]);
  }
  return segments.filter((s) => s.length > 1);
}

function ringSignedArea(points: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[(i + 1) % points.length];
    area += lon1 * lat2 - lon2 * lat1;
  }
  return area / 2;
}

function closeRing(points: [number, number][]): [number, number][] {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

function normalizeRingWinding(points: [number, number][], clockwise: boolean): [number, number][] {
  const area = ringSignedArea(points);
  const isClockwise = area < 0;
  if (clockwise === isClockwise) return points;
  return [...points].reverse();
}

function isRenderableRingPart(outer: [number, number][], inner: [number, number][]): boolean {
  if (outer.length < 4 || inner.length < 4) return false;
  const outerArea = Math.abs(ringSignedArea(outer));
  const innerArea = Math.abs(ringSignedArea(inner));
  if (outerArea <= innerArea) return false;
  if (outerArea < 1e-4 || innerArea < 1e-6) return false;
  return true;
}

export function makeRingGeometryForLeaflet(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number): [number, number][][][] {
  // Leaflet polygon filling treats a single ring that jumps from +180° to -180° as crossing the whole map;
  // splitting both inner and outer curves at the antimeridian keeps each filled part on the intended side.
  const outerSegments = splitPolylineAtAntimeridian(makeGeodesicCircleLine(center, outerRadiusKm));
  const innerSegments = splitPolylineAtAntimeridian(makeGeodesicCircleLine(center, innerRadiusKm));

  const innerCandidates = innerSegments.map((segment) => ({
    segment,
    meanLon: segment.reduce((acc, [, lon]) => acc + lon, 0) / segment.length,
    used: false,
  }));

  const parts: [number, number][][][] = [];
  for (const outer of outerSegments) {
    const outerMeanLon = outer.reduce((acc, [, lon]) => acc + lon, 0) / outer.length;

    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    innerCandidates.forEach((candidate, index) => {
      if (candidate.used) return;
      const distance = Math.abs(candidate.meanLon - outerMeanLon);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex < 0) continue;
    innerCandidates[bestIndex].used = true;

    const outerClosed = normalizeRingWinding(closeRing(outer), true);
    const innerClosed = normalizeRingWinding(closeRing(innerCandidates[bestIndex].segment), false);

    if (!isRenderableRingPart(outerClosed, innerClosed)) continue;
    parts.push([outerClosed, innerClosed]);
  }

  return parts;
}

export function makeRingPolygon(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number) {
  return { outer: makeGeodesicCircleLine(center, outerRadiusKm), inner: makeGeodesicCircleLine(center, innerRadiusKm).reverse() };
}
