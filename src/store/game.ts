import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, cardsByFaction, getCard, starterDeck } from '../engine/cards';
import { autoEvosphere } from '../engine/engine';
import { Faction, GameState } from '../engine/types';

/** Nombre de chapitres de campagne à remporter pour débloquer la seconde faction. */
export const UNLOCK_SECOND_FACTION_AT = 3;
export const XP_PER_LEVEL = 100;
export const MAIN_DECK_MIN = 30;
export const MAIN_DECK_MAX = 40;
export const EVOSPHERE_MAX = 20;
/** Nombre maximum de replays conservés localement (les plus anciens sont supprimés). */
export const MAX_REPLAYS = 12;

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh';
export type VisualQuality = 'eco' | 'balanced' | 'high';
export type AnimationMode = 'full' | 'reduced' | 'off';
export type InterfaceScale = 'small' | 'normal' | 'large';

export interface SavedDeck {
  id: string;
  name: string;
  faction: Faction;
  main: string[];
  /** Cartes d'évolution choisies manuellement pour l'Évosphère de ce deck (max EVOSPHERE_MAX,
      max 3 exemplaires par évolution — mêmes règles que le deck principal). Ne peut contenir
      que des évolutions dont la carte de base est présente dans `main`. */
  evo: string[];
}

/** Ne garde que les évolutions dont la carte de base niveau 1 est encore présente dans `main`
    (une évolution sans sa base en deck ne pourrait jamais être déclenchée en partie). */
function pruneEvoForMain(evo: string[], main: string[]): string[] {
  return evo.filter((id) => {
    const from = getCard(id).evolvesFrom;
    return Boolean(from && main.includes(from));
  });
}

/** Replay local d'un duel terminé : une suite d'instantanés de GameState,
    rejouable pas à pas depuis le profil du joueur. Aucun serveur partagé
    n'existe dans ce projet — ces replays restent sur l'appareil. */
export interface SavedReplay {
  id: string;
  date: number;
  opponentFaction: Faction;
  result: 'win' | 'loss';
  turns: number;
  label: string;
  snapshots: GameState[];
}

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
  /** Évosphère du deck actif — miroir de `decks[activeDeckId].evo`, comme `deck` l'est pour `main`. */
  evo: string[];
  decks: SavedDeck[];
  activeDeckId: string | null;
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
  musicVolume: number;
  sfxVolume: number;
  showFps: boolean;
  batterySaver: boolean;
  vibrationEnabled: boolean;
  addCard: (id: string) => void;
  saveDeck: (deck: string[]) => void;
  createDeck: (name: string, faction: Faction) => string;
  renameDeck: (id: string, name: string) => void;
  deleteDeck: (id: string) => void;
  setDeckCards: (id: string, main: string[]) => void;
  setDeckEvo: (id: string, evo: string[]) => void;
  setActiveDeck: (id: string) => void;
  chooseStartingFaction: (faction: Faction) => void;
  setFaction: (faction: Faction) => void;
  setPlayerName: (name: string) => void;
  setAvatarCardId: (cardId: string) => void;
  setVisualQuality: (quality: VisualQuality) => void;
  setAnimationMode: (mode: AnimationMode) => void;
  setGlowEffects: (enabled: boolean) => void;
  setScreenShake: (enabled: boolean) => void;
  setInterfaceScale: (scale: InterfaceScale) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setShowFps: (enabled: boolean) => void;
  setBatterySaver: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  resetSettings: () => void;
  record: (win: boolean) => void;
  addGold: (amount: number) => void;
  addXp: (amount: number) => void;
  completeChapter: (chapterId: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
  resetProgress: () => void;
  replays: SavedReplay[];
  saveReplay: (replay: Omit<SavedReplay, 'id' | 'date'>) => void;
  deleteReplay: (id: string) => void;
}

