import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[on-summon] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[on-summon] ' + label);
}

patch(
  'src/engine/engine.ts',
  "function effectivePlayCost(def: CardDef, owner: PlayerState): number {",
  "function isOnSummonEffect(def: CardDef): boolean {\n  const text = def.text.toLowerCase();\n  return text.includes('à l’invocation') || text.includes('cri de guerre');\n}\n\nfunction effectivePlayCost(def: CardDef, owner: PlayerState): number {",
  'helper effets à l’invocation'
);

patch(
  'src/engine/engine.ts',
  "    if (def.effect && def.text.toLowerCase().includes('à l’invocation')) resolveEffect(state, playerId, def.effect, unit.instanceId);",
  "    if (def.effect && isOnSummonEffect(def)) resolveEffect(state, playerId, def.effect, unit.instanceId);",
  'Cri de guerre déclenché à l’invocation'
);

patch(
  'src/engine/engine.ts',
  "  if (!def.effect || def.text.toLowerCase().includes('à l’invocation')) return state;",
  "  if (!def.effect || isOnSummonEffect(def)) return state;",
  'Cri de guerre non réactivable manuellement'
);

patch(
  'src/App.tsx',
  "  if (!def.effect || def.text.toLowerCase().includes('à l’invocation')) return 0;",
  "  if (!def.effect || def.text.toLowerCase().includes('à l’invocation') || def.text.toLowerCase().includes('cri de guerre')) return 0;",
  'UI masque activation manuelle des Cris de guerre'
);

console.log('[on-summon] Cris de guerre synchronisés avec l’invocation.');
