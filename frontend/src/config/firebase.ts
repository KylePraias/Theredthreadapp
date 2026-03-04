import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  initializeAuth,
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

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
let auth: ReturnType<typeof getAuth>;
try {
  auth = Platform.OS === 'web'
    ? initializeAuth(app)
    : getAuth(app);
} catch (error) {
  auth = getAuth(app);
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Google Sign-In function (web only)
export const signInWithGoogle = async () => {
  if (Platform.OS !== 'web') {
    throw new Error('Google Sign-In via popup is only supported on web');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
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

// Sign out function
export const signOutFromFirebase = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
  }
};

export { auth, googleProvider };