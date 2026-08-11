// Multijoueur en temps réel : file d'attente + synchronisation de partie via Firestore.
// L'état canonique d'un match est toujours stocké du point de vue de l'hôte
// ("player" = hôte, "enemy" = invité). Le client invité applique
// flipPerspective() pour se voir comme "player" localement, et la ré-applique
// avant d'écrire (opération symétrique) pour reconvertir en point de vue hôte.
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, runTransaction, serverTimestamp, setDoc, Unsubscribe, where } from 'firebase/firestore';
import { db, ensureSignedIn, firebaseReady } from './firebase';
import { flipPerspective, newPvpGame } from './engine/engine';
import type { Faction, GameState } from './engine/types';

export type PvpMode = 'classic' | 'ranked';

export interface PvpPlayerInfo {
  uid: string;
  name: string;
  faction: Faction;
  deck: string[];
  // Firestore refuse les champs undefined : toujours un tableau, vide si non personnalisée.
  evosphere: string[];
  rating: number;
}

export interface PvpMatchDoc {
  hostUid: string;
  guestUid: string;
  hostName: string;
  guestName: string;
  mode: PvpMode;
  state: GameState;
  lastWriterUid: string;
  status: 'active' | 'finished';
  createdAt?: unknown;
  updatedAt?: unknown;
}

const QUEUE = 'pvp_queue';
const MATCHES = 'pvp_matches';

/** Cherche un adversaire en attente pour ce mode ; si personne n'est trouvé,
 * s'inscrit dans la file et attend qu'un autre joueur le récupère.
 * Retourne un handle avec le matchId (résolu dès qu'un match est établi,
 * dans un sens comme dans l'autre) et une fonction pour annuler la recherche. */
export function searchForMatch(
  mode: PvpMode,
  me: PvpPlayerInfo,
  onMatched: (matchId: string, isHost: boolean) => void,
  onError: (err: unknown) => void
): () => void {
  let cancelled = false;
  let queueUnsub: Unsubscribe | null = null;
  let selfQueued = false;

  const cleanupQueue = async () => {
    if (!db || !selfQueued) return;
    selfQueued = false;
    try { await deleteDoc(doc(db, QUEUE, me.uid)); } catch { /* déjà consommé par un pairing concurrent */ }
  };

  const tryClaim = async () => {
    if (!db) return false;
    // Un seul filtre d'inégalité (uid !=) : pas besoin d'index composite.
    const candidatesQuery = query(collection(db, QUEUE), where('mode', '==', mode), where('uid', '!=', me.uid), limit(8));
    const snap = await getDocs(candidatesQuery);
    for (const candidateDoc of snap.docs) {
      if (cancelled) return true;
      const candidate = candidateDoc.data() as PvpPlayerInfo & { createdAt: unknown };
      try {
        const matchId = `${me.uid}_${candidate.uid}_${Date.now()}`;
        const claimed = await runTransaction(db, async (tx) => {
          const freshCandidate = await tx.get(doc(db!, QUEUE, candidate.uid));
          if (!freshCandidate.exists()) return false;
          const fresh = freshCandidate.data() as PvpPlayerInfo;
          const state = newPvpGame(me.faction, me.deck, me.evosphere, fresh.faction, fresh.deck, fresh.evosphere);
          tx.set(doc(db!, MATCHES, matchId), {
            hostUid: me.uid,
            guestUid: fresh.uid,
            hostName: me.name,
            guestName: fresh.name,
            mode,
            state,
            lastWriterUid: me.uid,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          } satisfies PvpMatchDoc);
          tx.delete(doc(db!, QUEUE, candidate.uid));
          return true;
        });
        if (claimed) {
          await cleanupQueue();
          if (!cancelled) onMatched(matchId, true);
          return true;
        }
      } catch {
        // Un autre client a probablement gagné la course sur ce candidat : on essaie le suivant.
      }
    }
    return false;
  };

  const waitAsGuest = () => {
    if (!db) return;
    const matchesQuery = query(collection(db, MATCHES), where('guestUid', '==', me.uid), where('status', '==', 'active'));
    queueUnsub = onSnapshot(matchesQuery, (snap) => {
      if (cancelled || snap.empty) return;
      const found = snap.docs[0];
      cleanupQueue();
      onMatched(found.id, false);
    });
  };

  (async () => {
    try {
      await ensureSignedIn();
      const claimed = await tryClaim();
      if (claimed || cancelled) return;
      if (!db) return;
      selfQueued = true;
      await setDoc(doc(db, QUEUE, me.uid), { ...me, mode, createdAt: serverTimestamp() });
      waitAsGuest();
    } catch (err) {
      onError(err);
    }
  })();

  return () => {
    cancelled = true;
    queueUnsub?.();
    cleanupQueue();
  };
}

/** Écoute un match en cours et fournit l'état toujours vu de MON point de
 * vue ("player" = moi), quel que soit mon rôle hôte/invité réel. */
export function subscribeMatch(matchId: string, isHost: boolean, onState: (state: GameState, raw: PvpMatchDoc) => void, onGone: () => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, MATCHES, matchId), (snap) => {
    if (!snap.exists()) { onGone(); return; }
    const data = snap.data() as PvpMatchDoc;
    onState(isHost ? data.state : flipPerspective(data.state), data);
  });
}

/** Pousse mon nouvel état (calculé dans MON point de vue "player") vers le
 * document partagé, reconverti en point de vue hôte si je suis l'invité.
 * "Qui a gagné" se déduit toujours de state.winner une fois relu avec
 * subscribeMatch (déjà remis dans le point de vue de qui le lit). */
export async function pushMatchState(matchId: string, myUid: string, isHost: boolean, myState: GameState): Promise<void> {
  if (!db) return;
  const canonical = isHost ? myState : flipPerspective(myState);
  const patch: Record<string, unknown> = { state: canonical, lastWriterUid: myUid, updatedAt: serverTimestamp() };
  if (canonical.winner) patch.status = 'finished';
  await setDoc(doc(db, MATCHES, matchId), patch, { merge: true });
}

/** Abandonne la recherche ou la partie en cours (nettoyage best-effort). */
export async function leaveMatch(matchId: string): Promise<void> {
  if (!db) return;
  try { await setDoc(doc(db, MATCHES, matchId), { status: 'finished' } as Partial<PvpMatchDoc>, { merge: true }); } catch { /* le document peut déjà avoir disparu */ }
}

export const pvpEnabled = firebaseReady;
