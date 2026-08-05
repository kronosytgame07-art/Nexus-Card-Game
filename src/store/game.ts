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
  addCard: (id: string) => void;
  saveDeck: (deck: string[]) => void;
  setFaction: (faction: Faction) => void;
  record: (win: boolean) => void;
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
      addCard: (id) => set((s) => ({ owned: [...new Set([...s.owned, id])] })),
      saveDeck: (deck) => set({ deck }),
      setFaction: (faction) =>
        set({ faction, deck: starterDeck(faction), owned: startingOwnedFor(faction) }),
      record: (win) =>
        set((s) => {
          if (win) {
            const wins = s.wins + 1;
            return { wins, gold: s.gold + 35, level: 1 + Math.floor(wins / 5) };
          }
          return { losses: s.losses + 1 };
        }),
      resetProgress: () =>
        set({
          gold: 250,
          wins: 0,
          losses: 0,
          level: 1,
          faction: 'Meute',
          owned: startingOwnedFor('Meute'),
          deck: starterDeck('Meute'),
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
