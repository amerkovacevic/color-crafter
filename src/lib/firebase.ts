import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore
} from 'firebase/firestore';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  provider: GoogleAuthProvider;
};

let services: FirebaseServices | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigValid = Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0);

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
