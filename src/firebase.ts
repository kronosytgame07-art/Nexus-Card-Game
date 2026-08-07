// Intégration Firebase pour l'écran Échanges (comptes joueurs + offres d'échange).
// Le jeu reste jouable en solo sans Firebase configuré : tant que les variables
// VITE_FIREBASE_* ne sont pas renseignées (voir .env.example et README.md), `firebaseReady`
// vaut false et l'écran Échanges affiche un message d'indisponibilité plutôt que de planter.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
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
