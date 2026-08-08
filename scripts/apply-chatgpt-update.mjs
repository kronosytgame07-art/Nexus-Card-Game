import fs from 'node:fs';

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { from, to, label } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[nexus-update] Patch déjà intégré ou motif introuvable: ${label}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
    console.log(`[nexus-update] ${label}`);
  }
  if (changed) fs.writeFileSync(path, source);
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, `\n${content}\n`);
  console.log(`[nexus-update] ${marker}`);
}

patchFile('src/store/game.ts', [
  {
    label: 'Mythique limitée à 1 exemplaire dans tous les decks',
    from: "export function maxCopiesAllowed(cardId: string): number {\n  return getCard(cardId).copies;\n}",
    to: "export function maxCopiesAllowed(cardId: string): number {\n  const card = getCard(cardId);\n  return card.rarity === 'Mythique' ? 1 : Math.min(3, card.copies);\n}",
  },
]);

patchFile('src/engine/engine.ts', [
  {
    label: 'Première Draw Phase réelle du joueur 1',
    from: "  const state: GameState = {\n    turn: 1,\n    activePlayer: 'player',\n    phase: 'main',\n    player: makePlayer('player', playerFaction, playerDeck, 0, playerEvosphere),\n    enemy: makePlayer('enemy', enemyFaction, undefined, enemyLifeBonus),\n    log: ['La partie commence. À toi de jouer.'],\n    aiDifficulty,\n  };\n  return state;",
    to: "  const state: GameState = {\n    turn: 1,\n    activePlayer: 'player',\n    phase: 'main',\n    player: makePlayer('player', playerFaction, playerDeck, 0, playerEvosphere),\n    enemy: makePlayer('enemy', enemyFaction, undefined, enemyLifeBonus),\n    log: ['La partie commence. À toi de jouer.'],\n    aiDifficulty,\n  };\n  // Le joueur 1 effectue bien sa première pioche. L'UI la masque jusqu'à\n  // l'animation de Draw Phase, puis passe automatiquement en Main Phase.\n  drawOne(state, 'player');\n  pushLog(state, 'Tu pioches ta première carte.');\n  return state;",
  },
]);

patchFile('src/components/VfxLayer.tsx', [
  {
    label: 'Presets WebGL dédiés aux activations d’effet',
    from: "export type BurstPreset = 'summon' | 'evolution' | 'attack' | 'draw' | 'crack';",
    to: "export type BurstPreset = 'summon' | 'evolution' | 'attack' | 'draw' | 'crack' | 'effect-ally' | 'effect-enemy';",
  },
  {
    label: 'Couleurs WebGL joueur/adversaire pour les effets',
    from: "  crack: { count: 30, speed: [220, 540], life: [0.16, 0.3], size: [2, 5], gravity: 160, colors: [[1, 1, 1], [1, 0.9, 0.6]] },\n};",
    to: "  crack: { count: 30, speed: [220, 540], life: [0.16, 0.3], size: [2, 5], gravity: 160, colors: [[1, 1, 1], [1, 0.9, 0.6]] },\n  'effect-ally': { count: 64, speed: [80, 270], life: [0.45, 0.9], size: [3, 9], gravity: -20, colors: [[0.2, 1, 0.8], [0.45, 0.85, 1], [1, 0.9, 0.4]] },\n  'effect-enemy': { count: 64, speed: [80, 270], life: [0.45, 0.9], size: [3, 9], gravity: -20, colors: [[1, 0.2, 0.4], [0.8, 0.25, 1], [1, 0.55, 0.25]] },\n};",
  },
]);

