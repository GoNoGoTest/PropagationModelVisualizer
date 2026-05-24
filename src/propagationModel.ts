import { bandProfiles } from "./bandProfiles";
import { radiationProfiles } from "./radiationProfiles";
import { clamp, degToRad, roundToNearest, EARTH_RADIUS_KM } from "./geo";
import type { ConditionId, PropagationResult, ReliabilityCategory, TimeId } from "./types";

const reliabilityOrder: ReliabilityCategory[] = ["very_low", "low", "medium", "high"];
export const reliabilityToNumeric = { very_low: 0.15, low: 0.35, medium: 0.65, high: 0.85 };
const reliabilityLabel = { very_low: "mycket låg", low: "låg", medium: "måttlig", high: "hög" };

export const conditionProfiles = {
  poor: { label: "Poor", reliabilityStep: -1, maxElevationDeltaDeg: -15, f2HeightKm: 280, esHeightKm: 105, ringOpacityMultiplier: 0.55, explanation: "Sämre jonisering/MUF." },
  fair: { label: "Fair", reliabilityStep: 0, maxElevationDeltaDeg: 0, f2HeightKm: 300, esHeightKm: 110, ringOpacityMultiplier: 1.0, explanation: "Normal pedagogisk utgångspunkt." },
  good: { label: "Good", reliabilityStep: 1, maxElevationDeltaDeg: 15, f2HeightKm: 320, esHeightKm: 115, ringOpacityMultiplier: 1.25, explanation: "Bättre jonisering/MUF." }
};

export const timeProfiles = {
  day: { label: "Dag", f2HeightAdjustmentKm: 10, penalty: { "160m": -1, "80m": -1 } as Record<string, number> },
  twilight: { label: "Grålinje", f2HeightAdjustmentKm: 0, penalty: {} as Record<string, number> },
  night: { label: "Natt", f2HeightAdjustmentKm: -10, penalty: { "17m": -1, "15m": -1, "12m": -1, "10m": -1, "6m": -1 } as Record<string, number> }
};

export const stepReliability = (category: ReliabilityCategory, steps: number): ReliabilityCategory => reliabilityOrder[clamp(reliabilityOrder.indexOf(category) + steps, 0, 3)];
export const oneHopDistanceKm = (elevationDeg: number, layerHeightKm: number) => {
  const alpha = degToRad(elevationDeg); const R = EARTH_RADIUS_KM; const h = layerHeightKm;
  const s = -R * Math.sin(alpha) + Math.sqrt((R * Math.sin(alpha)) ** 2 + 2 * R * h + h ** 2);
  const phi = Math.atan2(s * Math.cos(alpha), R + s * Math.sin(alpha));
  return 2 * R * phi;
};
export const formatKmRange = (i: number, o: number) => `cirka ${roundToNearest(i, 100).toLocaleString("sv-SE")}–${roundToNearest(o, 100).toLocaleString("sv-SE")} km`;

