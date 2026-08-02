import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Same Firebase project as the Court Champs mobile app (scoreboard-app-29148).
// These are Firebase Web SDK config values — public by design, since the SDK
// ships them to every browser.
//
// The stable project identifiers are committed directly. The apiKey,
// messagingSenderId and appId are read from the REACT_APP_* environment (the
// existing .env, matching src/services/firebase.config.js), so they live
// alongside the rest of the project's Firebase env config.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "scoreboard-app-29148.firebaseapp.com",
  projectId: "scoreboard-app-29148",
  storageBucket: "scoreboard-app-29148.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export default firebaseApp;
