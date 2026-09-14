import firebaseAppletConfig from '../../firebase-applet-config.json';

// Firebase Client Configuration
// Safe for public web clients (protected by Firestore Security Rules & Google App ID verification)
// Supports Vite environment variables with fallback to firebase-applet-config.json
export const firebaseConfig = {
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  firestoreDatabaseId: import.meta.env?.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId,
  oAuthClientId: import.meta.env?.VITE_FIREBASE_OAUTH_CLIENT_ID || firebaseAppletConfig.oAuthClientId,
};

export default firebaseConfig;
