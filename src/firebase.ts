// Intégration Firebase pour l'écran Échanges (comptes joueurs + offres d'échange).
// Le jeu reste jouable en solo sans Firebase configuré : tant que les variables
// VITE_FIREBASE_* ne sont pas renseignées (voir .env.example et README.md), `firebaseReady`
// vaut false et l'écran Échanges affiche un message d'indisponibilité plutôt que de planter.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (firebaseReady) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

let anonSignIn: Promise<User> | null = null;

/** Connexion anonyme, mémorisée (un seul appel réseau même si demandée plusieurs fois) —
    déclenchée uniquement à la première visite de l'écran Échanges, jamais au démarrage. */
export function ensureSignedIn(): Promise<User> {
  if (!firebaseReady || !auth) return Promise.reject(new Error('Firebase non configuré.'));
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!anonSignIn) {
    const currentAuth = auth;
    anonSignIn = new Promise<User>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(currentAuth, (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        }
      }, reject);
      signInAnonymously(currentAuth).catch((err) => {
        unsubscribe();
        reject(err);
      });
    });
  }
  return anonSignIn;
}

const googleProvider = new GoogleAuthProvider();

/** Connexion Google explicite (bouton) — remplace une éventuelle session anonyme
    par le vrai compte de l'utilisateur, ce qui préserve le même uid pour les échanges
    et sert de clé de sauvegarde cloud (voir src/cloudSave.ts). */
export function signInWithGoogle(): Promise<User> {
  if (!firebaseReady || !auth) return Promise.reject(new Error('Firebase non configuré.'));
  return signInWithPopup(auth, googleProvider).then((credential) => credential.user);
}

export function signOutUser(): Promise<void> {
  if (!auth) return Promise.resolve();
  anonSignIn = null;
  return signOut(auth);
}

/** true si l'utilisateur connecté a un vrai compte Google (pas une session anonyme). */
export function isGoogleUser(user: User | null | undefined): boolean {
  return Boolean(user && !user.isAnonymous);
}

/** S'abonne à l'état de connexion Firebase. Sans config Firebase, appelle immédiatement
    le callback avec `null` (aucune connexion possible) et ne s'abonne à rien. */
export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  if (!firebaseReady || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
