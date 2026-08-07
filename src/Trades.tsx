import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, ensureSignedIn, firebaseReady } from './firebase';
import { ALL_CARDS, useGame } from './store/game';
import { CardDef } from './engine/types';

interface TradeEntry {
  cardId: string;
  count: number;
}

interface TradeDoc {
  id: string;
  fromUid: string;
  fromCode: string;
  toUid: string;
  toCode: string;
  offer: TradeEntry[];
  request: TradeEntry[];
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (I, O, 0, 1)

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `NEXUS-${code}`;
}

function entriesToMap(entries: TradeEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) map[e.cardId] = (map[e.cardId] ?? 0) + e.count;
  return map;
}

function cardName(id: string): string {
  return ALL_CARDS.find((c) => c.id === id)?.name ?? id;
}

function CardQtyPicker({ cards, quantities, onChange, maxFor }: { cards: CardDef[]; quantities: Record<string, number>; onChange: (id: string, qty: number) => void; maxFor: (id: string) => number }) {
  return (
    <div className="trade-card-list">
      {cards.map((c) => {
        const qty = quantities[c.id] ?? 0;
        const max = maxFor(c.id);
        if (max <= 0 && qty <= 0) return null;
        return (
          <div key={c.id} className="trade-card-row">
            <span>{c.name}</span>
            <div className="trade-qty-stepper">
              <button type="button" disabled={qty <= 0} onClick={() => onChange(c.id, Math.max(0, qty - 1))}>−</button>
              <b>{qty}</b>
              <button type="button" disabled={qty >= max} onClick={() => onChange(c.id, Math.min(max, qty + 1))}>+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TradeCard({ trade, mine, onAccept, onDecline, onCancel }: { trade: TradeDoc; mine: boolean; onAccept?: () => void; onDecline?: () => void; onCancel?: () => void }) {
  return (
    <article className="options-card trade-offer">
      <b>{mine ? `À ${trade.toCode}` : `De ${trade.fromCode}`}</b>
      <p className="hint">Il/elle donne : {trade.offer.map((e) => `${e.count}× ${cardName(e.cardId)}`).join(', ') || '—'}</p>
      <p className="hint">Il/elle demande : {trade.request.map((e) => `${e.count}× ${cardName(e.cardId)}`).join(', ') || '—'}</p>
      <p className="hint">Statut : {trade.status}</p>
      {trade.status === 'pending' && !mine && (
        <div className="deck-menu-actions">
          <button className="primary" onClick={onAccept}>Accepter</button>
          <button className="secondary" onClick={onDecline}>Refuser</button>
        </div>
      )}
      {trade.status === 'pending' && mine && (
        <button className="secondary danger" onClick={onCancel}>Annuler</button>
      )}
    </article>
  );
}

export default function Trades() {
  const s = useGame();
  const [uid, setUid] = useState<string | null>(auth?.currentUser?.uid ?? null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [sent, setSent] = useState<TradeDoc[]>([]);
  const [received, setReceived] = useState<TradeDoc[]>([]);
  const [targetCode, setTargetCode] = useState('');
  const [offerQty, setOfferQty] = useState<Record<string, number>>({});
  const [requestQty, setRequestQty] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState('');

  const cardPool = useMemo(
    () => ALL_CARDS.filter((c) => c.level === 1 && s.unlockedFactions.includes(c.faction)),
    [s.unlockedFactions]
  );

  useEffect(() => {
    if (!firebaseReady) return;
    let cancelled = false;
    setStatus('connecting');
    (async () => {
      try {
        const user = await ensureSignedIn();
        if (cancelled) return;
        setUid(user.uid);
        let code = s.friendCode;
        if (!code) {
          for (let attempt = 0; attempt < 5 && !code; attempt++) {
            const candidate = randomCode();
            try {
              await setDoc(doc(db!, 'players', candidate), { uid: user.uid, displayName: s.playerName, createdAt: serverTimestamp() });
              code = candidate;
            } catch {
              // code déjà pris (ou tout autre souci de règles) — on retente avec un nouveau code
            }
          }
          if (!code) throw new Error("Impossible d'obtenir un code ami, réessaie plus tard.");
          s.setFriendCode(code);
        }
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Connexion impossible.');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!firebaseReady || !uid || !db) return;
    const sentQuery = query(collection(db, 'trades'), where('fromUid', '==', uid));
    const receivedQuery = query(collection(db, 'trades'), where('toUid', '==', uid));
    const unsubSent = onSnapshot(sentQuery, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeDoc));
      setSent(rows);
      for (const trade of rows) {
        if (trade.status === 'accepted' && !s.appliedTradeIds.includes(trade.id)) {
          s.applyTradeDelta(entriesToMap(trade.offer), entriesToMap(trade.request));
          s.markTradeApplied(trade.id);
        }
      }
    });
    const unsubReceived = onSnapshot(receivedQuery, (snap) => {
      setReceived(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeDoc)));
    });
    return () => { unsubSent(); unsubReceived(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const setOfferFor = (id: string, qty: number) => setOfferQty((q) => ({ ...q, [id]: qty }));
  const setRequestFor = (id: string, qty: number) => setRequestQty((q) => ({ ...q, [id]: qty }));

  const submitTrade = async () => {
    setFormError('');
    if (!db || !uid || !s.friendCode) return;
    const code = targetCode.trim().toUpperCase();
    if (!code) { setFormError('Renseigne le code ami du destinataire.'); return; }
    const offer = Object.entries(offerQty).filter(([, qty]) => qty > 0).map(([cardId, count]) => ({ cardId, count }));
    const request = Object.entries(requestQty).filter(([, qty]) => qty > 0).map(([cardId, count]) => ({ cardId, count }));
    if (offer.length === 0 || request.length === 0) { setFormError('Choisis au moins une carte offerte et une carte demandée.'); return; }
    try {
      const targetDoc = await getDoc(doc(db, 'players', code));
      if (!targetDoc.exists()) { setFormError('Aucun joueur trouvé avec ce code ami.'); return; }
      const toUid = (targetDoc.data() as { uid: string }).uid;
      if (toUid === uid) { setFormError('Tu ne peux pas t’échanger des cartes avec toi-même.'); return; }
      await addDoc(collection(db, 'trades'), {
        fromUid: uid,
        fromCode: s.friendCode,
        toUid,
        toCode: code,
        offer,
        request,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setOfferQty({});
      setRequestQty({});
      setTargetCode('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Échec de la proposition d’échange.');
    }
  };

  const accept = async (trade: TradeDoc) => {
    if (!db) return;
    await updateDoc(doc(db, 'trades', trade.id), { status: 'accepted' });
    if (!s.appliedTradeIds.includes(trade.id)) {
      s.applyTradeDelta(entriesToMap(trade.request), entriesToMap(trade.offer));
      s.markTradeApplied(trade.id);
    }
  };
  const decline = async (trade: TradeDoc) => { if (db) await updateDoc(doc(db, 'trades', trade.id), { status: 'declined' }); };
  const cancel = async (trade: TradeDoc) => { if (db) await updateDoc(doc(db, 'trades', trade.id), { status: 'cancelled' }); };

  if (!firebaseReady) {
    return (
      <section>
        <h2>Échanges</h2>
        <p className="hint">
          L'échange entre joueurs n'est pas encore configuré sur cette instance du jeu (aucun projet
          Firebase renseigné). Voir la section « Configurer Firebase pour les échanges » du README.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Échanges</h2>
      {status === 'connecting' && <p className="hint">Connexion…</p>}
      {status === 'error' && <p className="hint deck-count danger">{error}</p>}
      {status === 'ready' && (
        <>
          <p className="hint">
            Ton code ami : <b>{s.friendCode}</b> — partage-le à un ami pour qu'il te propose un échange.
          </p>
          <p className="hint">
            Limite connue : l'inventaire n'est pas vérifié par un serveur, chaque joueur applique
            lui-même le résultat d'un échange accepté — adapté entre amis, pas anti-triche à 100 %.
          </p>

          <h3>Proposer un échange</h3>
          <input placeholder="Code ami du destinataire (ex. NEXUS-7F2K)" value={targetCode} onChange={(e) => setTargetCode(e.target.value)} />
          <div className="builder">
            <div>
              <h4>Tu offres (parmi tes doublons)</h4>
              <CardQtyPicker cards={cardPool} quantities={offerQty} onChange={setOfferFor} maxFor={(id) => s.inventory[id] ?? 0} />
            </div>
            <div>
              <h4>Tu demandes</h4>
              <CardQtyPicker cards={cardPool} quantities={requestQty} onChange={setRequestFor} maxFor={() => 3} />
            </div>
          </div>
          {formError && <p className="hint deck-count danger">{formError}</p>}
          <button className="primary" onClick={submitTrade}>Envoyer la proposition</button>

          <h3>Offres reçues</h3>
          {received.length === 0 && <p className="hint">Aucune offre reçue pour le moment.</p>}
          <div className="options-grid">
            {received.map((trade) => (
              <TradeCard key={trade.id} trade={trade} mine={false} onAccept={() => accept(trade)} onDecline={() => decline(trade)} />
            ))}
          </div>

          <h3>Offres envoyées</h3>
          {sent.length === 0 && <p className="hint">Aucune offre envoyée pour le moment.</p>}
          <div className="options-grid">
            {sent.map((trade) => (
              <TradeCard key={trade.id} trade={trade} mine onCancel={() => cancel(trade)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
