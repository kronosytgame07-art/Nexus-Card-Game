// Connexion Google + sauvegarde cloud. Chargé à la demande (voir le `lazy()` dans
// App.tsx) pour ne pas alourdir le bundle principal avec le SDK Firebase — même
// raison que Trades.tsx pour l'écran Échanges.
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { firebaseReady, isGoogleUser, signInWithGoogle, signOutUser, subscribeAuthState } from './firebase';
import { applyCloudSave, fetchCloudSave, pushCloudSave, startCloudSaveSync } from './cloudSave';
import { useGame } from './store/game';

function useGoogleAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => subscribeAuthState(setUser), []);
  useEffect(() => {
    if (!isGoogleUser(user)) return;
    return startCloudSaveSync(user!.uid);
  }, [user?.uid]);

  const signIn = async () => {
    setBusy(true); setError('');
    try {
      const signedIn = await signInWithGoogle();
      const cloudRaw = await fetchCloudSave(signedIn.uid);
      if (cloudRaw) await applyCloudSave(cloudRaw);
      else await pushCloudSave(signedIn.uid);
      useGame.getState().dismissGoogleSignIn();
    } catch {
      setError('Connexion impossible — réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  const signOutAccount = async () => {
    setBusy(true);
    try { await signOutUser(); } finally { setBusy(false); }
  };

  return { user, connected: isGoogleUser(user), busy, error, signIn, signOutAccount };
}

/** Invite affichée une fois au lancement (tant que non connecté et non ignorée) —
    proposer de sauvegarder la progression sur un compte Google plutôt que de la
    laisser uniquement sur cet appareil. */
export function GoogleSignInGate() {
  const dismissed = useGame((s) => s.googleSignInDismissed);
  const dismiss = useGame((s) => s.dismissGoogleSignIn);
  const { connected, busy, error, signIn } = useGoogleAccount();
  if (!firebaseReady || dismissed || connected) return null;
  return (
    <div className="signin-gate-overlay" role="dialog" aria-modal="true">
      <div className="signin-gate-card">
        <b>Sauvegarder ta progression</b>
        <p>Connecte-toi avec Google pour retrouver ton deck, ta collection et ta progression sur n'importe quel appareil.</p>
        {error && <small className="signin-gate-error">{error}</small>}
        <button className="primary" disabled={busy} onClick={signIn}>{busy ? 'Connexion…' : 'Se connecter avec Google'}</button>
        <button className="secondary" disabled={busy} onClick={dismiss}>Continuer sans compte</button>
      </div>
    </div>
  );
}

/** Section Compte affichée dans l'onglet Profil — accès permanent à la connexion,
    même après avoir fermé l'invite de lancement. */
export default function GoogleAccountSection() {
  const { user, connected, busy, error, signIn, signOutAccount } = useGoogleAccount();
  if (!firebaseReady) return null;
  return (
    <div className="account-section">
      <h3>Compte</h3>
      {connected ? (
        <div className="account-connected">
          <p className="hint">Connecté avec {user?.displayName ?? user?.email ?? 'Google'} — ta progression se synchronise automatiquement.</p>
          <button className="secondary" disabled={busy} onClick={signOutAccount}>Se déconnecter</button>
        </div>
      ) : (
        <div className="account-disconnected">
          <p className="hint">Pas encore connecté — ta progression reste uniquement sur cet appareil.</p>
          {error && <small className="signin-gate-error">{error}</small>}
          <button className="primary" disabled={busy} onClick={signIn}>{busy ? 'Connexion…' : 'Se connecter avec Google'}</button>
        </div>
      )}
    </div>
  );
}
