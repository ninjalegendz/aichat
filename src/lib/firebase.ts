
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD7yQnrlu9wP8HEGexMdFkiAe5B3t3nAdA",
  authDomain: "glaciensupport.firebaseapp.com",
  projectId: "glaciensupport",
  storageBucket: "glaciensupport.firebasestorage.app",
  messagingSenderId: "626560116670",
  appId: "1:626560116670:web:9a176fd7311114d8f5fbef",
  measurementId: "G-6XKRBZFX7H"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
