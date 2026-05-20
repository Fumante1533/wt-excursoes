import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let analytics = null;
let messaging = null;
let firebaseConfigError = null;

try {
  // Evita falhas “hard” quando as variáveis de ambiente estão ausentes/erradas.
  const required = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missing = required.filter((k) => !firebaseConfig[k]);
  if (missing.length > 0) {
    firebaseConfigError = new Error(
      `Config Firebase incompleta (faltando: ${missing.join(", ")}).`
    );
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    analytics =
      typeof window !== "undefined" && firebaseConfig.measurementId
        ? getAnalytics(app)
        : null;
    if (typeof window !== "undefined") {
      try {
        messaging = getMessaging(app);
      } catch (messagingErr) {
        console.warn("Firebase Messaging não é suportado neste navegador:", messagingErr);
      }
    }
  }
} catch (err) {
  firebaseConfigError = err;
  app = null;
  auth = null;
  db = null;
  storage = null;
  analytics = null;
  messaging = null;
}

export default firebaseConfig;
export { app, auth, db, storage, analytics, messaging, firebaseConfigError };