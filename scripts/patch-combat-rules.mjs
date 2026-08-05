import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next !== source) writeFileSync(path, next);
}

patch(new URL('../src/engine/types.ts', import.meta.url), (source) => {
  if (source.includes('effectUsesThisTurn: number;')) return source;
  return source.replace(
    '  taunt: boolean;\n}',
    '  taunt: boolean;\n  /** Nombre d’activations manuelles déjà utilisées pendant le tour courant. */\n  effectUsesThisTurn: number;\n}'
  );
});

patch(new URL('../src/engine/engine.ts', import.meta.url), (source) => {
  let engine = source;

  engine = engine.replace(
    "  const opponent = state[other(playerId)];\n  const opponentTaunts = opponent.field.filter((u) => u.taunt);",
    "  const opponent = state[other(playerId)];\n  const opponentTaunts = opponent.field.filter((u) => u.taunt);\n  const attackerDef = getCard(attacker.cardId);\n  const canAttackDirectly = attackerDef.text.toLowerCase().includes('attaque directe');\n  if (!targetInstanceId && opponent.field.length > 0 && !canAttackDirectly) {\n    pushLog(state, 'Les créatures adverses te barrent la route.');\n    return state;\n  }"
  );

  engine = engine.replace(
    "    if (def.effect) resolveEffect(state, playerId, def.effect, unit.instanceId);",
    "    if (def.effect && def.text.toLowerCase().includes('à l’invocation')) resolveEffect(state, playerId, def.effect, unit.instanceId);"
  );
  engine = engine.replace(
    "    if (def.effect) resolveEffect(state, playerId, def.effect);",
    "    if (def.effect && def.text.toLowerCase().includes('à l’invocation')) resolveEffect(state, playerId, def.effect);"
  );

  if (!engine.includes('effectUsesThisTurn: 0,')) {
    engine = engine.replace(/(taunt: false,\n)/g, '$1          effectUsesThisTurn: 0,\n');
  }

  if (!engine.includes('unit.effectUsesThisTurn = 0;')) {
    engine = engine.replace(
      '  for (const unit of p.field) {\n    unit.canAttack = true;',
      '  for (const unit of p.field) {\n    unit.canAttack = true;\n    unit.effectUsesThisTurn = 0;'
    );
  }

  if (!engine.includes('export function activateUnitEffect')) {
    engine += `\n\nexport function activateUnitEffect(rawState: GameState, playerId: PlayerId, unitInstanceId: string): GameState {\n  const state = clone(rawState);\n  if (state.winner || state.activePlayer !== playerId) return state;\n  const unit = findUnit(state[playerId], unitInstanceId);\n  if (!unit) return state;\n  const def = getCard(unit.cardId);\n  if (!def.effect || def.text.toLowerCase().includes('à l’invocation')) return state;\n  const maxUses = def.text.toLowerCase().includes('2 fois par tour') ? 2 : 1;\n  if ((unit.effectUsesThisTurn ?? 0) >= maxUses) {\n    pushLog(state, def.name + ' a déjà utilisé toutes ses activations ce tour.');\n    return state;\n  }\n  resolveEffect(state, playerId, def.effect, unit.instanceId);\n  unit.effectUsesThisTurn = (unit.effectUsesThisTurn ?? 0) + 1;\n  pushLog(state, def.name + ' active son effet (' + unit.effectUsesThisTurn + '/' + maxUses + ').');\n  return state;\n}\n`;
  } else {
    engine = engine.replace(
      /export function activateUnitEffect\([\s\S]*?\n}\n(?=\n|$)/,
      `export function activateUnitEffect(rawState: GameState, playerId: PlayerId, unitInstanceId: string): GameState {\n  const state = clone(rawState);\n  if (state.winner || state.activePlayer !== playerId) return state;\n  const unit = findUnit(state[playerId], unitInstanceId);\n  if (!unit) return state;\n  const def = getCard(unit.cardId);\n  if (!def.effect || def.text.toLowerCase().includes('à l’invocation')) return state;\n  const maxUses = def.text.toLowerCase().includes('2 fois par tour') ? 2 : 1;\n  if ((unit.effectUsesThisTurn ?? 0) >= maxUses) {\n    pushLog(state, def.name + ' a déjà utilisé toutes ses activations ce tour.');\n    return state;\n  }\n  resolveEffect(state, playerId, def.effect, unit.instanceId);\n  unit.effectUsesThisTurn = (unit.effectUsesThisTurn ?? 0) + 1;\n  pushLog(state, def.name + ' active son effet (' + unit.effectUsesThisTurn + '/' + maxUses + ').');\n  return state;\n}`
    );
  }

  return engine;
});

