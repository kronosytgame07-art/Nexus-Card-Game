import fs from 'node:fs';

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { label, from, to } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[evolution-ui] motif introuvable ou déjà migré: ${label}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
    console.log(`[evolution-ui] ${label}`);
  }
  if (changed) fs.writeFileSync(path, source);
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, `\n${content}\n`);
  console.log(`[evolution-ui] ${marker}`);
}

patchFile('src/App.tsx', [
  {
    label: 'Composant commun EvolutionInfo',
    from: "function Home() {",
    to: `function EvolutionInfo({ card, turnsOnField }: { card: CardDef; turnsOnField?: number }) {
  if (!card.evolvesTo) return null;
  const evolution = ALL_CARDS.find((entry) => entry.id === card.evolvesTo);
  if (!evolution) return <div className="evolution-info missing"><b>Évolution</b><span>Forme suivante introuvable dans les données.</span></div>;
  const required = card.waitTurns ?? 0;
  const current = turnsOnField ?? 0;
  const remaining = Math.max(0, required - current);
  const ready = turnsOnField !== undefined && remaining === 0;
  return <div className={'evolution-info' + (ready ? ' ready' : '')}>
    <img src={evolution.image} alt={evolution.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} />
    <div><b>Évolution → {evolution.name}</b><span>⚔ {evolution.attack} · ♥ {evolution.health}</span>{required > 0 && <small>{turnsOnField === undefined ? `Disponible après ${required} tour${required > 1 ? 's' : ''} sur le terrain.` : ready ? '✓ ÉVOLUTION PRÊTE' : `Encore ${remaining} tour${remaining > 1 ? 's' : ''} à survivre.`}</small>}</div>
  </div>;
}

function Home() {`,
  },
  {
    label: 'Évolution toujours visible dans aperçu de main',
    from: `<p>{def.text || "Cette carte n'a pas d'effet."}</p>{isSpell && <small className="hand-preview-warn spell">`,
    to: `<p>{def.text || "Cette carte n'a pas d'effet."}</p>{def.type === 'unit' && <EvolutionInfo card={def} />}{isSpell && <small className="hand-preview-warn spell">`,
  },
  {
    label: 'Évolution visible dans panneau unité alliée',
    from: `<p>{def.text || "Cette carte n'a pas d'effet."}</p>{maxUses > 0 && <button className="secondary" onClick={() => activateEffect(activePlayerUnit.instanceId)}>`,
    to: `<p>{def.text || "Cette carte n'a pas d'effet."}</p><EvolutionInfo card={def} turnsOnField={activePlayerUnit.turnsOnField} />{maxUses > 0 && <button className="secondary" onClick={() => activateEffect(activePlayerUnit.instanceId)}>`,
  },
  {
    label: 'Évolution visible dans panneau unité adverse',
    from: `<p>{def.text || "Cette carte n'a pas d'effet."}</p><button onClick={() => setInspectedEnemyId(null)}>Fermer</button>`,
    to: `<p>{def.text || "Cette carte n'a pas d'effet."}</p><EvolutionInfo card={def} turnsOnField={unit.turnsOnField} /><button onClick={() => setInspectedEnemyId(null)}>Fermer</button>`,
  },
  {
    label: 'Badge terrain indique progression évolution',
    from: `<span className="field-card-level">NIV {card.level}</span>`,
    to: `<span className="field-card-level">NIV {card.level}</span>{card.evolvesTo && card.waitTurns && <span className={'field-card-evo' + (unit.turnsOnField >= card.waitTurns ? ' ready' : '')}>{unit.turnsOnField >= card.waitTurns ? 'ÉVO ✓' : `ÉVO ${unit.turnsOnField}/${card.waitTurns}`}</span>}`,
  },
]);

appendOnce('src/arena.css', 'NEXUS EVOLUTION STATUS UI', `
/* NEXUS EVOLUTION STATUS UI */
.evolution-info {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 9px;
  width: 100%;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid rgba(150,190,255,.35);
  background: linear-gradient(135deg, rgba(65,100,170,.16), rgba(8,18,26,.72));
  box-sizing: border-box;
  text-align: left;
}
.evolution-info img { width: 54px; height: 74px; object-fit: cover; border-radius: 7px; border: 1px solid rgba(239,201,107,.48); }
.evolution-info > div { display: flex; flex-direction: column; gap: 3px; justify-content: center; min-width: 0; }
.evolution-info b { color: #dcecff; font: 800 11px "Space Grotesk"; white-space: normal; }
.evolution-info span { color: #b8c9d8; font: 9px "DM Mono"; }
.evolution-info small { color: #90a9bc; font: 8px "DM Mono"; line-height: 1.35; }
.evolution-info.ready { border-color: rgba(100,255,195,.8); box-shadow: 0 0 18px rgba(65,226,179,.22); background: linear-gradient(135deg, rgba(40,155,120,.2), rgba(8,22,22,.82)); }
.evolution-info.ready small { color: #76f2ca; font-weight: 800; }
.evolution-info.missing { display: flex; flex-direction: column; color: #ffb3b3; border-color: rgba(255,90,110,.5); }
.field-card-evo {
  position: absolute;
  top: 25px;
  right: 4px;
  z-index: 8;
  padding: 2px 4px;
  border-radius: 5px;
  background: rgba(10,20,34,.9);
  border: 1px solid rgba(150,190,255,.55);
  color: #cfe5ff;
  font: 700 clamp(5px, .55vw, 7px) "DM Mono";
  pointer-events: none;
}
.field-card-evo.ready { color: #7bffd0; border-color: rgba(90,255,190,.8); box-shadow: 0 0 10px rgba(65,226,179,.45); animation: evo-ready-pulse 1.25s ease-in-out infinite; }
@keyframes evo-ready-pulse { 0%,100% { opacity:.8; } 50% { opacity:1; filter:brightness(1.45); } }
[data-animations="off"] .field-card-evo.ready { animation: none; }
`);

console.log('[evolution-ui] Migration terminée.');
