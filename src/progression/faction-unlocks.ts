import { starterDeck } from '../engine/cards';
import type { Faction } from '../engine/types';
import { CHAPTERS } from '../engine/campaign';
import { useGame, type SavedDeck } from '../store/game';

const PURCHASE_KEY = 'nexus-faction-purchases-v1';
export const FACTION_DECK_PRICE_GEMS = 1000;
export const GOBLIN_AVATAR_REQUIREMENT = 10;

function purchasedFactions(): Faction[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PURCHASE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((f): f is Faction => f === 'Chevalier' || f === 'Orc') : [];
  } catch {
    return [];
  }
}

function savePurchased(factions: Faction[]) {
  localStorage.setItem(PURCHASE_KEY, JSON.stringify([...new Set(factions)]));
}

function allowedFactions(state = useGame.getState()): Faction[] {
  const purchased = purchasedFactions();
  const allowed: Faction[] = ['Meute'];
  if (purchased.includes('Chevalier')) allowed.push('Chevalier');
  if (state.purchasedAvatars.length >= GOBLIN_AVATAR_REQUIREMENT) allowed.push('Gobelin');
  if (purchased.includes('Orc')) allowed.push('Orc');
  if (state.dragonStructureUnlocked) allowed.push('Dragon');
  if (state.campaignChapter >= CHAPTERS.length) allowed.push('Squelette');
  return allowed;
}

function structureDeck(faction: Faction): SavedDeck {
  return {
    id: `deck-${faction}-structure`,
    name: faction === 'Squelette' ? 'Légion Éternelle' : `Deck ${faction}`,
    faction,
    main: starterDeck(faction),
  };
}

let reconciling = false;
export function reconcileFactionUnlocks() {
  if (reconciling) return;
  const state = useGame.getState();
  if (!state.factionChosen) return;
  const allowed = allowedFactions(state);
  const same = allowed.length === state.unlockedFactions.length && allowed.every((f) => state.unlockedFactions.includes(f));
  const illegalDeck = state.decks.some((deck) => !allowed.includes(deck.faction));
  if (same && !illegalDeck && allowed.includes(state.faction)) return;

  reconciling = true;
  const decks = state.decks.filter((deck) => allowed.includes(deck.faction));
  for (const faction of allowed) {
    if (!decks.some((deck) => deck.faction === faction)) decks.push(structureDeck(faction));
  }
  const faction = allowed.includes(state.faction) ? state.faction : 'Meute';
  const active = decks.find((deck) => deck.id === state.activeDeckId && deck.faction === faction) ?? decks.find((deck) => deck.faction === faction) ?? decks[0];
  useGame.setState({
    unlockedFactions: allowed,
    faction,
    decks,
    activeDeckId: active?.id ?? null,
    deck: active?.main ?? starterDeck('Meute'),
  });
  reconciling = false;
}

export function purchaseFactionDeck(faction: 'Chevalier' | 'Orc'): boolean {
  const state = useGame.getState();
  const purchased = purchasedFactions();
  if (purchased.includes(faction) || state.gems < FACTION_DECK_PRICE_GEMS) return false;
  savePurchased([...purchased, faction]);
  useGame.setState({ gems: state.gems - FACTION_DECK_PRICE_GEMS });
  reconcileFactionUnlocks();
  return true;
}

export function factionUnlockLabel(faction: Faction, state = useGame.getState()): string {
  if (state.unlockedFactions.includes(faction)) return 'Débloqué';
  if (faction === 'Chevalier' || faction === 'Orc') return `${FACTION_DECK_PRICE_GEMS} gemmes`;
  if (faction === 'Gobelin') return `${Math.min(state.purchasedAvatars.length, GOBLIN_AVATAR_REQUIREMENT)}/${GOBLIN_AVATAR_REQUIREMENT} images de profil achetées`;
  if (faction === 'Squelette') return `Terminer toute la campagne (${Math.min(state.campaignChapter, CHAPTERS.length)}/${CHAPTERS.length})`;
  if (faction === 'Dragon') return 'Condition secrète';
  return 'Disponible';
}

export function installFactionUnlockRules() {
  reconcileFactionUnlocks();
  let signature = '';
  return useGame.subscribe((state) => {
    const next = `${state.factionChosen}|${state.campaignChapter}|${state.purchasedAvatars.length}|${state.dragonStructureUnlocked}|${state.gems}|${state.unlockedFactions.join(',')}`;
    if (next === signature) return;
    signature = next;
    reconcileFactionUnlocks();
  });
}
