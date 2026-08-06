const FX_LAYER_ID = 'nexus-action-fx-layer';

function fxLayer(): HTMLElement {
  let layer = document.getElementById(FX_LAYER_ID);
  if (!layer) {
    layer = document.createElement('div');
    layer.id = FX_LAYER_ID;
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

function pulse(element: Element | null, className: string, duration = 700) {
  if (!(element instanceof HTMLElement)) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), duration);
}

function banner(label: string, kind: string) {
  const node = document.createElement('div');
  node.className = `nexus-action-banner ${kind}`;
  node.textContent = label;
  fxLayer().appendChild(node);
  window.setTimeout(() => node.remove(), 1050);
}

function burst(target: Element | null, kind: string) {
  if (!(target instanceof HTMLElement)) return;
  const rect = target.getBoundingClientRect();
  const node = document.createElement('span');
  node.className = `nexus-action-burst ${kind}`;
  node.style.left = `${rect.left + rect.width / 2}px`;
  node.style.top = `${rect.top + rect.height / 2}px`;
  fxLayer().appendChild(node);
  window.setTimeout(() => node.remove(), 900);
}

function screenShake() {
  const battle = document.querySelector('.battle');
  pulse(battle, 'nexus-screen-shake', 440);
}

let selectedAttacker: HTMLElement | null = null;

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target || !target.closest('.battle')) return;

  const endTurn = target.closest('.end-turn');
  if (endTurn) {
    banner('FIN DU TOUR', 'turn');
    pulse(document.querySelector('.turn-strip'), 'nexus-phase-sweep', 850);
    return;
  }

  const phaseButton = target.closest('.phase-button, [data-phase]');
  if (phaseButton) {
    const label = phaseButton.textContent?.trim() || 'CHANGEMENT DE PHASE';
    banner(label, 'phase');
    pulse(document.querySelector('.turn-strip'), 'nexus-phase-sweep', 850);
    return;
  }

  const evolveButton = target.closest('.evolve-action, .unit-actions .primary, [data-action="evolve"]');
  if (evolveButton) {
    const card = document.querySelector('.field-card.selected') || document.querySelector('.player-zone .field-card[data-evolvable="true"]');
    banner('ÉVOLUTION', 'evolution');
    burst(card, 'evolution');
    pulse(card, 'nexus-evolving', 1250);
    return;
  }

  const effectButton = target.closest('.unit-actions .secondary, [data-action="effect"], .support-card:not(:disabled)');
  if (effectButton) {
    const card = document.querySelector('.field-card.selected') || effectButton.closest('.support-card');
    banner('EFFET ACTIVÉ', 'effect');
    burst(card, 'effect');
    pulse(card, 'nexus-effect-cast', 900);
    return;
  }

  const handCard = target.closest('.hand .card');
  if (handCard) {
    banner('CARTE JOUÉE', 'play');
    pulse(handCard, 'nexus-card-play', 650);
    return;
  }

  const playerCard = target.closest('.player-zone .field-card') as HTMLElement | null;
  if (playerCard) {
    if (playerCard.classList.contains('selected')) {
      selectedAttacker = playerCard;
      banner('ATTAQUE PRÊTE', 'attack');
      pulse(playerCard, 'nexus-attack-ready', 900);
    } else {
      pulse(playerCard, 'nexus-card-select', 420);
    }
    return;
  }

  const enemyCard = target.closest('.enemy-zone .field-card');
  if (enemyCard && selectedAttacker) {
    banner('ATTAQUE', 'attack');
    pulse(selectedAttacker, 'nexus-attacker-lunge', 620);
    pulse(enemyCard, 'nexus-target-hit', 720);
    burst(enemyCard, 'impact');
    screenShake();
    selectedAttacker = null;
    return;
  }

  const directAttack = target.closest('.attack-face');
  if (directAttack) {
    banner('ATTAQUE DIRECTE', 'attack');
    pulse(selectedAttacker, 'nexus-attacker-lunge', 620);
    burst(document.querySelector('.enemy-combatant'), 'impact');
    pulse(document.querySelector('.enemy-combatant'), 'nexus-hero-hit', 720);
    screenShake();
    selectedAttacker = null;
  }
}, true);

const knownEnemyHands = new WeakMap<Element, number>();
const knownFields = new WeakMap<Element, Set<string>>();

function scanAnimations() {
  const battle = document.querySelector('.battle');
  if (!battle) return;

  const enemyHand = battle.querySelector('.enemy-hand-row');
  if (enemyHand) {
    const count = enemyHand.children.length;
    const previous = knownEnemyHands.get(enemyHand);
    if (previous !== undefined && count > previous) {
      const newest = enemyHand.lastElementChild;
      banner("L'ADVERSAIRE PIOCHE", 'draw');
      pulse(newest, 'nexus-enemy-draw', 850);
    }
    knownEnemyHands.set(enemyHand, count);
  }

  battle.querySelectorAll('.player-zone .board, .enemy-zone .board').forEach((board) => {
    const ids = new Set(Array.from(board.querySelectorAll<HTMLElement>('.field-card')).map((card) => card.dataset.instanceId || card.dataset.cardId || ''));
    const before = knownFields.get(board);
    if (before) {
      ids.forEach((id) => {
        if (id && !before.has(id)) {
          const card = Array.from(board.querySelectorAll<HTMLElement>('.field-card')).find((item) => (item.dataset.instanceId || item.dataset.cardId) === id);
          banner(board.closest('.enemy-zone') ? 'INVOCATION ADVERSE' : 'INVOCATION', 'summon');
          burst(card || null, 'summon');
          pulse(card || null, 'nexus-summon-arrival', 1000);
        }
      });
    }
    knownFields.set(board, ids);
  });
}

const observer = new MutationObserver(scanAnimations);
observer.observe(document.documentElement, { childList: true, subtree: true });
scanAnimations();
