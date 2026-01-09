// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDj2T4MXZKFgSvP9RbWr3GgwHpsNRxjP0Q",
  authDomain: "wordsgame-5adb8.firebaseapp.com",
  projectId: "wordsgame-5adb8",
  storageBucket: "wordsgame-5adb8.firebasestorage.app",
  messagingSenderId: "737527761668",
  appId: "1:737527761668:web:114015aca3f17784ed9e51",
  measurementId: "G-TXZRS9T23E"
};

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null;
let db: Firestore;

if (typeof window !== "undefined") {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
} else {
  // Server-side initialization
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
}

export { app, analytics, db };
