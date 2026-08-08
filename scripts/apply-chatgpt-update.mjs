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

patchFile('src/App.tsx', [
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
]);

console.log('[nexus-update] Migration terminée.');
