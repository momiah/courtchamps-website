import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDtoCKYUPTsLSD-nDanaC8IW31mmD6oFaw",
  authDomain: "scoreboard-app-29148.firebaseapp.com",
  projectId: "scoreboard-app-29148"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);