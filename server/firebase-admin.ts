import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

let initialized = false;

export function getDb() {
  if (!initialized) {
    if (!getApps().length) {
      try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
          : null;

        if (serviceAccount) {
          initializeApp({
            credential: cert(serviceAccount),
            projectId: 'orbital-hybrid-bknl3'
          });
        } else {
          initializeApp({
            credential: applicationDefault(),
            projectId: 'orbital-hybrid-bknl3'
          });
        }
      } catch (error) {
        console.error("Failed to initialize Firebase Admin. Set FIREBASE_SERVICE_ACCOUNT.", error);
      }
    }
    initialized = true;
  }
  return getFirestore();
}
