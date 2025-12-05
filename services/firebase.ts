
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANcKnqcQrZf3X7bZnrkp4m1lEe2rIEPtw",
  authDomain: "gen-lang-client-0550155750.firebaseapp.com",
  projectId: "gen-lang-client-0550155750",
  storageBucket: "gen-lang-client-0550155750.firebasestorage.app",
  messagingSenderId: "647685192966",
  appId: "1:647685192966:web:6bb1ec7d46b5beae573287",
  measurementId: "G-K5NL9FMFY8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Firebase Analytics failed to initialize:", error);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
