import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, Polyline } from "react-leaflet";
import { isSafeFilledRing, makeGeodesicCircleLine, makeRingPolygon, splitPolylineAtAntimeridian } from "./geo";
import type { RingZone } from "./types";

const colorMap = { local: "var(--local)", nvisCore: "var(--nvisCore)", nvisFringe: "var(--nvisFringe)", skip: "var(--skip)", hop1: "var(--hop1)", hop2: "var(--hop2)", hop3: "var(--hop3)", hop4: "var(--hop4)", hop5: "var(--hop5)", globalDx: "var(--globalDx)" };
function QthClick({ onSet }: { onSet: (q: {lat:number;lon:number}) => void }) { useMapEvents({ click(e){ onSet({lat:e.latlng.lat, lon:e.latlng.lng}); } }); return null; }

function ZoneLayer({ qth, zone }: { qth: {lat:number;lon:number}, zone: RingZone }) {
  const safe = zone.renderingMode === "filled" && isSafeFilledRing(qth, zone.innerRadiusKm, zone.outerRadiusKm, zone.hopNumber);
  if (safe) {
    const ring = makeRingPolygon(qth, zone.innerRadiusKm, zone.outerRadiusKm);
    return <Polygon positions={[ring.outer, ring.inner]} pathOptions={{color:colorMap[zone.colorRole], fillColor:colorMap[zone.colorRole], fillOpacity:zone.opacity, weight:1, dashArray:zone.dashed?"6 6":undefined}}><Popup>{zone.label}</Popup></Polygon>;
  }
  if (zone.renderingMode === "globalEnvelope") {
    const globalLine = makeGeodesicCircleLine(qth, zone.outerRadiusKm);
    const globalSegments = splitPolylineAtAntimeridian(globalLine);
    const renderAsFilledZone = !zone.dashed;

    if (renderAsFilledZone && globalSegments.length === 1) {
      return <Polygon positions={globalSegments[0]} pathOptions={{color:colorMap.globalDx, fillColor:colorMap.globalDx, fillOpacity:zone.opacity, weight:1, dashArray:zone.dashed?"6 6":undefined}}><Popup>{zone.label}</Popup></Polygon>;
    }

    return <>{globalSegments.map((segment, i) => <Polyline key={`${zone.id}-g-${i}`} positions={segment} pathOptions={{color:colorMap.globalDx, opacity:zone.opacity, weight:2, dashArray:zone.dashed?"6 8":undefined}}><Popup>{zone.label}</Popup></Polyline>)}</>;
  }
  const outerSegments = splitPolylineAtAntimeridian(makeGeodesicCircleLine(qth, zone.outerRadiusKm));
  const innerSegments = zone.innerRadiusKm > 0 ? splitPolylineAtAntimeridian(makeGeodesicCircleLine(qth, zone.innerRadiusKm)) : [];
  return <>{outerSegments.map((s, i) => <Polyline key={`${zone.id}-o-${i}`} positions={s} pathOptions={{color:colorMap[zone.colorRole], opacity:zone.opacity, weight:2, dashArray:zone.dashed?"6 8":"4 4"}}><Popup>{zone.label}</Popup></Polyline>)}{innerSegments.map((s, i) => <Polyline key={`${zone.id}-i-${i}`} positions={s} pathOptions={{color:colorMap[zone.colorRole], opacity:Math.max(zone.opacity * 0.7, 0.06), weight:1, dashArray:"6 8"}} />)}</>;
}

export function MapView({ qth, zones, onSetQth }: { qth: {lat:number;lon:number}|null; zones: RingZone[]; onSetQth: (q:{lat:number;lon:number})=>void }) {
  return <MapContainer center={[57.5,12]} zoom={5} style={{height:"100%", width:"100%"}}>
    <QthClick onSet={onSetQth} />
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {qth && <Marker position={[qth.lat, qth.lon]}><Popup>QTH</Popup></Marker>}
    {qth && zones.map((z)=> <ZoneLayer key={z.id} qth={qth} zone={z} />)}
  </MapContainer>;
}
