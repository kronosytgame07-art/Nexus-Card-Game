import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARDS, cardsByFaction, getCard, starterDeck } from '../engine/cards';
import { CardDef, Faction, GameState, Rarity } from '../engine/types';

/** Nombre de chapitres de campagne à remporter pour débloquer la seconde faction. */
export const UNLOCK_SECOND_FACTION_AT = 3;
/** Nombre de chapitres de campagne à remporter pour débloquer la Horde Orc
    (récompense narrative après avoir vaincu le clan aux chapitres 8 et 9). */
export const UNLOCK_THIRD_FACTION_AT = 9;
export const ALL_FACTIONS: Faction[] = ['Meute', 'Chevalier', 'Orc'];
export const XP_PER_LEVEL = 100;
export const MAIN_DECK_MIN = 30;
export const MAIN_DECK_MAX = 40;
export const EVOSPHERE_MAX = 20;
/** Nombre maximum de replays conservés localement (les plus anciens sont supprimés). */
export const MAX_REPLAYS = 12;
/** Nombre de cartes révélées à chaque ouverture de booster. */
export const BOOSTER_PULL_COUNT = 5;
/** Nombre d'exemplaires normaux à sacrifier pour forger 1 exemplaire foil de la même carte. */
export const FOIL_CRAFT_COST = 3;

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh';
export type VisualQuality = 'eco' | 'balanced' | 'high';
export type AnimationMode = 'full' | 'reduced' | 'off';
export type InterfaceScale = 'small' | 'normal' | 'large';

export interface SavedDeck {
  id: string;
  name: string;
  faction: Faction;
  main: string[];
  /** Sélection manuelle de l'évosphère par le joueur ; si absente ou vide,
      elle est dérivée automatiquement des évolutions du deck principal. */
  evosphere?: string[];
}

/** Replay local d'un duel terminé : une suite d'instantanés de GameState,
    rejouable pas à pas depuis le profil du joueur. Aucun serveur partagé
    n'existe dans ce projet — ces replays restent sur l'appareil. */
