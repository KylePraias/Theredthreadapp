import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  initializeAuth,
  Auth,
} from 'firebase/auth';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

const getFirebaseApp = () => {
  if (!app) {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured');
    }
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return app;
};

const getFirebaseAuth = () => {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    try {
      auth = Platform.OS === 'web'
        ? getAuth(firebaseApp)
        : initializeAuth(firebaseApp);
    } catch (error) {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
};

const getGoogleProvider = () => {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
  }
  return googleProvider;
};

export const signInWithGoogle = async () => {
  if (Platform.OS !== 'web') {
    throw new Error('Google Sign-In via popup is only supported on web.');
  }

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Please check your environment variables.');
  }

  try {
    const firebaseAuth = getFirebaseAuth();
    const provider = getGoogleProvider();
    const result = await signInWithPopup(firebaseAuth, provider, browserPopupRedirectResolver);
    const user = result.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const signOutFromFirebase = async () => {
  try {
    if (auth) {
      await auth.signOut();
    }
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

export { getFirebaseAuth as auth, getGoogleProvider as googleProvider };