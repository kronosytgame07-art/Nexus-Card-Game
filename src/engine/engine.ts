import { CARD_DB, getCard, starterDeck } from './cards';
import { canFightTarget } from './combat-rules';
import {
  CardDef,
  EffectDef,
  Faction,
  FieldUnit,
  GameState,
  MAIN_DECK_SIZE,
  MAX_MANA,
  PlayerId,
  PlayerState,
  STARTING_HAND_SIZE,
  STARTING_LIFE,
} from './types';

export const MAX_FIELD_UNITS = 3;
export const MAX_SUPPORT = 5;

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MIN_PLAYABLE_DECK = 30;
const PACK_ATTACK_BONUS_CAP = 2;

function makePlayer(id: PlayerId, faction: Faction, customDeck?: string[], lifeBonus = 0, customEvosphere?: string[]): PlayerState {
  const source = customDeck && customDeck.length >= MIN_PLAYABLE_DECK ? customDeck : starterDeck(faction);
  const deck = shuffle(source).slice(0, MAIN_DECK_SIZE);
  const deckList = [...deck];
  const hand = deck.splice(0, STARTING_HAND_SIZE);
  const life = STARTING_LIFE + lifeBonus;
  const evolutionIds = [...new Set(
    source
      .map((id) => getCard(id).evolvesTo)
      .filter((id): id is string => Boolean(id))
  )];
  const evosphere = customEvosphere && customEvosphere.length
    ? customEvosphere.slice(0, 20)
    : evolutionIds.flatMap((id) => [id, id, id]).slice(0, 20);
  return {
    id,
    faction,
    life,
    maxLife: life,
    mana: 1,
    maxMana: 1,
    deck,
    deckList,
    hand,
    field: [],
    support: [],
    graveyard: [],
    evosphere,
    fatigue: 0,
    normalSummonUsed: false,
  };
}

export function newGame(
  playerFaction: Faction,
  enemyFaction: Faction,
  aiDifficulty: GameState['aiDifficulty'] = 'novice',
  playerDeck?: string[],
  enemyLifeBonus = 0,
  playerEvosphere?: string[]
): GameState {
  const state: GameState = {
    turn: 1,
    activePlayer: 'player',
    phase: 'main',
    player: makePlayer('player', playerFaction, playerDeck, 0, playerEvosphere),
    enemy: makePlayer('enemy', enemyFaction, undefined, enemyLifeBonus),
    log: ['La partie commence. À toi de jouer.'],
    aiDifficulty,
  };
  return state;
}

export { MIN_PLAYABLE_DECK };

function other(id: PlayerId): PlayerId {
  return id === 'player' ? 'enemy' : 'player';
}

function pushLog(state: GameState, message: string) {
  state.log.push(message);
  if (state.log.length > 30) state.log.shift();
}

function drawOne(state: GameState, id: PlayerId) {
  const p = state[id];
  if (p.deck.length === 0) {
    p.fatigue += 1;
    p.life -= p.fatigue;
    pushLog(state, `${labelFor(id)} n'a plus de cartes : ${p.fatigue} dégâts de fatigue.`);
    return;
  }
  const card = p.deck.shift()!;
  if (p.hand.length >= 10) {
    p.graveyard.push(card);
    pushLog(state, `${labelFor(id)} a la main pleine, une carte est brûlée.`);
    return;
  }
  p.hand.push(card);
}

function labelFor(id: PlayerId): string {
  return id === 'player' ? 'Toi' : "L'adversaire";
}

let idCounter = 0;
function instanceId(): string {
  idCounter += 1;
  return `u${Date.now()}-${idCounter}-${Math.floor(Math.random() * 100000)}`;
}

function findUnit(p: PlayerState, id: string): FieldUnit | undefined {
  return p.field.find((u) => u.instanceId === id);
}

function resolveSlot(existing: { slot: number }[], max: number, requested?: number): number {
  const taken = new Set(existing.map((u) => u.slot));
  if (requested !== undefined && requested >= 0 && requested < max && !taken.has(requested)) return requested;
  for (let i = 0; i < max; i++) if (!taken.has(i)) return i;
  return existing.length;
}

