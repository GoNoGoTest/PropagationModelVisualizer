import type { RadiationProfile } from "./types";

export const radiationProfiles: RadiationProfile[] = [
  { id: "reference_broad", label: "Bred referensprofil", angleMinDeg: 5, angleMaxDeg: 85, nvisWeight: 0.5, lowAngleWeight: 0.5, notes: "Neutral reference." },
  { id: "low_angle_vertical", label: "Lågstrålande profil, typ 1/4-vågs vertikal", angleMinDeg: 2, angleMaxDeg: 25, nvisWeight: 0.05, lowAngleWeight: 0.9, notes: "Emphasizes low takeoff angles.", tooltip: "2° är en idealiserad mycket låg elevationsvinkel. Verklig antenn, mark, radialer och omgivning kan göra detta betydligt sämre." },
  { id: "low_angle_vertical", label: "Lågstrålande profil, typ 1/4-vågs vertikal", angleMinDeg: 5, angleMaxDeg: 30, nvisWeight: 0.05, lowAngleWeight: 0.9, notes: "Emphasizes low takeoff angles." },
  { id: "high_angle_low_dipole", label: "Högvinklig profil, typ låg dipol ca 0,1 λ", angleMinDeg: 55, angleMaxDeg: 85, nvisWeight: 0.95, lowAngleWeight: 0.05, notes: "Strongly high-angle." },
  { id: "mostly_high_angle_dipole", label: "Mestadels högvinklig profil, typ dipol ca 0,25 λ", angleMinDeg: 35, angleMaxDeg: 80, nvisWeight: 0.75, lowAngleWeight: 0.2, notes: "Mixed but mostly high angle." },
  { id: "mixed_dipole", label: "Blandad profil, typ dipol runt 0,5 λ", angleMinDeg: 20, angleMaxDeg: 60, nvisWeight: 0.35, lowAngleWeight: 0.45, notes: "Mixed regional/DX character." },
  { id: "lower_angle_high_dipole", label: "Mer lågstrålande profil, typ dipol runt 1,0 λ", angleMinDeg: 8, angleMaxDeg: 35, nvisWeight: 0.1, lowAngleWeight: 0.75, notes: "More low-angle behavior." }
];
