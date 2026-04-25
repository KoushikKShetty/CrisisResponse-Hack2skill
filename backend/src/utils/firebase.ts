import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// To run this locally without crashing if credentials are not yet provided,
// we will mock the initialization or use a placeholder if env vars are missing.
const initializeFirebase = () => {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines if passed via env var
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('🔥 Firebase Admin initialized successfully');
    } else {
      console.warn('⚠️  Firebase credentials not fully provided. Running in mock/offline mode for development.');
      // Initialize a mock app for testing without credentials
      admin.initializeApp({ 
        projectId: 'crisis-responder-mock',
        databaseURL: 'https://crisis-responder-mock.firebaseio.com' 
      });
    }
  } catch (error) {
    console.error('Firebase initialization error', error);
  }
};

initializeFirebase();

export const db = admin.database();
export const auth = admin.auth();
