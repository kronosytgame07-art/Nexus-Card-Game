import type { Faction } from '../engine/types';

export type DialogueTone = 'heroic' | 'sarcastic' | 'pragmatic';
export type StoryCharacterId = 'lyra' | 'kael' | 'gribz' | 'rakh' | 'vaeloryx' | 'morvane';
export type CombatTrigger = 'first_summon' | 'first_damage' | 'big_damage' | 'player_low_hp' | 'enemy_low_hp' | 'evolution' | 'mythic_summon' | 'direct_attack' | 'board_wipe' | 'victory' | 'defeat';
export type CinematicCamera = 'push' | 'pull' | 'pan-left' | 'pan-right' | 'rise' | 'fall' | 'still';
export type CinematicAtmosphere = 'none' | 'embers' | 'storm' | 'mist' | 'necrotic' | 'nexus';

export interface StoryCharacter { id: StoryCharacterId; name: string; faction: Faction; role: string; description: string; portrait: string; }
export interface DialogueChoice { id: string; text: string; tone: DialogueTone; affinity?: Partial<Record<StoryCharacterId, number>>; }
export interface CinematicDirection {
  camera?: CinematicCamera;
  atmosphere?: CinematicAtmosphere;
  intensity?: 1 | 2 | 3;
  shake?: boolean;
  flash?: boolean;
  vignette?: boolean;
}
export interface DialogueLine {
  speaker: StoryCharacterId | 'player' | 'narrator';
  text: string;
  choices?: DialogueChoice[];
  panel: string;
  speakerSide?: 'left' | 'right' | 'center';
  emotion?: string;
  cinematic?: CinematicDirection;
}
export interface StoryDuel { id: number; opponent: StoryCharacterId; faction: Faction; title: string; lines: DialogueLine[]; rewardCodex: string[]; }
