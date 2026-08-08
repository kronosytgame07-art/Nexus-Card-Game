import { CARD_DB, getCard, starterDeck } from './cards';
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
  // Le joueur peut choisir lui-même le contenu de son évosphère dans le
  // deck-builder ; sinon on garde l'ancien comportement automatique
  // (chaque évolution possible x3, jusqu'à 20 emplacements).
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

/** Choisit l'emplacement d'affichage d'une nouvelle unité/carte de soutien : celui demandé
    par le joueur s'il est libre et valide, sinon le premier emplacement libre. */
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
 * Mécaniques d'archétype — chaque faction joue différemment :
 *  - Meute (Instinct de Meute) : chaque créature Meute gagne +1 ATQ pour chaque AUTRE
 *    créature Meute sur le même terrain. Recalculé à chaque changement de terrain via un
 *    delta (packBonus stocké) pour ne jamais dupliquer le bonus.
 *  - Chevalier (Rang Sacré) : jouer un chevalier coûte 1 mana de moins pour chaque
 *    chevalier déjà présent sur le terrain (minimum 1 mana). Voir chevalierPlayCost().
 *  - Orc (Fureur Sauvage) : une créature Orc passée sous la moitié de ses PV max
 *    frappe pour +2 ATQ (attaque comme contre-attaque). Récompense la prise de
 *    risque plutôt que la synergie de terrain ou le coût — voir effectiveAttack().
 */
function applyPackBonuses(state: GameState) {
  for (const id of ['player', 'enemy'] as PlayerId[]) {
    const p = state[id];
    for (const unit of p.field) {
      const def = getCard(unit.cardId);
      if (def.faction !== 'Meute') continue;
      const packSize = p.field.filter(
        (u) => u.instanceId !== unit.instanceId && getCard(u.cardId).faction === 'Meute'
      ).length;
      unit.attack += packSize - unit.packBonus;
      unit.packBonus = packSize;
    }
  }
}

/** Coût réel pour jouer une carte, en tenant compte du Rang Sacré des chevaliers.
    Les sorts/enchantements se posent toujours gratuitement face cachée en
    Soutien — seule leur activation coûte des runes (voir activateSupportCard). */
function effectivePlayCost(def: CardDef, owner: PlayerState): number {
  if (def.type === 'spell') return 0;
  if (def.faction !== 'Chevalier' || def.type !== 'unit') return def.cost;
  const knightsOnField = owner.field.filter((u) => getCard(u.cardId).faction === 'Chevalier').length;
  return Math.max(1, def.cost - knightsOnField);
}

const ORC_RAGE_BONUS = 2;

/** Puissance de frappe réelle d'une unité, Fureur Sauvage des Orcs incluse
    (voir le commentaire de mécaniques d'archétype ci-dessus). Calculée à
    partir des PV AVANT l'échange de coups, pour que les deux belligérants
    d'un même combat soient jugés sur leur état au moment de frapper. */
function effectiveAttack(unit: FieldUnit, def: CardDef): number {
  if (def.faction !== 'Orc' || unit.health > unit.maxHealth / 2) return unit.attack;
  return unit.attack + ORC_RAGE_BONUS;
}

function checkWinner(state: GameState) {
  if (state.player.life <= 0 && !state.winner) state.winner = 'enemy';
  if (state.enemy.life <= 0 && !state.winner) state.winner = 'player';
}

