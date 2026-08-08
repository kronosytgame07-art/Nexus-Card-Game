import fs from 'node:fs';

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { from, to, label } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[booster-update] Patch déjà intégré ou motif introuvable: ${label}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
    console.log(`[booster-update] ${label}`);
  }
  if (changed) fs.writeFileSync(path, source);
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, `\n${content}\n`);
  console.log(`[booster-update] ${marker}`);
}

patchFile('src/App.tsx', [
  {
    label: 'État d’ouverture séquentielle des boosters',
    from: "  const [reveal, setReveal] = useState<{ faction: Faction; cards: CardDef[]; isNew: boolean[] } | null>(null);",
    to: "  const [reveal, setReveal] = useState<{ faction: Faction; packs: { cards: CardDef[]; isNew: boolean[] }[]; packIndex: number; revealed: boolean; summary: boolean } | null>(null);\n  const boosterVfxRef = useRef<VfxHandle>(null);",
  },
  {
    label: 'Découpage x10 en boosters individuels',
    from: "    setReveal({\n      faction: booster.id,\n      cards: pulledIds.map((id) => getCard(id)),\n      isNew: pulledIds.map((id) => (before[id] ?? 0) === 0),\n    });",
    to: "    const pulledCards = pulledIds.map((id) => getCard(id));\n    const packs = Array.from({ length: Math.ceil(pulledCards.length / BOOSTER_PULL_COUNT) }, (_, packIndex) => {\n      const start = packIndex * BOOSTER_PULL_COUNT;\n      const cards = pulledCards.slice(start, start + BOOSTER_PULL_COUNT);\n      return { cards, isNew: pulledIds.slice(start, start + BOOSTER_PULL_COUNT).map((id) => (before[id] ?? 0) === 0) };\n    });\n    setReveal({ faction: booster.id, packs, packIndex: 0, revealed: false, summary: false });\n    requestAnimationFrame(() => boosterVfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'evolution'));",
  },
  {
    label: 'Contrôles révéler / suivant / passer',
    from: "  const closeReveal = () => setReveal(null);",
    to: "  const closeReveal = () => setReveal(null);\n  const revealCurrentPack = () => setReveal((current) => current ? { ...current, revealed: true } : current);\n  const nextRevealPack = () => setReveal((current) => {\n    if (!current) return current;\n    if (current.packIndex >= current.packs.length - 1) return { ...current, summary: true, revealed: true };\n    requestAnimationFrame(() => boosterVfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'evolution'));\n    return { ...current, packIndex: current.packIndex + 1, revealed: false };\n  });\n  const skipRevealPacks = () => setReveal((current) => current ? { ...current, summary: true, revealed: true } : current);",
  },
  {
    label: 'WebGL disponible dans la boutique',
    from: "    <section>\n      <h2>Boutique</h2>",
    to: "    <section className=\"shop-screen\">\n      <VfxLayer ref={boosterVfxRef} active={s.animationMode !== 'off' && !s.batterySaver} />\n      <h2>Boutique</h2>",
  },
  {
    label: 'Nouvelle expérience d’ouverture x1/x10',
    from: "      {reveal && (() => { const staggerDelay = reveal.cards.length > BOOSTER_PULL_COUNT ? 0.04 : 0.18; return <div className=\"pile-modal\" role=\"dialog\" aria-modal=\"true\" onClick={closeReveal}><div className=\"pile-modal-content\" onClick={(e) => e.stopPropagation()}><header><h3>Booster {reveal.faction} ({reveal.cards.length} cartes)</h3><button onClick={closeReveal}>×</button></header><div className=\"pile-grid\">{reveal.cards.map((card, i) => <motion.div key={`${card.id}-${i}`} initial={{ opacity: 0, y: 20, rotateY: 90 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ delay: i * staggerDelay, duration: 0.4, ease: 'easeOut' }}><CardView card={card} badge={reveal.isNew[i] ? 'Nouveau' : 'Doublon'} /></motion.div>)}</div></div></div>; })()}",
    to: "      {reveal && (() => {\n        const currentPack = reveal.packs[reveal.packIndex];\n        const allCards = reveal.packs.flatMap((pack) => pack.cards);\n        const allNew = reveal.packs.flatMap((pack) => pack.isNew);\n        if (reveal.summary) return <div className=\"booster-opening-overlay\" role=\"dialog\" aria-modal=\"true\"><div className=\"booster-summary\"><header><div><small>OUVERTURE TERMINÉE</small><h3>{reveal.packs.length} booster{reveal.packs.length > 1 ? 's' : ''} {reveal.faction}</h3></div><button onClick={closeReveal}>×</button></header><div className=\"booster-summary-grid\">{allCards.map((card, i) => <motion.div key={`${card.id}-${i}`} className={card.rarity === 'Mythique' ? 'mythic-pull' : ''} initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i * .025, .6), duration: .28 }}><CardView card={card} badge={allNew[i] ? 'Nouveau' : 'Doublon'} /></motion.div>)}</div><button className=\"primary booster-done\" onClick={closeReveal}>Récupérer les cartes</button></div></div>;\n        return <div className=\"booster-opening-overlay\" role=\"dialog\" aria-modal=\"true\"><div className=\"booster-opening-stage\"><header><div><small>BOOSTER {reveal.packIndex + 1}/{reveal.packs.length}</small><h3>{reveal.faction}</h3></div><div className=\"booster-opening-actions\">{reveal.packs.length > 1 && <button className=\"secondary\" onClick={skipRevealPacks}>Passer</button>}<button className=\"secondary\" onClick={closeReveal}>×</button></div></header><div className=\"booster-pack-animation\" aria-hidden=\"true\"><div className=\"booster-pack-shell\"><span>NEXUS</span><b>{reveal.faction}</b><i /></div><div className=\"booster-tear-line\" /></div><button type=\"button\" className={'booster-card-fan' + (reveal.revealed ? ' revealed' : '')} onClick={reveal.revealed ? undefined : revealCurrentPack} aria-label={reveal.revealed ? 'Cartes révélées' : 'Révéler toutes les cartes'}>{currentPack.cards.map((card, i) => <motion.div key={`${card.id}-${i}`} className={'booster-pull-card ' + (card.rarity === 'Mythique' ? 'mythic-pull' : '')} initial={{ opacity: 0, y: -80, rotate: (i - 2) * 5, scale: .7 }} animate={{ opacity: 1, y: 0, rotate: (i - 2) * 4, scale: 1 }} transition={{ delay: .55 + i * .08, duration: .42, ease: 'easeOut' }}>{reveal.revealed ? <CardView card={card} badge={currentPack.isNew[i] ? 'Nouveau' : 'Doublon'} /> : <div className=\"booster-card-back\" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} />}</motion.div>)}</button><div className=\"booster-opening-footer\">{!reveal.revealed ? <><b>Touche une fois pour tout révéler</b><small>Les {BOOSTER_PULL_COUNT} cartes se retournent ensemble.</small></> : <button className=\"primary\" onClick={nextRevealPack}>{reveal.packIndex < reveal.packs.length - 1 ? 'Booster suivant' : 'Voir tout le tirage'}</button>}</div></div></div>;\n      })()}",
  },
]);

