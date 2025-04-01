import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error('FIREBASE_ADMIN_PRIVATE_KEY is not set in environment variables');
}

if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
  throw new Error('FIREBASE_ADMIN_CLIENT_EMAIL is not set in environment variables');
}

if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
  throw new Error('FIREBASE_ADMIN_PROJECT_ID is not set in environment variables');
}

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Replace newlines in the private key
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore(); 