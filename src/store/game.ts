import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, cardsByFaction, getCard, starterDeck } from '../engine/cards';
import { Faction } from '../engine/types';

interface GameMeta {
  gold: number;
  wins: number;
  losses: number;
  level: number;
  faction: Faction;
  owned: string[];
  deck: string[];
  campaignChapter: number;
  addCard: (id: string) => void;
  saveDeck: (deck: string[]) => void;
  setFaction: (faction: Faction) => void;
  record: (win: boolean) => void;
  addGold: (amount: number) => void;
  completeChapter: (chapterId: number) => void;
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
      owned: startingOwnedFor('Meute'),
      deck: starterDeck('Meute'),
      campaignChapter: 0,
      addCard: (id) => set((s) => ({ owned: [...new Set([...s.owned, id])] })),
      saveDeck: (deck) => set({ deck }),
      setFaction: (faction) =>
        set({ faction, deck: starterDeck(faction), owned: startingOwnedFor(faction) }),
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
        set((s) => ({
          campaignChapter: chapterId >= s.campaignChapter ? chapterId + 1 : s.campaignChapter,
        })),
      resetProgress: () =>
        set({
          gold: 250,
          wins: 0,
          losses: 0,
          level: 1,
          faction: 'Meute',
          owned: startingOwnedFor('Meute'),
          deck: starterDeck('Meute'),
          campaignChapter: 0,
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
