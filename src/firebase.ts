// Firebase : échanges, identité joueur et sauvegarde Google.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithPopup, linkWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
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
export const firebaseMissingKeys = [
  !config.apiKey && 'VITE_FIREBASE_API_KEY',
  !config.projectId && 'VITE_FIREBASE_PROJECT_ID',
  !config.appId && 'VITE_FIREBASE_APP_ID',
].filter(Boolean) as string[];

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
if (firebaseReady) { app = initializeApp(config); auth = getAuth(app); db = getFirestore(app); }
export { auth, db };

let anonSignIn: Promise<User> | null = null;
export function ensureSignedIn(): Promise<User> {
  if (!firebaseReady || !auth) return Promise.reject(new Error('Firebase non configuré.'));
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!anonSignIn) {
    const currentAuth = auth;
    anonSignIn = new Promise<User>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(currentAuth, (user) => { if (user) { unsubscribe(); resolve(user); } }, reject);
      signInAnonymously(currentAuth).catch((err) => { unsubscribe(); reject(err); });
    });
  }
  return anonSignIn;
}

const googleProvider = new GoogleAuthProvider();
/** Lie un compte Google à la session anonyme existante pour conserver le même UID,
 * donc le même code ami, les échanges en attente et la sauvegarde cloud. */
export async function signInWithGoogle(): Promise<User> {
  if (!firebaseReady || !auth) throw new Error('Firebase non configuré.');
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try { return (await linkWithPopup(current, googleProvider)).user; }
    catch (err: any) {
      // Si ce Google existe déjà, Firebase refuse le link : on bascule alors sur ce compte.
      if (err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/email-already-in-use') {
        return (await signInWithPopup(auth, googleProvider)).user;
      }
      throw err;
    }
  }
  return (await signInWithPopup(auth, googleProvider)).user;
}
export function signOutUser(): Promise<void> { if (!auth) return Promise.resolve(); anonSignIn=null; return signOut(auth); }
export function isGoogleUser(user: User | null | undefined): boolean { return Boolean(user && !user.isAnonymous); }
export function subscribeAuthState(callback:(user:User|null)=>void):()=>void { if(!firebaseReady||!auth){callback(null);return()=>{}} return onAuthStateChanged(auth,callback); }
