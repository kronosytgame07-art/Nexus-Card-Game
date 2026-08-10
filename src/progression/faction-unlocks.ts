import { cardsByFaction, starterDeck } from '../engine/cards';
import type { Faction } from '../engine/types';
import { CHAPTERS } from '../engine/campaign';
import { defaultAvatarFor, useGame, type SavedDeck } from '../store/game';

const PURCHASE_KEY = 'nexus-faction-purchases-v1';
export const FACTION_DECK_PRICE_GEMS = 500;
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

function startingInventory(faction: Faction): Record<string, number> {
  const inventory: Record<string, number> = {};
  for (const card of cardsByFaction(faction)) {
    if (card.level === 1 && !card.boosterOnly && !card.assetMissing) inventory[card.id] = 3;
  }
  return inventory;
}

let reconciling = false;
export function reconcileFactionUnlocks() {
  if (reconciling) return;
  const state = useGame.getState();
  if (!state.factionChosen) return;
  const allowed = allowedFactions(state);
  const same = allowed.length === state.unlockedFactions.length && allowed.every((f) => state.unlockedFactions.includes(f));
  if (same && allowed.includes(state.faction)) return;

  reconciling = true;
  const decks = [...state.decks];
  for (const faction of allowed) {
    if (!decks.some((deck) => deck.faction === faction)) decks.push(structureDeck(faction));
  }
  const faction = allowed.includes(state.faction) ? state.faction : 'Meute';
  const active =
    decks.find((deck) => deck.id === state.activeDeckId && deck.faction === faction) ??
    decks.find((deck) => deck.faction === faction) ??
    structureDeck('Meute');

  useGame.setState({ unlockedFactions: allowed, faction, decks, activeDeckId: active.id, deck: active.main });
  reconciling = false;
}

export function purchaseFactionDeck(faction: Faction): boolean {
  if (faction !== 'Chevalier' && faction !== 'Orc') return false;
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

function installProgressionActions() {
  useGame.setState({
    chooseStartingFaction: (requestedFaction: Faction) => {
      const current = useGame.getState();
      if (current.factionChosen) return;
      const faction: Faction = requestedFaction === 'Meute' ? 'Meute' : 'Meute';
      const main = starterDeck(faction);
      const deck: SavedDeck = { id: `deck-${faction}-${Date.now()}`, name: `Deck ${faction} 1`, faction, main };
      const inventory = startingInventory(faction);
      useGame.setState({
        factionChosen: true,
        faction,
        unlockedFactions: [faction],
        inventory,
        owned: Object.keys(inventory),
        deck: main,
        decks: [deck],
        activeDeckId: deck.id,
        avatarCardId: current.avatarCardId || defaultAvatarFor(faction),
      });
    },
    completeChapter: (chapterId: number) => {
      const state = useGame.getState();
      const campaignChapter = chapterId >= state.campaignChapter ? chapterId + 1 : state.campaignChapter;
      useGame.setState({ campaignChapter });
    },
  });
}

function refreshOnboardingLocks() {
  document.querySelectorAll<HTMLButtonElement>('.onboarding-card').forEach((button) => {
    const text = button.textContent ?? '';
    if (text.includes('Meute')) return;
    button.disabled = true;
    button.classList.add('locked-by-progression');
    button.dataset.lockLabel = text.includes('Chevalier') ? `Boutique · ${FACTION_DECK_PRICE_GEMS} gemmes` : 'Verrouillé';
    button.title = text.includes('Chevalier') ? `Deck Chevalier disponible en boutique pour ${FACTION_DECK_PRICE_GEMS} gemmes` : 'Faction verrouillée';
  });
}

export function installFactionUnlockRules() {
  installProgressionActions();
  reconcileFactionUnlocks();
  // Une passe au lancement suffit : l'ancien MutationObserver sur tout #root
  // se déclenchait à chaque animation/changement de la boutique et ralentissait l'affichage.
  queueMicrotask(refreshOnboardingLocks);

  let signature = '';
  const unsubscribe = useGame.subscribe((state) => {
    const next = `${state.factionChosen}|${state.campaignChapter}|${state.purchasedAvatars.length}|${state.dragonStructureUnlocked}|${state.gems}|${state.unlockedFactions.join(',')}`;
    if (next === signature) return;
    signature = next;
    reconcileFactionUnlocks();
  });

  return unsubscribe;
}
