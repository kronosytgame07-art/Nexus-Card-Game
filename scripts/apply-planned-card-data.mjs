import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[planned-cards] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[planned-cards] ' + label);
}

const plannedRows = `const dragonRows: Row[] = [
['dragonnet-de-cendre','Dragonnet de Cendre',1,2,2,undefined],['dragonnet-des-rocs','Dragonnet des Rocs',1,1,3,undefined],['wyverne-du-brasier','Wyverne du Brasier',2,4,3,{kind:'damage',value:2}],['drake-ecaille-de-fer','Drake Écaille-de-Fer',2,3,5,{kind:'protect'}],['dragon-de-givre','Dragon de Givre',3,5,5,{kind:'stun',value:1}],['dragon-des-tempetes','Dragon des Tempêtes',3,5,4,{kind:'draw',value:1}],['dragon-de-fer','Dragon de Fer',3,4,7,{kind:'protect'}],['dragon-solaire','Dragon Solaire',4,7,5,{kind:'damage',value:3}],['dragon-abyssal','Dragon Abyssal',4,6,7,{kind:'buff',value:1}],['dragon-ancien','Dragon Ancien',5,8,8,{kind:'draw',value:1}],['appel-des-ecailles','Appel des Écailles',2,0,0,{kind:'summon',target:'Dragon'}],['tresor-draconique','Trésor Draconique',2,0,0,{kind:'search',target:'Dragon'}],['ecaille-ancestrale','Écaille Ancestrale',1,0,0,{kind:'protect'}],['souffle-de-feu','Souffle de Feu',2,0,0,{kind:'damage',value:3}],['hurlement-du-ciel','Hurlement du Ciel',3,0,0,{kind:'stun',value:1}],['sang-draconique','Sang Draconique',3,0,0,{kind:'buff',value:2}],['effondrement-draconique','Effondrement Draconique',4,0,0,{kind:'board_wipe'}],['oeuf-ancien','Œuf Ancien',2,0,0,{kind:'summon',target:'Dragon'}],['memoire-des-anciens','Mémoire des Anciens',1,0,0,{kind:'draw',value:1}],['appel-du-roi-dragon','Appel du Roi-Dragon',3,0,0,{kind:'search',target:'Dragon'}],['dragon-comete','Dragon Comète',3,6,4,{kind:'damage',value:2},true],['dragon-de-cristal','Dragon de Cristal',3,4,7,{kind:'stun',value:1},true],['tyran-des-cieux','Tyran des Cieux',5,9,7,{kind:'protect'},true],['pluie-de-meteores','Pluie de Météores',4,0,0,{kind:'damage',value:5},true],['ailes-du-destin','Ailes du Destin',2,0,0,{kind:'draw',value:2},true],['rugissement-primordial','Rugissement Primordial',5,0,0,{kind:'board_wipe'},true]];
const goblinRows: Row[] = [
['gobelin-au-couteau','Gobelin au Couteau',1,2,1,undefined],['gobelin-frondeur','Gobelin Frondeur',1,1,2,{kind:'damage',value:1}],['gobelin-pillard','Gobelin Pillard',1,2,1,{kind:'draw',value:1}],['gobelin-recruteur','Gobelin Recruteur',1,1,1,{kind:'summon',target:'Gobelin'}],['gobelin-a-la-bombe','Gobelin à la Bombe',1,3,1,{kind:'damage',value:1}],['gobelin-chaman','Gobelin Chaman',2,2,2,{kind:'draw',value:1}],['gobelin-chevaucheur','Gobelin Chevaucheur',2,3,2,{kind:'summon',target:'Gobelin'}],['gobelin-sapeur','Gobelin Sapeur',2,3,2,{kind:'damage',value:2}],['chef-gobelin','Chef Gobelin',3,4,3,{kind:'buff',value:1}],['roi-gobelin','Roi Gobelin',3,4,4,{kind:'summon',target:'Gobelin'}],['appel-de-la-horde','Appel de la Horde',1,0,0,{kind:'summon',target:'Gobelin'}],['butin-vole','Butin Volé',1,0,0,{kind:'draw',value:1}],['embuscade-sale','Embuscade Sale',1,0,0,{kind:'stun',value:1}],['coup-bas','Coup Bas',1,0,0,{kind:'damage',value:2}],['banniere-bancale','Bannière Bancale',2,0,0,{kind:'buff',value:1}],['plan-foireux','Plan Foireux',1,0,0,{kind:'draw',value:2}],['tunnel-secret','Tunnel Secret',2,0,0,{kind:'summon',target:'Gobelin'}],['piege-a-clous','Piège à Clous',2,0,0,{kind:'stun',value:1}],['poudre-noire','Poudre Noire',3,0,0,{kind:'damage',value:4}],['tout-pour-la-horde','Tout pour la Horde',3,0,0,{kind:'buff',value:2}],['gobelin-fusee','Gobelin-Fusée',1,2,1,{kind:'draw',value:1},true],['gobelin-alchimiste','Gobelin Alchimiste',2,2,2,{kind:'damage',value:2},true],['champion-de-la-decharge','Champion de la Décharge',3,4,3,{kind:'summon',target:'Gobelin'},true],['explosion-improvisee','Explosion Improvisée',3,0,0,{kind:'damage',value:5},true],['filet-de-ferraille','Filet de Ferraille',2,0,0,{kind:'stun',value:2},true],['maree-verte','Marée Verte',4,0,0,{kind:'summon',target:'Gobelin'},true]];
`;

