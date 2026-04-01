# Fossil Map Explorer

Interactive dinosaur fossil map built with Next.js and a local dataset generated from the Paleobiology Database.

License: MIT

## What It Does

- Loads fossil occurrence data locally from `data/fossils.json`
- Shows every unique fossil site in the current map view
- Filters by:
  - place/taxon/period search
  - geological period
  - taxonomy category and subgroup
  - bird inclusion
  - specific identifications only
  - timeline slider
- Opens a side panel with:
  - fossil image or fallback illustration
  - brief description
  - category and subgroup
  - time and age range
  - locality and source-reference details

## Stack

- Next.js 15
- React 19
- TypeScript
- React Leaflet
- Python 3 data ingestion script

## Data Source

Fossil occurrence data comes from the Paleobiology Database occurrence endpoint:

- `https://paleobiodb.org/data1.2/occs/list.json`

The frontend does **not** call PBDB directly. Data is fetched once by Python and stored locally in:

- [data/fossils.json](/Users/egodinhm/Desktop/Fossils_map/data/fossils.json)

Current generated dataset size:

- `37,692` cleaned records

## Image And Description Source

The fossil detail drawer uses a server-side route:

- [app/api/fossil-media/route.ts](/Users/egodinhm/Desktop/Fossils_map/app/api/fossil-media/route.ts)

That route queries free Wikimedia endpoints for:

- Wikipedia page summaries
- Wikimedia Commons images

It prefers dinosaur-like images such as restorations, skeletons, and mounts. If no trustworthy free image is found, the UI falls back to a local illustration instead of showing a misleading random image.

## Project Structure

- [app/page.tsx](/Users/egodinhm/Desktop/Fossils_map/app/page.tsx): app entry
- [components/fossil-explorer.tsx](/Users/egodinhm/Desktop/Fossils_map/components/fossil-explorer.tsx): main state and layout
- [components/filter-panel.tsx](/Users/egodinhm/Desktop/Fossils_map/components/filter-panel.tsx): top controls
- [components/fossil-map.tsx](/Users/egodinhm/Desktop/Fossils_map/components/fossil-map.tsx): Leaflet map
- [components/fossil-details-drawer.tsx](/Users/egodinhm/Desktop/Fossils_map/components/fossil-details-drawer.tsx): selected-site panel
- [lib/filter-fossils.ts](/Users/egodinhm/Desktop/Fossils_map/lib/filter-fossils.ts): reusable filtering and grouping logic
- [lib/types.ts](/Users/egodinhm/Desktop/Fossils_map/lib/types.ts): shared types
- [scripts/fetch_fossils.py](/Users/egodinhm/Desktop/Fossils_map/scripts/fetch_fossils.py): PBDB ingestion script

## Run Locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Refresh The Dataset

Regenerate the local JSON from PBDB:

```bash
npm run fetch:data
```

This script:

- fetches Dinosauria occurrence records
- removes rows without coordinates
- normalizes taxonomy, time, and locality fields
- stores the result in `data/fossils.json`

## Fossil Record Shape

Each cleaned record includes:

```json
{
  "id": "403027",
  "taxonName": "Allosaurus europaeus",
  "lat": 39.85,
  "lng": -8.617,
  "period": "Late Kimmeridgian to Early Tithonian",
  "group": "Saurischia",
  "collectionNo": "12345",
  "referenceNo": "67890",
  "discoveryDate": "",
  "country": "Portugal",
  "state": "Centro",
  "county": "Leiria",
  "locality": "near village of Andrés...",
  "olderAgeMa": 152.21,
  "youngerAgeMa": 145.0
}
```

## Filters Explained

### Include birds

PBDB `Dinosauria` data includes avian records. This toggle hides them by default so extinct non-avian dinosaurs are easier to explore.

### Specific identifications only

Hides broad labels such as:

- `Dinosauria`
- `Theropoda`
- `Sauropoda`
- `Ornithischia`

This makes the map feel more precise by favoring genus/species-like identifications.

### Site counts

Multiple PBDB records often share the exact same coordinates. The map groups those records into a single clickable site marker.

## Known Limitations

- Some PBDB records are only identifiable to broad groups, not exact dinosaurs.
- Some localities have vague or political-unit-based coordinates.
- Wikimedia does not have good free images for every fossil taxon, especially obscure ichnotaxa and trace fossils.
- `Date of finding` is not shown because PBDB does not reliably provide it.
- Search supports taxon, period, country, state, county, and locality text, but it is still text matching rather than a dedicated geocoder.

## Why Some Images Fall Back

If the app cannot find a trustworthy free image for a fossil, it intentionally shows a fallback illustration instead of:

- a random park or museum result
- a mismatched related dinosaur
- a tiny unrelated fossil fragment

That tradeoff is deliberate.
