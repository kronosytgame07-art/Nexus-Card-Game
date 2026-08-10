import type { Faction } from '../engine/types';

export type DialogueTone = 'heroic' | 'sarcastic' | 'pragmatic';
export type StoryCharacterId = 'lyra' | 'kael' | 'gribz' | 'rakh' | 'vaeloryx' | 'morvane';
export type CombatTrigger = 'first_summon' | 'first_damage' | 'big_damage' | 'player_low_hp' | 'enemy_low_hp' | 'evolution' | 'mythic_summon' | 'direct_attack' | 'board_wipe' | 'victory' | 'defeat';

export interface StoryCharacter { id: StoryCharacterId; name: string; faction: Faction; role: string; description: string; portrait: string; }
export interface DialogueChoice { id: string; text: string; tone: DialogueTone; affinity?: Partial<Record<StoryCharacterId, number>>; }
export interface DialogueLine {
  speaker: StoryCharacterId | 'player' | 'narrator';
  text: string;
  choices?: DialogueChoice[];
  /** Illustration plein écran correspondant exactement à cette réplique. */
  panel: string;
  /** Côté où se trouve le personnage actif dans l'illustration. */
  speakerSide?: 'left' | 'right' | 'center';
  /** Didascalie courte décrivant la réaction jouée dans cette case. */
  emotion?: string;
}
export interface StoryDuel { id: number; opponent: StoryCharacterId; faction: Faction; title: string; lines: DialogueLine[]; rewardCodex: string[]; }
