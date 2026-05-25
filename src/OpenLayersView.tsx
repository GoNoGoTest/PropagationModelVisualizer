import { useEffect, useRef } from "react";

declare global {
  interface Window {
    ol?: any;
  }
}

let olLoader: Promise<void> | null = null;

function loadOpenLayers() {
  if (window.ol) return Promise.resolve();
  if (olLoader) return olLoader;

  olLoader = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/ol@v10.6.1/ol.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/ol@v10.6.1/dist/ol.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load OpenLayers from CDN"));
    document.head.appendChild(script);
  });

  return olLoader;
}

export function OpenLayersView({ featureCollection, points }: { featureCollection: GeoJSON.FeatureCollection; points: [number, number][] }) {
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    let canceled = false;

    loadOpenLayers()
      .then(() => {
        if (!targetRef.current || !window.ol || canceled) return;
        const ol = window.ol;

        targetRef.current.innerHTML = "";

        const features = new ol.format.GeoJSON().readFeatures(featureCollection, { featureProjection: "EPSG:3857" });
        for (const [lat, lon] of points) {
          features.push(new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])) }));
        }

        map = new ol.Map({
          target: targetRef.current,
          layers: [
            new ol.layer.Tile({ source: new ol.source.OSM({ wrapX: true }) }),
            new ol.layer.Vector({
              source: new ol.source.Vector({ features, wrapX: true }),
              style: (feature: any) => {
                const geomType = feature.getGeometry()?.getType();
                if (geomType === "Point") {
                  return new ol.style.Style({
                    image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: "#d7263d" }), stroke: new ol.style.Stroke({ color: "white", width: 1 }) }),
                  });
                }
                return new ol.style.Style({
                  fill: new ol.style.Fill({ color: "rgba(34, 139, 230, 0.35)" }),
                  stroke: new ol.style.Stroke({ color: "rgba(34, 139, 230, 1)", width: 1 }),
                });
              },
            }),
          ],
          view: new ol.View({ center: ol.proj.fromLonLat([170, 40]), zoom: 1 }),
        });
      })
      .catch(() => {});

    return () => {
      canceled = true;
      map?.setTarget(undefined);
    };
  }, [featureCollection, points]);

  return <div style={{ height: "420px", width: "100%" }} ref={targetRef} />;
}
