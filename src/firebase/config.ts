import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  // Serve the OAuth handler from our own domain where possible. On mobile
  // Safari, using the default *.firebaseapp.com authDomain makes the handler's
  // sessionStorage third-party, which iOS partitions/clears and breaks
  // signInWithPopup ("missing initial state"). Point this at the domain that
  // serves the app (e.g. courtchamps.com) via REACT_APP_FIREBASE_AUTH_DOMAIN.
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ??
    "scoreboard-app-29148.firebaseapp.com",
  projectId: "scoreboard-app-29148",
  storageBucket: "scoreboard-app-29148.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(
  firebaseApp,
  "gs://scoreboard-app-29148.firebasestorage.app",
);
export default firebaseApp;
