import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, cardsByFaction, getCard, starterDeck } from '../engine/cards';
import { Faction } from '../engine/types';

/** Nombre de chapitres de campagne à remporter pour débloquer la seconde faction. */
export const UNLOCK_SECOND_FACTION_AT = 3;
export const XP_PER_LEVEL = 100;

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt';
export type VisualQuality = 'eco' | 'balanced' | 'high';
export type AnimationMode = 'full' | 'reduced' | 'off';
export type InterfaceScale = 'small' | 'normal' | 'large';

interface GameMeta {
  gold: number;
  gems: number;
  xp: number;
  wins: number;
  losses: number;
  level: number;
  faction: Faction;
  owned: string[];
  deck: string[];
  campaignChapter: number;
  musicEnabled: boolean;
  language: Language;
  factionChosen: boolean;
  unlockedFactions: Faction[];
  playerName: string;
  avatarCardId: string;
  visualQuality: VisualQuality;
  animationMode: AnimationMode;
  glowEffects: boolean;
  screenShake: boolean;
  interfaceScale: InterfaceScale;
  addCard: (id: string) => void;
  saveDeck: (deck: string[]) => void;
  chooseStartingFaction: (faction: Faction) => void;
  setFaction: (faction: Faction) => void;
  setPlayerName: (name: string) => void;
  setAvatarCardId: (cardId: string) => void;
  setVisualQuality: (quality: VisualQuality) => void;
  setAnimationMode: (mode: AnimationMode) => void;
  setGlowEffects: (enabled: boolean) => void;
  setScreenShake: (enabled: boolean) => void;
  setInterfaceScale: (scale: InterfaceScale) => void;
  record: (win: boolean) => void;
  addGold: (amount: number) => void;
  addXp: (amount: number) => void;
  completeChapter: (chapterId: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
  resetProgress: () => void;
}

function startingOwnedFor(faction: Faction): string[] {
  return cardsByFaction(faction)
    .filter((c) => c.level === 1)
    .map((c) => c.id);
}

function defaultAvatarFor(faction: Faction): string {
  const unit = cardsByFaction(faction).find((c) => c.type === 'unit' && c.level === 1);
  return unit?.id ?? '';
}

function applyXp(level: number, xp: number, gems: number, amount: number) {
  let nextLevel = level;
  let nextXp = xp + Math.max(0, amount);
  let nextGems = gems;

  while (nextXp >= XP_PER_LEVEL) {
    nextXp -= XP_PER_LEVEL;
    nextLevel += 1;
    nextGems += nextLevel % 5 === 0 ? 500 : 100;
  }

  return { level: nextLevel, xp: nextXp, gems: nextGems };
}

export const useGame = create<GameMeta>()(
  persist(
    (set) => ({
      gold: 250,
      gems: 0,
      xp: 0,
      wins: 0,
      losses: 0,
      level: 1,
      faction: 'Meute',
      owned: [],
      deck: [],
      campaignChapter: 0,
      musicEnabled: false,
      language: 'fr',
      factionChosen: false,
      unlockedFactions: [],
      playerName: 'Chronos',
      avatarCardId: '',
      visualQuality: 'balanced',
      animationMode: 'full',
      glowEffects: true,
      screenShake: true,
      interfaceScale: 'normal',
      addCard: (id) => set((s) => ({ owned: [...new Set([...s.owned, id])] })),
      saveDeck: (deck) => set({ deck }),
      chooseStartingFaction: (faction) =>
        set((s) => ({
          factionChosen: true,
          faction,
          unlockedFactions: [faction],
          owned: startingOwnedFor(faction),
          deck: starterDeck(faction),
          avatarCardId: s.avatarCardId || defaultAvatarFor(faction),
        })),
      setFaction: (faction) =>
        set((s) => (s.unlockedFactions.includes(faction) ? { faction, deck: starterDeck(faction) } : {})),
      setPlayerName: (name) => set({ playerName: name.trim().slice(0, 20) || 'Chronos' }),
      setAvatarCardId: (cardId) => set({ avatarCardId: cardId }),
      setVisualQuality: (visualQuality) => set({ visualQuality }),
      setAnimationMode: (animationMode) => set({ animationMode }),
      setGlowEffects: (glowEffects) => set({ glowEffects }),
      setScreenShake: (screenShake) => set({ screenShake }),
      setInterfaceScale: (interfaceScale) => set({ interfaceScale }),
      record: (win) =>
        set((s) => {
          const progression = applyXp(s.level, s.xp, s.gems, win ? 40 : 15);
          return win
            ? { wins: s.wins + 1, ...progression }
            : { losses: s.losses + 1, ...progression };
        }),
      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),
      addXp: (amount) => set((s) => applyXp(s.level, s.xp, s.gems, amount)),
      completeChapter: (chapterId) =>
        set((s) => {
          const campaignChapter = chapterId >= s.campaignChapter ? chapterId + 1 : s.campaignChapter;
          const missing = (['Meute', 'Chevalier'] as Faction[]).find((f) => !s.unlockedFactions.includes(f));
          if (campaignChapter >= UNLOCK_SECOND_FACTION_AT && missing) {
            return {
              campaignChapter,
              unlockedFactions: [...s.unlockedFactions, missing],
              owned: [...new Set([...s.owned, ...startingOwnedFor(missing)])],
            };
          }
          return { campaignChapter };
        }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
      setLanguage: (language) => set({ language }),
      resetProgress: () =>
        set({
          gold: 250,
          gems: 0,
          xp: 0,
          wins: 0,
          losses: 0,
          level: 1,
          faction: 'Meute',
          owned: [],
          deck: [],
          campaignChapter: 0,
          factionChosen: false,
          unlockedFactions: [],
          playerName: 'Chronos',
          avatarCardId: '',
        }),
    }),
    { name: 'nexus-save' }
  )
);

export function copiesInDeck(deck: string[], cardId: string): number {
  return deck.filter((id) => id === cardId).length;
}

export function maxCopiesAllowed(cardId: string): number {
  return getCard(cardId).copies;
}

export const ALL_CARDS = CARDS;