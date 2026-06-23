import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { environment } from '../../../environments/environment';

// Firebase configuration settings loaded from environment
export const firebaseConfig = environment.firebase;

// Check if credentials are placeholders or if actual Firebase config was supplied
export const isFirebaseConfigured = (): boolean => {
  return (
    firebaseConfig.apiKey !== 'PLACEHOLDER_API_KEY' &&
    firebaseConfig.apiKey.trim() !== ''
  );
};

let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;
let firebaseStorage: any = null;
let firebaseMessaging: any = null;

// Lazy services loader
export const getFirebaseServices = () => {
  if (!isFirebaseConfigured()) {
    return { auth: null, db: null, storage: null };
  }
  
  if (!firebaseApp) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      firebaseAuth = getAuth(firebaseApp);
      firebaseDb = getFirestore(firebaseApp);
      firebaseStorage = getStorage(firebaseApp);
    } catch (e) {
      console.error('Firebase initialization failed:', e);
      return { auth: null, db: null, storage: null };
    }
  }

  return {
    auth: firebaseAuth,
    db: firebaseDb,
    storage: firebaseStorage
  };
};

export const getFirebaseMessaging = async () => {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (!firebaseApp) {
    getFirebaseServices();
  }

  if (!firebaseMessaging && firebaseApp) {
    try {
      const supported = await isSupported();
      if (supported) {
        firebaseMessaging = getMessaging(firebaseApp);
      }
    } catch (e) {
      console.warn('Firebase Messaging failed to initialize:', e);
    }
  }

  return firebaseMessaging;
};