function removeDead(state: GameState, id: PlayerId) {
  const p = state[id];
  const dead = p.field.filter((u) => u.health <= 0);
  for (const u of dead) {
    p.graveyard.push(u.cardId);
    pushLog(state, `${getCard(u.cardId).name} tombe au combat.`);
  }
  p.field = p.field.filter((u) => u.health > 0);
}

/**
 * Mécaniques d'archétype :
 *  - Meute (Instinct de Meute) : +1 ATQ par autre Meute, plafonné à +2 ATQ par unité.
 *  - Chevalier (Rang Sacré) : coût réduit selon les Chevaliers déjà présents, minimum 1.
 *  - Orc (Fureur Sauvage) : +2 ATQ sous 50 % des PV max.
 */
function applyPackBonuses(state: GameState) {
  for (const id of ['player', 'enemy'] as PlayerId[]) {
    const p = state[id];
    for (const unit of p.field) {
      const def = getCard(unit.cardId);
      if (def.faction !== 'Meute') continue;
      const otherPackMembers = p.field.filter(
        (u) => u.instanceId !== unit.instanceId && getCard(u.cardId).faction === 'Meute'
      ).length;
      const nextBonus = Math.min(PACK_ATTACK_BONUS_CAP, otherPackMembers);
      unit.attack += nextBonus - unit.packBonus;
      unit.packBonus = nextBonus;
    }
  }
}

function effectivePlayCost(def: CardDef, owner: PlayerState): number {
  if (def.type === 'spell') return 0;
  if (def.faction !== 'Chevalier' || def.type !== 'unit') return def.cost;
  const knightsOnField = owner.field.filter((u) => getCard(u.cardId).faction === 'Chevalier').length;
  return Math.max(1, def.cost - knightsOnField);
}

const ORC_RAGE_BONUS = 2;

function effectiveAttack(unit: FieldUnit, def: CardDef): number {
  if (def.faction !== 'Orc' || unit.health > unit.maxHealth / 2) return unit.attack;
  return unit.attack + ORC_RAGE_BONUS;
}

function checkWinner(state: GameState) {
  if (state.player.life <= 0 && !state.winner) state.winner = 'enemy';
  if (state.enemy.life <= 0 && !state.winner) state.winner = 'player';
}

function autoTarget(state: GameState, ownerId: PlayerId, effect: EffectDef, sourceUnitId?: string) {
  const owner = state[ownerId];
  const opponent = state[other(ownerId)];

  switch (effect.kind) {
    case 'protect': {
      if (sourceUnitId && findUnit(owner, sourceUnitId)) return sourceUnitId;
      const strongest = [...owner.field].sort((a, b) => b.health - a.health)[0];
      return strongest?.instanceId;
    }
    case 'buff': {
      const pool = sourceUnitId ? owner.field.filter((u) => u.instanceId !== sourceUnitId) : owner.field;
      const source = sourceUnitId ? [findUnit(owner, sourceUnitId)].filter(Boolean) as FieldUnit[] : [];
      const candidates = pool.length > 0 ? pool : source;
      const target = [...candidates].sort((a, b) => b.attack - a.attack)[0];
      return target?.instanceId;
    }
    case 'stun': {
      const target = [...opponent.field]
        .filter((u) => u.stunnedTurns === 0)
        .sort((a, b) => b.attack - a.attack)[0];
      return target?.instanceId;
    }
    case 'damage': {
      const target = [...opponent.field].sort((a, b) => b.health - a.health)[0];
      return target?.instanceId;
    }
    default:
      return undefined;
  }
}

