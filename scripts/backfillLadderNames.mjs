/**
 * One-off backfill: set `name` on every ladder and ladder pre-registration from
 * the shared getLadderName (city + team type, e.g. "London Men's Singles"), so
 * names typed before the admin form derived them match the ladder tickets.
 *
 * Dry run by default (reads only, prints old -> new):
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccountKey.json \
 *     node scripts/backfillLadderNames.mjs
 * Write the changes:
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccountKey.json \
 *     node scripts/backfillLadderNames.mjs --apply
 *
 * Only `name` is written; documents whose name already matches are skipped, so
 * it is safe to re-run.
 */

import { createRequire } from "node:module";

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const { getLadderName } = require("courtchamps-shared/helpers");
const { LADDER_PRE_REGISTRATIONS_COLLECTION } = require("courtchamps-shared/types");

const PROJECT_ID = "scoreboard-app-29148";
const LADDERS_COLLECTION = "ladders";
const BATCH_LIMIT = 400;
const isApply = process.argv.includes("--apply");

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const backfillCollection = async (collectionName) => {
  const snapshot = await db.collection(collectionName).get();
  const changes = snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        ref: document.ref,
        id: document.id,
        from: data.name ?? "",
        to: getLadderName(data),
      };
    })
    .filter(({ from, to }) => to.length > 0 && from !== to);
  const blank = snapshot.docs.filter(
    (document) => getLadderName(document.data()).length === 0,
  );

  console.log(
    `\n${collectionName}: ${snapshot.size} docs, ${changes.length} to rename, ${blank.length} skipped (no city, region or team type)`,
  );
  for (const { id, from, to } of changes) {
    console.log(`  ${id}: "${from}" -> "${to}"`);
  }
  for (const document of blank) {
    console.log(`  ${document.id}: skipped, nothing to build a name from`);
  }

  if (!isApply) return changes.length;
  for (let start = 0; start < changes.length; start += BATCH_LIMIT) {
    const batch = db.batch();
    for (const { ref, to } of changes.slice(start, start + BATCH_LIMIT)) {
      batch.update(ref, { name: to });
    }
    await batch.commit();
  }
  return changes.length;
};

const ladderCount = await backfillCollection(LADDERS_COLLECTION);
const preRegistrationCount = await backfillCollection(
  LADDER_PRE_REGISTRATIONS_COLLECTION,
);
console.log(
  `\n${isApply ? "Updated" : "Dry run: would update"} ${ladderCount} ladders and ${preRegistrationCount} pre-registrations.${isApply ? "" : " Re-run with --apply to write."}`,
);
