import { makeRingGeometryForLeaflet } from "./geo";
import type { RenderableZone, RingZone } from "./types";

type Qth = { lat: number; lon: number };

export function toRenderableZone(zone: RingZone, qth: Qth): RenderableZone | null {
  const parts = makeRingGeometryForLeaflet(qth, zone.innerRadiusKm, zone.outerRadiusKm);
  if (parts.length === 0) return null;

  const geometry =
    parts.length === 1
      ? ({ type: "polygon", coordinates: parts[0] } as const)
      : ({ type: "multiPolygon", coordinates: parts } as const);

  return {
    zoneId: zone.id,
    label: zone.label,
    colorRole: zone.colorRole,
    opacity: zone.opacity,
    geometry,
  };
}

export function toRenderableZones(zones: RingZone[], qth: Qth): RenderableZone[] {
  return zones.map((zone) => toRenderableZone(zone, qth)).filter((zone): zone is RenderableZone => zone !== null);
}
