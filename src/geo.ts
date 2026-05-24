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
  const segments: [number, number][][] = [[points[0]]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (Math.abs(curr[1] - prev[1]) > 180) segments.push([curr]);
    else segments[segments.length - 1].push(curr);
  }
  return segments.filter((s) => s.length > 1);
}

export function isSafeFilledRing(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number, hopNumber?: number): boolean {
  if ((hopNumber ?? 0) >= 3) return false;
  if (outerRadiusKm > 3200) return false;
  const poleDistKm = (90 - Math.abs(center.lat)) * 111;
  if (outerRadiusKm >= poleDistKm - 150) return false;
  const outer = makeGeodesicCircleLine(center, outerRadiusKm);
  for (let i = 1; i < outer.length; i += 1) if (Math.abs(outer[i][1] - outer[i - 1][1]) > 180) return false;
  const inner = makeGeodesicCircleLine(center, innerRadiusKm);
  for (let i = 1; i < inner.length; i += 1) if (Math.abs(inner[i][1] - inner[i - 1][1]) > 180) return false;
  return true;
}

export function makeRingPolygon(center: { lat: number; lon: number }, innerRadiusKm: number, outerRadiusKm: number) {
  return { outer: makeGeodesicCircleLine(center, outerRadiusKm), inner: makeGeodesicCircleLine(center, innerRadiusKm).reverse() };
}
