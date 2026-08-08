import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[planned-boosters] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[planned-boosters] ' + label);
}

patch(
  'src/App.tsx',
  'const BOOSTERS: { id: Faction; name: string; price: number; blurb: string }[] = [',
  'const BOOSTERS: { id: Faction; name: string; price: number; blurb: string; available?: boolean }[] = [',
  'catalogue boosters avec disponibilité'
);

patch(
  'src/App.tsx',
  "  { id: 'Orc', name: 'Booster Orc', price: 150, blurb: 'Nouvelles cartes Orc, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.' },\n];",
  "  { id: 'Orc', name: 'Booster Orc', price: 150, blurb: 'Nouvelles cartes Orc, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.' },\n  { id: 'Dragon', name: 'Booster Dragon', price: 150, available: false, blurb: 'Archétype lent et terrifiant : gros Dragons à forte puissance, inertie de 2 tours avant attaque et évolutions dévastatrices. En attente des illustrations définitives.' },\n  { id: 'Gobelin', name: 'Booster Gobelin', price: 150, available: false, blurb: 'Archétype essaim ultra-agressif : petites unités fragiles avec Blitz et invocations spéciales depuis le deck. En attente des illustrations définitives.' },\n];",
  'boosters Dragon et Gobelin planifiés'
);

patch(
  'src/App.tsx',
  '          const affordable = s.gold >= booster.price;',
  "          const available = booster.available !== false;\n          const affordable = available && s.gold >= booster.price;",
  'achat bloqué si booster non prêt'
);

patch(
  'src/App.tsx',
  "                <button className=\"primary\" disabled={!affordable} onClick={() => openBooster(booster)}>{affordable ? 'Ouvrir' : 'Or insuffisant'}</button>\n                <button className=\"secondary\" disabled={s.gold < booster.price * 10} onClick={() => openBooster(booster, 10)}>Ouvrir ×10 (✦ {booster.price * 10})</button>",
  "                <button className=\"primary\" disabled={!affordable} onClick={() => openBooster(booster)}>{!available ? 'Illustrations à installer' : affordable ? 'Ouvrir' : 'Or insuffisant'}</button>\n                <button className=\"secondary\" disabled={!available || s.gold < booster.price * 10} onClick={() => openBooster(booster, 10)}>{available ? 'Ouvrir ×10 (✦ ' + (booster.price * 10) + ')' : 'Booster bientôt disponible'}</button>",
  'boutons boosters planifiés sécurisés'
);

patch(
  'src/App.tsx',
  "      <p className=\"hint\">Chaque booster tire {BOOSTER_PULL_COUNT} cartes de sa faction (cartes déjà possédées incluses) — le tirage favorise les cartes que tu n'as pas encore, et une carte Épique ou plus est garantie tous les 10 boosters au maximum.</p>",
  "      <p className=\"hint\">Chaque booster tire {BOOSTER_PULL_COUNT} cartes de sa faction (doublons possibles). Une carte Épique ou plus est garantie tous les 10 boosters au maximum. Une Mythique exclusive de booster, lorsqu'elle est installée, tombe uniquement sur son jet indépendant de 0,0001 % — environ 1 chance sur 1 000 000 par carte tirée — et n'est jamais forcée par le pity.</p>",
  'taux Mythique expliqué en boutique'
);

console.log('[planned-boosters] Catalogue futur sécurisé.');