function resolveEffect(state: GameState, ownerId: PlayerId, effect: EffectDef, sourceUnitId?: string): boolean {
  const owner = state[ownerId];
  const opponent = state[other(ownerId)];
  let succeeded = true;

  switch (effect.kind) {
    case 'draw': {
      for (let i = 0; i < (effect.value ?? 1); i++) drawOne(state, ownerId);
      pushLog(state, `${labelFor(ownerId)} pioche ${effect.value ?? 1} carte(s).`);
      break;
    }
    case 'search': {
      const wanted = effect.target;
      const idx = owner.deck.findIndex((id) => !wanted || getCard(id).faction === wanted);
      if (idx >= 0 && owner.hand.length < 10) {
        const [found] = owner.deck.splice(idx, 1);
        owner.hand.push(found);
        pushLog(state, `${labelFor(ownerId)} trouve ${getCard(found).name} dans son deck.`);
      } else succeeded = false;
      break;
    }
    case 'protect': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(owner, targetId);
      if (unit) {
        unit.taunt = true;
        pushLog(state, `${getCard(unit.cardId).name} gagne Provocation.`);
      } else succeeded = false;
      break;
    }
    case 'buff': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(owner, targetId);
      if (unit) {
        unit.attack += effect.value ?? 1;
        unit.buffs += effect.value ?? 1;
        pushLog(state, `${getCard(unit.cardId).name} gagne +${effect.value ?? 1} attaque.`);
      } else succeeded = false;
      break;
    }
    case 'stun': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(opponent, targetId);
      if (unit) {
        unit.stunnedTurns += effect.value ?? 1;
        unit.canAttack = false;
        pushLog(state, `${getCard(unit.cardId).name} est étourdi.`);
      } else succeeded = false;
      break;
    }
    case 'damage': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(opponent, targetId);
      const amount = effect.value ?? 0;
      if (unit) {
        unit.health -= amount;
        pushLog(state, `${getCard(unit.cardId).name} subit ${amount} dégâts.`);
      } else {
        opponent.life -= amount;
        pushLog(state, `${labelFor(other(ownerId))} subit ${amount} dégâts directs.`);
      }
      break;
    }
    case 'summon': {
      if (owner.field.length >= MAX_FIELD_UNITS) {
        succeeded = false;
        break;
      }
      const ownedUnitIds = [...new Set(owner.deckList)];
      const pool = ownedUnitIds
        .map((id) => getCard(id))
        .filter((c) => c.level === 1 && c.type === 'unit' && (!effect.target || c.faction === effect.target));
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) {
        owner.field.push({
          instanceId: instanceId(),
          cardId: pick.id,
          attack: pick.attack,
          health: pick.health,
          maxHealth: pick.health,
          turnsOnField: 0,
          canAttack: Boolean(pick.blitz),
          stunnedTurns: 0,
          buffs: 0,
          taunt: false,
          packBonus: 0,
          effectUsesThisTurn: 0,
          slot: resolveSlot(owner.field, MAX_FIELD_UNITS),
        });
        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name}${pick.blitz ? ' — Blitz !' : ''}.`);
      } else succeeded = false;
      break;
    }
  }
  removeDead(state, other(ownerId));
  removeDead(state, ownerId);
  checkWinner(state);
  return succeeded;
}

export function playCard(rawState: GameState, playerId: PlayerId, cardId: string, slotIndex?: number): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const p = state[playerId];
  const handIdx = p.hand.indexOf(cardId);
  if (handIdx < 0) return state;
  const def = getCard(cardId);
  const cost = effectivePlayCost(def, p);
  if (cost > p.mana) return state;
  if (def.type === 'unit' && p.normalSummonUsed) {
    pushLog(state, `${labelFor(playerId)} a déjà utilisé son invocation normale ce tour.`);
    return state;
  }
  if (def.type === 'unit' && p.field.length >= MAX_FIELD_UNITS) {
    pushLog(state, 'Le plateau est plein, impossible de jouer cette unité.');
    return state;
  }
  if (def.type === 'spell' && p.support.length >= MAX_SUPPORT) {
    pushLog(state, 'La zone Soutien est pleine, impossible de poser ce sort.');
    return state;
  }

  p.hand.splice(handIdx, 1);
  p.mana -= cost;

  if (def.type === 'unit') {
    const unit: FieldUnit = {
      instanceId: instanceId(),
      cardId: def.id,
      attack: def.attack,
      health: def.health,
      maxHealth: def.health,
      turnsOnField: 0,
      canAttack: Boolean(def.blitz),
      stunnedTurns: 0,
      buffs: 0,
      taunt: false,
      packBonus: 0,
      effectUsesThisTurn: 0,
      slot: resolveSlot(p.field, MAX_FIELD_UNITS, slotIndex),
    };
    p.field.push(unit);
    p.normalSummonUsed = true;
    pushLog(state, `${labelFor(playerId)} joue ${def.name}${cost < def.cost ? ` (Rang Sacré : ${cost}◆ au lieu de ${def.cost}◆)` : ''}${def.blitz ? ' — Blitz !' : ''}.`);
    if (def.effect && def.text.toLowerCase().includes('à l’invocation')) resolveEffect(state, playerId, def.effect, unit.instanceId);
  } else {
    const support = { instanceId: instanceId(), cardId: def.id, slot: resolveSlot(p.support, MAX_SUPPORT, slotIndex) };
    p.support.push(support);
    pushLog(state, `${labelFor(playerId)} pose ${def.name} face cachée en Soutien.`);
  }

  applyPackBonuses(state);
  return state;
}

export function declareAttack(
  rawState: GameState,
  playerId: PlayerId,
  attackerInstanceId: string,
  targetInstanceId: string | null
): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const attacker = findUnit(state[playerId], attackerInstanceId);
  if (!attacker || !attacker.canAttack || attacker.stunnedTurns > 0) return state;

  const opponent = state[other(playerId)];
  const attackerDef = getCard(attacker.cardId);
  const canAttackDirectly = attackerDef.text.toLowerCase().includes('attaque directe');

  const reachableUnits = opponent.field.filter((u) => canFightTarget(attackerDef, getCard(u.cardId)));
  const reachableTaunts = reachableUnits.filter((u) => u.taunt && u.stunnedTurns === 0);

  if (!targetInstanceId && reachableUnits.length > 0 && !canAttackDirectly) {
    pushLog(state, 'Les créatures adverses atteignables te barrent la route.');
    return state;
  }

  if (reachableTaunts.length > 0) {
    const validIds = new Set(reachableTaunts.map((u) => u.instanceId));
    if (!targetInstanceId || !validIds.has(targetInstanceId)) {
      pushLog(state, 'Une unité avec Provocation doit être attaquée en priorité.');
      return state;
    }
  }

  if (targetInstanceId) {
    const target = findUnit(opponent, targetInstanceId);
    if (!target) return state;
    const targetDef = getCard(target.cardId);
    if (!canFightTarget(attackerDef, targetDef)) {
      pushLog(state, `${targetDef.name} possède Vol : ${attackerDef.name} doit avoir À distance pour l'atteindre.`);
      return state;
    }
  }

  attacker.canAttack = false;
  const attackerDmg = effectiveAttack(attacker, attackerDef);

  if (!targetInstanceId) {
    opponent.life -= attackerDmg;
    pushLog(state, `${attackerDef.name} frappe directement : ${attackerDmg} dégâts.`);
  } else {
    const target = findUnit(opponent, targetInstanceId)!;
    const targetDef = getCard(target.cardId);
    const targetStunned = target.stunnedTurns > 0;
    const targetDmg = targetStunned ? 0 : effectiveAttack(target, targetDef);
    target.health -= attackerDmg;
    if (!targetStunned) attacker.health -= targetDmg;
    pushLog(
      state,
      targetStunned
        ? `${attackerDef.name} frappe ${targetDef.name} (étourdi) : ${attackerDmg} dégâts, aucune riposte.`
        : `${attackerDef.name} (${attackerDmg}) affronte ${targetDef.name} (${targetDmg}).`
    );
  }

  removeDead(state, 'player');
  removeDead(state, 'enemy');
  applyPackBonuses(state);
  checkWinner(state);
  return state;
}

