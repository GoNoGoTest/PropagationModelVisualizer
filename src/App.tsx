import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { OpenLayersView } from "./OpenLayersView";
import { makeRingPolygon } from "./geo";

const EXTREME_POINTS: [string, { lat: number; lon: number }][] = [
  ["Hög latitud", { lat: 84, lon: 20 }],
  ["Nära +180", { lat: 10, lon: 179.6 }],
  ["Nära -180", { lat: 10, lon: -179.6 }],
];

const annulus = makeRingPolygon({ lat: 10, lon: 179.6 }, 450, 1100);
const featureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { label: "Annulus-zon" },
      geometry: {
        type: "Polygon",
        coordinates: [
          annulus.outer.map(([lat, lon]) => [lon, lat]),
          annulus.inner.map(([lat, lon]) => [lon, lat]),
        ],
      },
    },
  ],
};

function LeafletPanel() {
  return (
    <MapContainer center={[74, 179]} zoom={2} style={{ height: "420px", width: "100%" }} worldCopyJump>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={featureCollection as any} style={{ color: "#228be6", weight: 1, fillOpacity: 0.35 }} />
    </MapContainer>
  );
}

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>Spike: Leaflet vs OpenLayers (dateline/annulus)</h1>
      <p>Tre extrema testpunkter: {EXTREME_POINTS.map(([name, p]) => `${name} (${p.lat}, ${p.lon})`).join(" • ")}</p>
      <p>Samma GeoJSON annulus renderas i båda kartmotorer. OpenLayers har wrapX/world-wrap påslaget.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <section>
          <h2>Leaflet</h2>
          <LeafletPanel />
        </section>
        <section>
          <h2>OpenLayers</h2>
          <OpenLayersView featureCollection={featureCollection} points={EXTREME_POINTS.map(([, p]) => [p.lat, p.lon])} />
        </section>
      </div>
      <h2>Topologisk jämförelse</h2>
      <ul>
        <li>GeoJSON innehåller 1 polygon med 2 ringar (ytter + hål/inner), utan split/wedge-speciallogik.</li>
        <li>Leaflet tenderar att få dateline-artefakter för den här typen av annulus nära ±180°.</li>
        <li>OpenLayers med wrapX hanterar normalt kontinuiteten över dateline stabilare för samma geometri.</li>
      </ul>
      <h2>Beslutskriterium</h2>
      <p>Migrera endast om OpenLayers eliminerar dateline-buggar i dessa fall med mindre total kod än nuvarande workaround-spår.</p>
    </div>
  );
}
