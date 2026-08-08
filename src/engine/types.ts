// Modèle de données central du moteur de jeu Nexus.
// Toute la logique de partie s'appuie sur ces types — aucune UI ne doit
// dupliquer de règles, elle ne fait que lire GameState et appeler engine.ts.

export type Faction = 'Meute' | 'Chevalier' | 'Orc' | 'Dragon' | 'Gobelin';

export type EffectKind =
  | 'protect'
  | 'draw'
  | 'search'
  | 'stun'
  | 'damage'
  | 'buff'
  | 'summon'
  | 'board_wipe';

export interface EffectDef {
  kind: EffectKind;
  value?: number;
  target?: Faction;
}

export type CardType = 'unit' | 'spell';
/** Sous-type des cartes de Soutien : enchantement proactif ou Sortilège réactif. */
export type SupportKind = 'enchantment' | 'reaction';
export type ReactionTrigger = 'attack_declared' | 'unit_summoned' | 'effect_activated' | 'unit_evolved' | 'unit_destroyed';
export type CardLevel = 1 | 2 | 3;
export type Rarity = 'Commune' | 'Rare' | 'Épique' | 'Légendaire' | 'Mythique';

export interface CardDef {
  id: string;
  name: string;
  faction: Faction;
  level: CardLevel;
  type: CardType;
  /** Uniquement pour type === 'spell'. Absent = enchantment pour rétrocompatibilité. */
  supportKind?: SupportKind;
  /** Événements adverses auxquels un Sortilège peut répondre. */
  reactionTriggers?: ReactionTrigger[];
  cost: number;
  attack: number;
  health: number;
  effect?: EffectDef;
  /** Unité volante : ne peut être ciblée au combat que par une unité à distance. */
  flying?: boolean;
  /** Unité capable de combattre les cibles Vol. */
  ranged?: boolean;
  /** Peut attaquer dès le tour où elle est invoquée. */
  blitz?: boolean;
  /** Nombre de tours complets à attendre avant de pouvoir attaquer. Utilisé notamment par les gros Dragons. */
  attackDelayTurns?: number;
  /** Nombre de tours à survivre avant l'évolution. */
  waitTurns?: number;
  evolvesTo?: string;
  evolvesFrom?: string;
  copies: number;
  rarity: Rarity;
  image: string;
  boosterOnly?: boolean;
  /** Carte définie côté gameplay mais volontairement masquée tant que l'illustration finale n'est pas installée. */
  assetMissing?: boolean;
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
  packBonus: number;
  effectUsesThisTurn: number;
  slot: number;
}

export interface SupportCard {
  instanceId: string;
  cardId: string;
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
  deckList: string[];
  hand: string[];
  field: FieldUnit[];
  support: SupportCard[];
  graveyard: string[];
  evosphere: string[];
  fatigue: number;
  normalSummonUsed: boolean;
}

export type Phase = 'main' | 'combat' | 'end';

/** Événement suspendu le temps que l'adversaire décide s'il répond avec un Sortilège. */
export interface ReactionWindow {
  trigger: ReactionTrigger;
  actingPlayer: PlayerId;
  respondingPlayer: PlayerId;
  sourceInstanceId?: string;
  targetInstanceId?: string | null;
  sourceCardId?: string;
}

export interface GameState {
  turn: number;
  activePlayer: PlayerId;
  phase: Phase;
  player: PlayerState;
  enemy: PlayerState;
  log: string[];
  winner?: PlayerId;
  aiDifficulty: 'novice' | 'veteran' | 'maitre';
  /** Présent uniquement lorsqu'une action peut recevoir une réponse adverse. */
  reactionWindow?: ReactionWindow;
}

export const MAX_MANA = 10;
export const MAIN_DECK_SIZE = 40;
export const STARTING_HAND_SIZE = 3;
export const STARTING_LIFE = 25;
