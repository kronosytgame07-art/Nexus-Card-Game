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

interface TradeEntry { cardId: string; count: number; }
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
interface MarketDoc {
  id: string;
  sellerUid: string;
  sellerCode: string;
  offerCardId: string;
  requestCardId: string;
  rarity: CardDef['rarity'];
  status: 'open' | 'accepted' | 'cancelled';
  acceptedByUid?: string;
  acceptedByCode?: string;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
function cardById(id: string): CardDef | undefined { return ALL_CARDS.find((c) => c.id === id); }
function cardName(id: string): string { return cardById(id)?.name ?? id; }

function CardQtyPicker({ cards, quantities, onChange, maxFor }: { cards: CardDef[]; quantities: Record<string, number>; onChange: (id: string, qty: number) => void; maxFor: (id: string) => number }) {
  return <div className="trade-card-list">{cards.map((c) => {
    const qty = quantities[c.id] ?? 0;
    const max = maxFor(c.id);
    if (max <= 0 && qty <= 0) return null;
    return <div key={c.id} className="trade-card-row"><span>{c.name}</span><div className="trade-qty-stepper"><button type="button" disabled={qty <= 0} onClick={() => onChange(c.id, Math.max(0, qty - 1))}>−</button><b>{qty}</b><button type="button" disabled={qty >= max} onClick={() => onChange(c.id, Math.min(max, qty + 1))}>+</button></div></div>;
  })}</div>;
}

function TradeCard({ trade, mine, onAccept, onDecline, onCancel }: { trade: TradeDoc; mine: boolean; onAccept?: () => void; onDecline?: () => void; onCancel?: () => void }) {
  return <article className="options-card trade-offer"><b>{mine ? `À ${trade.toCode}` : `De ${trade.fromCode}`}</b><p className="hint">Il/elle donne : {trade.offer.map((e) => `${e.count}× ${cardName(e.cardId)}`).join(', ') || '—'}</p><p className="hint">Il/elle demande : {trade.request.map((e) => `${e.count}× ${cardName(e.cardId)}`).join(', ') || '—'}</p><p className="hint">Statut : {trade.status}</p>{trade.status === 'pending' && !mine && <div className="deck-menu-actions"><button className="primary" onClick={onAccept}>Accepter</button><button className="secondary" onClick={onDecline}>Refuser</button></div>}{trade.status === 'pending' && mine && <button className="secondary danger" onClick={onCancel}>Annuler</button>}</article>;
}

function MarketCard({ listing, mine, canAccept, onAccept, onCancel }: { listing: MarketDoc; mine: boolean; canAccept: boolean; onAccept?: () => void; onCancel?: () => void }) {
  const offer = cardById(listing.offerCardId);
  const request = cardById(listing.requestCardId);
  return <article className="options-card trade-offer"><b>{offer?.name ?? listing.offerCardId}</b><p className="hint">Proposé par {mine ? 'toi' : listing.sellerCode}</p><p className="hint">Recherche : {request?.name ?? listing.requestCardId}</p><p className="hint">Rareté imposée : <strong>{listing.rarity}</strong></p>{listing.status === 'open' && mine && <button className="secondary danger" onClick={onCancel}>Retirer du marché</button>}{listing.status === 'open' && !mine && <button className="primary" disabled={!canAccept} onClick={onAccept}>{canAccept ? 'Échanger' : `Il te manque ${request?.name ?? 'la carte demandée'}`}</button>}{listing.status !== 'open' && <p className="hint">Annonce terminée</p>}</article>;
}

export default function Trades() {
  const s = useGame();
  const [uid, setUid] = useState<string | null>(auth?.currentUser?.uid ?? null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [sent, setSent] = useState<TradeDoc[]>([]);
  const [received, setReceived] = useState<TradeDoc[]>([]);
  const [market, setMarket] = useState<MarketDoc[]>([]);
  const [targetCode, setTargetCode] = useState('');
  const [offerQty, setOfferQty] = useState<Record<string, number>>({});
  const [requestQty, setRequestQty] = useState<Record<string, number>>({});
  const [marketOffer, setMarketOffer] = useState('');
  const [marketRequest, setMarketRequest] = useState('');
  const [formError, setFormError] = useState('');
  const [marketError, setMarketError] = useState('');

  const cardPool = useMemo(() => ALL_CARDS.filter((c) => c.level === 1 && s.unlockedFactions.includes(c.faction)), [s.unlockedFactions]);
  const ownedMarketCards = useMemo(() => cardPool.filter((c) => (s.inventory[c.id] ?? 0) > 0), [cardPool, s.inventory]);
  const selectedOffer = cardById(marketOffer);
  const sameRarityRequests = useMemo(() => selectedOffer ? cardPool.filter((c) => c.rarity === selectedOffer.rarity && c.id !== selectedOffer.id) : [], [selectedOffer, cardPool]);

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
            try { await setDoc(doc(db!, 'players', candidate), { uid: user.uid, displayName: s.playerName, createdAt: serverTimestamp() }); code = candidate; } catch {}
          }
          if (!code) throw new Error("Impossible d'obtenir un code ami, réessaie plus tard.");
          s.setFriendCode(code);
        }
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Connexion impossible.'); setStatus('error'); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!firebaseReady || !uid || !db) return;
    const sentQuery = query(collection(db, 'trades'), where('fromUid', '==', uid));
    const receivedQuery = query(collection(db, 'trades'), where('toUid', '==', uid));
    const marketQuery = query(collection(db, 'market'), where('status', '==', 'open'));
    const unsubSent = onSnapshot(sentQuery, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeDoc));
      setSent(rows);
      for (const trade of rows) if (trade.status === 'accepted' && !s.appliedTradeIds.includes(trade.id)) { s.applyTradeDelta(entriesToMap(trade.offer), entriesToMap(trade.request)); s.markTradeApplied(trade.id); }
    });
    const unsubReceived = onSnapshot(receivedQuery, (snap) => setReceived(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeDoc))));
    const unsubMarket = onSnapshot(marketQuery, (snap) => setMarket(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketDoc))));
    return () => { unsubSent(); unsubReceived(); unsubMarket(); };
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
      await addDoc(collection(db, 'trades'), { fromUid: uid, fromCode: s.friendCode, toUid, toCode: code, offer, request, status: 'pending', createdAt: serverTimestamp() });
      setOfferQty({}); setRequestQty({}); setTargetCode('');
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Échec de la proposition d’échange.'); }
  };

  const postMarket = async () => {
    setMarketError('');
    if (!db || !uid || !s.friendCode) return;
    const offer = cardById(marketOffer);
    const request = cardById(marketRequest);
    if (!offer || !request) { setMarketError('Choisis une carte à proposer et une carte à demander.'); return; }
    if ((s.inventory[offer.id] ?? 0) <= 0) { setMarketError('Tu ne possèdes pas cette carte.'); return; }
    if (offer.rarity !== request.rarity) { setMarketError('Le marché public impose strictement la même rareté des deux côtés.'); return; }
    await addDoc(collection(db, 'market'), { sellerUid: uid, sellerCode: s.friendCode, offerCardId: offer.id, requestCardId: request.id, rarity: offer.rarity, status: 'open', createdAt: serverTimestamp() });
    setMarketOffer(''); setMarketRequest('');
  };

  const acceptMarket = async (listing: MarketDoc) => {
    if (!db || !uid || !s.friendCode || listing.sellerUid === uid) return;
    const offer = cardById(listing.offerCardId);
    const request = cardById(listing.requestCardId);
    if (!offer || !request || offer.rarity !== request.rarity || listing.rarity !== offer.rarity) return;
    if ((s.inventory[request.id] ?? 0) <= 0) { setMarketError(`Il te manque ${request.name}.`); return; }
    await updateDoc(doc(db, 'market', listing.id), { status: 'accepted', acceptedByUid: uid, acceptedByCode: s.friendCode, acceptedAt: serverTimestamp() });
    if (!s.appliedTradeIds.includes(`market-${listing.id}`)) {
      s.applyTradeDelta({ [request.id]: 1 }, { [offer.id]: 1 });
      s.markTradeApplied(`market-${listing.id}`);
    }
  };

  const accept = async (trade: TradeDoc) => { if (!db) return; await updateDoc(doc(db, 'trades', trade.id), { status: 'accepted' }); if (!s.appliedTradeIds.includes(trade.id)) { s.applyTradeDelta(entriesToMap(trade.request), entriesToMap(trade.offer)); s.markTradeApplied(trade.id); } };
  const decline = async (trade: TradeDoc) => { if (db) await updateDoc(doc(db, 'trades', trade.id), { status: 'declined' }); };
  const cancel = async (trade: TradeDoc) => { if (db) await updateDoc(doc(db, 'trades', trade.id), { status: 'cancelled' }); };
  const cancelMarket = async (listing: MarketDoc) => { if (db && listing.sellerUid === uid) await updateDoc(doc(db, 'market', listing.id), { status: 'cancelled' }); };

  if (!firebaseReady) return <section><h2>Échanges</h2><p className="hint">L'échange entre joueurs n'est pas encore configuré sur cette instance du jeu (aucun projet Firebase renseigné). Voir la section « Configurer Firebase pour les échanges » du README.</p></section>;

  return <section><h2>Échanges</h2>{status === 'connecting' && <p className="hint">Connexion…</p>}{status === 'error' && <p className="hint deck-count danger">{error}</p>}{status === 'ready' && <>
    <p className="hint">Ton code ami : <b>{s.friendCode}</b></p>

    <h3>Marché général</h3>
    <p className="hint">Une annonce publique échange exactement 1 carte contre 1 carte de <strong>même rareté</strong>. Les échanges entre amis restent libres.</p>
    <div className="builder"><div><h4>Carte proposée</h4><select value={marketOffer} onChange={(e) => { setMarketOffer(e.target.value); setMarketRequest(''); }}><option value="">Choisir…</option>{ownedMarketCards.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.rarity}</option>)}</select></div><div><h4>Carte demandée</h4><select value={marketRequest} disabled={!selectedOffer} onChange={(e) => setMarketRequest(e.target.value)}><option value="">Choisir…</option>{sameRarityRequests.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.rarity}</option>)}</select></div></div>
    {marketError && <p className="hint deck-count danger">{marketError}</p>}
    <button className="primary" onClick={postMarket}>Publier sur le marché</button>
    <div className="options-grid">{market.length === 0 && <p className="hint">Aucune annonce publique pour le moment.</p>}{market.map((listing) => <MarketCard key={listing.id} listing={listing} mine={listing.sellerUid === uid} canAccept={(s.inventory[listing.requestCardId] ?? 0) > 0} onAccept={() => acceptMarket(listing)} onCancel={() => cancelMarket(listing)} />)}</div>

    <h3>Échanges entre amis</h3>
    <p className="hint">Entre amis, aucune restriction de rareté : vous décidez librement de la valeur de l'échange.</p>
    <input placeholder="Code ami du destinataire (ex. NEXUS-7F2K)" value={targetCode} onChange={(e) => setTargetCode(e.target.value)} />
    <div className="builder"><div><h4>Tu offres</h4><CardQtyPicker cards={cardPool} quantities={offerQty} onChange={setOfferFor} maxFor={(id) => s.inventory[id] ?? 0} /></div><div><h4>Tu demandes</h4><CardQtyPicker cards={cardPool} quantities={requestQty} onChange={setRequestFor} maxFor={() => 3} /></div></div>
    {formError && <p className="hint deck-count danger">{formError}</p>}<button className="primary" onClick={submitTrade}>Envoyer la proposition</button>

    <h3>Offres reçues</h3><div className="options-grid">{received.length === 0 && <p className="hint">Aucune offre reçue.</p>}{received.map((trade) => <TradeCard key={trade.id} trade={trade} mine={false} onAccept={() => accept(trade)} onDecline={() => decline(trade)} />)}</div>
    <h3>Offres envoyées</h3><div className="options-grid">{sent.length === 0 && <p className="hint">Aucune offre envoyée.</p>}{sent.map((trade) => <TradeCard key={trade.id} trade={trade} mine onCancel={() => cancel(trade)} />)}</div>
  </>}</section>;
}