patchFile('src/App.tsx', [
  {
    label: 'Importer les règles de ciblage Vol/À distance dans l’UI',
    from: "import { activateSupportCard, activateUnitEffect, aiDrawPhase, aiEndPhase, aiMainPhase, aiPrepareBattlePlan, aiResolveOneAttack, declareAttack, evolveUnit, MAX_FIELD_UNITS, MAX_SUPPORT, newGame, playCard } from './engine/engine';",
    to: "import { activateSupportCard, activateUnitEffect, aiDrawPhase, aiEndPhase, aiMainPhase, aiPrepareBattlePlan, aiResolveOneAttack, declareAttack, evolveUnit, MAX_FIELD_UNITS, MAX_SUPPORT, newGame, playCard } from './engine/engine';\nimport { canFightTarget } from './engine/combat-rules';",
  },
  {
    label: 'Deck builder: pool multi-archétypes',
    from: "  const pool = savedDeck ? cardsByFaction(savedDeck.faction).filter((c) => c.level === 1 && s.owned.includes(c.id)) : [];",
    to: "  // Un deck garde une faction principale pour son identité visuelle, mais les cartes\n  // de toutes les factions débloquées peuvent être mélangées librement.\n  const pool = savedDeck ? ALL_CARDS.filter((c) => c.level === 1 && s.unlockedFactions.includes(c.faction) && s.owned.includes(c.id)) : [];",
  },
  {
    label: 'Évosphère compatible avec decks hybrides',
    from: "  const evoPool = savedDeck\n    ? cardsByFaction(savedDeck.faction).filter((c) => c.level === 2 && c.evolvesFrom && s.owned.includes(c.evolvesFrom))\n    : [];",
    to: "  const evoPool = savedDeck\n    ? ALL_CARDS.filter((c) => c.level === 2 && c.evolvesFrom && savedDeck.main.includes(c.evolvesFrom) && s.owned.includes(c.evolvesFrom))\n    : [];",
  },
  {
    label: 'Libellé deck hybride',
    from: "        {count}/{MAIN_DECK_MAX} cartes ({MAIN_DECK_MIN} minimum pour jouer) · faction {savedDeck.faction}",
    to: "        {count}/{MAIN_DECK_MAX} cartes ({MAIN_DECK_MIN} minimum pour jouer) · identité {savedDeck.faction} · archétypes mélangeables",
  },
  {
    label: 'Règles deck builder visibles',
    from: "      <p className=\"hint\">Règles : {MAIN_DECK_MIN} à {MAIN_DECK_MAX} cartes par deck · pas d'Extra Deck · l'Évosphère (max {EVOSPHERE_MAX}) se choisit toi-même parmi les évolutions des cartes de ton deck · aucun craft, uniquement les cartes déjà possédées.</p>",
    to: "      <p className=\"hint\">Règles : {MAIN_DECK_MIN} à {MAIN_DECK_MAX} cartes · mélange libre des archétypes débloqués · 3 exemplaires max par carte, 1 seule Mythique · l'Évosphère (max {EVOSPHERE_MAX}) ne propose que les évolutions des unités réellement présentes dans le deck · uniquement les cartes possédées.</p>",
  },
  {
    label: 'Première Draw Phase visible dès le début du duel',
    from: "const [drawStage, setDrawStage] = useState<'idle' | 'prompt' | 'reveal'>('idle');",
    to: "const [drawStage, setDrawStage] = useState<'idle' | 'prompt' | 'reveal'>('prompt');",
  },
  {
    label: 'Restart reprend en Draw Phase visible',
    from: "setPhase('draw'); setDrawStage('idle'); setPauseOpen(false);",
    to: "setPhase('draw'); setDrawStage('prompt'); setPauseOpen(false);",
  },
  {
    label: 'Tags Vol / À distance / Blitz visibles sur le terrain',
    from: "<span className=\"field-card-tags\">{unit.taunt && <em>PROVOCATION</em>}{unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}</span>",
    to: "<span className=\"field-card-tags\">{card.flying && <em>VOL</em>}{card.ranged && <em>À DISTANCE</em>}{card.blitz && <em>BLITZ</em>}{unit.taunt && <em>PROVOCATION</em>}{unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}</span>",
  },
  {
    label: 'Provocation UI respecte Vol et portée',
    from: "  const enemyHasTaunt = match.enemy.field.some((unit) => unit.taunt && unit.stunnedTurns === 0); const activePlayerUnit = inspectedUnit ? match.player.field.find((unit) => unit.instanceId === inspectedUnit) : undefined;",
    to: "  const selectedAttackerUnit = selectedAttacker ? match.player.field.find((unit) => unit.instanceId === selectedAttacker) : undefined;\n  const selectedAttackerDef = selectedAttackerUnit ? getCard(selectedAttackerUnit.cardId) : undefined;\n  const enemyHasTaunt = match.enemy.field.some((unit) => unit.taunt && unit.stunnedTurns === 0 && (!selectedAttackerDef || canFightTarget(selectedAttackerDef, getCard(unit.cardId)))); const activePlayerUnit = inspectedUnit ? match.player.field.find((unit) => unit.instanceId === inspectedUnit) : undefined;",
  },
  {
    label: 'Type VFX activation d’effet sur une unité',
    from: "type BattleFx = { type: 'summon'; side: 'player' | 'enemy'; instanceId?: string } | { type: 'attack'; side: 'player' | 'enemy'; instanceId: string; dx?: number; dy?: number } | { type: 'evolution'; side: 'player' | 'enemy'; cardName: string } | null;",
    to: "type BattleFx = { type: 'summon'; side: 'player' | 'enemy'; instanceId?: string } | { type: 'attack'; side: 'player' | 'enemy'; instanceId: string; dx?: number; dy?: number } | { type: 'effect'; side: 'player' | 'enemy'; instanceId: string } | { type: 'evolution'; side: 'player' | 'enemy'; cardName: string } | null;",
  },
  {
    label: 'Classe aura sur carte activant un effet',
    from: "  const isAttacking = fx?.type === 'attack' && fx.instanceId === unit.instanceId; const isHit = !!damagePulse;",
    to: "  const isAttacking = fx?.type === 'attack' && fx.instanceId === unit.instanceId; const isHit = !!damagePulse;\n  const isEffect = fx?.type === 'effect' && fx.instanceId === unit.instanceId;",
  },
  {
    label: 'Aura joueur/adversaire ajoutée à FieldCard',
    from: " + (selected ? ' selected' : '') + (hidden ? ' evolving-hidden' : '')}",
    to: " + (selected ? ' selected' : '') + (hidden ? ' evolving-hidden' : '') + (isEffect ? (isEnemy ? ' effect-active enemy-effect' : ' effect-active ally-effect') : '')}",
  },
  {
    label: 'Activation manuelle déclenche aura et WebGL',
    from: "updateMatch(next); pulseFromDiff(before, next); showHint(card ? `Effet de ${card.name} activé !` : 'Effet activé !');",
    to: "updateMatch(next); pulseFromDiff(before, next); triggerFx({ type: 'effect', side: 'player', instanceId }, 900); const effectEl = cardRefs.current[instanceId]; if (effectEl) { const r = effectEl.getBoundingClientRect(); vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'effect-ally'); } showHint(card ? `Effet de ${card.name} activé !` : 'Effet activé !');",
  },
  {
    label: 'Effets adverses détectés dans les différences d’état',
    from: "const prevHp = prevUnit?.health; if (prevHp != null && u.health < prevHp)",
    to: "const prevHp = prevUnit?.health; if (side === 'enemy' && prevUnit && (u.effectUsesThisTurn ?? 0) > (prevUnit.effectUsesThisTurn ?? 0)) { const el = cardRefs.current[u.instanceId]; if (el) { const r = el.getBoundingClientRect(); triggerFx({ type: 'effect', side: 'enemy', instanceId: u.instanceId }, 900); vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'effect-enemy'); } } if (prevHp != null && u.health < prevHp)",
  },
]);