export function calculatePropagation(input: { bandId: string; radiationProfileId: string; condition: ConditionId; time: TimeId; maxHops: 1|2|3; showGlobalDx: boolean; }): PropagationResult {
  const band = bandProfiles.find((b) => b.id === input.bandId)!;
  const radiation = radiationProfiles.find((r) => r.id === input.radiationProfileId)!;
  const condition = conditionProfiles[input.condition];
  const time = timeProfiles[input.time];
  const rel = stepReliability(band.fairReliability[input.time], condition.reliabilityStep + (time.penalty[band.id] ?? 0));
  const numericRel = reliabilityToNumeric[rel];
  const maxReturn = clamp(band.maxReturnElevationFairDeg[input.time] + condition.maxElevationDeltaDeg, 2, 85);
  const layer = band.id === "6m" ? "Es" : "F2";
  const layerHeightKm = layer === "Es" ? condition.esHeightKm : clamp(condition.f2HeightKm + time.f2HeightAdjustmentKm, 260, 330);
  const warnings: string[] = [];
  if (band.id === "6m") warnings.push("6 m visas som sporadiskt E-specialfall, inte normal HF-F2-propagation.");
  if (band.id === "10m" && input.condition === "poor" && input.time === "night") warnings.push("10 m är sannolikt stängt i denna kombination.");
  if (input.showGlobalDx) warnings.push("Global-DX-zoner är mycket osäkra och visar endast att flera hopp kan ge interkontinental räckvidd. De är inte en prognos.");

  const angleMin = radiation.angleMinDeg;
  const angleMax = Math.min(radiation.angleMaxDeg, maxReturn);
  const localZone = { id: "local", label: `Lokal/nära zon, ${formatKmRange(0, band.localNearRadiusKm)}`, innerRadiusKm: 0, outerRadiusKm: band.localNearRadiusKm, colorRole: "local" as const, opacity: 0.24, renderingMode: "filled" as const };
  let nvisCoreZone; let nvisFringeZone;
  if (band.nvisCandidate && radiation.nvisWeight >= 0.35 && maxReturn >= 65 && numericRel >= 0.2) {
    nvisCoreZone = { id: "nvis-core", label: "NVIS/regional kärnzon, cirka 0–400 km", innerRadiusKm: 0, outerRadiusKm: 400, colorRole: "nvisCore" as const, opacity: 0.24 * numericRel * radiation.nvisWeight, renderingMode: "filled" as const };
    nvisFringeZone = { id: "nvis-fringe", label: "NVIS/regional osäker ytterzon, cirka 400–650 km", innerRadiusKm: 400, outerRadiusKm: 650, colorRole: "nvisFringe" as const, opacity: 0.12 * numericRel * radiation.nvisWeight, dashed: true, renderingMode: "filled" as const };
  }
  const hopZones = [] as PropagationResult["hopZones"]; let skipZone; let firstHopRange;
  if (angleMax >= angleMin) {
    let inner1 = clamp(oneHopDistanceKm(angleMax, layerHeightKm), 50, 5000);
    let outer1 = clamp(oneHopDistanceKm(angleMin, layerHeightKm), inner1 + 100, 5000);
    if (band.id === "6m") { inner1 = Math.max(inner1, 600); outer1 = Math.min(Math.max(outer1, 1800), 2300); }
    firstHopRange = { inner: inner1, outer: outer1 };
    const skipInner = nvisCoreZone ? Math.max(650, band.localNearRadiusKm) : band.localNearRadiusKm;
    if (inner1 > skipInner) skipZone = { id: "skip", label: `Skip zone / död zon, ${formatKmRange(skipInner, inner1)}`, innerRadiusKm: skipInner, outerRadiusKm: inner1, colorRole: "skip" as const, opacity: 0.15, dashed: true, renderingMode: "filled" as const };

    const highBandForGlobal = ["10m", "12m", "15m", "20m"].includes(band.id);
    const maxHop = input.showGlobalDx && highBandForGlobal ? 5 : input.maxHops;
    for (let hop = 1; hop <= maxHop; hop += 1) {
      const inner = hop * inner1; if (inner > 20000) break;
      const outer = Math.min(20000, hop * outer1);
      const veryUncertain = hop >= 3;
      const globalHop = hop >= 4;
      const suffix = hop === 1 ? "" : hop === 2 ? ", mer osäkert" : hop === 3 ? ", mycket osäkert" : " / global DX, mycket osäkert";
      let opacity = 0.44 * numericRel * condition.ringOpacityMultiplier / (hop ** 1.25);
      if (hop >= 2) opacity = Math.max(opacity, 0.12);
      if (hop >= 3) opacity = Math.max(opacity, 0.18);
      if (globalHop) opacity = Math.max(Math.min(opacity, 0.22), 0.12);
      hopZones.push({ id: `hop-${hop}`, label: `${hop === 3 ? "3:e" : `${hop}:a`} hoppet${suffix}, ${formatKmRange(inner, outer)}`.replace("4:a", "4:e").replace("5:a", "5:e"), hopNumber: hop, innerRadiusKm: inner, outerRadiusKm: outer, colorRole: (hop === 1 ? "hop1" : hop === 2 ? "hop2" : hop === 3 ? "hop3" : hop === 4 ? "hop4" : "hop5") as any, opacity, dashed: veryUncertain, renderingMode: globalHop ? "outline" : (veryUncertain ? "outline" : "filled") });
    }
  } else warnings.push("Skywave mycket osannolik i vald kombination.");

  let explanation = `Bandet ${band.label} med vald strålningsprofil visar typiska zoner där signalen kan återkomma om bandet bär. ${condition.explanation}`;
  if (band.id === "6m") explanation = "6 m visas som sporadiskt E-specialfall. Ringarna är grova typzoner för Es och ska inte tolkas som kontinuerlig HF-propagation.";
  if (band.id === "10m") explanation = "På 10 m når man inte VK/ZL med ett enda normalt F2-hopp från Sverige. Sådana kontakter sker typiskt via flera F2-hopp, ibland 4–5 hopp, eller mer komplex multi-hop/chordal propagation. Därför visas global-DX-zoner endast som mycket osäkra konturer.";

  return { reliabilityCategory: rel, reliabilityLabel: reliabilityLabel[rel], layer, layerHeightKm, effectiveAngleMinDeg: angleMax >= angleMin ? angleMin : null, effectiveAngleMaxDeg: angleMax >= angleMin ? angleMax : null, localZone, nvisCoreZone, nvisFringeZone, skipZone, hopZones, warnings, firstHopRange, explanation };
}