patch(
  'src/engine/cards.ts',
  'const evolutionNames: Partial<Record<Faction,string[]>> =',
  plannedRows + 'const evolutionNames: Partial<Record<Faction,string[]>> =',
  'pools Dragon et Gobelin'
);

patch(
  'src/engine/cards.ts',
  "const REACTION_IDS=new Set(['piege-de-givre','serment-inebranlable','sceau-immobilite','piege-a-ours']);",
  "const REACTION_IDS=new Set(['piege-de-givre','serment-inebranlable','sceau-immobilite','piege-a-ours','embuscade-sale','piege-a-clous']);",
  'Sortilèges Gobelin préparés'
);

patch(
  'src/engine/cards.ts',
  "const RANGED_IDS=new Set(['chaman-de-guerre']);",
  "const RANGED_IDS=new Set(['chaman-de-guerre','gobelin-frondeur','gobelin-chaman']);\nconst PLANNED_FLYING_IDS=new Set(['wyverne-du-brasier','dragon-de-givre','dragon-des-tempetes','dragon-solaire','dragon-abyssal','dragon-ancien','dragon-comete','dragon-de-cristal','tyran-des-cieux']);",
  'portée Gobelin et Vol Dragon préparés'
);

patch(
  'src/engine/cards.ts',
  "const REACTION_IDS=new Set(['piege-de-givre','serment-inebranlable','sceau-immobilite','piege-a-ours','embuscade-sale','piege-a-clous']);",
  "Object.assign(evolutionNames,{Dragon:['Drake de Cendre','Gardien des Montagnes','Wyverne Incendiaire','Drake Bastion','Fléau du Givre','Seigneur des Tempêtes','Colosse de Fer','Avatar Solaire','Léviathan Abyssal','Ancien Primordial'],Gobelin:['Surineur Frénétique','Maître Frondeur','Pillard Couronné','Grand Recruteur','Bombardier Fou','Grand Chaman Vert','Chevaucheur de Guerre','Maître Sapeur','Chef de la Horde','Roi de la Décharge']});\nconst REACTION_IDS=new Set(['piege-de-givre','serment-inebranlable','sceau-immobilite','piege-a-ours','embuscade-sale','piege-a-clous']);",
  'noms évolutions Dragon et Gobelin'
);

patch(
  'src/engine/cards.ts',
  "export const CARDS:CardDef[]=[...buildFaction('Meute',wolfRows),...buildFaction('Chevalier',knightRows),...buildFaction('Orc',orcRows)];",
  "export const CARDS:CardDef[]=[...buildFaction('Meute',wolfRows),...buildFaction('Chevalier',knightRows),...buildFaction('Orc',orcRows),...buildFaction('Dragon',dragonRows),...buildFaction('Gobelin',goblinRows)].map((card)=>{const planned=card.faction==='Dragon'||card.faction==='Gobelin';const baseId=card.evolvesFrom??card.id;return planned?{...card,assetMissing:true,flying:PLANNED_FLYING_IDS.has(baseId)||undefined,blitz:card.faction==='Gobelin'&&card.type==='unit'?true:card.blitz}:card;});",
  'cartes planifiées intégrées mais marquées sans asset'
);

patch(
  'src/store/game.ts',
  "  return ALL_CARDS.filter((c) => c.level === 2 && c.faction !== 'Orc');",
  "  return ALL_CARDS.filter((c) => c.level === 2 && c.faction !== 'Orc' && !c.assetMissing);",
  'avatars masquent les cartes sans illustration'
);

console.log('[planned-cards] Dragon et Gobelin définis côté gameplay, masqués jusqu’aux assets.');
