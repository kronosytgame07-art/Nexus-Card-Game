import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[mythic-slots] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[mythic-slots] ' + label);
}

const mythics = `
const PLANNED_MYTHICS: CardDef[] = [
  { id:'mythique-loup-du-nexus', name:'Loup du Nexus', faction:'Meute', level:1, type:'unit', cost:5, attack:8, health:8, effect:{kind:'buff',value:2}, copies:1, rarity:'Mythique', boosterOnly:true, assetMissing:true, image:\`${'${import.meta.env.BASE_URL}'}cards/mythique-loup-du-nexus.png\`, text:'Mythique — présence légendaire de la Meute. Limitée à 1 exemplaire par deck.' },
  { id:'mythique-paladin-du-nexus', name:'Paladin du Nexus', faction:'Chevalier', level:1, type:'unit', cost:5, attack:7, health:10, effect:{kind:'protect'}, copies:1, rarity:'Mythique', boosterOnly:true, assetMissing:true, image:\`${'${import.meta.env.BASE_URL}'}cards/mythique-paladin-du-nexus.png\`, text:'Mythique — rempart absolu de l’ordre. Limitée à 1 exemplaire par deck.' },
  { id:'mythique-seigneur-de-guerre', name:'Seigneur de Guerre Mythique', faction:'Orc', level:1, type:'unit', cost:5, attack:9, health:7, effect:{kind:'damage',value:3}, copies:1, rarity:'Mythique', boosterOnly:true, assetMissing:true, image:\`${'${import.meta.env.BASE_URL}'}cards/mythique-seigneur-de-guerre.png\`, text:'Mythique — incarnation ultime de la Fureur Sauvage. Limitée à 1 exemplaire par deck.' },
  { id:'mythique-dragon-du-nexus', name:'Dragon du Nexus', faction:'Dragon', level:1, type:'unit', cost:6, attack:11, health:11, effect:{kind:'damage',value:4}, flying:true, attackDelayTurns:2, copies:1, rarity:'Mythique', boosterOnly:true, assetMissing:true, image:\`${'${import.meta.env.BASE_URL}'}cards/mythique-dragon-du-nexus.png\`, text:'Mythique — titan volant à Inertie Draconique. Limitée à 1 exemplaire par deck.' },
  { id:'mythique-roi-gobelin', name:'Roi Gobelin du Nexus', faction:'Gobelin', level:1, type:'unit', cost:4, attack:6, health:5, effect:{kind:'summon',target:'Gobelin'}, blitz:true, copies:1, rarity:'Mythique', boosterOnly:true, assetMissing:true, image:\`${'${import.meta.env.BASE_URL}'}cards/mythique-roi-gobelin.png\`, text:'Mythique — mène immédiatement la Ruée de la Horde. Blitz. Limitée à 1 exemplaire par deck.' },
];
`;

patch(
  'src/engine/cards.ts',
  'export const CARDS:CardDef[]=[...buildFaction',
  mythics + '\nexport const CARDS:CardDef[]=[...buildFaction',
  'déclarations Mythiques planifiées'
);

patch(
  'src/engine/cards.ts',
  ":card;});\nexport const CARD_DB:",
  ":card;}),...PLANNED_MYTHICS];\nexport const CARD_DB:",
  'Mythiques ajoutées à la base sans être jouables'
);

console.log('[mythic-slots] Une Mythique planifiée par archétype, toutes masquées sans asset.');
