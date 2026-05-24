import { bandProfiles } from "./bandProfiles";
import { radiationProfiles } from "./radiationProfiles";
import type { ConditionId, TimeId } from "./types";

interface ControlPanelProps {
  bandId: string; setBandId: (v: string) => void;
  radiationProfileId: string; setRadiationProfileId: (v: string) => void;
  condition: ConditionId; setCondition: (v: ConditionId) => void;
  time: TimeId; setTime: (v: TimeId) => void;
  maxHops: 1 | 2 | 3; setMaxHops: (v: 1 | 2 | 3) => void;
  showLocal: boolean; setShowLocal: (v: boolean) => void;
  showNvis: boolean; setShowNvis: (v: boolean) => void;
  showSkip: boolean; setShowSkip: (v: boolean) => void;
  showHops: boolean; setShowHops: (v: boolean) => void;
  showGlobalDx: boolean; setShowGlobalDx: (v: boolean) => void;
}

export function ControlPanel(props: ControlPanelProps) {
  const activeProfile = radiationProfiles.find((r) => r.id === props.radiationProfileId);
  return <div className="panel"><h2>Kontroller</h2>
    <label>Band<select value={props.bandId} onChange={(e)=>props.setBandId(e.target.value)}>{bandProfiles.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
    <label>Strålningsprofil<select value={props.radiationProfileId} onChange={(e)=>props.setRadiationProfileId(e.target.value)}>{radiationProfiles.map((r)=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
    {activeProfile?.tooltip && <p className="hint">{activeProfile.tooltip}</p>}
    <label>Kondition<select value={props.condition} onChange={(e)=>props.setCondition(e.target.value as ConditionId)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option></select></label>
    <label>Tid<select value={props.time} onChange={(e)=>props.setTime(e.target.value as TimeId)}><option value="day">Dag</option><option value="twilight">Grålinje</option><option value="night">Natt</option></select></label>
    <label>Antal hopp<select value={props.maxHops} onChange={(e)=>props.setMaxHops(Number(e.target.value) as 1|2|3)}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
    <label><input type="checkbox" checked={props.showGlobalDx} onChange={(e)=>props.setShowGlobalDx(e.target.checked)} /> Visa mycket osäkra global-DX-zoner</label>
    <label><input type="checkbox" checked={props.showLocal} onChange={(e)=>props.setShowLocal(e.target.checked)} /> Visa lokal/nära zon</label>
    <label><input type="checkbox" checked={props.showNvis} onChange={(e)=>props.setShowNvis(e.target.checked)} /> Visa NVIS</label>
    <label><input type="checkbox" checked={props.showSkip} onChange={(e)=>props.setShowSkip(e.target.checked)} /> Visa skip zone</label>
    <label><input type="checkbox" checked={props.showHops} onChange={(e)=>props.setShowHops(e.target.checked)} /> Visa hoppringar</label>
  </div>;
}
