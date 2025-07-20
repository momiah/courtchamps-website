const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: "https://courtchamps.com" });

admin.initializeApp();

// Configure Nodemailer for Namecheap Private Email
const transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: "465",
  secure: true,
  auth: {
    user: "info@courtchamps.com",
    pass: "Speedyam1!",
  },
});

//Request account deletion
exports.requestAccountDeletion = functions.https.onRequest(async (req, res) => {
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

      // Send email via Namecheap Private Email
      const mailOptions = {
        from: "info@courtchamps.com",
        to: email,
        subject: "Confirm Your CourtChamps Account Deletion",
        html: `
          <p>Hello,</p>
          <p></p>
          <p>You have requested to delete your CourtChamps account. Please click the link below to proceed:</p>
          <p><a href="https://courtchamps.com/accounts/delete-account?email=${encodeURIComponent(email)}&securetoken=${secureToken}">Confirm Account Deletion</a></p>
          <p></p>
          <p>This link will expire in 30 minutes. If you did not request this, please ignore this email.</p>
          <p></p>
          <p>Best regards,<br>CourtChamps Team</p>
        `,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Error:", error);
      res.status(400).json({
        message: error.code === "auth/user-not-found"
          ? "No account found with this email"
          : error.message.includes("SMTP connection failed") ? error.message
          : "Failed to send verification email",
      });
    }
  });
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