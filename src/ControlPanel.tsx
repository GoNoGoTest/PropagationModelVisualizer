import { bandProfiles } from "./bandProfiles";
import { radiationProfiles } from "./radiationProfiles";
import type { ConditionId, TimeId } from "./types";

export function ControlPanel(props: any) {
  return <div className="panel"><h2>Kontroller</h2>
    <label>Band<select value={props.bandId} onChange={(e)=>props.setBandId(e.target.value)}>{bandProfiles.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
    <label>Strålningsprofil<select value={props.radiationProfileId} onChange={(e)=>props.setRadiationProfileId(e.target.value)}>{radiationProfiles.map((r)=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
    <label>Kondition<select value={props.condition} onChange={(e)=>props.setCondition(e.target.value as ConditionId)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option></select></label>
    <label>Tid<select value={props.time} onChange={(e)=>props.setTime(e.target.value as TimeId)}><option value="day">Dag</option><option value="twilight">Grålinje</option><option value="night">Natt</option></select></label>
    <label>Antal hopp<select value={props.maxHops} onChange={(e)=>props.setMaxHops(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
    {['showLocal','showNvis','showSkip','showHops'].map((k)=><label key={k}><input type="checkbox" checked={props[k]} onChange={(e)=>props[`set${k[0].toUpperCase()+k.slice(1)}`](e.target.checked)} /> {k}</label>)}
  </div>;
}
