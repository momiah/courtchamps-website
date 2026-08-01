/*
 * grantRole.js — manual, local-only role bootstrap script.
 *
 * This script is run BY HAND on a trusted machine and is NEVER deployed or
 * bundled with the website. It exists because clients cannot write to the
 * userRoles collection (see firestore.rules), so the first privileged users
 * must be seeded out of band with Admin SDK credentials.
 *
 * Usage:
 *   1. Download a service account key for scoreboard-app-29148 from
 *      Firebase console → Project settings → Service accounts → Generate key.
 *   2. Point GOOGLE_APPLICATION_CREDENTIALS at it, or pass the path inline:
 *
 *        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *          node scripts/grantRole.js owner@example.com owner
 *
 *   Roles must be one of: owner, admin, moderator.
 *
 * Never commit the service account key. Keep it out of the repository.
 */

const admin = require("firebase-admin");

const VALID_ROLES = ["owner", "admin", "moderator"];

async function grantRole() {
  const email = process.argv[2];
  const role = process.argv[3];

  if (!email || !role) {
    console.error(
      "Usage: node scripts/grantRole.js <email> <role>\n" +
        "  role must be one of: " +
        VALID_ROLES.join(", "),
    );
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(
      `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(", ")}`,
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  const userRecord = await admin.auth().getUserByEmail(email);

  await admin
    .firestore()
    .collection("userRoles")
    .doc(userRecord.uid)
    .set({ role, email });

  console.log(
    `Granted role "${role}" to ${email} (uid: ${userRecord.uid}) in userRoles.`,
  );
}

grantRole()
  .then(() => process.exit(0))
  .catch((grantError) => {
    console.error("Failed to grant role:", grantError);
    process.exit(1);
  });
