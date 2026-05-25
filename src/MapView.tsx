import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import { makeRingGeometryForLeaflet } from "./geo";
import type { RingZone } from "./types";

const colorMap = { local: "var(--local)", nvisCore: "var(--nvisCore)", nvisFringe: "var(--nvisFringe)", skip: "var(--skip)", hop1: "var(--hop1)", hop2: "var(--hop2)", hop3: "var(--hop3)", hop4: "var(--hop4)", hop5: "var(--hop5)", globalDx: "var(--globalDx)" };
function QthClick({ onSet }: { onSet: (q: {lat:number;lon:number}) => void }) { useMapEvents({ click(e){ onSet({lat:e.latlng.lat, lon:e.latlng.lng}); } }); return null; }

function ZoneLayer({ qth, zone }: { qth: {lat:number;lon:number}, zone: RingZone }) {
  const style = {color:colorMap[zone.colorRole], fillColor:colorMap[zone.colorRole], fillOpacity:zone.opacity, weight:0};
  const ringParts = makeRingGeometryForLeaflet(qth, zone.innerRadiusKm, zone.outerRadiusKm);

  return <>
    {ringParts.map((part, partIndex) => (
      <Polygon key={`${zone.id}-${partIndex}`} positions={part} pathOptions={style}>
        {partIndex === 0 && <Popup>{zone.label}</Popup>}
      </Polygon>
    ))}
  </>;
}

export function MapView({ qth, zones, onSetQth }: { qth: {lat:number;lon:number}|null; zones: RingZone[]; onSetQth: (q:{lat:number;lon:number})=>void }) {
  return <MapContainer center={[57.5,12]} zoom={5} style={{height:"100%", width:"100%"}}>
    <QthClick onSet={onSetQth} />
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {qth && <Marker position={[qth.lat, qth.lon]}><Popup>QTH</Popup></Marker>}
    {qth && zones.map((z)=> <ZoneLayer key={z.id} qth={qth} zone={z} />)}
  </MapContainer>;
}
