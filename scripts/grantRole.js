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