/** Choisit une cible pertinente pour un effet, selon des heuristiques simples et déterministes. */
function autoTarget(state: GameState, ownerId: PlayerId, effect: EffectDef, sourceUnitId?: string) {
  const owner = state[ownerId];
  const opponent = state[other(ownerId)];

  switch (effect.kind) {
    case 'protect': {
      // Si la source est déjà une unité sur le plateau, elle devient elle-même Provocation.
      if (sourceUnitId && findUnit(owner, sourceUnitId)) {
        return sourceUnitId;
      }
      // Sinon (carte sort), la Provocation est accordée à l'unité alliée avec le plus de PV.
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
      } else {
        succeeded = false;
      }
      break;
    }
    case 'protect': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(owner, targetId);
      if (unit) {
        unit.taunt = true;
        pushLog(state, `${getCard(unit.cardId).name} gagne Provocation.`);
      } else {
        succeeded = false;
      }
      break;
    }
    case 'buff': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(owner, targetId);
      if (unit) {
        unit.attack += effect.value ?? 1;
        unit.buffs += effect.value ?? 1;
        pushLog(state, `${getCard(unit.cardId).name} gagne +${effect.value ?? 1} attaque.`);
      } else {
        succeeded = false;
      }
      break;
    }
    case 'stun': {
      const targetId = autoTarget(state, ownerId, effect, sourceUnitId);
      const unit = targetId && findUnit(opponent, targetId);
      if (unit) {
        unit.stunnedTurns += effect.value ?? 1;
        unit.canAttack = false;
        pushLog(state, `${getCard(unit.cardId).name} est étourdi.`);
      } else {
        succeeded = false;
      }
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
      // Uniquement parmi les cartes réellement présentes dans le deck de
      // départ du joueur — jamais une carte qu'il ne possède pas (issue
      // d'un booster jamais ouvert, par exemple).
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
          canAttack: false,
          stunnedTurns: 0,
          buffs: 0,
          taunt: false,
          packBonus: 0,
          effectUsesThisTurn: 0,
          slot: resolveSlot(owner.field, MAX_FIELD_UNITS),
        });
        pushLog(state, `${labelFor(ownerId)} invoque ${pick.name}.`);
      } else {
        succeeded = false;
      }
      break;
    }
  }
  removeDead(state, other(ownerId));
  removeDead(state, ownerId);
  checkWinner(state);
  return succeeded;
}

