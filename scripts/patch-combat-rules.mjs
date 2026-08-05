import { readFileSync, writeFileSync } from 'node:fs';

const enginePath = new URL('../src/engine/engine.ts', import.meta.url);
let engine = readFileSync(enginePath, 'utf8');

if (!engine.includes('export function activateUnitEffect')) {
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

  engine += `\n\nexport function activateUnitEffect(rawState: GameState, playerId: PlayerId, unitInstanceId: string): GameState {\n  const state = clone(rawState);\n  if (state.winner || state.activePlayer !== playerId) return state;\n  const unit = findUnit(state[playerId], unitInstanceId);\n  if (!unit) return state;\n  const def = getCard(unit.cardId);\n  if (!def.effect) return state;\n  if (def.text.toLowerCase().includes('à l’invocation')) return state;\n  resolveEffect(state, playerId, def.effect, unit.instanceId);\n  pushLog(state, def.name + ' active son effet.');\n  return state;\n}\n`;

  writeFileSync(enginePath, engine);
}

const appPath = new URL('../src/App.tsx', import.meta.url);
let app = readFileSync(appPath, 'utf8');
if (!app.includes('activateUnitEffect')) {
  app = app.replace(
    "import { declareAttack, endTurn, newGame, playCard } from './engine/engine';",
    "import { activateUnitEffect, declareAttack, endTurn, newGame, playCard } from './engine/engine';"
  );

  app = app.replace(
    "  const [reported, setReported] = useState(false);",
    "  const [reported, setReported] = useState(false);\n  const [inspectedUnit, setInspectedUnit] = useState<string | null>(null);"
  );

  app = app.replace(
    "  const finishTurn = () => {",
    "  const activateEffect = () => {\n    if (!inspectedUnit) return;\n    setMatch(activateUnitEffect(match, 'player', inspectedUnit));\n  };\n\n  const finishTurn = () => {"
  );

  app = app.replace(
    "        onSelect={onPlayerUnitClick}\n      />",
    "        onSelect={(id) => { setInspectedUnit(id); onPlayerUnitClick(id); }}\n      />\n\n      {inspectedUnit && (\n        <button className=\"activate-effect\" onClick={activateEffect}>Activer l’effet</button>\n      )}"
  );

  app = app.replace(
    "      {chapter && <p className=\"eyebrow\">Chapitre {chapter.id + 1} · {chapter.title}</p>}",
    "      {chapter && <p className=\"eyebrow\">Chapitre {chapter.id + 1} · {chapter.title}</p>}\n      {chapter && <div className=\"boss-quote\">{chapter.opponentFaction === 'Chevalier' ? 'Jeanne d’Arc : Que la lumière guide ma lame !' : 'Chef de la Meute : Tu es entré sur notre territoire.'}</div>}"
  );

  writeFileSync(appPath, app);
}

const cssPath = new URL('../src/arena.css', import.meta.url);
let css = readFileSync(cssPath, 'utf8');
if (!css.includes('.activate-effect')) {
  css += `\n.activate-effect{position:fixed;left:3%;bottom:95px;z-index:45;padding:12px 18px;border:1px solid #ffe08a;border-radius:10px;background:linear-gradient(90deg,#6f5312,#d39b2d);color:#fff;font-weight:800;text-transform:uppercase;box-shadow:0 0 24px #ffc94755}.boss-quote{position:fixed;top:66px;left:50%;transform:translateX(-50%);z-index:30;padding:8px 14px;border:1px solid #ffffff33;border-radius:10px;background:#05090dcc;color:#fff;font:700 11px \"DM Mono\";box-shadow:0 8px 24px #0008}\n`;
  writeFileSync(cssPath, css);
}
