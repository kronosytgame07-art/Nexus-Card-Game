let currentPhase: 'main' | 'battle' = 'main';
let previousEnemyHand = -1;

function syncPhaseButtons() {
  const phases = document.querySelector('.nexus-phases');
  if (!phases) return;
  phases.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const phase = button.dataset.phase === 'battle' ? 'battle' : 'main';
    button.classList.toggle('active', phase === currentPhase);
  });
  document.body.dataset.nexusPhase = currentPhase;
}

function setPhase(phase: 'main' | 'battle') {
  currentPhase = phase;
  syncPhaseButtons();
  document.querySelectorAll('.field-card.nexus-attacker').forEach((card) => card.classList.remove('nexus-attacker'));
  document.body.classList.remove('nexus-targeting');
}

function syncAttackControls() {
  const inspector = document.querySelector('#nexus-card-inspector');
  if (!inspector) return;
  inspector.querySelectorAll<HTMLElement>('.nexus-attack-action').forEach((button) => {
    button.hidden = currentPhase !== 'battle';
    button.setAttribute('aria-hidden', currentPhase === 'battle' ? 'false' : 'true');
  });
}

function syncEnemyHand() {
  const row = document.querySelector<HTMLElement>('.enemy-hand-row');
  if (!row) {
    previousEnemyHand = -1;
    return;
  }
  const count = row.children.length;
  row.dataset.count = String(count);
  if (previousEnemyHand >= 0 && count > previousEnemyHand) {
    const newest = row.lastElementChild as HTMLElement | null;
    newest?.classList.add('enemy-card-draw');
    window.setTimeout(() => newest?.classList.remove('enemy-card-draw'), 900);
  }
  previousEnemyHand = count;
}

function scanDuel() {
  if (!document.querySelector('.battle')) return;
  syncPhaseButtons();
  syncAttackControls();
  syncEnemyHand();
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target) return;

  const phaseButton = target.closest('.nexus-phases button') as HTMLButtonElement | null;
  if (phaseButton) {
    setPhase(phaseButton.dataset.phase === 'battle' ? 'battle' : 'main');
    return;
  }

  if (target.closest('.end-turn')) {
    setPhase('main');
    return;
  }

  const attackButton = target.closest('.nexus-attack-action');
  if (attackButton && currentPhase !== 'battle') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}, true);

const observer = new MutationObserver(scanDuel);
observer.observe(document.documentElement, { childList: true, subtree: true });
scanDuel();
