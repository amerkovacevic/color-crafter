import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import configFromRepo from './firebase-config.json';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  provider: GoogleAuthProvider;
};

let services: FirebaseServices | null = null;

const requiredKeys: (keyof FirebaseOptions)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const repoConfig = configFromRepo as FirebaseOptions;

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || repoConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || repoConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || repoConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || repoConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || repoConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || repoConfig.appId
};

const isConfigValid = requiredKeys.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0;
});

export function getFirebase(): FirebaseServices | null {
  if (!isConfigValid) {
    return null;
  }
  if (!services) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    services = { app, auth, db, provider };
  }
  return services;
}

export async function googleSignIn(): Promise<User | null> {
  const firebase = getFirebase();
  if (!firebase) return null;
  const { auth, provider } = firebase;
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function logOut(): Promise<void> {
  const firebase = getFirebase();
  if (!firebase) return;
  await signOut(firebase.auth);
}

export function listenToAuth(callback: (user: User | null) => void): () => void {
  const firebase = getFirebase();
  if (!firebase) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebase.auth, callback);
}