export interface SavedReplay {
  id: string;
  date: number;
  playerFaction: Faction;
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
  /** Dérivé de `inventory` + `foilInventory` : id présent dès qu'on possède au moins un
      exemplaire de la carte (normal ou foil). */
  owned: string[];
  /** Nombre d'exemplaires normaux possédés, par id de carte — source de vérité pour la
      construction de deck, le craft foil et l'échange. */
  inventory: Record<string, number>;
  /** Nombre d'exemplaires foil (cosmétiques) possédés, par id de carte. */
  foilInventory: Record<string, number>;
  /** Compteur de "pity" par faction : boosters ouverts depuis la dernière carte Épique+ obtenue. */
  packsSincePity: Partial<Record<Faction, number>>;
  /** Code ami Firestore (ex. "NEXUS-7F2K") une fois créé — voir src/Trades.tsx. */
  friendCode: string | null;
  /** Ids des échanges Firestore déjà appliqués localement, pour ne jamais appliquer deux fois
      le même delta d'inventaire (ex. après un rechargement de page). */
  appliedTradeIds: string[];
  deck: string[];
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
  addCards: (ids: string[]) => void;
  /** Ouvre un booster de la faction donnée pour `cost` en or : débite l'or, tire
      BOOSTER_PULL_COUNT cartes (pondérées par rareté + bonus carte manquante + pity), les
      ajoute à l'inventaire, et retourne les ids tirés pour l'animation de révélation. Ne fait
      rien et retourne [] si l'or est insuffisant. */
  openBooster: (faction: Faction, cost: number) => string[];
  /** Détruit FOIL_CRAFT_COST exemplaires normaux d'une carte pour en forger 1 exemplaire foil
      (cosmétique). Ne fait rien si l'inventaire normal est insuffisant. */
  craftFoil: (cardId: string) => void;
  setFriendCode: (code: string) => void;
  /** Applique le delta d'un échange à l'inventaire local : retire `give`, ajoute `receive`
      (comptes par id de carte). Utilisé des deux côtés d'un échange accepté — voir Trades.tsx. */
  applyTradeDelta: (give: Record<string, number>, receive: Record<string, number>) => void;
  markTradeApplied: (tradeId: string) => void;
  saveDeck: (deck: string[]) => void;
  createDeck: (name: string, faction: Faction) => string;
  renameDeck: (id: string, name: string) => void;
  deleteDeck: (id: string) => void;
  setDeckCards: (id: string, main: string[]) => void;
  setDeckEvosphere: (id: string, evosphere: string[]) => void;
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

export function defaultAvatarFor(faction: Faction): string {
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
  return { id: `deck-${faction}-${Date.now()}`, name: `Deck ${faction} ${n}`, faction, main: starterDeck(faction) };
}

/** Construit un inventaire (copies normales) donnant `copies` exemplaires à chaque id — utilisé
    pour la dotation de départ, où l'ancien système laissait un accès illimité aux 3 exemplaires. */
function inventoryFrom(ids: string[], copies = 3): Record<string, number> {
  const inventory: Record<string, number> = {};
  for (const id of ids) inventory[id] = copies;
  return inventory;
}

/** `owned` reste un dérivé pratique de `inventory` + `foilInventory` (id présent dès qu'on
    possède ≥1 exemplaire, normal ou foil), conservé pour ne pas casser les écrans qui ne
    raisonnent qu'en "possédée ou non" — un joueur qui a converti tous ses exemplaires normaux
    en foil reste bien propriétaire de la carte. */
function ownedFromInventory(inventory: Record<string, number>, foilInventory: Record<string, number> = {}): string[] {
  return [...new Set([...Object.keys(inventory), ...Object.keys(foilInventory)])].filter(
    (id) => (inventory[id] ?? 0) + (foilInventory[id] ?? 0) > 0
  );
}

/** Fusionne un ajout de copies dans un inventaire existant sans muter l'original. */
function mergeInventory(inventory: Record<string, number>, additions: string[]): Record<string, number> {
  const next = { ...inventory };
  for (const id of additions) next[id] = (next[id] ?? 0) + 1;
  return next;
}

// --- Boosters : tirage pondéré par rareté, favorisant les cartes jamais possédées ---

const RARITY_ORDER: Rarity[] = ['Commune', 'Rare', 'Épique', 'Légendaire', 'Mythique'];
const RARITY_WEIGHT: Record<Rarity, number> = { Commune: 10, Rare: 6, Épique: 3, Légendaire: 1, Mythique: 0 };
/** Multiplicateur de poids pour une carte encore jamais possédée (0 exemplaire à ce jour). */
const UNOWNED_BONUS = 3;
/** Garantit au moins une carte Épique ou plus tous les N boosters ouverts, par faction. */
const PITY_INTERVAL = 10;

function rarityIndex(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

function weightedRandomCard(entries: { card: CardDef; weight: number }[]): CardDef {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.card;
  }
  return entries[entries.length - 1].card;
}

function weightedPick(pool: CardDef[], inventory: Record<string, number>): CardDef {
  const entries = pool.map((card) => ({
    card,
    weight: RARITY_WEIGHT[card.rarity] * ((inventory[card.id] ?? 0) === 0 ? UNOWNED_BONUS : 1),
  }));
  return weightedRandomCard(entries);
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
      inventory: {},
      foilInventory: {},
      packsSincePity: {},
      friendCode: null,
      appliedTradeIds: [],
      deck: [],
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
      addCard: (id) =>
        set((s) => {
          const inventory = mergeInventory(s.inventory, [id]);
          return { inventory, owned: ownedFromInventory(inventory, s.foilInventory) };
        }),
      addCards: (ids) =>
        set((s) => {
          const inventory = mergeInventory(s.inventory, ids);
          return { inventory, owned: ownedFromInventory(inventory, s.foilInventory) };
        }),
      openBooster: (faction, cost) => {
        let pulled: string[] = [];
        set((s) => {
          if (s.gold < cost) return {};
          const pool = cardsByFaction(faction).filter((c) => c.level === 1);
          const picks = Array.from({ length: BOOSTER_PULL_COUNT }, () => weightedPick(pool, s.inventory));
          const hasRare = picks.some((c) => rarityIndex(c.rarity) >= rarityIndex('Épique'));
          const pity = (s.packsSincePity[faction] ?? 0) + 1;
          let finalPicks = picks;
          let nextPity = pity;
          if (hasRare) {
            nextPity = 0;
          } else if (pity >= PITY_INTERVAL) {
            const rarePool = pool.filter((c) => rarityIndex(c.rarity) >= rarityIndex('Épique'));
            finalPicks = [...picks.slice(0, -1), weightedPick(rarePool, s.inventory)];
            nextPity = 0;
          }
          pulled = finalPicks.map((c) => c.id);
          const inventory = mergeInventory(s.inventory, pulled);
          return {
            gold: s.gold - cost,
            inventory,
            owned: ownedFromInventory(inventory, s.foilInventory),
            packsSincePity: { ...s.packsSincePity, [faction]: nextPity },
          };
        });
        return pulled;
      },
      craftFoil: (cardId) =>
        set((s) => {
          if ((s.inventory[cardId] ?? 0) < FOIL_CRAFT_COST) return {};
          const inventory = { ...s.inventory, [cardId]: s.inventory[cardId] - FOIL_CRAFT_COST };
          const foilInventory = { ...s.foilInventory, [cardId]: (s.foilInventory[cardId] ?? 0) + 1 };
          return { inventory, owned: ownedFromInventory(inventory, foilInventory), foilInventory };
        }),
      setFriendCode: (code) => set({ friendCode: code }),
      applyTradeDelta: (give, receive) =>
        set((s) => {
          const inventory = { ...s.inventory };
          for (const [id, count] of Object.entries(give)) inventory[id] = Math.max(0, (inventory[id] ?? 0) - count);
          for (const [id, count] of Object.entries(receive)) inventory[id] = (inventory[id] ?? 0) + count;
          return { inventory, owned: ownedFromInventory(inventory, s.foilInventory) };
        }),
      markTradeApplied: (tradeId) => set((s) => ({ appliedTradeIds: [...s.appliedTradeIds, tradeId].slice(-200) })),
      saveDeck: (deck) => set({ deck }),
      createDeck: (name, faction) => {
        const id = `deck-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const trimmed = name.trim().slice(0, 30) || `Deck ${faction}`;
        set((s) => ({ decks: [...s.decks, { id, name: trimmed, faction, main: [] }] }));
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
            faction: fallback?.faction ?? s.faction,
          };
        }),
      setDeckCards: (id, main) =>
        set((s) => ({
          decks: s.decks.map((d) => (d.id === id ? { ...d, main } : d)),
          deck: s.activeDeckId === id ? main : s.deck,
        })),
      setDeckEvosphere: (id, evosphere) =>
        set((s) => ({
          decks: s.decks.map((d) => (d.id === id ? { ...d, evosphere } : d)),
        })),
      setActiveDeck: (id) =>
        set((s) => {
          const target = s.decks.find((d) => d.id === id);
          if (!target || !s.unlockedFactions.includes(target.faction)) return {};
          return { activeDeckId: id, faction: target.faction, deck: target.main };
        }),
      chooseStartingFaction: (faction) =>
        set((s) => {
          const starter = makeStarterDeck(faction, []);
          const inventory = inventoryFrom(startingOwnedFor(faction));
          return {
            factionChosen: true,
            faction,
            unlockedFactions: [faction],
            inventory,
            owned: ownedFromInventory(inventory),
            deck: starter.main,
            decks: [starter],
            activeDeckId: starter.id,
            avatarCardId: s.avatarCardId || defaultAvatarFor(faction),
          };
        }),
      setFaction: (faction) =>
        set((s) => {
          if (!s.unlockedFactions.includes(faction)) return {};
          const existing = s.decks.find((d) => d.faction === faction);
          if (existing) return { faction, activeDeckId: existing.id, deck: existing.main };
          return { faction, deck: starterDeck(faction) };
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
          const toUnlock: Faction[] = [];
          const missingStarter = (['Meute', 'Chevalier'] as Faction[]).find((f) => !s.unlockedFactions.includes(f));
          if (campaignChapter >= UNLOCK_SECOND_FACTION_AT && missingStarter) toUnlock.push(missingStarter);
          if (campaignChapter >= UNLOCK_THIRD_FACTION_AT && !s.unlockedFactions.includes('Orc')) toUnlock.push('Orc');
          if (toUnlock.length === 0) return { campaignChapter };
          const existingNames = s.decks.map((d) => d.name);
          const inventory = { ...s.inventory };
          for (const f of toUnlock) {
            for (const id of startingOwnedFor(f)) inventory[id] = Math.max(inventory[id] ?? 0, 3);
          }
          return {
            campaignChapter,
            unlockedFactions: [...s.unlockedFactions, ...toUnlock],
            inventory,
            owned: ownedFromInventory(inventory, s.foilInventory),
            decks: [...s.decks, ...toUnlock.map((f) => makeStarterDeck(f, existingNames))],
          };
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
          inventory: {},
          foilInventory: {},
          packsSincePity: {},
          friendCode: null,
          appliedTradeIds: [],
          deck: [],
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
      // Migrations de sauvegarde : calculées ici plutôt que dans onRehydrateStorage, qui
      // s'exécute de façon SYNCHRONE pendant l'hydratation avec un stockage synchrone
      // (localStorage) — à ce moment-là, `const useGame = create(...)` n'a pas encore fini
      // de s'exécuter, donc toute référence à `useGame` depuis ce callback lève une
      // ReferenceError (TDZ) et fait silencieusement échouer la migration (et, même sans
      // cette référence, muter l'objet `state` reçu ne notifie personne et n'est jamais
      // réécrit dans localStorage). `merge` reçoit directement le state par défaut et le
      // state persisté : aucune référence externe nécessaire, et le résultat retourné
      // devient le nouveau state sans détour.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<GameMeta>;
        const merged: GameMeta = { ...currentState, ...persisted };

        // Migration douce pour les joueurs qui avaient un unique deck avant l'ajout du
        // gestionnaire multi-decks : on l'enveloppe dans un SavedDeck plutôt que de le perdre.
        if (merged.decks.length === 0 && merged.deck.length > 0) {
          const wrapped: SavedDeck = { id: 'deck-migrated', name: `Deck ${merged.faction} 1`, faction: merged.faction, main: merged.deck };
          merged.decks = [wrapped];
          merged.activeDeckId = wrapped.id;
        }

        // Migration douce pour les joueurs qui avaient un `owned` sans compteur de copies :
        // on leur donne 3 exemplaires de chaque carte déjà débloquée (comportement équivalent
        // à l'ancien système, où une carte "possédée" donnait un accès illimité à 3 exemplaires).
        if (Object.keys(merged.inventory ?? {}).length === 0 && merged.owned.length > 0) {
          merged.inventory = inventoryFrom(merged.owned);
          merged.foilInventory = merged.foilInventory ?? {};
        }

        return merged;
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