appendOnce('src/arena.css', 'NEXUS SIDE PREVIEW NON BLOCKING', `
/* NEXUS SIDE PREVIEW NON BLOCKING */
.hand-preview-overlay {
  pointer-events: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: flex-end !important;
  padding: 0 !important;
}
.hand-preview {
  pointer-events: auto !important;
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: clamp(250px, 24vw, 360px) !important;
  max-width: 42vw !important;
  height: 100dvh !important;
  max-height: none !important;
  border-radius: 0 !important;
  border-width: 0 0 0 1px !important;
  box-shadow: -18px 0 48px rgba(0,0,0,.58) !important;
}
@media (max-width: 900px), (orientation: landscape) and (max-height: 600px) {
  .hand-preview { width: clamp(210px, 38vw, 300px) !important; max-width: 44vw !important; }
}

@keyframes nexus-effect-pulse-ally {
  0% { box-shadow: 0 0 0 0 rgba(65,226,179,0), 0 0 0 rgba(95,220,255,0); filter: brightness(1); }
  35% { box-shadow: 0 0 0 7px rgba(65,226,179,.5), 0 0 38px rgba(95,220,255,.95); filter: brightness(1.45) saturate(1.25); }
  100% { box-shadow: 0 0 0 18px rgba(65,226,179,0), 0 0 8px rgba(95,220,255,0); filter: brightness(1); }
}
@keyframes nexus-effect-pulse-enemy {
  0% { box-shadow: 0 0 0 0 rgba(239,73,97,0), 0 0 0 rgba(190,90,255,0); filter: brightness(1); }
  35% { box-shadow: 0 0 0 7px rgba(239,73,97,.5), 0 0 38px rgba(190,90,255,.95); filter: brightness(1.45) saturate(1.3); }
  100% { box-shadow: 0 0 0 18px rgba(239,73,97,0), 0 0 8px rgba(190,90,255,0); filter: brightness(1); }
}
.field-card.effect-active.ally-effect { animation: nexus-effect-pulse-ally .9s ease-out !important; z-index: 55 !important; }
.field-card.effect-active.enemy-effect { animation: nexus-effect-pulse-enemy .9s ease-out !important; z-index: 55 !important; }
`);

console.log('[nexus-update] Migration terminée.');