function startTurn(state: GameState, id: PlayerId) {
  const p = state[id];
  p.normalSummonUsed = false;
  p.maxMana = Math.min(MAX_MANA, p.maxMana + 1);
  p.mana = p.maxMana;
  drawOne(state, id);
  for (const unit of p.field) {
    unit.canAttack = true;
    unit.effectUsesThisTurn = 0;
    unit.turnsOnField += 1;
    if (unit.stunnedTurns > 0) {
      unit.stunnedTurns -= 1;
      unit.canAttack = unit.stunnedTurns > 0 ? false : unit.canAttack;
    }
  }
  pushLog(state, `Tour ${state.turn} : c'est à ${labelFor(id).toLowerCase()} de jouer.`);
}

export function evolveUnit(rawState: GameState, playerId: PlayerId, unitInstanceId: string): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const player = state[playerId];
  const unit = findUnit(player, unitInstanceId);
  if (!unit) return state;

  const base = getCard(unit.cardId);
  if (!base.waitTurns || !base.evolvesTo || unit.turnsOnField < base.waitTurns) return state;
  const evoIndex = player.evosphere.indexOf(base.evolvesTo);
  if (evoIndex < 0) {
    pushLog(state, `${base.name} ne peut pas évoluer : son évolution n’est plus dans l’Évosphère.`);
    return state;
  }

  const evo = getCard(base.evolvesTo);
  player.evosphere.splice(evoIndex, 1);
  player.graveyard.push(base.id);
  unit.cardId = evo.id;
  unit.attack = evo.attack + unit.buffs;
  unit.maxHealth = evo.health;
  unit.health = evo.health;
  unit.turnsOnField = 0;
  unit.canAttack = Boolean(evo.blitz);
  unit.packBonus = 0;

  pushLog(state, `WARNING EVOLUTION — ${base.name} évolue en ${evo.name} !`);
  if (evo.effect) resolveEffect(state, playerId, evo.effect, unit.instanceId);
  applyPackBonuses(state);
  return state;
}