function startingOwnedFor(faction: Faction): string[] {
  return cardsByFaction(faction)
    .filter((c) => c.level === 1 && !c.boosterOnly)
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

function makeStarterDeck(faction: Faction, existingNames: string[]): SavedDeck {
  let n = 1;
  while (existingNames.includes(`Deck ${faction} ${n}`)) n += 1;
  const main = starterDeck(faction);
  return { id: `deck-${faction}-${Date.now()}`, name: `Deck ${faction} ${n}`, faction, main, evo: autoEvosphere(main) };
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
      evo: [],
      decks: [],
      activeDeckId: null,
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
      musicVolume: 45,
      sfxVolume: 70,
      showFps: false,
      batterySaver: false,
      vibrationEnabled: true,
      replays: [],
      addCard: (id) => set((s) => ({ owned: [...new Set([...s.owned, id])] })),
      saveDeck: (deck) => set({ deck }),
      createDeck: (name, faction) => {
        const id = `deck-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const trimmed = name.trim().slice(0, 30) || `Deck ${faction}`;
        set((s) => ({ decks: [...s.decks, { id, name: trimmed, faction, main: [], evo: [] }] }));
        return id;
      },
      renameDeck: (id, name) =>
        set((s) => ({
          decks: s.decks.map((d) => (d.id === id ? { ...d, name: name.trim().slice(0, 30) || d.name } : d)),
        })),
      deleteDeck: (id) =>
        set((s) => {
          const decks = s.decks.filter((d) => d.id !== id);
          if (s.activeDeckId !== id) return { decks };
          const fallback = decks.find((d) => d.faction === s.faction) ?? decks[0];
          return {
            decks,
            activeDeckId: fallback?.id ?? null,
            deck: fallback?.main ?? [],
            evo: fallback?.evo ?? [],
            faction: fallback?.faction ?? s.faction,
          };
        }),
      setDeckCards: (id, main) =>
        set((s) => {
          const target = s.decks.find((d) => d.id === id);
          const evo = target ? pruneEvoForMain(target.evo, main) : [];
          return {
            decks: s.decks.map((d) => (d.id === id ? { ...d, main, evo } : d)),
            deck: s.activeDeckId === id ? main : s.deck,
            evo: s.activeDeckId === id ? evo : s.evo,
          };
        }),
      setDeckEvo: (id, evo) =>
        set((s) => {
          const target = s.decks.find((d) => d.id === id);
          if (!target) return {};
          const valid = pruneEvoForMain(evo, target.main).slice(0, EVOSPHERE_MAX);
          return {
            decks: s.decks.map((d) => (d.id === id ? { ...d, evo: valid } : d)),
            evo: s.activeDeckId === id ? valid : s.evo,
          };
        }),
      setActiveDeck: (id) =>
        set((s) => {
          const target = s.decks.find((d) => d.id === id);
          if (!target || !s.unlockedFactions.includes(target.faction)) return {};
          return { activeDeckId: id, faction: target.faction, deck: target.main, evo: target.evo };
        }),
      chooseStartingFaction: (faction) =>
        set((s) => {
          const starter = makeStarterDeck(faction, []);
          return {
            factionChosen: true,
            faction,
            unlockedFactions: [faction],
            owned: startingOwnedFor(faction),
            deck: starter.main,
            evo: starter.evo,
            decks: [starter],
            activeDeckId: starter.id,
            avatarCardId: s.avatarCardId || defaultAvatarFor(faction),
          };
        }),
      setFaction: (faction) =>
        set((s) => {
          if (!s.unlockedFactions.includes(faction)) return {};
          const existing = s.decks.find((d) => d.faction === faction);
          if (existing) return { faction, activeDeckId: existing.id, deck: existing.main, evo: existing.evo };
          const main = starterDeck(faction);
          return { faction, deck: main, evo: autoEvosphere(main) };
        }),
      setPlayerName: (name) => set({ playerName: name.trim().slice(0, 20) || 'Chronos' }),
      setAvatarCardId: (cardId) => set({ avatarCardId: cardId }),
      setVisualQuality: (visualQuality) => set({ visualQuality }),
      setAnimationMode: (animationMode) => set({ animationMode }),
      setGlowEffects: (glowEffects) => set({ glowEffects }),
      setScreenShake: (screenShake) => set({ screenShake }),
      setInterfaceScale: (interfaceScale) => set({ interfaceScale }),
      setMusicVolume: (musicVolume) => set({ musicVolume: Math.min(100, Math.max(0, musicVolume)) }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume: Math.min(100, Math.max(0, sfxVolume)) }),
      setShowFps: (showFps) => set({ showFps }),
      setBatterySaver: (batterySaver) => set({ batterySaver }),
      setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
      resetSettings: () =>
        set({
          musicEnabled: false,
          musicVolume: 45,
          sfxVolume: 70,
          visualQuality: 'balanced',
          animationMode: 'full',
          glowEffects: true,
          screenShake: true,
          interfaceScale: 'normal',
          showFps: false,
          batterySaver: false,
          vibrationEnabled: true,
          language: 'fr',
        }),
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
            const starter = makeStarterDeck(missing, s.decks.map((d) => d.name));
            return {
              campaignChapter,
              unlockedFactions: [...s.unlockedFactions, missing],
              owned: [...new Set([...s.owned, ...startingOwnedFor(missing)])],
              decks: [...s.decks, starter],
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
          evo: [],
          decks: [],
          activeDeckId: null,
          campaignChapter: 0,
          factionChosen: false,
          unlockedFactions: [],
          playerName: 'Chronos',
          avatarCardId: '',
          replays: [],
        }),
      saveReplay: (replay) =>
        set((s) => ({
          replays: [{ ...replay, id: `replay-${Date.now()}-${Math.floor(Math.random() * 1000)}`, date: Date.now() }, ...s.replays].slice(0, MAX_REPLAYS),
        })),
      deleteReplay: (id) => set((s) => ({ replays: s.replays.filter((r) => r.id !== id) })),
    }),
    {
      name: 'nexus-save',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migration douce pour les joueurs qui avaient un unique deck avant l'ajout du
        // gestionnaire multi-decks : on l'enveloppe dans un SavedDeck plutôt que de le perdre.
        if (state.decks.length === 0 && state.deck.length > 0) {
          const wrapped: SavedDeck = { id: 'deck-migrated', name: `Deck ${state.faction} 1`, faction: state.faction, main: state.deck, evo: autoEvosphere(state.deck) };
          state.decks = [wrapped];
          state.activeDeckId = wrapped.id;
        }
        // Migration douce pour les decks sauvegardés avant l'ajout de l'Évosphère
        // personnalisable : on leur donne le même remplissage automatique qu'avant.
        state.decks = state.decks.map((d) => (d.evo ? d : { ...d, evo: autoEvosphere(d.main) }));
        const active = state.decks.find((d) => d.id === state.activeDeckId);
        state.evo = active?.evo ?? state.evo ?? [];
      },
    }
  )
);

export function copiesInDeck(deck: string[], cardId: string): number {
  return deck.filter((id) => id === cardId).length;
}

export function maxCopiesAllowed(cardId: string): number {
  return getCard(cardId).copies;
}

export const ALL_CARDS = CARDS;
