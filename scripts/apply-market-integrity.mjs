import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[market-integrity] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[market-integrity] ' + label);
}

patch(
  'src/Trades.tsx',
  '  query,\n  serverTimestamp,',
  '  query,\n  runTransaction,\n  serverTimestamp,',
  'import transaction Firestore'
);

patch(
  'src/Trades.tsx',
  "    const marketQuery = query(collection(db, 'market'), where('status', '==', 'open'));",
  "    const marketQuery = query(collection(db, 'market'), where('status', '==', 'open'));\n    const sellerMarketQuery = query(collection(db, 'market'), where('sellerUid', '==', uid));",
  'listener annonces vendeur'
);

patch(
  'src/Trades.tsx',
  "    const unsubMarket = onSnapshot(marketQuery, (snap) => setMarket(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketDoc))));\n    return () => { unsubSent(); unsubReceived(); unsubMarket(); };",
  "    const unsubMarket = onSnapshot(marketQuery, (snap) => setMarket(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketDoc))));\n    const unsubSellerMarket = onSnapshot(sellerMarketQuery, (snap) => {\n      for (const row of snap.docs) {\n        const listing = { id: row.id, ...row.data() } as MarketDoc;\n        const appliedId = 'market-seller-' + listing.id;\n        if (listing.status !== 'accepted' || s.appliedTradeIds.includes(appliedId)) continue;\n        const offer = cardById(listing.offerCardId);\n        const request = cardById(listing.requestCardId);\n        if (!offer || !request || offer.rarity !== request.rarity || listing.rarity !== offer.rarity) continue;\n        s.applyTradeDelta({ [offer.id]: 1 }, { [request.id]: 1 });\n        s.markTradeApplied(appliedId);\n      }\n    });\n    return () => { unsubSent(); unsubReceived(); unsubMarket(); unsubSellerMarket(); };",
  'vendeur reçoit sa contrepartie'
);

patch(
  'src/Trades.tsx',
  "    if ((s.inventory[offer.id] ?? 0) <= 0) { setMarketError('Tu ne possèdes pas cette carte.'); return; }\n    if (offer.rarity !== request.rarity)",
  "    const alreadyListed = market.filter((listing) => listing.sellerUid === uid && listing.status === 'open' && listing.offerCardId === offer.id).length;\n    if ((s.inventory[offer.id] ?? 0) - alreadyListed <= 0) { setMarketError('Tous tes exemplaires disponibles de cette carte sont déjà engagés sur le marché.'); return; }\n    if (offer.rarity !== request.rarity)",
  'réservation locale des cartes déjà listées'
);

patch(
  'src/Trades.tsx',
  "    await updateDoc(doc(db, 'market', listing.id), { status: 'accepted', acceptedByUid: uid, acceptedByCode: s.friendCode, acceptedAt: serverTimestamp() });\n    if (!s.appliedTradeIds.includes(`market-${listing.id}`)) {\n      s.applyTradeDelta({ [request.id]: 1 }, { [offer.id]: 1 });\n      s.markTradeApplied(`market-${listing.id}`);\n    }",
  "    const listingRef = doc(db, 'market', listing.id);\n    try {\n      await runTransaction(db, async (transaction) => {\n        const snapshot = await transaction.get(listingRef);\n        if (!snapshot.exists()) throw new Error('Cette annonce n’existe plus.');\n        const live = snapshot.data() as Omit<MarketDoc, 'id'>;\n        if (live.status !== 'open') throw new Error('Cette annonce vient déjà d’être prise par un autre joueur.');\n        if (live.sellerUid === uid) throw new Error('Tu ne peux pas accepter ta propre annonce.');\n        transaction.update(listingRef, { status: 'accepted', acceptedByUid: uid, acceptedByCode: s.friendCode, acceptedAt: serverTimestamp() });\n      });\n    } catch (err) { setMarketError(err instanceof Error ? err.message : 'Impossible de valider cet échange.'); return; }\n    const buyerAppliedId = 'market-buyer-' + listing.id;\n    if (!s.appliedTradeIds.includes(buyerAppliedId)) {\n      s.applyTradeDelta({ [request.id]: 1 }, { [offer.id]: 1 });\n      s.markTradeApplied(buyerAppliedId);\n    }",
  'acceptation atomique et idempotente marché'
);

console.log('[market-integrity] Marché public synchronisé des deux côtés.');
