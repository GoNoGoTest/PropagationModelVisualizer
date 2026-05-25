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

function ringDifference(outer: [number, number][], inner: [number, number][]): [number, number][][][] {
  if (outer.length < 4 || inner.length < 4) return [];
  return [[outer, inner.slice().reverse()]];
}

export function makeRingGeometryForLeaflet(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number): [number, number][][][] {
  // 1) generate dense outer/inner rings in a continuous longitude domain around center.
  const outerRing = unwrapRing(makeGeodesicCircleLine(center, outerRadiusKm), center.lon);
  const innerRing = unwrapRing(makeGeodesicCircleLine(center, innerRadiusKm), center.lon);

  // 2) ring = outer - inner (single annulus polygon with one hole).
  const annulus = ringDifference(outerRing, innerRing);
  if (annulus.length === 0) return [];

  // 3) Keep coordinates unwrapped; forcing [-180,180] introduces antimeridian jumps that
  // create self-intersections and large fill artifacts in Leaflet for wide rings.
  return annulus.map(([outer, inner]) => [closeRing(outer), closeRing(inner)]);
}

export function makeRingPolygon(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number) {
  return { outer: makeGeodesicCircleLine(center, outerRadiusKm), inner: makeGeodesicCircleLine(center, innerRadiusKm).reverse() };
}