patch(new URL('../src/App.tsx', import.meta.url), (source) => {
  let app = source;

  if (!app.includes('activateUnitEffect, declareAttack')) {
    app = app.replace(
      /import \{ ([^}]*?)declareAttack, endTurn,([^}]*?) \} from '\.\/engine\/engine';/,
      (_match, before, after) => `import { ${before}activateUnitEffect, declareAttack, endTurn,${after} } from './engine/engine';`
    );
  }

  if (!app.includes('const [inspectedUnit, setInspectedUnit]')) {
    app = app.replace(
      '  const [reported, setReported] = useState(false);',
      '  const [reported, setReported] = useState(false);\n  const [inspectedUnit, setInspectedUnit] = useState<string | null>(null);'
    );
  }

  if (!app.includes('const activateEffect = () =>')) {
    app = app.replace(
      '  const finishTurn = () => {',
      "  const activateEffect = () => {\n    if (!inspectedUnit) return;\n    setMatch((current) => activateUnitEffect(current, 'player', inspectedUnit));\n  };\n\n  const finishTurn = () => {"
    );
  }

  app = app.replace(
    '        onSelect={onPlayerUnitClick}\n      />',
    '        onSelect={(id) => { setInspectedUnit(id); onPlayerUnitClick(id); }}\n      />\n\n      {inspectedUnit && (\n        <button className="activate-effect" onClick={activateEffect}>Activer l’effet</button>\n      )}'
  );

  if (!app.includes('data-card-text={card.text}')) {
    app = app.replace(
      '      data-evolution-name={card.evolvesTo ? ALL_CARDS.find((entry) => entry.id === card.evolvesTo)?.name ?? \'\' : \'\'}',
      `      data-evolution-name={card.evolvesTo ? ALL_CARDS.find((entry) => entry.id === card.evolvesTo)?.name ?? '' : ''}\n      data-card-text={card.text}\n      data-card-cost={card.cost}\n      data-card-rarity={card.rarity}\n      data-card-faction={card.faction}\n      data-wait-turns={card.waitTurns ?? ''}\n      data-turns-on-field={unit.turnsOnField}\n      data-effect-uses={unit.effectUsesThisTurn ?? 0}\n      data-effect-max={card.effect && !card.text.toLowerCase().includes('à l’invocation') ? (card.text.toLowerCase().includes('2 fois par tour') ? 2 : 1) : 0}\n      data-has-effect={Boolean(card.effect)}`
    );
  }

  if (!app.includes('className="boss-quote"')) {
    app = app.replace(
      '      {chapter && <p className="eyebrow">Chapitre {chapter.id + 1} · {chapter.title}</p>}',
      `      {chapter && <p className="eyebrow">Chapitre {chapter.id + 1} · {chapter.title}</p>}\n      {chapter && <div className="boss-quote">{chapter.opponentFaction === 'Chevalier' ? 'Jeanne d’Arc : Que la lumière guide ma lame !' : 'Chef de la Meute : Tu es entré sur notre territoire.'}</div>}`
    );
  }

  return app;
});

patch(new URL('../src/arena.css', import.meta.url), (source) => {
  if (source.includes('.activate-effect')) return source;
  return source + `\n.activate-effect{position:fixed;left:3%;bottom:95px;z-index:45;padding:12px 18px;border:1px solid #ffe08a;border-radius:10px;background:linear-gradient(90deg,#6f5312,#d39b2d);color:#fff;font-weight:800;text-transform:uppercase;box-shadow:0 0 24px #ffc94755}.boss-quote{position:fixed;top:66px;left:50%;transform:translateX(-50%);z-index:30;padding:8px 14px;border:1px solid #ffffff33;border-radius:10px;background:#05090dcc;color:#fff;font:700 11px "DM Mono";box-shadow:0 8px 24px #0008}\n`;
});
