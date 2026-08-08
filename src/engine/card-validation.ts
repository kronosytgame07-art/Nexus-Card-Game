import type { CardDef } from './types';

export interface CardValidationIssue {
  severity: 'error' | 'warning';
  cardId?: string;
  message: string;
}

export function validateCardDatabase(cards: CardDef[]): CardValidationIssue[] {
  const issues: CardValidationIssue[] = [];
  const byId = new Map<string, CardDef>();

  for (const card of cards) {
    if (byId.has(card.id)) issues.push({ severity: 'error', cardId: card.id, message: `ID de carte dupliqué : ${card.id}` });
    byId.set(card.id, card);

    if (card.rarity === 'Mythique' && card.copies !== 1) {
      issues.push({ severity: 'error', cardId: card.id, message: 'Une Mythique doit déclarer copies: 1.' });
    }
    if (card.type === 'unit' && (card.attack < 0 || card.health <= 0)) {
      issues.push({ severity: 'error', cardId: card.id, message: 'Statistiques invalides pour une unité.' });
    }
    if (card.type === 'spell' && (card.attack !== 0 || card.health !== 0)) {
      issues.push({ severity: 'warning', cardId: card.id, message: 'Une carte Soutien devrait avoir ATK/PV à 0.' });
    }
    if (card.blitz && card.attack >= 7 && card.level === 1) {
      issues.push({ severity: 'warning', cardId: card.id, message: 'Blitz est prévu principalement pour des unités légères ; vérifier cette ATK élevée.' });
    }
    if (card.assetMissing && card.rarity === 'Mythique') {
      issues.push({ severity: 'warning', cardId: card.id, message: 'Mythique préparée sans asset final.' });
    }
  }

  for (const card of cards) {
    if (card.evolvesTo) {
      const evo = byId.get(card.evolvesTo);
      if (!evo) issues.push({ severity: 'error', cardId: card.id, message: `Évolution introuvable : ${card.evolvesTo}` });
      else if (evo.evolvesFrom !== card.id) issues.push({ severity: 'error', cardId: card.id, message: `Lien evolvesFrom incohérent sur ${evo.id}.` });
    }
    if (card.evolvesFrom) {
      const base = byId.get(card.evolvesFrom);
      if (!base) issues.push({ severity: 'error', cardId: card.id, message: `Carte de base introuvable : ${card.evolvesFrom}` });
      else if (base.evolvesTo !== card.id) issues.push({ severity: 'error', cardId: card.id, message: `Lien evolvesTo incohérent sur ${base.id}.` });
    }
  }

  return issues;
}

export function assertValidCardDatabase(cards: CardDef[]): void {
  const errors = validateCardDatabase(cards).filter((issue) => issue.severity === 'error');
  if (errors.length === 0) return;
  throw new Error(`Base de cartes Nexus invalide :\n${errors.map((issue) => `- ${issue.cardId ?? 'global'}: ${issue.message}`).join('\n')}`);
}
