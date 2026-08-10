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

function GoogleMark() {
  return (
    <svg className="google-account-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.79H12v3.48h5.52a4.75 4.75 0 0 1-2.05 3.03l-.02.12 2.98 2.31.21.02c1.92-1.77 2.96-4.38 2.96-7.17Z"/>
      <path fill="#34A853" d="M12 22c2.75 0 5.06-.9 6.74-2.45l-3.17-2.45c-.85.57-1.99.97-3.57.97-2.65 0-4.9-1.79-5.7-4.26l-.12.01-3.1 2.4-.04.11C4.71 19.65 8.1 22 12 22Z"/>
      <path fill="#FBBC05" d="M6.3 13.81A6.1 6.1 0 0 1 6 12c0-.63.11-1.24.29-1.81l-.01-.12-3.14-2.44-.1.05A10 10 0 0 0 2 12c0 1.56.36 3.03 1.04 4.32l3.26-2.51Z"/>
      <path fill="#EA4335" d="M12 5.93c1.91 0 3.2.83 3.94 1.51l2.86-2.79C17.05 3.02 14.75 2 12 2 8.1 2 4.71 4.35 3.04 7.68l3.25 2.51C7.1 7.72 9.35 5.93 12 5.93Z"/>
    </svg>
  );
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
    <section className={'account-section profile-cloud-save' + (connected ? ' connected' : '')}>
      <div className="profile-cloud-save-head">
        <span className="profile-cloud-save-icon"><GoogleMark /></span>
        <div>
          <small>COMPTE & SAUVEGARDE</small>
          <h3>{connected ? 'Progression synchronisée' : 'Sauvegarde ta progression'}</h3>
        </div>
        <span className={'cloud-save-status' + (connected ? ' online' : '')}>{connected ? 'Synchronisé' : 'Local uniquement'}</span>
      </div>
      {connected ? (
        <div className="account-connected profile-cloud-save-body">
          <div>
            <b>{user?.displayName ?? user?.email ?? 'Compte Google'}</b>
            <p className="hint">Ton profil, tes decks, ta collection et ta progression sont sauvegardés automatiquement dans le cloud.</p>
          </div>
          <button className="secondary" disabled={busy} onClick={signOutAccount}>Se déconnecter</button>
        </div>
      ) : (
        <div className="account-disconnected profile-cloud-save-body">
          <div>
            <b>Connectez-vous à votre compte Google</b>
            <p className="hint">Sauvegarde tes données et retrouve ta progression sur un autre appareil. Sans connexion, les données restent uniquement sur cet appareil.</p>
            {error && <small className="signin-gate-error">{error}</small>}
          </div>
          <button className="google-signin-button" disabled={busy} onClick={signIn}>
            <GoogleMark />
            <span>{busy ? 'Connexion…' : 'Continuer avec Google'}</span>
          </button>
        </div>
      )}
    </section>
  );
}
