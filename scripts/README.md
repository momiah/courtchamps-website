# Bulk-importing courts

`importCourts.mjs` pulls real venues (with coordinates) from the Google Places
API (New) and writes them to the `courts` collection in Firestore. Because a
court is verified purely by having latitude/longitude, every imported court is
verified automatically.

## One-time setup

1. **Places API** — in the Google Cloud project that has billing enabled, enable
   **Places API (New)** and create an API key. This can be the same project as
   your Maps key.
2. **Service account** — in the Firebase console for `scoreboard-app-29148`, go
   to _Project settings → Service accounts → Generate new private key_ and save
   the JSON somewhere outside the repo (or it is git-ignored if kept as
   `serviceAccountKey.json`).
3. **Env file** — create a `.env` in the repo root (git-ignored):

   ```
   GOOGLE_MAPS_API_KEY=your-places-api-key
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json
   IMPORT_ACTOR_UID=google-places-import
   ```

4. **Search config** — copy the example and edit it for your sports/regions:

   ```
   cp scripts/courts-import.example.json scripts/courts-import.json
   ```

   Each search has a `textQuery` (e.g. `"badminton courts in North London, UK"`),
   an optional `includedType` (e.g. `sports_complex`), and `maxPages` (each page
   is up to 20 results, max 3 pages ≈ 60 results per query).

## Running

Preview what would be imported (no writes):

```
node --env-file=.env scripts/importCourts.mjs --dry-run
```

Import for real:

```
node --env-file=.env scripts/importCourts.mjs
```

The script de-duplicates against courts already in Firestore by Google place id
and by name + proximity (`dedupeRadiusMeters`, default 200 m), so it is safe to
re-run and to extend the config over time. Imported courts store their
`googlePlaceId` so future runs skip them.

## Notes

- Places billing applies per request — Text Search is a paid SKU. A few dozen
  queries is inexpensive; check your Cloud billing if you plan large sweeps.
- Review the `--dry-run` output before writing. If a venue looks wrong, tighten
  the `textQuery` or remove it afterwards from the Courts admin page.
