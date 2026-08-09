// Sauvegarde cloud liée au compte Google — voir src/firebase.ts pour la connexion
// et le composant GoogleSignInGate dans App.tsx pour le point d'entrée UI.
//
// Plutôt que de choisir manuellement quels champs du store synchroniser (risque de
// désynchronisation avec store/game.ts à chaque nouvel ajout), on réutilise tel quel
// le blob JSON que zustand `persist` écrit déjà dans localStorage sous la clé
// `nexus-save` (voir store/game.ts) : c'est la même sérialisation, une seule source
// de vérité pour "ce qu'est une sauvegarde".

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseReady } from './firebase';
import { useGame } from './store/game';

const SAVE_KEY = 'nexus-save';
const BACKUP_KEY = 'nexus-save-before-cloud-import';
const COLLECTION = 'saves';

function readLocalSaveRaw(): string | null {
  return localStorage.getItem(SAVE_KEY);
}

/** Récupère la sauvegarde cloud du compte, ou `null` si ce compte n'en a encore aucune. */
export async function fetchCloudSave(uid: string): Promise<string | null> {
  if (!firebaseReady || !db) return null;
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { raw?: string };
  return data.raw ?? null;
}

/** Pousse l'état local actuel (déjà sérialisé par zustand persist) vers le cloud. */
export async function pushCloudSave(uid: string): Promise<void> {
  if (!firebaseReady || !db) return;
  const raw = readLocalSaveRaw();
  if (!raw) return;
  await setDoc(doc(db, COLLECTION, uid), { raw, updatedAt: serverTimestamp() });
}

/** Remplace la sauvegarde locale par celle du cloud puis fait rejouer l'hydratation
    zustand (merge() dans store/game.ts s'occupe des migrations), sans recharger la page. */
export async function applyCloudSave(raw: string): Promise<void> {
  // Une connexion depuis un second appareil ne doit jamais écraser silencieusement
  // la progression locale. On conserve la dernière sauvegarde avant import.
  const localRaw = readLocalSaveRaw();
  if (localRaw && localRaw !== raw) localStorage.setItem(BACKUP_KEY, localRaw);
  localStorage.setItem(SAVE_KEY, raw);
  await useGame.persist.rehydrate();
}

let pushTimer: number | undefined;

/** S'abonne aux changements du store et pousse la sauvegarde vers le cloud avec un
    court debounce (évite une écriture Firestore à chaque frappe/état intermédiaire).
    Retourne une fonction de désabonnement (déconnexion, changement de compte). */
export function startCloudSaveSync(uid: string): () => void {
  const unsubscribe = useGame.subscribe(() => {
    if (pushTimer) window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => { pushCloudSave(uid).catch(() => {}); }, 3000);
  });
  return () => {
    unsubscribe();
    if (pushTimer) window.clearTimeout(pushTimer);
  };
}
