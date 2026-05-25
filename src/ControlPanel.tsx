import { bandProfiles } from "./bandProfiles";
import { radiationProfiles } from "./radiationProfiles";
import type { ConditionId, TimeId } from "./types";

interface ControlPanelProps {
  bandId: string; setBandId: (v: string) => void;
  radiationProfileId: string; setRadiationProfileId: (v: string) => void;
  condition: ConditionId; setCondition: (v: ConditionId) => void;
  time: TimeId; setTime: (v: TimeId) => void;
  showNvis: boolean; setShowNvis: (v: boolean) => void;
  nvisAvailable: boolean;
}

export function ControlPanel(props: ControlPanelProps) {
  const activeProfile = radiationProfiles.find((r) => r.id === props.radiationProfileId);
  return <div className="panel"><h2>Kontroller</h2>
    <label>Band<select value={props.bandId} onChange={(e)=>props.setBandId(e.target.value)}>{bandProfiles.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
    <label>Strålningsprofil<select value={props.radiationProfileId} onChange={(e)=>props.setRadiationProfileId(e.target.value)}>{radiationProfiles.map((r)=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
    {activeProfile?.tooltip && <p className="hint">{activeProfile.tooltip}</p>}
    <label>Kondition<select value={props.condition} onChange={(e)=>props.setCondition(e.target.value as ConditionId)}><option value="poor">Dålig</option><option value="fair">Normal</option><option value="good">Bra</option></select></label>
    <label>Tid<select value={props.time} onChange={(e)=>props.setTime(e.target.value as TimeId)}><option value="day">Dag</option><option value="twilight">Grålinje</option><option value="night">Natt</option></select></label>
    <label><input type="checkbox" checked={props.showNvis} disabled={!props.nvisAvailable} onChange={(e)=>props.setShowNvis(e.target.checked)} /> Visa NVIS</label>
    {!props.nvisAvailable && <p className="hint">NVIS är ej sannolik i denna kombination av band, profil, tid och kondition.</p>}
  </div>;
}