function evolveAiUnits(rawState: GameState): GameState {
  let state = rawState;
  const eligible = state.enemy.field.filter((unit) => {
    const card = getCard(unit.cardId);
    return Boolean(card.waitTurns && card.evolvesTo && unit.turnsOnField >= card.waitTurns);
  });
  for (const unit of eligible) state = evolveUnit(state, 'enemy', unit.instanceId);
  return state;
}

export function endTurn(rawState: GameState): GameState {
  let state = clone(rawState);
  if (state.winner) return state;
  const finishing = state.activePlayer;
  const next = other(finishing);
  state.activePlayer = next;
  state.phase = 'main';
  startTurn(state, next);
  checkWinner(state);

  if (!state.winner && next === 'enemy') {
    state = aiMainPhase(state);
    state = aiBattlePhase(state);
    state = aiEndPhase(state);
  }
  return state;
}

export function aiDrawPhase(rawState: GameState): GameState {
  const state = clone(rawState);
  if (state.winner) return state;
  state.activePlayer = 'enemy';
  state.phase = 'main';
  startTurn(state, 'enemy');
  checkWinner(state);
  return state;
}

type Trade = 'kill_free' | 'kill_trade' | 'bad';

function evaluateTrade(attacker: FieldUnit, defender: FieldUnit): Trade {
  const attackerDef = getCard(attacker.cardId);
  const defenderDef = getCard(defender.cardId);
  if (!canFightTarget(attackerDef, defenderDef)) return 'bad';
  const attackerDamage = effectiveAttack(attacker, attackerDef);
  const defenderDamage = defender.stunnedTurns > 0 ? 0 : effectiveAttack(defender, defenderDef);
  const killsDefender = attackerDamage >= defender.health;
  const attackerSurvives = defenderDamage < attacker.health;
  if (killsDefender && attackerSurvives) return 'kill_free';
  if (killsDefender) return 'kill_trade';
  return 'bad';
}

