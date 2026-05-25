import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import { ControlPanel } from "./ControlPanel";
import { Legend } from "./Legend";
import { ModelExplanation } from "./ModelExplanation";
import { bandProfiles } from "./bandProfiles";
import { radiationProfiles } from "./radiationProfiles";
import { calculatePropagation, formatKmRange } from "./propagationModel";

export default function App(){
  const [qth,setQth]=useState<{lat:number;lon:number}|null>(null);
  const [bandId,setBandId]=useState("20m"); const [radiationProfileId,setRadiationProfileId]=useState("mixed_dipole");
  const [condition,setCondition]=useState<"poor"|"fair"|"good">("fair"); const [time,setTime]=useState<"day"|"twilight"|"night">("day");
  const [showNvis,setShowNvis]=useState(true);
  const result = useMemo(()=>calculatePropagation({bandId,radiationProfileId,condition,time,maxHops:8}),[bandId,radiationProfileId,condition,time]);
  const nvisAvailable = Boolean(result.nvisCoreZone || result.nvisFringeZone);
  const zones=[result.localZone,showNvis?result.nvisCoreZone:undefined,showNvis?result.nvisFringeZone:undefined,result.skipZone,result.hopZones].flat().filter(Boolean) as any[];
  const band = bandProfiles.find((b) => b.id === bandId) ?? bandProfiles[0];
  const profile = radiationProfiles.find((r) => r.id === radiationProfileId) ?? radiationProfiles[0];
  return <div className="layout"><aside><ControlPanel {...{bandId,setBandId,radiationProfileId,setRadiationProfileId,condition,setCondition,time,setTime,showNvis,setShowNvis,nvisAvailable}} />
    <div className="panel"><h3>Modellstatus</h3><p>Band: {band.label}</p><p>Frekvensintervall: {band.frequencyRange}</p><p>Strålningsprofil: {profile.label}</p><p>Tid: {time}</p><p>Kondition: {condition}</p><p>Tillförlitlighet: {result.reliabilityLabel}</p><p>Lager: {result.layer}</p><p>Effektiv lagerhöjd: {Math.round(result.layerHeightKm/10)*10} km</p><p>Elevationsfönster: {result.effectiveAngleMinDeg ?? "-"}–{result.effectiveAngleMaxDeg ?? "-"}°</p><p>Första hoppet: {result.firstHopRange?formatKmRange(result.firstHopRange.inner,result.firstHopRange.outer):"-"}</p><p>Skip-status: {result.skipStatusLabel}</p><p>Alla zoner visas nu konsekvent som fyllda fält, där mer osäkra zoner får lägre opacitet.</p>{result.warnings.map((w)=> <p key={w}>⚠ {w}</p>)}</div>
    <ModelExplanation text={result.explanation}/></aside>
    <main><Legend />{!qth && <div className="clickhint">Klicka på kartan för att sätta QTH</div>}<MapView qth={qth} zones={zones} onSetQth={setQth} /></main></div>;
}
