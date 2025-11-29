import { credential } from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load Firebase service account key from environment variable or default path
let firebaseAdminCredential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    firebaseAdminCredential = credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
  } catch (e) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY environment variable:', e);
    // Fallback to file path if parsing fails
    const serviceAccountPath = resolve((process as any).cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json');
    console.warn(`Falling back to Firebase service account file at: ${serviceAccountPath}`);
    firebaseAdminCredential = credential.cert(serviceAccountPath);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  const serviceAccountPath = resolve((process as any).cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  firebaseAdminCredential = credential.cert(serviceAccountPath);
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH not set. Firebase Admin SDK might not initialize correctly.');
}

export const firebaseApp = initializeApp({
  credential: firebaseAdminCredential,
});

export const firebaseAuth = firebaseApp.auth();