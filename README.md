# Propagation Model Visualizer (MVP)

Pedagogisk single-page webapp för att visualisera typiska räckviddszoner på HF och 6 m.

## Installera och köra

```bash
npm install
npm run dev
```

## Modellbegränsningar

- Pedagogisk tumregel, inte faktisk QSO-prognos.
- Ingen backend, inga externa propagations-API:er.
- Deterministisk och tabellbaserad modell.
- Ringar visar typiska zoner och osäkerhet ökar snabbt för fler hopp.

## Ändra tabellvärden

- Banddata: `src/bandProfiles.ts`
- Strålningsprofiler: `src/radiationProfiles.ts`
- Kondition/tid/reliability: `src/propagationModel.ts`

## Viktigt

Appen visar pedagogiska zoner, inte om ett specifikt QSO kommer fungera.


## Nya förbättringar i denna version

- Säkrare kart-rendering: stora/polnära/antimeridiankorsande zoner renderas som konturer istället för fyllda polygoner.
- Valbar visning av mycket osäkra global-DX-zoner (hopp 4–5) för 10m/12m/15m/20m.
