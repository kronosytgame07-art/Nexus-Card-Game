import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
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
const CARD_BACK_URL = `${import.meta.env.BASE_URL}cards/card-back.webp`;
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
function onArtError(e: SyntheticEvent<HTMLImageElement>) { e.currentTarget.onerror = null; e.currentTarget.src = CARD_BACK_URL; }

function CardThumb({ card, className = '' }: { card: CardDef; className?: string }) {
  return <img className={`trade-thumb ${card.rarity} ${className}`} src={card.image} alt={card.name} loading="lazy" onError={onArtError} />;
}

function CardChip({ cardId, count }: { cardId: string; count?: number }) {
  const c = cardById(cardId);
  if (!c) return <span className="trade-chip"><b>{cardId}</b></span>;
  return <span className="trade-chip"><CardThumb card={c} />{c.name}{count ? <i>×{count}</i> : null}</span>;
}

function CardQtyPicker({ cards, quantities, onChange, maxFor }: { cards: CardDef[]; quantities: Record<string, number>; onChange: (id: string, qty: number) => void; maxFor: (id: string) => number }) {
  return <div className="trade-card-list">{cards.map((c) => {
    const qty = quantities[c.id] ?? 0;
    const max = maxFor(c.id);
    if (max <= 0 && qty <= 0) return null;
    return <div key={c.id} className={'trade-card-row ' + c.rarity}><span className="trade-row-main"><CardThumb card={c} /><span>{c.name}</span></span><div className="trade-qty-stepper"><button type="button" disabled={qty <= 0} onClick={() => onChange(c.id, Math.max(0, qty - 1))}>−</button><b>{qty}</b><button type="button" disabled={qty >= max} onClick={() => onChange(c.id, Math.min(max, qty + 1))}>+</button></div></div>;
  })}</div>;
}

function CardPickerGrid({ cards, selectedId, onSelect, emptyText }: { cards: CardDef[]; selectedId: string; onSelect: (id: string) => void; emptyText?: string }) {
  if (cards.length === 0) return <p className="hint trade-picker-empty">{emptyText ?? 'Aucune carte disponible.'}</p>;
  return <div className="trade-picker-grid">{cards.map((c) => (
    <button type="button" key={c.id} className={'trade-picker-item ' + c.rarity + (selectedId === c.id ? ' selected' : '')} onClick={() => onSelect(c.id)}>
      <img src={c.image} alt={c.name} loading="lazy" onError={onArtError} />
      <span>{c.name}</span>
    </button>
  ))}</div>;
}

function TradeCard({ trade, mine, onAccept, onDecline, onCancel }: { trade: TradeDoc; mine: boolean; onAccept?: () => void; onDecline?: () => void; onCancel?: () => void }) {
  return <article className="options-card trade-offer">
    <div className="options-card-head"><b>{mine ? `À ${trade.toCode}` : `De ${trade.fromCode}`}</b><span className={'trade-status trade-status-' + trade.status}>{trade.status}</span></div>
    <p className="hint">Il/elle donne :</p>
    <div className="trade-chip-row">{trade.offer.length ? trade.offer.map((e) => <CardChip key={e.cardId} cardId={e.cardId} count={e.count} />) : <span className="hint">—</span>}</div>
    <p className="hint">Il/elle demande :</p>
    <div className="trade-chip-row">{trade.request.length ? trade.request.map((e) => <CardChip key={e.cardId} cardId={e.cardId} count={e.count} />) : <span className="hint">—</span>}</div>
    {trade.status === 'pending' && !mine && <div className="deck-menu-actions"><button className="primary" onClick={onAccept}>Accepter</button><button className="secondary" onClick={onDecline}>Refuser</button></div>}
    {trade.status === 'pending' && mine && <button className="secondary danger" onClick={onCancel}>Annuler</button>}
  </article>;
}

