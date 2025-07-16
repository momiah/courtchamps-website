const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: "https://courtchamps.com" });

admin.initializeApp();

// Store deletion token in Firestore
exports.storeDeletionToken = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        // Check if user exists in Firebase Authentication
        await admin.auth().getUserByEmail(email);

        // Generate a secure token
        const secureToken = require("crypto").randomBytes(16).toString("hex");

        // Store token in Firestore with 30-minute expiry
        await admin.firestore().collection("deletionTokens").doc(email).set({
        secureToken,
        expires: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
        });

        res.status(200).json({ secureToken });
    } catch (error) {
        console.error("Error:", error);
        res.status(400).json({
        message: error.code === "auth/user-not-found"
            ? "No account found with this email"
            : "Failed to store deletion token",
        });
    }
  })  
});

// Confirm account deletion (Option 1: users collection uses uid)
exports.confirmAccountDeletion = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
      const { email, secureToken } = req.body;

    try {
        // Verify token in Firestore
        const doc = await admin.firestore().collection("deletionTokens").doc(email).get();
        if (!doc.exists) {
        throw new Error("Invalid or expired token");
        }

        const { secureToken: storedToken, expires } = doc.data();
        if (storedToken !== secureToken || expires.toDate() < new Date()) {
        throw new Error("Invalid or expired token");
        }

        // Delete user from Firebase Auth
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(user.uid);

        // Delete user data from Firestore (assuming users collection uses uid as doc ID)
        await admin.firestore().collection("users").doc(user.uid).delete();

        // Clean up token
        await admin.firestore().collection("deletionTokens").doc(email).delete();

        res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("Error:", error);
        res.status(400).json({ message: error.message || "Failed to delete account" });
    }
  })  
});

// I was not sure if I should use email or userId for Confirm account deletion (Option 2: users collection uses userId)
exports.confirmAccountDeletionWithUserId = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const { email, secureToken } = req.body;

    try {
        // Verify token in Firestore
        const doc = await admin.firestore().collection("deletionTokens").doc(email).get();
        if (!doc.exists) {
        throw new Error("Invalid or expired token");
        }

        const { secureToken: storedToken, expires } = doc.data();
        if (storedToken !== secureToken || expires.toDate() < new Date()) {
        throw new Error("Invalid or expired token");
        }

        // Delete user from Firebase Auth
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(user.uid);

        // Find user document in Firestore by email (as you used userId is a field)
        const userQuery = await admin.firestore()
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

        if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await userDoc.ref.delete(); // Delete the document
        }

        // Clean up token
        await admin.firestore().collection("deletionTokens").doc(email).delete();

        res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("Error:", error);
        res.status(400).json({ message: error.message || "Failed to delete account" });
    }
  })  
});