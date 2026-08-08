import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[card-validation] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[card-validation] ' + label);
}

patch(
  'src/engine/cards.ts',
  "import { CardDef, EffectDef, Faction, Rarity } from './types';",
  "import { CardDef, EffectDef, Faction, Rarity } from './types';\nimport { assertValidCardDatabase } from './card-validation';",
  'import validation cartes'
);

patch(
  'src/engine/cards.ts',
  'export const CARD_DB:Map<string,CardDef>=new Map(CARDS.map(c=>[c.id,c]));',
  'assertValidCardDatabase(CARDS);\nexport const CARD_DB:Map<string,CardDef>=new Map(CARDS.map(c=>[c.id,c]));',
  'validation exécutée avant création CARD_DB'
);

console.log('[card-validation] Validation de la base de cartes branchée.');
