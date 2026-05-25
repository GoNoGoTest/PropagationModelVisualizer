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

function normalizeLon(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function unwrapRing(points: [number, number][], anchorLon: number): [number, number][] {
  if (points.length === 0) return [];
  const unwrapped: [number, number][] = [];
  let prev = anchorLon;
  for (const [lat, lonRaw] of points) {
    let lon = lonRaw;
    while (lon - prev > 180) lon -= 360;
    while (lon - prev < -180) lon += 360;
    unwrapped.push([lat, lon]);
    prev = lon;
  }
  return unwrapped;
}

function closeAndNormalizeRing(points: [number, number][], clockwise: boolean): [number, number][] {
  return normalizeRingWinding(closeRing(points), clockwise);
}

function clipRingByVerticalLine(points: [number, number][], cutLon: number, keepRight: boolean): [number, number][] {
  if (points.length < 3) return [];
  const isInside = (lon: number) => (keepRight ? lon >= cutLon : lon <= cutLon);
  const intersection = (a: [number, number], b: [number, number]): [number, number] => {
    const [lat1, lon1] = a;
    const [lat2, lon2] = b;
    const t = (cutLon - lon1) / (lon2 - lon1);
    return [lat1 + (lat2 - lat1) * t, cutLon];
  };

  const input = closeRing(points);
  const clipped: [number, number][] = [];
  for (let i = 0; i < input.length - 1; i += 1) {
    const curr = input[i];
    const next = input[i + 1];
    const currInside = isInside(curr[1]);
    const nextInside = isInside(next[1]);

    if (currInside && nextInside) {
      clipped.push(next);
    } else if (currInside && !nextInside) {
      clipped.push(intersection(curr, next));
    } else if (!currInside && nextInside) {
      clipped.push(intersection(curr, next));
      clipped.push(next);
    }
  }
  if (clipped.length < 3) return [];
  return clipped;
}

function ringCentroid(points: [number, number][]): [number, number] {
  const ring = closeRing(points);
  let area = 0;
  let sumLat = 0;
  let sumLon = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lat1, lon1] = ring[i];
    const [lat2, lon2] = ring[i + 1];
    const cross = lon1 * lat2 - lon2 * lat1;
    area += cross;
    sumLat += (lat1 + lat2) * cross;
    sumLon += (lon1 + lon2) * cross;
  }
  if (Math.abs(area) < 1e-12) return ring[0];
  return [sumLat / (3 * area), sumLon / (3 * area)];
}

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [py, px] = point;
  const ring = closeRing(polygon);
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function toLeafletLonDomain(points: [number, number][]): [number, number][] {
  return points.map(([lat, lon]) => [lat, normalizeLon(lon)]);
}

export function makeRingGeometryForLeaflet(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number): [number, number][][][] {
  const parts: [number, number][][][] = [];
  const outerRing = unwrapRing(makeGeodesicCircleLine(center, outerRadiusKm), center.lon);
  const innerRing = unwrapRing(makeGeodesicCircleLine(center, innerRadiusKm), center.lon);
  const cutLon = center.lon - 180;

  [false, true].forEach((keepRight) => {
    const outerClipped = closeAndNormalizeRing(clipRingByVerticalLine(outerRing, cutLon, keepRight), true);
    const innerClipped = closeAndNormalizeRing(clipRingByVerticalLine(innerRing, cutLon, keepRight), false);
    if (outerClipped.length === 0 || innerClipped.length === 0) return;
    if (!isRenderableRingPart(outerClipped, innerClipped)) return;

    const holeCenter = ringCentroid(innerClipped);
    if (!pointInPolygon(holeCenter, outerClipped)) return;

    parts.push([toLeafletLonDomain(outerClipped), toLeafletLonDomain(innerClipped)]);
  });

  if (parts.length === 0) {
    const fallbackOuter = closeAndNormalizeRing(outerRing, true);
    const fallbackInner = closeAndNormalizeRing(innerRing, false);
    if (isRenderableRingPart(fallbackOuter, fallbackInner)) {
      const holeCenter = ringCentroid(fallbackInner);
      if (pointInPolygon(holeCenter, fallbackOuter)) {
        parts.push([toLeafletLonDomain(fallbackOuter), toLeafletLonDomain(fallbackInner)]);
      }
    }
  }

  return parts;
}

export function makeRingPolygon(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number) {
  return { outer: makeGeodesicCircleLine(center, outerRadiusKm), inner: makeGeodesicCircleLine(center, innerRadiusKm).reverse() };
}
