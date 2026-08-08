import fs from 'node:fs';

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, `\n${content}\n`);
  console.log(`[nexus-update] ${marker}`);
}

appendOnce('src/styles.css', 'NEXUS PREMIUM PRISM FOIL', `
/* NEXUS PREMIUM PRISM FOIL */
@keyframes nexus-prism-sweep {
  0% { background-position: -180% -120%, 0 0, 0 0; opacity: .28; }
  45% { opacity: .68; }
  100% { background-position: 220% 160%, 180% 0, 0 180%; opacity: .32; }
}
@keyframes nexus-prism-breathe {
  0%, 100% { filter: saturate(1.04) contrast(1.02) brightness(1); }
  50% { filter: saturate(1.18) contrast(1.05) brightness(1.08); }
}
.collection-entry.has-foil .card,
.collection-entry.has-foil .card.full-art {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  animation: nexus-prism-breathe 4.8s ease-in-out infinite;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.26),
    0 0 18px rgba(130,200,255,.25),
    0 12px 30px rgba(0,0,0,.45);
}
.collection-entry.has-foil .card::after,
.collection-entry.has-foil .card.full-art::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    linear-gradient(118deg,
      transparent 0 34%,
      rgba(255,255,255,.08) 38%,
      rgba(125,235,255,.34) 42%,
      rgba(255,130,235,.28) 46%,
      rgba(255,238,120,.34) 50%,
      rgba(140,255,200,.28) 54%,
      rgba(255,255,255,.12) 58%,
      transparent 64% 100%),
    repeating-linear-gradient(132deg,
      rgba(255,255,255,.08) 0 1px,
      transparent 1px 7px),
    repeating-linear-gradient(48deg,
      rgba(120,210,255,.06) 0 1px,
      transparent 1px 9px);
  background-size: 220% 220%, 180% 180%, 180% 180%;
  animation: nexus-prism-sweep 4.2s linear infinite;
}
.collection-entry.has-foil .card::before,
.collection-entry.has-foil .card.full-art::before {
  content: '';
  position: absolute;
  inset: 2px;
  z-index: 7;
  pointer-events: none;
  border-radius: inherit;
  border: 1px solid rgba(255,255,255,.32);
  box-shadow: inset 0 0 18px rgba(150,215,255,.12);
}

/* La Mythique est visuellement au-dessus d'une foil standard : halo irisé fin,
   sans masquer l'illustration ni le texte. */
.card.Mythique,
.card.full-art.Mythique,
.field-card.Mythique {
  position: relative;
  border-color: rgba(255,255,255,.88) !important;
  box-shadow:
    0 0 0 1px rgba(180,225,255,.55),
    0 0 18px rgba(120,210,255,.45),
    0 0 34px rgba(225,110,255,.24),
    0 12px 30px rgba(0,0,0,.5) !important;
}
.card.Mythique::after,
.card.full-art.Mythique::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    linear-gradient(112deg,
      transparent 0 28%,
      rgba(120,220,255,.2) 34%,
      rgba(255,255,255,.62) 43%,
      rgba(255,120,235,.34) 49%,
      rgba(255,235,120,.32) 54%,
      rgba(115,255,205,.3) 59%,
      transparent 68% 100%),
    repeating-linear-gradient(135deg, rgba(255,255,255,.12) 0 1px, transparent 1px 5px);
  background-size: 250% 250%, 140% 140%;
  animation: nexus-prism-sweep 2.8s linear infinite;
}

html[data-animations='off'] .collection-entry.has-foil .card,
html[data-animations='off'] .collection-entry.has-foil .card::after,
html[data-animations='off'] .card.Mythique::after {
  animation: none !important;
}
`);

console.log('[nexus-update] Finition prismatique prête.');
