import { activateUnitEffect, declareAttack, evolveUnit } from './engine/engine';

type AnyState = Record<string, any>;

const INSPECTOR_ID = 'nexus-card-inspector';
const EFFECT_TOAST_ID = 'nexus-effect-toast';
let selectedAttacker: string | null = null;
let currentPhase: 'main' | 'battle' = 'main';
let previousEnemyHand = -1;

function closeInspector() {
  document.getElementById(INSPECTOR_ID)?.remove();
}

function textOf(root: Element, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
}

function reactFiber(element: Element): any {
  const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
  return key ? (element as any)[key] : null;
}

function combatFiber(): any {
  const battle = document.querySelector('.battle');
  let fiber = battle ? reactFiber(battle) : null;
  while (fiber) {
    const name = fiber.type?.name || fiber.elementType?.name;
    if (name === 'Combat') return fiber;
    fiber = fiber.return;
  }
  return null;
}

function matchHook(): { state: AnyState; dispatch: (next: AnyState) => void } | null {
  const fiber = combatFiber();
  let hook = fiber?.memoizedState;
  while (hook) {
    const state = hook.memoizedState;
    if (state && typeof state === 'object' && state.player && state.enemy && state.activePlayer) {
      const dispatch = hook.queue?.dispatch;
      if (typeof dispatch === 'function') return { state, dispatch };
    }
    hook = hook.next;
  }
  return null;
}

function setMatch(next: AnyState) {
  const hook = matchHook();
  if (!hook || next === hook.state) return false;
  hook.dispatch(next);
  return true;
}

function clearAttackSelection() {
  selectedAttacker = null;
  document.querySelectorAll('.field-card.nexus-attacker').forEach((el) => el.classList.remove('nexus-attacker'));
  document.body.classList.remove('nexus-targeting');
}

function selectForAttack(card: HTMLElement) {
  const id = card.dataset.instanceId;
  if (!id) return;
  const hook = matchHook();
  const unit = hook?.state?.player?.field?.find((entry: AnyState) => entry.instanceId === id);
  if (!unit?.canAttack || unit.stunnedTurns > 0) {
    showEffectToast('Cette unité ne peut pas attaquer maintenant.');
    return;
  }
  clearAttackSelection();
  selectedAttacker = id;
  card.classList.add('nexus-attacker');
  document.body.classList.add('nexus-targeting');
  showEffectToast('Choisis une créature adverse ou attaque directement.');
}

function attackTarget(targetId: string | null) {
  if (!selectedAttacker) return;
  const hook = matchHook();
  if (!hook || hook.state.activePlayer !== 'player') return;
  const next = declareAttack(hook.state, 'player', selectedAttacker, targetId);
  if (!setMatch(next)) showEffectToast("L'attaque n'est pas possible.");
  clearAttackSelection();
  closeInspector();
}

function evolve(instanceId: string) {
  const hook = matchHook();
  if (!hook) return;
  const next = evolveUnit(hook.state, 'player', instanceId);
  if (setMatch(next)) showEffectToast('ÉVOLUTION ACTIVÉE !');
  else showEffectToast("Cette carte ne peut pas encore évoluer.");
  closeInspector();
}

function activateEffect(instanceId: string) {
  const hook = matchHook();
  if (!hook) return;
  const next = activateUnitEffect(hook.state, 'player', instanceId);
  if (setMatch(next)) showEffectToast('EFFET ACTIVÉ !');
  else showEffectToast("Cet effet ne peut pas être activé maintenant.");
  closeInspector();
}