function bestTradeTarget(attacker: FieldUnit, enemyField: FieldUnit[]): { target?: FieldUnit; trade: Trade } {
  let best: { target?: FieldUnit; trade: Trade } = { trade: 'bad' };
  const attackerDef = getCard(attacker.cardId);
  for (const defender of enemyField.filter((u) => canFightTarget(attackerDef, getCard(u.cardId)))) {
    const trade = evaluateTrade(attacker, defender);
    if (trade === 'kill_free') return { target: defender, trade };
    if (trade === 'kill_trade' && best.trade !== 'kill_free') {
      const attackerCost = attackerDef.cost;
      const defenderCost = getCard(defender.cardId).cost;
      if (defenderCost >= attackerCost) best = { target: defender, trade };
    }
  }
  return best;
}

export function aiMainPhase(rawState: GameState): GameState {
  let state = clone(rawState);
  if (state.winner || state.activePlayer !== 'enemy') return state;
  state = evolveAiUnits(state);

  let playedSomething = true;
  while (playedSomething) {
    playedSomething = false;
    const p = state.enemy;
    const playable = p.hand
      .map((id) => getCard(id))
      .filter(
        (c) =>
          effectivePlayCost(c, p) <= p.mana &&
          (c.type !== 'unit' || (!p.normalSummonUsed && p.field.length < MAX_FIELD_UNITS)) &&
          (c.type !== 'spell' || p.support.length < MAX_SUPPORT)
      )
      .sort((a, b) => b.cost - a.cost);
    if (playable[0]) {
      state = playCard(state, 'enemy', playable[0].id);
      playedSomething = true;
    }
  }

  for (const unit of state.enemy.field) {
    const def = getCard(unit.cardId);
    if (def.effect && !def.text.toLowerCase().includes('à l’invocation')) state = activateUnitEffect(state, 'enemy', unit.instanceId);
  }
  for (const s of [...state.enemy.support]) state = activateSupportCard(state, 'enemy', s.instanceId);
  return state;
}

export type AiBattlePlan = { attackerIds: string[]; lethal: boolean; keepBackId?: string };

export function aiPrepareBattlePlan(rawState: GameState): AiBattlePlan {
  if (rawState.winner || rawState.activePlayer !== 'enemy') return { attackerIds: [], lethal: false };
  const difficulty = rawState.aiDifficulty;
  const attackers = rawState.enemy.field.filter((u) => u.canAttack && u.stunnedTurns === 0);
  const hasReachableTaunt = attackers.some((attacker) =>
    rawState.player.field.some((defender) => defender.taunt && defender.stunnedTurns === 0 && canFightTarget(getCard(attacker.cardId), getCard(defender.cardId)))
  );
  const lethal =
    difficulty === 'maitre' &&
    !hasReachableTaunt &&
    attackers.reduce((sum, u) => sum + effectiveAttack(u, getCard(u.cardId)), 0) >= rawState.player.life;
  const keepBackId =
    difficulty === 'maitre' && !lethal && rawState.enemy.life <= 10 && attackers.length > 1
      ? [...attackers].sort((a, b) => b.health - a.health)[0]?.instanceId
      : undefined;
  return { attackerIds: attackers.map((u) => u.instanceId), lethal, keepBackId };
}

export type AiAttackStep = { state: GameState; attackerId: string; targetId: string | null; skipped: boolean };

