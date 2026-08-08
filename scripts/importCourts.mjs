/**
 * Bulk-import verified courts from the Google Places API (New) into Firestore.
 *
 * A court is "verified" purely by having latitude/longitude, and Places always
 * returns coordinates, so every imported court is verified.
 *
 * Setup (run from the repo root):
 *   1. Enable the "Places API (New)" in your Google Cloud project and create an
 *      API key. Put it in GOOGLE_MAPS_API_KEY.
 *   2. Create a Firebase service-account key (Project settings -> Service
 *      accounts -> Generate new private key) and point GOOGLE_APPLICATION_CREDENTIALS
 *      at the downloaded JSON file.
 *   3. Copy scripts/courts-import.example.json to scripts/courts-import.json and
 *      edit the searches for your sports and regions.
 *   4. Preview without writing:
 *        node --env-file=.env scripts/importCourts.mjs --dry-run
 *      Then write for real:
 *        node --env-file=.env scripts/importCourts.mjs
 *
 * Env vars:
 *   GOOGLE_MAPS_API_KEY            (required) Places API (New) key
 *   GOOGLE_APPLICATION_CREDENTIALS (required) path to service-account JSON
 *   IMPORT_ACTOR_UID              (optional) stored as submittedBy/verifiedBy
 *                                  (default "google-places-import")
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = "scoreboard-app-29148";
const COURTS_COLLECTION = "courts";
const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.addressComponents",
  "places.types",
].join(",");

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
const actorUid = process.env.IMPORT_ACTOR_UID ?? "google-places-import";
const isDryRun = process.argv.includes("--dry-run");

if (!apiKey) {
  console.error("Missing GOOGLE_MAPS_API_KEY.");
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(resolve(scriptDir, "courts-import.json"), "utf8"),
);
const searches = Array.isArray(config.searches) ? config.searches : [];
const dedupeRadiusMeters =
  typeof config.dedupeRadiusMeters === "number"
    ? config.dedupeRadiusMeters
    : 200;

// Names containing any of these (case-insensitive) are skipped: shops,
// stringing/retail services, street names and non-badminton venues. Override
// via "excludeNameKeywords" in courts-import.json.
const DEFAULT_EXCLUDE_KEYWORDS = [
  "stringing",
  "restring",
  "stringer",
  "racket service",
  "racket players",
  "decathlon",
  "sports direct",
  "padel",
  "mews",
  "badminton close",
  "badminton group",
  "tennis",
  "lido",
  "stadium",
  "athletics",
  "swimming",
];
const excludeKeywords = (
  Array.isArray(config.excludeNameKeywords)
    ? config.excludeNameKeywords
    : DEFAULT_EXCLUDE_KEYWORDS
).map((keyword) => String(keyword).toLowerCase());

const isExcludedName = (courtName) => {
  const normalized = courtName.toLowerCase();
  return excludeKeywords.some((keyword) => normalized.includes(keyword));
};

// Google has no "badminton court" type, so exclude place types that are clearly
// not indoor court venues. Type-based (not name-based) so a venue with e.g.
// "Park" in its name is only dropped if Google actually types it as a park.
// Only genuinely-non-court types. Note: leisure centres are multi-sport and are
// often typed swimming_pool/stadium/gym alongside their badminton courts, so
// those types are NOT excluded — otherwise real badminton venues get dropped.
const DEFAULT_EXCLUDE_TYPES = [
  "park",
  "national_park",
  "dog_park",
  "playground",
  "tourist_attraction",
  "store",
  "sporting_goods_store",
  "shopping_mall",
  "historical_landmark",
  "lodging",
  "hotel",
  "place_of_worship",
];
const excludeTypes = new Set(
  (Array.isArray(config.excludePlaceTypes)
    ? config.excludePlaceTypes
    : DEFAULT_EXCLUDE_TYPES
  ).map((placeType) => String(placeType).toLowerCase()),
);

const hasExcludedType = (types) =>
  (types ?? []).some((placeType) =>
    excludeTypes.has(String(placeType).toLowerCase()),
  );

if (searches.length === 0) {
  console.error("No searches configured in scripts/courts-import.json.");
  process.exit(1);
}

const findComponent = (components, type) =>
  (components ?? []).find((component) =>
    (component.types ?? []).includes(type),
  );

const toCourtLocation = (place) => {
  const components = place.addressComponents ?? [];
  const cityComponent =
    findComponent(components, "postal_town") ??
    findComponent(components, "locality") ??
    findComponent(components, "administrative_area_level_2");
  const postCodeComponent = findComponent(components, "postal_code");
  const countryComponent = findComponent(components, "country");

  return {
    address: place.formattedAddress ?? "",
    city: cityComponent?.longText ?? "",
    country: countryComponent?.longText ?? "",
    countryCode: countryComponent?.shortText ?? "",
    postCode: postCodeComponent?.longText ?? "",
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  };
};

const distanceMeters = (first, second) => {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLng = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
};

const searchPlaces = async ({ textQuery, includedType, maxPages }) => {
  const collected = [];
  let pageToken;
  const pageLimit = typeof maxPages === "number" ? maxPages : 3;

  for (let page = 0; page < pageLimit; page += 1) {
    const body = { textQuery, pageSize: 20 };
    if (includedType) {
      body.includedType = includedType;
    }
    if (pageToken) {
      body.pageToken = pageToken;
    }

    const response = await fetch(PLACES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Places request failed (${response.status}): ${detail}`);
    }

    const payload = await response.json();
    collected.push(...(payload.places ?? []));

    pageToken = payload.nextPageToken;
    if (!pageToken) {
      break;
    }
    // The next_page_token needs a brief moment before it becomes valid.
    await new Promise((resolvePause) => setTimeout(resolvePause, 2000));
  }

  return collected;
};

const run = async () => {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore();

  console.log("Loading existing courts for de-duplication…");
  const existingSnapshot = await db.collection(COURTS_COLLECTION).get();
  const existingPlaceIds = new Set();
  const existingPoints = [];
  existingSnapshot.forEach((courtDoc) => {
    const data = courtDoc.data();
    if (typeof data.googlePlaceId === "string") {
      existingPlaceIds.add(data.googlePlaceId);
    }
    const latitude = data.location?.latitude;
    const longitude = data.location?.longitude;
    if (typeof latitude === "number" && typeof longitude === "number") {
      existingPoints.push({
        name: (data.courtName ?? "").trim().toLowerCase(),
        latitude,
        longitude,
      });
    }
  });
  console.log(`Found ${existingSnapshot.size} existing courts.`);

  const seenPlaceIds = new Set();
  const toCreate = [];

  for (const search of searches) {
    console.log(`Searching: ${search.textQuery}`);
    const places = await searchPlaces(search);
    console.log(`  ${places.length} results`);

    for (const place of places) {
      const placeId = place.id;
      const location = toCourtLocation(place);
      const courtName = place.displayName?.text ?? "";

      if (
        !placeId ||
        !courtName ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        continue;
      }
      if (isExcludedName(courtName) || hasExcludedType(place.types)) {
        continue;
      }
      if (seenPlaceIds.has(placeId) || existingPlaceIds.has(placeId)) {
        continue;
      }

      const isNearDuplicate = existingPoints.some(
        (point) =>
          point.name === courtName.trim().toLowerCase() &&
          distanceMeters(point, location) <= dedupeRadiusMeters,
      );
      if (isNearDuplicate) {
        continue;
      }

      seenPlaceIds.add(placeId);
      toCreate.push({ courtName, location, placeId, types: place.types ?? [] });
    }
  }

  console.log(`\n${toCreate.length} new courts to import.`);
  toCreate.forEach((court) =>
    console.log(
      `  • ${court.courtName} — ${court.location.city}  [${court.types.join(", ")}]`,
    ),
  );

  if (isDryRun) {
    console.log("\nDry run — nothing written.");
    return;
  }
  if (toCreate.length === 0) {
    return;
  }

  let batch = db.batch();
  let pending = 0;
  for (const court of toCreate) {
    const courtRef = db.collection(COURTS_COLLECTION).doc();
    batch.set(courtRef, {
      courtName: court.courtName,
      location: court.location,
      verified: true,
      submittedBy: actorUid,
      verifiedBy: actorUid,
      verifiedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      googlePlaceId: court.placeId,
    });
    pending += 1;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) {
    await batch.commit();
  }

  console.log(`\nImported ${toCreate.length} courts.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
