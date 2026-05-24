export type ReliabilityCategory = "very_low" | "low" | "medium" | "high";
export type ConditionId = "poor" | "fair" | "good";
export type TimeId = "day" | "twilight" | "night";
export type RenderingMode = "filled" | "outline" | "globalEnvelope";

export interface BandProfile {
  id: string;
  label: string;
  frequencyMHz: number;
  frequencyRange: string;
  normalLayer: "F2" | "Es";
  localNearRadiusKm: number;
  nvisCandidate: boolean;
  notes: string;
  fairReliability: Record<TimeId, ReliabilityCategory>;
  maxReturnElevationFairDeg: Record<TimeId, number>;
}

export interface RadiationProfile {
  id: string;
  label: string;
  angleMinDeg: number;
  angleMaxDeg: number;
  nvisWeight: number;
  lowAngleWeight: number;
  notes: string;
  tooltip?: string;
}

export interface RingZone {
  id: string;
  label: string;
  innerRadiusKm: number;
  outerRadiusKm: number;
  hopNumber?: number;
  colorRole: "local" | "nvisCore" | "nvisFringe" | "skip" | "hop1" | "hop2" | "hop3" | "hop4" | "hop5" | "globalDx";
  opacity: number;
  dashed?: boolean;
  renderingMode: RenderingMode;
  uncertaintyLabel?: string;
}

export interface PropagationResult {
  reliabilityCategory: ReliabilityCategory;
  reliabilityLabel: string;
  layer: "F2" | "Es";
  layerHeightKm: number;
  effectiveAngleMinDeg: number | null;
  effectiveAngleMaxDeg: number | null;
  localZone: RingZone;
  nvisCoreZone?: RingZone;
  nvisFringeZone?: RingZone;
  skipZone?: RingZone;
  hopZones: RingZone[];
  warnings: string[];
  explanation: string;
  firstHopRange?: { inner: number; outer: number };
}
