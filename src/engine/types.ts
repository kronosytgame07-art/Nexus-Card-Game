// Modèle de données central du moteur de jeu Nexus.
// Toute la logique de partie s'appuie sur ces types — aucune UI ne doit
// dupliquer de règles, elle ne fait que lire GameState et appeler engine.ts.

export type Faction = 'Meute' | 'Chevalier' | 'Orc';

export type EffectKind =
  | 'protect' // Provocation : les ennemis doivent attaquer cette unité en priorité
  | 'draw'    // Pioche N cartes
  | 'search'  // Cherche une carte de la faction ciblée dans le deck et la met en main
  | 'stun'    // Étourdit une unité ennemie pendant N tour(s) : elle ne peut pas attaquer
  | 'damage'  // Inflige N dégâts (à une unité choisie, ou au héros adverse si aucune cible)
  | 'buff'    // Augmente l'attaque d'une unité alliée de N de façon permanente
  | 'summon'; // Invoque une unité 1★ aléatoire de la faction ciblée sur le plateau

export interface EffectDef {
  kind: EffectKind;
  value?: number;
  target?: Faction;
}

export type CardType = 'unit' | 'spell';
export type CardLevel = 1 | 2 | 3;
export type Rarity = 'Commune' | 'Rare' | 'Épique' | 'Légendaire' | 'Mythique';

export interface CardDef {
  id: string;
  name: string;
  faction: Faction;
  level: CardLevel;
  type: CardType;
  cost: number;
  attack: number;
  health: number;
  effect?: EffectDef;
  /** Vol : ne peut être combattue que par une unité disposant d'À distance. */
  flying?: boolean;
  /** À distance : peut combattre les unités Vol (archers, projectiles, magie offensive, etc.). */
  ranged?: boolean;
  /** Blitz : peut attaquer dès le tour où elle est invoquée. Réservé en priorité aux unités légères. */
  blitz?: boolean;
  /** Nombre de tours passés sur le plateau requis pour évoluer (unités niveau 1/2 uniquement). */
  waitTurns?: number;
  /** id de la carte évoluée obtenue une fois waitTurns atteint. */
  evolvesTo?: string;
  /** id de la carte niveau inférieur dont celle-ci est l'évolution. */
  evolvesFrom?: string;
  /** Nombre d'exemplaires autorisés en deck (règle de construction). */
  copies: number;
  rarity: Rarity;
  image: string;
  /** Carte obtenue uniquement via un booster (pas distribuée automatiquement au choix de faction). */
  boosterOnly?: boolean;
  text: string;
}

export interface FieldUnit {
  instanceId: string;
  cardId: string;
  attack: number;
  health: number;
  maxHealth: number;
  turnsOnField: number;
  canAttack: boolean;
  stunnedTurns: number;
  buffs: number;
  taunt: boolean;
  /** Bonus d'Instinct de Meute actuellement appliqué (recalculé à chaque changement de terrain). */
  packBonus: number;
  /** Nombre d’activations manuelles déjà utilisées pendant le tour courant. */
  effectUsesThisTurn: number;
  /** Emplacement choisi (0..MAX_FIELD_UNITS-1) sur le terrain — purement pour l'affichage,
      la liste elle-même reste ordonnée par ordre d'arrivée pour le reste des règles. */
  slot: number;
}

export interface SupportCard {
  instanceId: string;
  cardId: string;
  /** Emplacement choisi (0..MAX_SUPPORT-1) en zone Soutien — même logique que FieldUnit.slot. */
  slot: number;
}

export type PlayerId = 'player' | 'enemy';

export interface PlayerState {
  id: PlayerId;
  faction: Faction;
  life: number;
  maxLife: number;
  mana: number;
  maxMana: number;
  deck: string[];
  /** Composition figée du deck de départ (30 cartes) — sert de réserve pour
   *  les effets qui invoquent/piochent "au hasard dans ton deck", pour ne
   *  jamais tirer une carte que le joueur ne possède pas. */
  deckList: string[];
  hand: string[];
  field: FieldUnit[];
  /** Sorts posés face cachée en zone Soutien, en attente d'activation (5 emplacements). */
  support: SupportCard[];
  graveyard: string[];
  /** Réserve séparée contenant jusqu’à 20 cartes d’évolution. */
  evosphere: string[];
  fatigue: number;
  /** Une seule invocation normale (payée en runes depuis la main) est autorisée par tour.
   *  Les invocations spéciales déclenchées par des effets n'utilisent pas ce compteur. */
  normalSummonUsed: boolean;
}

export type Phase = 'main' | 'combat' | 'end';

export interface GameState {
  turn: number;
  activePlayer: PlayerId;
  phase: Phase;
  player: PlayerState;
  enemy: PlayerState;
  log: string[];
  winner?: PlayerId;
  /** Difficulté de l'IA côté enemy. */
  aiDifficulty: 'novice' | 'veteran' | 'maitre';
}

export const MAX_MANA = 10;
export const MAIN_DECK_SIZE = 40;
export const STARTING_HAND_SIZE = 3;
export const STARTING_LIFE = 25;