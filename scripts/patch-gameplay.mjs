import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next !== source) writeFileSync(path, next);
}

patch(new URL('../src/engine/types.ts', import.meta.url), (source) => {
  if (source.includes('evosphere: string[]')) return source;
  return source.replace(
    '  graveyard: string[];\n  fatigue: number;',
    '  graveyard: string[];\n  /** Réserve séparée contenant les cartes d’évolution encore disponibles. */\n  evosphere: string[];\n  fatigue: number;'
  );
});

patch(new URL('../src/engine/engine.ts', import.meta.url), (source) => {
  let next = source.replace('export const MAX_FIELD_UNITS = 6;', 'export const MAX_FIELD_UNITS = 3;');

  if (!next.includes('evosphere: [...CARD_DB.values()]')) {
    next = next.replace(
      '    graveyard: [],\n    fatigue: 0,',
      "    graveyard: [],\n    evosphere: [...CARD_DB.values()]\n      .filter((card) => card.faction === faction && card.level === 2)\n      .map((card) => card.id),\n    fatigue: 0,"
    );
  }

  next = next.replace('  applyEvolutions(state, id);\n', '');

  next = next.replace(
    /function applyEvolutions\([\s\S]*?\n}\n\nexport function endTurn/,
    `export function evolveUnit(\n  rawState: GameState,\n  playerId: PlayerId,\n  unitInstanceId: string\n): GameState {\n  const state = clone(rawState);\n  if (state.winner || state.activePlayer !== playerId) return state;\n\n  const player = state[playerId];\n  const unit = findUnit(player, unitInstanceId);\n  if (!unit) return state;\n\n  const base = getCard(unit.cardId);\n  if (!base.waitTurns || !base.evolvesTo || unit.turnsOnField < base.waitTurns) return state;\n\n  const evoIndex = player.evosphere.indexOf(base.evolvesTo);\n  if (evoIndex < 0) {\n    pushLog(state, \`${'${base.name}'} ne peut pas évoluer : son évolution n’est plus dans l’Évosphère.\`);\n    return state;\n  }\n\n  const evo = getCard(base.evolvesTo);\n  player.evosphere.splice(evoIndex, 1);\n  player.graveyard.push(base.id);\n\n  unit.cardId = evo.id;\n  unit.attack = evo.attack + unit.buffs;\n  unit.maxHealth = evo.health;\n  unit.health = evo.health;\n  unit.turnsOnField = 0;\n  unit.canAttack = false;\n\n  pushLog(state, \`WARNING EVOLUTION — ${'${base.name}'} évolue en ${'${evo.name}'} !\`);\n  if (evo.effect) resolveEffect(state, playerId, evo.effect, unit.instanceId);\n  return state;\n}\n\nfunction evolveAiUnits(rawState: GameState): GameState {\n  let state = rawState;\n  const eligible = state.enemy.field.filter((unit) => {\n    const card = getCard(unit.cardId);\n    return Boolean(card.waitTurns && card.evolvesTo && unit.turnsOnField >= card.waitTurns);\n  });\n  for (const unit of eligible) state = evolveUnit(state, 'enemy', unit.instanceId);\n  return state;\n}\n\nexport function endTurn`
  );

  if (!next.includes('state = evolveAiUnits(state);')) {
    next = next.replace(
      "  const difficulty = state.aiDifficulty;\n\n  // Phase principale",
      "  const difficulty = state.aiDifficulty;\n  state = evolveAiUnits(state);\n\n  // Phase principale"
    );
  }

  return next;
});

patch(new URL('../src/App.tsx', import.meta.url), (source) => {
  let next = source.replace(
    "import { declareAttack, endTurn, newGame, playCard } from './engine/engine';",
    "import { declareAttack, endTurn, evolveUnit, newGame, playCard } from './engine/engine';"
  );

  if (!next.includes("window.addEventListener('nexus:evolve'")) {
    next = next.replace(
      '  const [reported, setReported] = useState(false);',
      `  const [reported, setReported] = useState(false);\n\n  useEffect(() => {\n    const onEvolve = (event: Event) => {\n      const instanceId = (event as CustomEvent<string>).detail;\n      if (!instanceId) return;\n      setMatch((current) => evolveUnit(current, 'player', instanceId));\n    };\n    window.addEventListener('nexus:evolve', onEvolve);\n    return () => window.removeEventListener('nexus:evolve', onEvolve);\n  }, []);`
    );
  }

  if (!next.includes('data-evolvable=')) {
    next = next.replace(
      '      onClick={() => onSelect?.(unit.instanceId)}\n    >',
      `      onClick={() => onSelect?.(unit.instanceId)}\n      data-card-id={card.id}\n      data-instance-id={unit.instanceId}\n      data-evolvable={Boolean(!isEnemy && card.waitTurns && card.evolvesTo && unit.turnsOnField >= card.waitTurns)}\n      data-evolution-name={card.evolvesTo ? ALL_CARDS.find((entry) => entry.id === card.evolvesTo)?.name ?? '' : ''}\n    >`
    );
  }

  if (!next.includes('className="battle-side-piles"')) {
    next = next.replace(
      '      {match.winner && (',
      `      <div className="battle-side-piles" aria-label="Piles de cartes">\n        <button className="card-pile evosphere-pile" type="button" title="Évosphère : évolutions disponibles">\n          <span className="pile-cards" aria-hidden="true" />\n          <b>{match.player.evosphere.length}</b>\n          <small>ÉVOSPHÈRE</small>\n        </button>\n        <button className="card-pile graveyard-pile" type="button" title="Fosse : cartes utilisées ou détruites">\n          <span className="pile-cards" aria-hidden="true" />\n          <b>{match.player.graveyard.length}</b>\n          <small>FOSSE</small>\n        </button>\n        <button className="card-pile deck-pile" type="button" title="Cartes restantes dans le deck">\n          <span className="pile-cards" aria-hidden="true" />\n          <b>{match.player.deck.length}</b>\n          <small>DECK</small>\n        </button>\n      </div>\n\n      {match.winner && (`
    );
  }

  return next;
});
