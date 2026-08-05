import { CardDef, EffectDef, Faction, Rarity } from './types';

function rarityForCost(cost: number): Rarity {
  if (cost <= 1) return 'Commune';
  if (cost === 2) return 'Rare';
  if (cost === 3) return 'Épique';
  return 'Légendaire';
}

type Row = [string, string, number, number, number, EffectDef | undefined];

const wolfRows: Row[] = [
  ['louve-veilleuse', 'Louve Veilleuse', 1, 2, 3, { kind: 'protect' }],
  ['loup-eclaireur', 'Loup Éclaireur', 1, 2, 2, { kind: 'search', target: 'Meute' }],
  ['jeune-croc', 'Jeune Croc', 1, 3, 1, undefined],
  ['loup-des-brumes', 'Loup des Brumes', 2, 3, 3, { kind: 'stun', value: 1 }],
  ['chasseuse-grise', 'Chasseuse Grise', 2, 3, 4, undefined],
  ['loup-de-givre', 'Loup de Givre', 2, 2, 5, { kind: 'stun', value: 1 }],
  ['pisteur-alpha', 'Pisteur Alpha', 3, 5, 3, { kind: 'draw', value: 1 }],
  ['loup-sentinelle', 'Loup Sentinelle', 3, 4, 5, { kind: 'protect' }],
  ['hurleur-de-nuit', 'Hurleur de Nuit', 3, 5, 4, { kind: 'buff', value: 1 }],
  ['croc-de-fer', 'Croc de Fer', 4, 6, 5, undefined],
  ['meute-rassemblee', 'Meute Rassemblée', 2, 0, 0, { kind: 'summon', target: 'Meute' }],
  ['appel-de-la-lune', 'Appel de la Lune', 2, 0, 0, { kind: 'search', target: 'Meute' }],
  ['instinct-de-survie', 'Instinct de Survie', 1, 0, 0, { kind: 'protect' }],
  ['morsure-sauvage', 'Morsure Sauvage', 2, 0, 0, { kind: 'damage', value: 3 }],
  ['territoire-sacre', 'Territoire Sacré', 3, 0, 0, { kind: 'buff', value: 1 }],
  ['emprise-de-la-meute', 'Emprise de la Meute', 3, 0, 0, { kind: 'stun', value: 1 }],
  ['lune-rouge', 'Lune Rouge', 4, 0, 0, { kind: 'buff', value: 2 }],
  ['totem-alpha', 'Totem Alpha', 2, 0, 4, { kind: 'buff', value: 1 }],
  ['pacte-des-crocs', 'Pacte des Crocs', 1, 0, 0, { kind: 'draw', value: 1 }],
  ['derniere-trace', 'Dernière Trace', 2, 0, 0, { kind: 'search', target: 'Meute' }],
];

const knightRows: Row[] = [
  ['ecuyer-dore', 'Écuyer Doré', 1, 1, 4, { kind: 'protect' }],
  ['novice-du-serment', 'Novice du Serment', 1, 2, 3, { kind: 'search', target: 'Chevalier' }],
  ['lame-blanche', 'Lame Blanche', 1, 3, 2, undefined],
  ['garde-du-portail', 'Garde du Portail', 2, 3, 5, { kind: 'protect' }],
  ['paladin-des-cendres', 'Paladin des Cendres', 2, 4, 3, undefined],
  ['chevalier-azur', 'Chevalier Azur', 2, 3, 4, { kind: 'stun', value: 1 }],
  ['porte-etendard', 'Porte-Étendard', 3, 3, 5, { kind: 'buff', value: 1 }],
  ['sentinelle-doree', 'Sentinelle Dorée', 3, 4, 6, { kind: 'protect' }],
  ['duelliste-royal', 'Duelliste Royal', 3, 5, 3, undefined],
  ['capitaine-du-royaume', 'Capitaine du Royaume', 4, 6, 5, { kind: 'draw', value: 1 }],
  ['ordre-de-ralliement', 'Ordre de Ralliement', 2, 0, 0, { kind: 'summon', target: 'Chevalier' }],
  ['grande-bibliotheque', 'Grande Bibliothèque', 2, 0, 0, { kind: 'search', target: 'Chevalier' }],
  ['bouclier-de-lumiere', 'Bouclier de Lumière', 1, 0, 0, { kind: 'protect' }],
  ['jugement-solaire', 'Jugement Solaire', 2, 0, 0, { kind: 'damage', value: 3 }],
  ['banniere-du-royaume', 'Bannière du Royaume', 3, 0, 0, { kind: 'buff', value: 1 }],
  ['sceau-immobilite', "Sceau d'Immobilité", 3, 0, 0, { kind: 'stun', value: 1 }],
  ['aube-victorieuse', 'Aube Victorieuse', 4, 0, 0, { kind: 'buff', value: 2 }],
  ['reliquaire-du-roi', 'Reliquaire du Roi', 2, 0, 4, { kind: 'buff', value: 1 }],
  ['serment-de-garde', 'Serment de Garde', 1, 0, 0, { kind: 'draw', value: 1 }],
  ['voie-du-paladin', 'Voie du Paladin', 2, 0, 0, { kind: 'search', target: 'Chevalier' }],
];

