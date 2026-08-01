import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Same Firebase project as the Court Champs mobile app (scoreboard-app-29148).
// These are Firebase Web SDK config values. They are public by design — the
// SDK ships them to every browser — so they are committed directly here.
//
// The three commented values below (apiKey, messagingSenderId, appId) are the
// only ones this repo did not already have on hand. Paste the real values from
// Firebase console → Project settings → General → "Your apps" → Web app config.
// A REACT_APP_* environment override is honoured when present so nothing has to
// be hardcoded in environments that already inject it.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ?? "PASTE_WEB_API_KEY",
  authDomain: "scoreboard-app-29148.firebaseapp.com",
  projectId: "scoreboard-app-29148",
  storageBucket: "scoreboard-app-29148.appspot.com",
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ??
    "PASTE_MESSAGING_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID ?? "PASTE_APP_ID",
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export default firebaseApp;
