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

function normalizeLon(lon: number): number {
  let value = lon;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
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

function splitSegmentByDateline(a: [number, number], b: [number, number]): [number, number][][] {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const delta = lon2 - lon1;
  if (Math.abs(delta) <= 180) return [[a, b]];

  const crossingLon = delta > 0 ? 180 : -180;
  const targetLon = delta > 0 ? -180 : 180;
  const t = (crossingLon - lon1) / delta;
  const latX = lat1 + (lat2 - lat1) * t;

  return [
    [a, [latX, crossingLon]],
    [[latX, targetLon], b],
  ];
}

function splitPolygonAtDateline(poly: [number, number][]): [number, number][][] {
  if (poly.length < 4) return [];
  const parts: [number, number][][] = [];
  let current: [number, number][] = [poly[0]];

  for (let i = 0; i < poly.length - 1; i += 1) {
    const segs = splitSegmentByDateline(poly[i], poly[i + 1]);
    if (segs.length === 1) {
      current.push(segs[0][1]);
      continue;
    }
    current.push(segs[0][1]);
    if (current.length >= 4) parts.push(closeRing(current));
    current = [segs[1][0], segs[1][1]];
  }

  if (current.length >= 4) parts.push(closeRing(current));
  return parts.map((ring) => ring.map(([lat, lon]) => [lat, normalizeLon(lon)]));
}

export function makeRingGeometryForLeaflet(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number): [number, number][][][] {
  if (outerRadiusKm <= innerRadiusKm) return [];
  const step = adaptiveBearingStep(outerRadiusKm, center.lat);
  const outerRaw: [number, number][] = [];
  const innerRaw: [number, number][] = [];
  for (let b = 0; b < 360; b += step) {
    outerRaw.push(destinationPoint(center.lat, center.lon, b, outerRadiusKm));
    innerRaw.push(destinationPoint(center.lat, center.lon, b, innerRadiusKm));
  }
  const outer = unwrapRing(closeRing(outerRaw), center.lon);
  const inner = unwrapRing(closeRing(innerRaw), center.lon);
  if (outer.length < 4 || inner.length < 4 || outer.length !== inner.length) return [];

  const polygons: [number, number][][][] = [];
  for (let i = 0; i < outer.length - 1; i += 1) {
    const wedge = closeRing([outer[i], outer[i + 1], inner[i + 1], inner[i]]);
    const split = splitPolygonAtDateline(wedge);
    for (const ring of split) {
      if (ring.length >= 4) polygons.push([ring]);
    }
  }
  return polygons;
}

export function makeRingPolygon(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number) {
  return { outer: makeGeodesicCircleLine(center, outerRadiusKm), inner: makeGeodesicCircleLine(center, innerRadiusKm).reverse() };
}
