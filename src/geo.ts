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

function normalizeLonToRange(lon: number, min: number): number {
  const span = 360;
  let value = lon;
  while (value < min) value += span;
  while (value >= min + span) value -= span;
  return value;
}

function adaptiveBearingStep(radiusKm: number, lat: number): number {
  const radiusFactor = clamp(radiusKm / 1000, 0, 4);
  const latFactor = clamp(Math.abs(lat) / 70, 0, 1.5);
  const step = 2 - radiusFactor * 0.35 - latFactor * 0.6;
  return clamp(step, 0.5, 2);
}

export function makeGeodesicCircleLine(center: { lat: number; lon: number }, radiusKm: number): [number, number][] {
  const pts: [number, number][] = [];
  const step = adaptiveBearingStep(radiusKm, center.lat);
  for (let b = 0; b < 360; b += step) pts.push(destinationPoint(center.lat, center.lon, b, radiusKm));
  pts.push(pts[0]);
  return pts;
}

export function splitPolylineAtAntimeridian(points: [number, number][]): [number, number][][] {
  if (points.length < 2) return [points];

  const toCartesian = (lat: number, lon: number): [number, number, number] => {
    const latR = degToRad(lat);
    const lonR = degToRad(lon);
    const c = Math.cos(latR);
    return [c * Math.cos(lonR), c * Math.sin(lonR), Math.sin(latR)];
  };

  const fromCartesian = (v: [number, number, number]): [number, number] => {
    const [x, y, z] = v;
    const lat = radToDeg(Math.atan2(z, Math.hypot(x, y)));
    const lon = radToDeg(Math.atan2(y, x));
    return [lat, lon];
  };

  const slerp = (a: [number, number], b: [number, number], t: number): [number, number] => {
    const v1 = toCartesian(a[0], a[1]);
    const v2 = toCartesian(b[0], b[1]);
    const dot = clamp(v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2], -1, 1);
    const omega = Math.acos(dot);
    if (omega < 1e-12) return a;
    const sinOmega = Math.sin(omega);
    const w1 = Math.sin((1 - t) * omega) / sinOmega;
    const w2 = Math.sin(t * omega) / sinOmega;
    return fromCartesian([v1[0] * w1 + v2[0] * w2, v1[1] * w1 + v2[1] * w2, v1[2] * w1 + v2[2] * w2]);
  };

  const refinedCrossing = (a: [number, number], b: [number, number], targetLon: number): [number, number] => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 32; i += 1) {
      const mid = (lo + hi) / 2;
      const p = slerp(a, b, mid);
      const lon = normalizeLonToRange(p[1], targetLon - 180);
      if (lon < targetLon) lo = mid;
      else hi = mid;
    }
    const point = slerp(a, b, (lo + hi) / 2);
    return [point[0], targetLon];
  };

  const unwrapped: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const [lat, lonRaw] = points[i];
    const prevLon = unwrapped[unwrapped.length - 1][1];
    let lon = lonRaw;
    while (lon - prevLon > 180) lon -= 360;
    while (lon - prevLon < -180) lon += 360;
    unwrapped.push([lat, lon]);
  }

  const segments: [number, number][][] = [[[unwrapped[0][0], normalizeLon(unwrapped[0][1])]]];
  for (let i = 1; i < unwrapped.length; i += 1) {
    const prev = unwrapped[i - 1];
    const curr = unwrapped[i];
    if (Math.abs(curr[0] - prev[0]) < 1e-10 && Math.abs(curr[1] - prev[1]) < 1e-10) continue;

    const prevBand = Math.floor((prev[1] + 180) / 360);
    const currBand = Math.floor((curr[1] + 180) / 360);
    const currentSegment = segments[segments.length - 1];

    if (prevBand === currBand) {
      currentSegment.push([curr[0], normalizeLon(curr[1])]);
      continue;
    }

    const direction = curr[1] > prev[1] ? 1 : -1;
    let walker = prev;
    let band = prevBand;
    while (band !== currBand) {
      const targetLon = direction > 0 ? 180 + band * 360 : -180 + band * 360;
      const crossing = refinedCrossing(walker, curr, targetLon);
      currentSegment.push([crossing[0], normalizeLon(targetLon)]);
      const wrappedLon = normalizeLon(targetLon + (direction > 0 ? -360 : 360));
      segments.push([[crossing[0], wrappedLon]]);
      band += direction;
      walker = [crossing[0], targetLon + (direction > 0 ? 1e-8 : -1e-8)];
    }

    segments[segments.length - 1].push([curr[0], normalizeLon(curr[1])]);
  }

  return segments.filter((segment) => segment.length > 1);
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


function segmentLengthSquared(a: [number, number], b: [number, number]): number {
  const dLat = b[0] - a[0];
  const dLon = b[1] - a[1];
  return dLat * dLat + dLon * dLon;
}

function hasSelfIntersection(points: [number, number][]): boolean {
  const ring = closeRing(points);
  const ccw = (a: [number, number], b: [number, number], c: [number, number]) => (c[0] - a[0]) * (b[1] - a[1]) > (b[0] - a[0]) * (c[1] - a[1]);
  for (let i = 0; i < ring.length - 1; i += 1) {
    for (let j = i + 2; j < ring.length - 1; j += 1) {
      if (i === 0 && j === ring.length - 2) continue;
      const a = ring[i], b = ring[i + 1], c = ring[j], d = ring[j + 1];
      if (segmentLengthSquared(a, b) < 1e-12 || segmentLengthSquared(c, d) < 1e-12) continue;
      if (ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)) return true;
    }
  }
  return false;
}

function isRenderableRingPart(outer: [number, number][], inner: [number, number][]): boolean {
  if (outer.length < 4 || inner.length < 4) return false;
  const outerArea = Math.abs(ringSignedArea(outer));
  const innerArea = Math.abs(ringSignedArea(inner));
  if (outerArea <= innerArea) return false;
  if (outerArea < 1e-4 || innerArea < 1e-6) return false;
  if (hasSelfIntersection(outer) || hasSelfIntersection(inner)) return false;
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
