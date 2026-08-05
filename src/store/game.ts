import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, cardsByFaction, getCard, starterDeck } from '../engine/cards';
import { Faction } from '../engine/types';

/** Nombre de chapitres de campagne à remporter pour débloquer la seconde faction. */
export const UNLOCK_SECOND_FACTION_AT = 3;

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt';

interface GameMeta {
  gold: number;
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
  addCard: (id: string) => void;
  saveDeck: (deck: string[]) => void;
  chooseStartingFaction: (faction: Faction) => void;
  setFaction: (faction: Faction) => void;
  record: (win: boolean) => void;
  addGold: (amount: number) => void;
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

export const useGame = create<GameMeta>()(
  persist(
    (set) => ({
      gold: 250,
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
      addCard: (id) => set((s) => ({ owned: [...new Set([...s.owned, id])] })),
      saveDeck: (deck) => set({ deck }),
      chooseStartingFaction: (faction) =>
        set({
          factionChosen: true,
          faction,
          unlockedFactions: [faction],
          owned: startingOwnedFor(faction),
          deck: starterDeck(faction),
        }),
      setFaction: (faction) =>
        set((s) => (s.unlockedFactions.includes(faction) ? { faction, deck: starterDeck(faction) } : {})),
      record: (win) =>
        set((s) => {
          if (win) {
            const wins = s.wins + 1;
            return { wins, level: 1 + Math.floor(wins / 5) };
          }
          return { losses: s.losses + 1 };
        }),
      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),
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
          wins: 0,
          losses: 0,
          level: 1,
          faction: 'Meute',
          owned: [],
          deck: [],
          campaignChapter: 0,
          factionChosen: false,
          unlockedFactions: [],
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