const evolutionNames: Record<Faction, string[]> = {
  Meute: [
    'Alpha des Brumes', 'Traqueur Lunaire', 'Croc du Premier Sang', 'Spectre de la Meute',
    'Matriarche Grise', 'Fléau de Givre', 'Alpha Pisteur', 'Gardien du Territoire',
    'Hurleur des Mille Lunes', 'Bête de Fer',
  ],
  Chevalier: [
    "Chevalier d'Or", 'Paladin du Serment', "Lame de l'Aube", 'Rempart Royal',
    'Flamme du Royaume', 'Croisé Azur', 'Maréchal des Bannières', 'Gardien du Trône',
    'Champion de la Couronne', 'Seigneur du Royaume',
  ],
};

function buildFaction(faction: Faction, rows: Row[]): CardDef[] {
  const base: CardDef[] = rows.map(([id, name, cost, attack, health, effect]) => ({
    id,
    name,
    faction,
    level: 1,
    type: health > 0 ? 'unit' : 'spell',
    cost,
    attack,
    health,
    effect,
    waitTurns: health > 0 ? 3 : undefined,
    evolvesTo: health > 0 ? `evo-${id}` : undefined,
    copies: 3,
    rarity: rarityForCost(cost),
    image: `${import.meta.env.BASE_URL}cards/${id}.png`,
    text: describeEffect(effect),
  }));

  // Seules les 10 premières unités niveau 1 possèdent une évolution imprimée,
  // à l'image de la structure d'origine (une évolution par archétype clé).
  const evolvables = base.filter((c) => c.type === 'unit').slice(0, 10);
  const names = evolutionNames[faction];
  const evolutions: CardDef[] = evolvables.map((from, i) => {
    const id = `evo-${from.id}`;
    return {
      id,
      name: names[i],
      faction,
      level: 2,
      type: 'unit',
      cost: from.cost + 1,
      attack: from.attack + 2,
      health: from.health + 2,
      effect: { kind: 'buff', value: 1 },
      waitTurns: undefined,
      evolvesFrom: from.id,
      copies: 3,
      rarity: 'Mythique',
      image: `${import.meta.env.BASE_URL}cards/${id}.png`,
      text: `Évolution de ${from.name}. Cri de guerre : +1 attaque à une unité alliée.`,
    };
  });

  return [...base, ...evolutions];
}

function describeEffect(effect?: EffectDef): string {
  if (!effect) return 'Aucun effet spécial.';
  switch (effect.kind) {
    case 'protect':
      return 'Provocation : les ennemis doivent attaquer cette unité en priorité.';
    case 'draw':
      return `Cri de guerre : pioche ${effect.value ?? 1} carte(s).`;
    case 'search':
      return `Cri de guerre : cherche une carte ${effect.target ?? ''} dans le deck.`;
    case 'stun':
      return `Cri de guerre : étourdit une unité ennemie pendant ${effect.value ?? 1} tour(s).`;
    case 'damage':
      return `Inflige ${effect.value ?? 0} dégâts.`;
    case 'buff':
      return `Cri de guerre : +${effect.value ?? 1} attaque à une unité alliée.`;
    case 'summon':
      return `Cri de guerre : invoque une unité ${effect.target ?? ''}.`;
    default:
      return 'Aucun effet spécial.';
  }
}

export const CARDS: CardDef[] = [
  ...buildFaction('Meute', wolfRows),
  ...buildFaction('Chevalier', knightRows),
];

export const CARD_DB: Map<string, CardDef> = new Map(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDef {
  const card = CARD_DB.get(id);
  if (!card) throw new Error(`Carte inconnue : ${id}`);
  return card;
}

export function cardsByFaction(faction: Faction): CardDef[] {
  return CARDS.filter((c) => c.faction === faction);
}

/** Construit la liste des 40 cartes (avec doublons) d'un deck de démarrage pour une faction. */
export function starterDeck(faction: Faction): string[] {
  const level1 = cardsByFaction(faction).filter((c) => c.level === 1);
  const deck: string[] = [];
  for (const card of level1) {
    for (let i = 0; i < 2; i++) deck.push(card.id);
  }
  return deck;
}