export function playCard(
  rawState: GameState,
  playerId: PlayerId,
  cardId: string,
  slotIndex?: number
): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const p = state[playerId];
  const handIdx = p.hand.indexOf(cardId);
  if (handIdx < 0) return state;
  const def = getCard(cardId);
  const cost = effectivePlayCost(def, p);
  if (cost > p.mana) return state;
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
      canAttack: false,
      stunnedTurns: 0,
      buffs: 0,
      taunt: false,
      packBonus: 0,
      effectUsesThisTurn: 0,
      slot: resolveSlot(p.field, MAX_FIELD_UNITS, slotIndex),
    };
    p.field.push(unit);
    pushLog(state, `${labelFor(playerId)} joue ${def.name}${cost < def.cost ? ` (Rang Sacré : ${cost}◆ au lieu de ${def.cost}◆)` : ''}.`);
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
  // Un étourdissement suspend les effets de l'unité — une Provocation étourdie
  // ne force plus l'attaque sur elle, les autres cibles redeviennent valides.
  const opponentTaunts = opponent.field.filter((u) => u.taunt && u.stunnedTurns === 0);
  const attackerDef = getCard(attacker.cardId);
  const canAttackDirectly = attackerDef.text.toLowerCase().includes('attaque directe');
  if (!targetInstanceId && opponent.field.length > 0 && !canAttackDirectly) {
    pushLog(state, 'Les créatures adverses te barrent la route.');
    return state;
  }
  if (opponentTaunts.length > 0) {
    const validIds = new Set(opponentTaunts.map((u) => u.instanceId));
    if (!targetInstanceId || !validIds.has(targetInstanceId)) return state; // doit cibler une Provocation
  }

  attacker.canAttack = false;
  const attackerDmg = effectiveAttack(attacker, attackerDef);

  if (!targetInstanceId) {
    opponent.life -= attackerDmg;
    pushLog(state, `${attackerDef.name} frappe directement : ${attackerDmg} dégâts.`);
  } else {
    const target = findUnit(opponent, targetInstanceId);
    if (!target) return state;
    const targetDef = getCard(target.cardId);
    // Une cible étourdie ne riposte pas : elle encaisse les dégâts sans contre-attaquer.
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

export function evolveUnit(
  rawState: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): GameState {
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
  unit.canAttack = false;
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

// --- Tour de l'IA, découpé en phases -------------------------------------
// Chaque fonction est un pas autonome (pioche / main / combat / fin) que
// l'interface peut appliquer l'une après l'autre avec une pause visuelle
// entre chacune, au lieu de tout résoudre d'un bloc et de ne montrer le
// résultat qu'à la toute fin.

// Pioche + mana de l'IA — équivalent du début d'endTurn pour le camp adverse.
export function aiDrawPhase(rawState: GameState): GameState {
  const state = clone(rawState);
  if (state.winner) return state;
  state.activePlayer = 'enemy';
  state.phase = 'main';
  startTurn(state, 'enemy');
  checkWinner(state);
  return state;
}

// --- Intelligence artificielle -------------------------------------------
// Trois niveaux, du même moteur de décision mais avec des seuils différents :
//  - novice  : joue tout son mana, fonce au visage sauf échange gratuit.
//  - veteran : n'accepte que les échanges rentables (garde ses unités plus
//              chères que celles qu'elle sacrifie), sinon frappe au visage.
//  - maitre  : en plus, calcule le coup fatal (lethal) et fonce dessus sans
//              hésiter, et garde une unité en défense si sa vie est basse.

type Trade = 'kill_free' | 'kill_trade' | 'bad';

function evaluateTrade(attacker: FieldUnit, defender: FieldUnit): Trade {
  const killsDefender = attacker.attack >= defender.health;
  const attackerSurvives = defender.attack < attacker.health;
  if (killsDefender && attackerSurvives) return 'kill_free';
  if (killsDefender) return 'kill_trade';
  return 'bad';
}

function bestTradeTarget(attacker: FieldUnit, enemyField: FieldUnit[]): { target?: FieldUnit; trade: Trade } {
  let best: { target?: FieldUnit; trade: Trade } = { trade: 'bad' };
  for (const defender of enemyField) {
    const trade = evaluateTrade(attacker, defender);
    if (trade === 'kill_free') return { target: defender, trade };
    if (trade === 'kill_trade' && best.trade !== 'kill_free') {
      // Un échange à la loyale n'en vaut la peine que si la cible coûte au
      // moins autant à construire que l'attaquant qu'on va perdre.
      const attackerCost = getCard(attacker.cardId).cost;
      const defenderCost = getCard(defender.cardId).cost;
      if (defenderCost >= attackerCost) best = { target: defender, trade };
    }
  }
  return best;
}

// Main phase de l'IA : évolutions, pose de cartes (la plus chère d'abord),
// puis activation des effets/soutiens déjà en jeu.
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
          (c.type !== 'unit' || p.field.length < MAX_FIELD_UNITS) &&
          (c.type !== 'spell' || p.support.length < MAX_SUPPORT)
      )
      .sort((a, b) => b.cost - a.cost);
    if (playable[0]) {
      state = playCard(state, 'enemy', playable[0].id);
      playedSomething = true;
    }
  }

  // Active les effets des unités déjà sur le plateau et les sorts posés en Soutien,
  // comme le ferait un joueur cliquant sur chaque carte prête à s'activer.
  for (const unit of state.enemy.field) {
    const def = getCard(unit.cardId);
    if (def.effect && !def.text.toLowerCase().includes('à l’invocation')) {
      state = activateUnitEffect(state, 'enemy', unit.instanceId);
    }
  }
  for (const s of [...state.enemy.support]) {
    state = activateSupportCard(state, 'enemy', s.instanceId);
  }
  return state;
}

// Battle phase de l'IA : décide et résout toutes ses attaques.
export type AiBattlePlan = { attackerIds: string[]; lethal: boolean; keepBackId?: string };