appendOnce('src/styles.css', 'NEXUS BOOSTER OPENING EXPERIENCE', `
/* NEXUS BOOSTER OPENING EXPERIENCE */
.shop-screen { position: relative; }
.shop-screen > .vfx-layer { position: fixed; inset: 0; z-index: 310; pointer-events: none; }
.booster-opening-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: radial-gradient(circle at 50% 42%, rgba(46, 74, 95, .45), rgba(2, 6, 10, .96) 68%);
  backdrop-filter: blur(8px);
}
.booster-opening-stage,
.booster-summary {
  width: min(1100px, 96vw);
  height: min(720px, 94dvh);
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(239, 201, 107, .45);
  border-radius: 22px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(15, 25, 31, .98), rgba(3, 8, 12, .99));
  box-shadow: 0 36px 100px rgba(0,0,0,.7), inset 0 1px rgba(255,255,255,.05);
}
.booster-opening-stage > header,
.booster-summary > header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; border-bottom:1px solid rgba(255,255,255,.08); }
.booster-opening-stage header small,
.booster-summary header small { font: 700 9px "DM Mono"; letter-spacing:2px; color:#9db3ac; }
.booster-opening-stage h3,
.booster-summary h3 { margin:2px 0 0; color:#ffe9a8; }
.booster-opening-actions { display:flex; gap:8px; }
.booster-opening-actions button { margin:0; }
.booster-pack-animation { position:relative; height:126px; flex:0 0 126px; display:grid; place-items:center; overflow:hidden; }
.booster-pack-shell {
  position:relative;
  width:118px;
  height:102px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  border-radius:10px 10px 16px 16px;
  border:1px solid rgba(239,201,107,.75);
  background: linear-gradient(135deg,#17242d,#5b4521 46%,#0b151b 72%);
  box-shadow:0 0 36px rgba(239,201,107,.28);
  overflow:hidden;
  animation:nexus-pack-rise .58s ease-out both;
}
.booster-pack-shell:before { content:""; position:absolute; inset:0; background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.28) 43%,transparent 58%); transform:translateX(-140%); animation:nexus-pack-shine 1.2s .15s ease-out forwards; }
.booster-pack-shell span { font:900 20px "Space Grotesk"; letter-spacing:2px; color:white; z-index:1; }
.booster-pack-shell b { font:800 11px "DM Mono"; color:#ffe9a8; z-index:1; }
.booster-pack-shell i { position:absolute; left:-10%; right:-10%; top:16px; height:2px; background:#fff; box-shadow:0 0 12px #fff; transform:rotate(-5deg) scaleX(0); transform-origin:left; animation:nexus-pack-cut .32s .48s ease-out forwards; }
.booster-tear-line { position:absolute; top:40px; width:150px; height:16px; border-top:2px solid rgba(255,255,255,.8); opacity:0; filter:drop-shadow(0 0 7px #fff); transform:rotate(-5deg); animation:nexus-tear-fly .52s .72s ease-out forwards; }
@keyframes nexus-pack-rise { from { opacity:0; transform:translateY(28px) scale(.82); } to { opacity:1; transform:none; } }
@keyframes nexus-pack-shine { to { transform:translateX(140%); } }
@keyframes nexus-pack-cut { to { transform:rotate(-5deg) scaleX(1); } }
@keyframes nexus-tear-fly { 0% { opacity:0; transform:rotate(-5deg) translate(0,0); } 25% { opacity:1; } 100% { opacity:0; transform:rotate(-13deg) translate(90px,-34px); } }
.booster-card-fan {
  flex:1;
  min-height:0;
  width:100%;
  padding:12px 24px;
  border:0;
  background:transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:clamp(6px,1.2vw,16px);
  cursor:pointer;
  perspective:1300px;
}
.booster-card-fan.revealed { cursor:default; }
.booster-pull-card { width:clamp(92px,14vw,180px); max-height:100%; transform-origin:50% 100%; transition:transform .5s ease, filter .5s ease; }
.booster-card-fan:not(.revealed) .booster-pull-card:hover { transform:translateY(-10px) scale(1.03) !important; }
.booster-card-back { width:100%; aspect-ratio:.7; border-radius:12px; background-size:cover; background-position:center; border:2px solid rgba(239,201,107,.8); box-shadow:0 18px 35px rgba(0,0,0,.5); }
.booster-card-fan.revealed .booster-pull-card { animation:nexus-card-flip .58s ease both; }
@keyframes nexus-card-flip { 0% { transform:rotateY(180deg) scale(.92); } 55% { transform:rotateY(0) scale(1.06); } 100% { transform:rotateY(0) scale(1); } }
.booster-opening-footer { min-height:70px; flex:0 0 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; padding:10px 16px 16px; }
.booster-opening-footer b { color:#ffe9a8; font:800 12px "DM Mono"; }
.booster-opening-footer small { color:#9db3ac; }
.booster-opening-footer button { margin:0; min-width:180px; }
.booster-summary-grid { flex:1; min-height:0; overflow:auto; padding:16px; display:grid; grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap:12px; align-content:start; }
.booster-summary-grid .card { width:100%; }
.booster-done { align-self:center; margin:10px 0 16px; }
.mythic-pull { position:relative; filter:drop-shadow(0 0 12px rgba(255,255,255,.55)); }
.mythic-pull:after { content:""; pointer-events:none; position:absolute; inset:-5px; border-radius:14px; border:2px solid rgba(255,255,255,.85); box-shadow:0 0 18px rgba(120,220,255,.85),0 0 34px rgba(255,120,240,.6); animation:nexus-mythic-prism 1.2s linear infinite; }
@keyframes nexus-mythic-prism { 0%,100% { filter:hue-rotate(0deg); opacity:.65; } 50% { filter:hue-rotate(160deg); opacity:1; } }
@media (max-width:900px), (max-height:600px) {
  .booster-opening-stage,.booster-summary { width:98vw; height:96dvh; border-radius:14px; }
  .booster-pack-animation { height:82px; flex-basis:82px; }
  .booster-pack-shell { width:86px; height:70px; }
  .booster-pack-shell span { font-size:14px; }
  .booster-card-fan { padding:5px 12px; gap:5px; }
  .booster-pull-card { width:clamp(62px,15vw,108px); }
  .booster-opening-footer { min-height:48px; padding:5px 10px 8px; }
  .booster-opening-footer small { display:none; }
  .booster-summary-grid { grid-template-columns:repeat(auto-fill,minmax(76px,1fr)); gap:7px; padding:9px; }
}
`);

console.log('[booster-update] Migration boosters terminée.');