export function aiResolveOneAttack(rawState: GameState, attackerId: string, lethal: boolean, keepBackId: string | undefined): AiAttackStep {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== 'enemy') return { state, attackerId, targetId: null, skipped: true };
  const currentAttacker = findUnit(state.enemy, attackerId);
  if (!currentAttacker || !currentAttacker.canAttack) return { state, attackerId, targetId: null, skipped: true };
  if (!lethal && currentAttacker.instanceId === keepBackId) return { state, attackerId, targetId: null, skipped: true };

  const attackerDef = getCard(currentAttacker.cardId);
  const reachable = state.player.field.filter((u) => canFightTarget(attackerDef, getCard(u.cardId)));
  const reachableTaunts = reachable.filter((u) => u.taunt && u.stunnedTurns === 0);
  const difficulty = state.aiDifficulty;
  let targetId: string | null;

  if (reachableTaunts.length > 0) {
    targetId = [...reachableTaunts].sort((a, b) => a.health - b.health)[0].instanceId;
  } else if (lethal || reachable.length === 0) {
    targetId = null;
  } else if (difficulty === 'novice') {
    const trade = bestTradeTarget(currentAttacker, reachable);
    targetId = trade.trade === 'kill_free' && trade.target ? trade.target.instanceId : null;
  } else {
    const trade = bestTradeTarget(currentAttacker, reachable);
    targetId = trade.trade !== 'bad' && trade.target ? trade.target.instanceId : null;
  }

  const before = currentAttacker.canAttack;
  const next = declareAttack(state, 'enemy', attackerId, targetId);
  const after = findUnit(next.enemy, attackerId)?.canAttack;
  return { state: next, attackerId, targetId, skipped: before === after };
}

export function aiBattlePhase(rawState: GameState): GameState {
  let state = clone(rawState);
  if (state.winner || state.activePlayer !== 'enemy') return state;
  const plan = aiPrepareBattlePlan(state);
  for (const attackerId of plan.attackerIds) {
    const step = aiResolveOneAttack(state, attackerId, plan.lethal, plan.keepBackId);
    state = step.state;
    if (state.winner) break;
  }
  return state;
}

export function aiEndPhase(rawState: GameState): GameState {
  const state = clone(rawState);
  pushLog(state, "L'adversaire termine son tour.");
  const next = clone(state);
  next.activePlayer = 'player';
  next.phase = 'main';
  next.turn += 1;
  startTurn(next, 'player');
  checkWinner(next);
  return next;
}

export function runAiTurn(rawState: GameState): GameState {
  let state = clone(rawState);
  if (state.winner || state.activePlayer !== 'enemy') return state;
  state = aiMainPhase(state);
  state = aiBattlePhase(state);
  return aiEndPhase(state);
}

export function activateUnitEffect(rawState: GameState, playerId: PlayerId, unitInstanceId: string): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const unit = findUnit(state[playerId], unitInstanceId);
  if (!unit) return state;
  const def = getCard(unit.cardId);
  if (!def.effect || def.text.toLowerCase().includes('à l’invocation')) return state;
  const maxUses = def.text.toLowerCase().includes('2 fois par tour') ? 2 : 1;
  if ((unit.effectUsesThisTurn ?? 0) >= maxUses) {
    pushLog(state, def.name + ' a déjà utilisé toutes ses activations ce tour.');
    return state;
  }
  resolveEffect(state, playerId, def.effect, unit.instanceId);
  unit.effectUsesThisTurn = (unit.effectUsesThisTurn ?? 0) + 1;
  pushLog(state, def.name + ' active son effet (' + unit.effectUsesThisTurn + '/' + maxUses + ').');
  applyPackBonuses(state);
  return state;
}

export function activateSupportCard(rawState: GameState, playerId: PlayerId, supportInstanceId: string): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const p = state[playerId];
  const idx = p.support.findIndex((s) => s.instanceId === supportInstanceId);
  if (idx < 0) return state;
  const support = p.support[idx];
  const def = getCard(support.cardId);
  if (!def.effect) return state;
  if (def.cost > p.mana) {
    pushLog(state, `${def.name} reste face cachée : pas assez de runes pour l'activer (${def.cost}◆).`);
    return state;
  }

  const succeeded = resolveEffect(state, playerId, def.effect);
  if (succeeded) {
    p.mana -= def.cost;
    p.support.splice(idx, 1);
    p.graveyard.push(def.id);
    pushLog(state, `${def.name} se révèle et son effet s'active.`);
  } else {
    pushLog(state, `${def.name} reste face cachée : conditions non réunies pour l'activer.`);
  }
  applyPackBonuses(state);
  return state;
}