function MarketCard({ listing, mine, canAccept, onAccept, onCancel }: { listing: MarketDoc; mine: boolean; canAccept: boolean; onAccept?: () => void; onCancel?: () => void }) {
  const offer = cardById(listing.offerCardId);
  const request = cardById(listing.requestCardId);
  return <article className="options-card trade-offer market-offer">
    <div className="trade-market-swap">
      {offer ? <CardThumb card={offer} className="lg" /> : <img className="trade-thumb lg" src={CARD_BACK_URL} alt="" />}
      <span className="trade-market-arrow">⇄</span>
      {request ? <CardThumb card={request} className="lg" /> : <img className="trade-thumb lg" src={CARD_BACK_URL} alt="" />}
    </div>
    <b>{offer?.name ?? listing.offerCardId}</b>
    <p className="hint">Proposé par {mine ? 'toi' : listing.sellerCode} — recherche <strong>{request?.name ?? listing.requestCardId}</strong></p>
    <p className="hint">Rareté imposée : <strong>{listing.rarity}</strong></p>
    {listing.status === 'open' && mine && <button className="secondary danger" onClick={onCancel}>Retirer du marché</button>}
    {listing.status === 'open' && !mine && <button className="primary" disabled={!canAccept} onClick={onAccept}>{canAccept ? 'Échanger' : `Il te manque ${request?.name ?? 'la carte demandée'}`}</button>}
    {listing.status !== 'open' && <p className="hint">Annonce terminée</p>}
  </article>;
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
    const sellerMarketQuery = query(collection(db, 'market'), where('sellerUid', '==', uid));
    const unsubSent = onSnapshot(sentQuery, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeDoc));
      setSent(rows);
      for (const trade of rows) if (trade.status === 'accepted' && !s.appliedTradeIds.includes(trade.id)) { s.applyTradeDelta(entriesToMap(trade.offer), entriesToMap(trade.request)); s.markTradeApplied(trade.id); }
    });
    const unsubReceived = onSnapshot(receivedQuery, (snap) => setReceived(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeDoc))));
    const unsubMarket = onSnapshot(marketQuery, (snap) => setMarket(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketDoc))));
    const unsubSellerMarket = onSnapshot(sellerMarketQuery, (snap) => {
      for (const row of snap.docs) {
        const listing = { id: row.id, ...row.data() } as MarketDoc;
        const appliedId = 'market-seller-' + listing.id;
        if (listing.status !== 'accepted' || s.appliedTradeIds.includes(appliedId)) continue;
        const offer = cardById(listing.offerCardId);
        const request = cardById(listing.requestCardId);
        if (!offer || !request || offer.rarity !== request.rarity || listing.rarity !== offer.rarity) continue;
        s.applyTradeDelta({ [offer.id]: 1 }, { [request.id]: 1 });
        s.markTradeApplied(appliedId);
      }
    });
    return () => { unsubSent(); unsubReceived(); unsubMarket(); unsubSellerMarket(); };
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
    const alreadyListed = market.filter((listing) => listing.sellerUid === uid && listing.status === 'open' && listing.offerCardId === offer.id).length;
    if ((s.inventory[offer.id] ?? 0) - alreadyListed <= 0) { setMarketError('Tous tes exemplaires disponibles de cette carte sont déjà engagés sur le marché.'); return; }
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
    const listingRef = doc(db, 'market', listing.id);
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(listingRef);
        if (!snapshot.exists()) throw new Error('Cette annonce n’existe plus.');
        const live = snapshot.data() as Omit<MarketDoc, 'id'>;
        if (live.status !== 'open') throw new Error('Cette annonce vient déjà d’être prise par un autre joueur.');
        if (live.sellerUid === uid) throw new Error('Tu ne peux pas accepter ta propre annonce.');
        transaction.update(listingRef, { status: 'accepted', acceptedByUid: uid, acceptedByCode: s.friendCode, acceptedAt: serverTimestamp() });
      });
    } catch (err) { setMarketError(err instanceof Error ? err.message : 'Impossible de valider cet échange.'); return; }
    const buyerAppliedId = 'market-buyer-' + listing.id;
    if (!s.appliedTradeIds.includes(buyerAppliedId)) {
      s.applyTradeDelta({ [request.id]: 1 }, { [offer.id]: 1 });
      s.markTradeApplied(buyerAppliedId);
    }
  };

  const accept = async (trade: TradeDoc) => { if (!db) return; await updateDoc(doc(db, 'trades', trade.id), { status: 'accepted' }); if (!s.appliedTradeIds.includes(trade.id)) { s.applyTradeDelta(entriesToMap(trade.request), entriesToMap(trade.offer)); s.markTradeApplied(trade.id); } };
  const decline = async (trade: TradeDoc) => { if (db) await updateDoc(doc(db, 'trades', trade.id), { status: 'declined' }); };
  const cancel = async (trade: TradeDoc) => { if (db) await updateDoc(doc(db, 'trades', trade.id), { status: 'cancelled' }); };
  const cancelMarket = async (listing: MarketDoc) => { if (db && listing.sellerUid === uid) await updateDoc(doc(db, 'market', listing.id), { status: 'cancelled' }); };

  if (!firebaseReady) return <section><h2>Échanges</h2><p className="hint">L'échange entre joueurs n'est pas encore configuré sur cette instance du jeu (aucun projet Firebase renseigné). Voir la section « Configurer Firebase pour les échanges » du README.</p></section>;

  const copyFriendCode = () => { if (s.friendCode) navigator.clipboard?.writeText(s.friendCode).catch(() => {}); };

  return <section className="trades-section"><h2>Échanges</h2>{status === 'connecting' && <p className="hint">Connexion…</p>}{status === 'error' && <p className="hint deck-count danger">{error}</p>}{status === 'ready' && <>
    <div className="trade-friend-code"><span>Ton code ami</span><b>{s.friendCode}</b><button type="button" onClick={copyFriendCode} title="Copier le code">Copier</button></div>

    <h3>Marché général</h3>
    <p className="hint">Une annonce publique échange exactement 1 carte contre 1 carte de <strong>même rareté</strong>. Les échanges entre amis restent libres.</p>
    <div className="builder">
      <div><h4>Carte proposée</h4><CardPickerGrid cards={ownedMarketCards} selectedId={marketOffer} onSelect={(id) => { setMarketOffer(id); setMarketRequest(''); }} emptyText="Tu ne possèdes aucune carte à proposer pour l'instant." /></div>
      <div><h4>Carte demandée</h4>{selectedOffer ? <CardPickerGrid cards={sameRarityRequests} selectedId={marketRequest} onSelect={setMarketRequest} emptyText="Aucune autre carte de cette rareté." /> : <p className="hint trade-picker-empty">Choisis d'abord une carte à proposer.</p>}</div>
    </div>
    {marketError && <p className="hint deck-count danger">{marketError}</p>}
    <button className="primary" onClick={postMarket}>Publier sur le marché</button>
    <div className="options-grid">{market.length === 0 && <p className="hint">Aucune annonce publique pour le moment.</p>}{market.map((listing) => <MarketCard key={listing.id} listing={listing} mine={listing.sellerUid === uid} canAccept={(s.inventory[listing.requestCardId] ?? 0) > 0} onAccept={() => acceptMarket(listing)} onCancel={() => cancelMarket(listing)} />)}</div>

    <h3>Échanges entre amis</h3>
    <p className="hint">Entre amis, aucune restriction de rareté : vous décidez librement de la valeur de l'échange.</p>
    <input className="trade-friend-input" placeholder="Code ami du destinataire (ex. NEXUS-7F2K)" value={targetCode} onChange={(e) => setTargetCode(e.target.value)} />
    <div className="builder"><div><h4>Tu offres</h4><CardQtyPicker cards={cardPool} quantities={offerQty} onChange={setOfferFor} maxFor={(id) => s.inventory[id] ?? 0} /></div><div><h4>Tu demandes</h4><CardQtyPicker cards={cardPool} quantities={requestQty} onChange={setRequestFor} maxFor={() => 3} /></div></div>
    {formError && <p className="hint deck-count danger">{formError}</p>}<button className="primary" onClick={submitTrade}>Envoyer la proposition</button>

    <h3>Offres reçues</h3><div className="options-grid">{received.length === 0 && <p className="hint">Aucune offre reçue.</p>}{received.map((trade) => <TradeCard key={trade.id} trade={trade} mine={false} onAccept={() => accept(trade)} onDecline={() => decline(trade)} />)}</div>
    <h3>Offres envoyées</h3><div className="options-grid">{sent.length === 0 && <p className="hint">Aucune offre envoyée.</p>}{sent.map((trade) => <TradeCard key={trade.id} trade={trade} mine onCancel={() => cancel(trade)} />)}</div>
  </>}</section>;
}
