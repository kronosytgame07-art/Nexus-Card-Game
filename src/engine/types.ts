// Modèle de données central du moteur de jeu Nexus.
// Toute la logique de partie s'appuie sur ces types — aucune UI ne doit
// dupliquer de règles, elle ne fait que lire GameState et appeler engine.ts.

export type Faction = 'Meute' | 'Chevalier';

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
  hand: string[];
  field: FieldUnit[];
  graveyard: string[];
  fatigue: number;
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
