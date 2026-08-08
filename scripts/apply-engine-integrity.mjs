import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[engine-integrity] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[engine-integrity] ' + label);
}

patch(
  'src/engine/engine.ts',
  "      const ownedUnitIds = [...new Set(owner.deckList)];\n      const pool = ownedUnitIds\n        .map((id) => getCard(id))\n        .filter((c) => c.level === 1 && c.type === 'unit' && (!effect.target || c.faction === effect.target));\n      const pick = pool[Math.floor(Math.random() * pool.length)];\n      if (pick) {\n        owner.field.push({",
  "      const eligibleDeckIndexes = owner.deck\n        .map((id, index) => ({ id, index, card: getCard(id) }))\n        .filter(({ card }) => card.level === 1 && card.type === 'unit' && (!effect.target || card.faction === effect.target));\n      const chosen = eligibleDeckIndexes[Math.floor(Math.random() * eligibleDeckIndexes.length)];\n      const pick = chosen?.card;\n      if (pick && chosen) {\n        owner.deck.splice(chosen.index, 1);\n        owner.field.push({",
  'invocation spéciale depuis le vrai deck'
);

patch(
  'src/engine/engine.ts',
  "        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name}${pick.blitz ? ' — Blitz !' : ''}.`);",
  "        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name} depuis son deck${pick.blitz ? ' — Blitz !' : ''}.`);",
  'journal invocation spéciale explicite'
);

console.log('[engine-integrity] Invocations spéciales sécurisées.');
