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

function normalizeLon(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function adaptiveBearingStep(radiusKm: number, lat: number): number {
  const radiusFactor = clamp(radiusKm / 1000, 0, 4);
  const latFactor = clamp(Math.abs(lat) / 70, 0, 1.5);
  const step = 2 - radiusFactor * 0.35 - latFactor * 0.6;
  return clamp(step, 0.5, 2);
}

function closeRing(points: [number, number][]): [number, number][] {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

export function makeGeodesicCircleLine(center: { lat: number; lon: number }, radiusKm: number): [number, number][] {
  const pts: [number, number][] = [];
  const step = adaptiveBearingStep(radiusKm, center.lat);
  for (let b = 0; b < 360; b += step) pts.push(destinationPoint(center.lat, center.lon, b, radiusKm));
  return closeRing(pts);
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

// pseudo geometry-lib ops helpers
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

    if (currInside && nextInside) clipped.push(next);
    else if (currInside && !nextInside) clipped.push(intersection(curr, next));
    else if (!currInside && nextInside) {
      clipped.push(intersection(curr, next));
      clipped.push(next);
    }
  }
  return closeRing(clipped);
}

function ringDifference(outer: [number, number][], inner: [number, number][]): [number, number][][][] {
  if (outer.length < 4 || inner.length < 4) return [];
  return [[outer, inner.slice().reverse()]];
}

function toLeafletLonDomain(points: [number, number][]): [number, number][] {
  return points.map(([lat, lon]) => [lat, normalizeLon(lon)]);
}

export function makeRingGeometryForLeaflet(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number): [number, number][][][] {
  // 1) generate dense outer/inner rings
  const outerRing = unwrapRing(makeGeodesicCircleLine(center, outerRadiusKm), center.lon);
  const innerRing = unwrapRing(makeGeodesicCircleLine(center, innerRadiusKm), center.lon);

  // 2) ring = outer - inner
  const annulus = ringDifference(outerRing, innerRing);
  if (annulus.length === 0) return [];

  // 3) clip against dateline-split hemispheres
  const cutLon = center.lon - 180;
  const parts: [number, number][][][] = [];
  for (const [outer, inner] of annulus) {
    for (const keepRight of [false, true]) {
      const co = clipRingByVerticalLine(outer, cutLon, keepRight);
      const ci = clipRingByVerticalLine(inner, cutLon, keepRight);
      if (co.length >= 4 && ci.length >= 4) parts.push([toLeafletLonDomain(co), toLeafletLonDomain(ci)]);
    }
  }

  // fallback if clipping removed everything
  if (parts.length === 0) {
    return annulus.map(([outer, inner]) => [toLeafletLonDomain(closeRing(outer)), toLeafletLonDomain(closeRing(inner))]);
  }

  // 4) already in Leaflet Polygon/MultiPolygon coordinate shape
  return parts;
}

export function makeRingPolygon(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number) {
  return { outer: makeGeodesicCircleLine(center, outerRadiusKm), inner: makeGeodesicCircleLine(center, innerRadiusKm).reverse() };
}
