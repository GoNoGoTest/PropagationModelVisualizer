import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeRingGeometryForLeaflet } from '../dist-test/geo.js';

const cases = {
  sweden: { center: { lat: 59.3293, lon: 18.0686 }, inner: 300, outer: 1200 },
  alaska: { center: { lat: 64.2008, lon: -149.4937 }, inner: 400, outer: 1800 },
  fiji: { center: { lat: -17.7134, lon: 178.065 }, inner: 200, outer: 1000 },
  nearDateline: { center: { lat: 0, lon: 179.9 }, inner: 100, outer: 900 },
  crossDatelineRadius: { center: { lat: 37.7749, lon: -179.2 }, inner: 700, outer: 2600 },
};

const snapshotPath = new URL('./__snapshots__/zoneGeometry.snap.json', import.meta.url);
const snapshots = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

for (const [name, cfg] of Object.entries(cases)) {
  test(`snapshot ${name}`, () => {
    const got = makeRingGeometryForLeaflet(cfg.center, cfg.inner, cfg.outer);
    assert.deepEqual(got, snapshots[name]);
  });
}