// Décide à l'avance QUI va attaquer et selon quelle logique ("lethal",
// unité gardée en défense) — calculé une seule fois sur l'état d'entrée en
// Battle Phase, pour que l'interface puisse ensuite dérouler les attaques
// une par une (avec une animation par attaque) sans changer la décision de
// l'IA en cours de route.
export function aiPrepareBattlePlan(rawState: GameState): AiBattlePlan {
  if (rawState.winner || rawState.activePlayer !== 'enemy') return { attackerIds: [], lethal: false };
  const difficulty = rawState.aiDifficulty;
  const attackers = rawState.enemy.field.filter((u) => u.canAttack && u.stunnedTurns === 0);

  // "maitre" : si la somme des attaques disponibles peut achever le joueur, on fonce tout au visage.
  const lethal =
    difficulty === 'maitre' &&
    rawState.player.field.filter((u) => u.taunt && u.stunnedTurns === 0).length === 0 &&
    attackers.reduce((sum, u) => sum + effectiveAttack(u, getCard(u.cardId)), 0) >= rawState.player.life;

  // "maitre" à faible vie : on garde la meilleure unité en défense plutôt que de l'engager.
  const keepBackId =
    difficulty === 'maitre' && !lethal && rawState.enemy.life <= 10 && attackers.length > 1
      ? [...attackers].sort((a, b) => b.health - a.health)[0]?.instanceId
      : undefined;

  return { attackerIds: attackers.map((u) => u.instanceId), lethal, keepBackId };
}

export type AiAttackStep = { state: GameState; attackerId: string; targetId: string | null; skipped: boolean };

// Résout UNE attaque de l'IA (celle de attackerId), en respectant la
// décision globale déjà prise par aiPrepareBattlePlan. "skipped" indique
// qu'il n'y a rien à animer pour cet attaquant (mort entre-temps, étourdi,
// ou gardé volontairement en défense) — l'appelant doit alors passer au
// suivant sans délai ni animation.
export function aiResolveOneAttack(rawState: GameState, attackerId: string, lethal: boolean, keepBackId: string | undefined): AiAttackStep {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== 'enemy') return { state, attackerId, targetId: null, skipped: true };
  const currentAttacker = findUnit(state.enemy, attackerId);
  if (!currentAttacker || !currentAttacker.canAttack) return { state, attackerId, targetId: null, skipped: true };
  if (!lethal && currentAttacker.instanceId === keepBackId) return { state, attackerId, targetId: null, skipped: true };

  const difficulty = state.aiDifficulty;
  const playerTaunts = state.player.field.filter((u) => u.taunt && u.stunnedTurns === 0);
  let targetId: string | null;
  if (playerTaunts.length > 0) {
    targetId = [...playerTaunts].sort((a, b) => a.health - b.health)[0].instanceId;
  } else if (lethal) {
    targetId = null;
  } else if (difficulty === 'novice') {
    const trade = bestTradeTarget(currentAttacker, state.player.field);
    targetId = trade.trade === 'kill_free' ? trade.target!.instanceId : null;
  } else {
    // veteran / maitre : n'accepte que les échanges rentables (gratuits ou de valeur égale).
    const trade = bestTradeTarget(currentAttacker, state.player.field);
    targetId = trade.trade !== 'bad' && trade.target ? trade.target.instanceId : null;
  }
  const next = declareAttack(state, 'enemy', attackerId, targetId);
  return { state: next, attackerId, targetId, skipped: false };
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

// Fin du tour de l'IA : bascule la main au joueur.
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

/**
 * Retourne un sort posé face cachée en zone Soutien et tente d'activer son effet.
 * Si les conditions ne sont pas réunies (pas de cible valide, etc.), la carte
 * reste posée face cachée et n'est pas consommée — elle pourra être retentée
 * plus tard.
 */
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
