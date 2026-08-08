import { CardDef } from './types';

export const DECK_MIN_SIZE = 30;
export const DECK_MAX_SIZE = 40;
export const STANDARD_COPY_LIMIT = 3;
export const MYTHIC_COPY_LIMIT = 1;

export function copyLimitForCard(card: CardDef): number {
  return card.rarity === 'Mythique' ? MYTHIC_COPY_LIMIT : Math.min(STANDARD_COPY_LIMIT, Math.max(1, card.copies));
}

export function copiesOf(deck: string[], cardId: string): number {
  return deck.filter((id) => id === cardId).length;
}

export function canAddCard(deck: string[], card: CardDef, ownedCopies: number): boolean {
  if (deck.length >= DECK_MAX_SIZE) return false;
  if (card.level !== 1) return false;
  const current = copiesOf(deck, card.id);
  return current < copyLimitForCard(card) && current < ownedCopies;
}