function showInspector(card: HTMLElement) {
  closeInspector();

  const name = textOf(card, 'b') || textOf(card, '.field-card-name') || 'Carte';
  const faction = card.dataset.cardFaction || textOf(card, 'i');
  const rules = card.dataset.cardText || textOf(card, 'p') || 'Aucun effet spécial.';
  const footer = textOf(card, 'footer') || `${textOf(card, '.field-card-atk')} ${textOf(card, '.field-card-hp')}`;
  const image = card.querySelector('img') as HTMLImageElement | null;
  const instanceId = card.dataset.instanceId || '';
  const evolvable = card.dataset.evolvable === 'true';
  const evolutionName = card.dataset.evolutionName || '';
  const effectMax = Number(card.dataset.effectMax || 0);
  const effectUses = Number(card.dataset.effectUses || 0);
  const isFieldCard = card.classList.contains('field-card');
  const isEnemy = !!card.closest('.enemy-zone');
  const hook = matchHook();
  const unit = instanceId ? hook?.state?.player?.field?.find((entry: AnyState) => entry.instanceId === instanceId) : null;
  const canAttack = !!unit?.canAttack && unit.stunnedTurns <= 0;

  const panel = document.createElement('div');
  panel.id = INSPECTOR_ID;
  panel.className = 'card-inspector';
  panel.setAttribute('role', 'dialog');
  panel.innerHTML = `
    <button class="card-inspector-close" aria-label="Fermer">×</button>
    <div class="card-inspector-frame">
      ${image ? `<img src="${image.currentSrc || image.src}" alt="${escapeHtml(name)}">` : ''}
      <div class="card-inspector-body">
        <small>${escapeHtml(faction)}</small>
        <h3>${escapeHtml(name)}</h3>
        <div class="card-inspector-stats">${escapeHtml(footer)}</div>
        <div class="card-inspector-rules"><b>EFFET</b><p>${escapeHtml(rules)}</p></div>
        ${evolutionName ? `<div class="card-inspector-evolution"><b>ÉVOLUTION</b><span>${escapeHtml(evolutionName)}</span></div>` : ''}
        ${effectMax > 0 ? `<div class="card-inspector-usage"><b>UTILISATIONS</b><span>${effectUses}/${effectMax}</span></div>` : ''}
        ${isFieldCard && !isEnemy ? `<div class="nexus-unit-actions">
          <button class="nexus-attack-action" ${canAttack ? '' : 'disabled'}>⚔ ATTAQUER</button>
          ${effectMax > 0 ? '<button class="nexus-effect-action">✦ ACTIVER L\'EFFET</button>' : ''}
          ${evolutionName ? `<button class="nexus-evolve-action" ${evolvable ? '' : 'disabled'}>⬆ ÉVOLUER</button>` : ''}
        </div>` : ''}
      </div>
    </div>`;

  panel.querySelector('.card-inspector-close')?.addEventListener('click', closeInspector);
  panel.querySelector('.nexus-attack-action')?.addEventListener('click', () => { closeInspector(); selectForAttack(card); });
  panel.querySelector('.nexus-effect-action')?.addEventListener('click', () => activateEffect(instanceId));
  panel.querySelector('.nexus-evolve-action')?.addEventListener('click', () => evolve(instanceId));
  document.body.appendChild(panel);
}

function showEffectToast(message: string) {
  if (!message) return;
  document.getElementById(EFFECT_TOAST_ID)?.remove();
  const toast = document.createElement('div');
  toast.id = EFFECT_TOAST_ID;
  toast.className = 'effect-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function ensurePhaseBar() {
  const strip = document.querySelector('.turn-strip');
  if (!strip || strip.querySelector('.nexus-phases')) return;
  const phases = document.createElement('div');
  phases.className = 'nexus-phases';
  phases.innerHTML = '<button data-phase="main" class="active">MAIN PHASE</button><button data-phase="battle">BATTLE PHASE</button>';
  phases.addEventListener('click', (event) => {
    const button = (event.target as Element).closest('button') as HTMLButtonElement | null;
    if (!button) return;
    currentPhase = button.dataset.phase === 'battle' ? 'battle' : 'main';
    phases.querySelectorAll('button').forEach((el) => el.classList.toggle('active', el === button));
    clearAttackSelection();
    showEffectToast(currentPhase === 'battle' ? 'BATTLE PHASE' : 'MAIN PHASE');
  });
  strip.appendChild(phases);
}

function animateEnemyDraw() {
  const row = document.querySelector('.enemy-hand-row');
  if (!row) return;
  const count = row.children.length;
  if (previousEnemyHand >= 0 && count > previousEnemyHand) {
    const newest = row.lastElementChild as HTMLElement | null;
    newest?.classList.add('enemy-card-draw');
    showEffectToast("L'adversaire pioche une carte");
    window.setTimeout(() => newest?.classList.remove('enemy-card-draw'), 900);
  }
  previousEnemyHand = count;
}

function scanBattle() {
  const battle = document.querySelector('.battle');
  if (!battle) {
    closeInspector();
    previousEnemyHand = -1;
    return;
  }
  ensurePhaseBar();
  animateEnemyDraw();
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target) return;

  const enemyCard = target.closest('.enemy-zone .field-card') as HTMLElement | null;
  if (enemyCard && selectedAttacker) {
    event.preventDefault();
    event.stopPropagation();
    attackTarget(enemyCard.dataset.instanceId || null);
    return;
  }

  const directAttack = target.closest('.attack-face');
  if (directAttack && selectedAttacker) {
    event.preventDefault();
    event.stopPropagation();
    attackTarget(null);
    return;
  }

  const fieldCard = target.closest('.battle .field-card') as HTMLElement | null;
  if (fieldCard) {
    if (fieldCard.closest('.player-zone')) {
      event.preventDefault();
      event.stopPropagation();
      showInspector(fieldCard);
    }
    return;
  }

  const card = target.closest('.battle .hand .card') as HTMLElement | null;
  if (card && (event.altKey || event.shiftKey)) showInspector(card);

  if (target.closest('.end-turn')) {
    currentPhase = 'main';
    clearAttackSelection();
    window.setTimeout(() => {
      const phases = document.querySelector('.nexus-phases');
      phases?.querySelectorAll('button').forEach((el, i) => el.classList.toggle('active', i === 0));
    }, 0);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeInspector(); clearAttackSelection(); }
});

const battleObserver = new MutationObserver(scanBattle);
battleObserver.observe(document.documentElement, { childList: true, subtree: true });
scanBattle();
