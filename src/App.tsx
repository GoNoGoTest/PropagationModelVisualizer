import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import { ControlPanel } from "./ControlPanel";
import { Legend } from "./Legend";
import { ModelExplanation } from "./ModelExplanation";
import { calculatePropagation, formatKmRange } from "./propagationModel";

export default function App(){
  const [qth,setQth]=useState<{lat:number;lon:number}|null>(null);
  const [bandId,setBandId]=useState("20m"); const [radiationProfileId,setRadiationProfileId]=useState("mixed_dipole");
  const [condition,setCondition]=useState<"poor"|"fair"|"good">("fair"); const [time,setTime]=useState<"day"|"twilight"|"night">("day"); const [maxHops,setMaxHops]=useState<1|2|3>(2);
  const [showLocal,setShowLocal]=useState(true); const [showNvis,setShowNvis]=useState(true); const [showSkip,setShowSkip]=useState(true); const [showHops,setShowHops]=useState(true);
  const result = useMemo(()=>calculatePropagation({bandId,radiationProfileId,condition,time,maxHops}),[bandId,radiationProfileId,condition,time,maxHops]);
  const zones=[showLocal?result.localZone:undefined,showNvis?result.nvisCoreZone:undefined,showNvis?result.nvisFringeZone:undefined,showSkip?result.skipZone:undefined,showHops?result.hopZones:undefined].flat().filter(Boolean) as any[];
  return <div className="layout"><aside><ControlPanel {...{bandId,setBandId,radiationProfileId,setRadiationProfileId,condition,setCondition,time,setTime,maxHops,setMaxHops,showLocal,setShowLocal,showNvis,setShowNvis,showSkip,setShowSkip,showHops,setShowHops}} />
    <div className="panel"><h3>Modellstatus</h3><p>Tillförlitlighet: {result.reliabilityLabel}</p><p>Lager: {result.layer}</p><p>Effektiv lagerhöjd: {Math.round(result.layerHeightKm/10)*10} km</p><p>Elevationsfönster: {result.effectiveAngleMinDeg ?? "-"}–{result.effectiveAngleMaxDeg ?? "-"}°</p><p>Första hoppet: {result.firstHopRange?formatKmRange(result.firstHopRange.inner,result.firstHopRange.outer):"-"}</p>{result.warnings.map((w)=> <p key={w}>⚠ {w}</p>)}</div>
    <ModelExplanation text={result.explanation}/></aside>
    <main><Legend />{!qth && <div className="clickhint">Klicka på kartan för att sätta QTH</div>}<MapView qth={qth} zones={zones} onSetQth={setQth} /></main></div>;
}
