import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[tutorial] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[tutorial] ' + label);
}

patch(
  'src/App.tsx',
  `{ title: '2. Le mana', text: "Tu gagnes +1 mana maximum à chacun de tes tours (jusqu'à 10), et ton mana se recharge entièrement à chaque tour. Chaque carte a un coût en mana affiché en haut à gauche : tu ne peux la jouer que si tu as assez de mana disponible." },`,
  `{ title: '2. Les runes', text: "Tu gagnes +1 rune maximum à chacun de tes tours (jusqu'à 10), et tes runes se rechargent entièrement à chaque tour. Chaque carte a un coût en runes : tu ne peux la jouer que si tu as assez de ressources disponibles." },`,
  'mana renommé runes dans tutoriel'
);

patch(
  'src/App.tsx',
  `{ title: '4. Poser une créature', text: "En Main Phase, ouvre ta main puis touche une créature : un aperçu s'affiche avec le bouton INVOQUER. Confirme pour la poser sur ton terrain (3 emplacements). Une créature qui vient d'être posée ne peut pas attaquer ce tour-ci." },`,
  `{ title: '4. Invoquer une unité', text: "En Main Phase, tu disposes d'une seule invocation normale par tour, payée avec tes runes. Les effets de cartes peuvent effectuer des invocations spéciales supplémentaires. Une unité ne peut normalement pas attaquer le tour où elle arrive, sauf si elle possède Blitz." },`,
  'invocation normale et Blitz expliqués'
);

patch(
  'src/App.tsx',
  `{ title: '5. Jouer un sort', text: "Même principe que pour une créature, en Main Phase : ouvre ta main, touche le sort, un aperçu s'affiche avec le bouton ACTIVER. Les enchantements et soutiens se posent face cachée dans les 5 emplacements de soutien et restent sur le terrain jusqu'à leur activation." },`,
  `{ title: '5. Enchantements et Sortilèges', text: "Les cartes de Soutien occupent 5 emplacements. Les Enchantements s'utilisent pendant ton tour. Les Sortilèges sont des réactions : ils restent face cachée et peuvent être proposés pendant le tour adverse lorsqu'un déclencheur compatible survient, par exemple une attaque." },`,
  'sortilèges réactifs expliqués'
);

patch(
  'src/App.tsx',
  `{ title: '6. Attaquer', text: "En Battle Phase (et uniquement là), touche une de tes créatures pour la sélectionner comme attaquante, puis touche une créature adverse pour l'attaquer, ou utilise le bouton 'Attaquer directement' pour viser le héros adverse. Si l'adversaire a une créature en Provocation, tu dois d'abord l'éliminer." },`,
  `{ title: '6. Combat, Vol et portée', text: "En Battle Phase, sélectionne une unité puis sa cible. Provocation doit être respectée lorsqu'elle est atteignable. Une unité avec Vol ne peut pas être combattue par une unité de mêlée : il faut une unité À distance, comme un archer, un tireur ou un lanceur de sorts." },`,
  'Vol et À distance expliqués'
);

patch(
  'src/App.tsx',
  `{ title: '8. Activer un effet', text: "En Main Phase, certaines créatures ont un effet activable : touche ta créature, puis choisis 'Activer l'effet' dans le panneau à droite. Chaque effet a un nombre d'utilisations limité par tour." },`,
  `{ title: '8. Effets et Blitz', text: "Certaines unités ont un effet activable limité par tour. Blitz permet à une unité légère et rapide d'attaquer immédiatement après son invocation. Les unités Blitz ont en général des statistiques plus faibles : leur avantage principal est le tempo." },`,
  'règle équilibrage Blitz expliquée'
);

console.log('[tutorial] Tutoriel synchronisé avec les nouvelles règles.');
