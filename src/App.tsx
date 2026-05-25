import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { OpenLayersView } from "./OpenLayersView";
import { makeRingPolygon } from "./geo";

type TestPoint = { name: string; lat: number; lon: number };

const EXTREME_POINTS: TestPoint[] = [
  { name: "Hög latitud", lat: 84, lon: 20 },
  { name: "Nära +180", lat: 10, lon: 179.6 },
  { name: "Nära -180", lat: 10, lon: -179.6 },
];

const featureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: EXTREME_POINTS.map((point) => {
    const annulus = makeRingPolygon({ lat: point.lat, lon: point.lon }, 450, 1100);
    return {
      type: "Feature",
      properties: { label: `Annulus ${point.name}` },
      geometry: {
        type: "Polygon",
        coordinates: [
          annulus.outer.map(([lat, lon]) => [lon, lat]),
          annulus.inner.map(([lat, lon]) => [lon, lat]),
        ],
      },
    };
  }),
};

function LeafletPanel() {
  return (
    <MapContainer center={[40, 170]} zoom={1} style={{ height: "420px", width: "100%" }} worldCopyJump>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={featureCollection as any} style={{ color: "#228be6", weight: 1, fillOpacity: 0.35 }} />
    </MapContainer>
  );
}

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>Decision spike v2: Leaflet vs OpenLayers (dateline/annulus)</h1>
      <p>Tre extrema testpunkter: {EXTREME_POINTS.map((p) => `${p.name} (${p.lat}, ${p.lon})`).join(" • ")}</p>
      <p>Samma GeoJSON annulus renderas i båda kartmotorer. OpenLayers har wrapX/world-wrap påslaget.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <section>
          <h2>Leaflet</h2>
          <LeafletPanel />
        </section>
        <section>
          <h2>OpenLayers</h2>
          <OpenLayersView featureCollection={featureCollection} points={EXTREME_POINTS.map((p) => [p.lat, p.lon])} />
        </section>
      </div>
      <h2>Go / No-go matris</h2>
      <ul>
        <li>Pass om annulus visas som sammanhängande ring utan dateline-seam artefakt.</li>
        <li>Pass om samma GeoJSON-topologi (polygon + hål) fungerar utan split/wedge-speciallogik.</li>
        <li>Migrera endast om OpenLayers får pass i alla tre punkter och minskar total workaround-kod.</li>
      </ul>
    </div>
  );
}
