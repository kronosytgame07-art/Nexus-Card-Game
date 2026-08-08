import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[asset-safety] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[asset-safety] ' + label);
}

patch(
  'src/engine/cards.ts',
  "export function starterDeck(faction:Faction):string[]{const level1=cardsByFaction(faction).filter(c=>c.level===1&&!c.boosterOnly);",
  "export function starterDeck(faction:Faction):string[]{const level1=cardsByFaction(faction).filter(c=>c.level===1&&!c.boosterOnly&&!c.assetMissing);",
  'starter exclut assets manquants'
);

patch(
  'src/store/game.ts',
  ".filter((c) => c.level === 1 && !c.boosterOnly)",
  ".filter((c) => c.level === 1 && !c.boosterOnly && !c.assetMissing)",
  'dotation de départ exclut assets manquants'
);

patch(
  'src/store/game.ts',
  "          const pool = cardsByFaction(faction).filter((c) => c.level === 1);",
  "          const pool = cardsByFaction(faction).filter((c) => c.level === 1 && !c.assetMissing);\n          if (pool.length === 0) return {};",
  'boosters refusent faction sans assets'
);

patch(
  'src/App.tsx',
  "  const pool = savedDeck ? ALL_CARDS.filter((c) => c.level === 1 && s.unlockedFactions.includes(c.faction) && s.owned.includes(c.id)) : [];",
  "  const pool = savedDeck ? ALL_CARDS.filter((c) => c.level === 1 && !c.assetMissing && s.unlockedFactions.includes(c.faction) && s.owned.includes(c.id)) : [];",
  'deck builder masque assets manquants'
);

patch(
  'src/App.tsx',
  "    ? ALL_CARDS.filter((c) => c.level === 2 && c.evolvesFrom && savedDeck.main.includes(c.evolvesFrom) && s.owned.includes(c.evolvesFrom))",
  "    ? ALL_CARDS.filter((c) => c.level === 2 && !c.assetMissing && c.evolvesFrom && savedDeck.main.includes(c.evolvesFrom) && s.owned.includes(c.evolvesFrom))",
  'Évosphère masque assets manquants'
);

console.log('[asset-safety] Aucun asset manquant ne peut entrer dans une partie.');
