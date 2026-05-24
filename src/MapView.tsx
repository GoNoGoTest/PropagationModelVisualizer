import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import { isSafeFilledRing, makeRenderableRingSegments, makeRingPolygon } from "./geo";
import type { RingZone } from "./types";

const colorMap = { local: "var(--local)", nvisCore: "var(--nvisCore)", nvisFringe: "var(--nvisFringe)", skip: "var(--skip)", hop1: "var(--hop1)", hop2: "var(--hop2)", hop3: "var(--hop3)", hop4: "var(--hop4)", hop5: "var(--hop5)", globalDx: "var(--globalDx)" };
function QthClick({ onSet }: { onSet: (q: {lat:number;lon:number}) => void }) { useMapEvents({ click(e){ onSet({lat:e.latlng.lat, lon:e.latlng.lng}); } }); return null; }

function ZoneLayer({ qth, zone }: { qth: {lat:number;lon:number}, zone: RingZone }) {
  const style = {color:colorMap[zone.colorRole], fillColor:colorMap[zone.colorRole], fillOpacity:zone.opacity, weight:1, dashArray:zone.dashed?"6 6":undefined};
  const safeFilled = isSafeFilledRing(qth, zone.innerRadiusKm, zone.outerRadiusKm, zone.hopNumber);

  if (safeFilled) {
    const ring = makeRingPolygon(qth, zone.innerRadiusKm, zone.outerRadiusKm);
    return <Polygon positions={[ring.outer, ring.inner]} pathOptions={style}><Popup>{zone.label}</Popup></Polygon>;
  }

  const { outerSegments, innerSegments } = makeRenderableRingSegments(qth, zone.innerRadiusKm, zone.outerRadiusKm);
  const hasSplitSegments = outerSegments.length > 1 || innerSegments.length > 1;

  if (hasSplitSegments && outerSegments.length === innerSegments.length) {
    return <>
      {outerSegments.map((outerSegment, idx) => {
        const innerSegment = innerSegments[idx];
        return <Polygon key={`${zone.id}-seg-${idx}`} positions={[outerSegment, [...innerSegment].reverse()]} pathOptions={style}><Popup>{zone.label}</Popup></Polygon>;
      })}
    </>;
  }

  return <>
    {outerSegments.map((segment, idx) => <Polyline key={`${zone.id}-outer-${idx}`} positions={segment} pathOptions={{...style, fillOpacity:0}}><Popup>{zone.label}</Popup></Polyline>)}
    {innerSegments.map((segment, idx) => <Polyline key={`${zone.id}-inner-${idx}`} positions={segment} pathOptions={{...style, fillOpacity:0}} />)}
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
