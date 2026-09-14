import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase Admin SDK
let adminApp;
if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: firebaseConfig.projectId,
      });
    } catch (e) {
      console.warn('[FirebaseAdmin] Falha ao carregar FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      adminApp = initializeApp({ projectId: firebaseConfig.projectId });
    }
  } else {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminDb = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(adminApp);

export const adminAuth = getAuth(adminApp);
