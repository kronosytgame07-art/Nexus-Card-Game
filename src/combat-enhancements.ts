const INSPECTOR_ID = 'nexus-card-inspector';
const EFFECT_TOAST_ID = 'nexus-effect-toast';

function closeInspector() {
  document.getElementById(INSPECTOR_ID)?.remove();
}

function textOf(root: Element, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? '';
}

function showInspector(card: HTMLElement) {
  closeInspector();

  const name = textOf(card, 'b') || textOf(card, '.field-card-name') || 'Carte';
  const faction = textOf(card, 'i') || textOf(card, '.field-card-faction');
  const rules = textOf(card, 'p') || textOf(card, '.field-card-text') || 'Aucun effet spécial.';
  const footer = textOf(card, 'footer') || textOf(card, '.fu-stats') ||
    `${textOf(card, '.field-card-atk')}  ${textOf(card, '.field-card-hp')}`;
  const tags = Array.from(card.querySelectorAll('.fu-tag, .field-card-tags em'))
    .map((x) => x.textContent?.trim())
    .filter(Boolean);
  const image = card.querySelector('img') as HTMLImageElement | null;
  const evolvable = card.dataset.evolvable === 'true';
  const evolutionName = card.dataset.evolutionName || 'sa forme évoluée';
  const instanceId = card.dataset.instanceId;

  const panel = document.createElement('aside');
  panel.id = INSPECTOR_ID;
  panel.className = 'card-inspector';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `Aperçu de ${name}`);
  panel.innerHTML = `
    <button class="card-inspector-close" aria-label="Fermer">×</button>
    <div class="card-inspector-frame">
      ${image ? `<img src="${image.currentSrc || image.src}" alt="${name}">` : '<div class="card-inspector-placeholder">✦</div>'}
      <div class="card-inspector-body">
        <small>${faction}</small>
        <h3>${name}</h3>
        <div class="card-inspector-stats">${footer}</div>
        <p>${rules}</p>
        ${tags.length ? `<div class="card-inspector-tags">${tags.map((tag) => `<span>${tag}</span>`).join('')}</div>` : ''}
        ${evolvable && instanceId ? `<button class="evolve-action" type="button">ÉVOLUER EN ${evolutionName.toUpperCase()}</button>` : ''}
      </div>
    </div>
  `;

  panel.querySelector('.card-inspector-close')?.addEventListener('click', closeInspector);
  panel.querySelector('.evolve-action')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('nexus:evolve', { detail: instanceId }));
    closeInspector();
  });
  document.body.appendChild(panel);
}

function showEffectToast(message: string) {
  if (!message) return;
  document.getElementById(EFFECT_TOAST_ID)?.remove();

  const toast = document.createElement('div');
  toast.id = EFFECT_TOAST_ID;
  toast.className = 'effect-toast';

  const lower = message.toLowerCase();
  if (lower.includes('warning evolution')) toast.dataset.kind = 'evolution';
  else if (lower.includes('dégât')) toast.dataset.kind = 'damage';
  else if (lower.includes('étourdi')) toast.dataset.kind = 'stun';
  else if (lower.includes('gagne +') || lower.includes('provocation')) toast.dataset.kind = 'buff';
  else if (lower.includes('pioche') || lower.includes('trouve')) toast.dataset.kind = 'draw';
  else if (lower.includes('invoque') || lower.includes('joue')) toast.dataset.kind = 'summon';
  else toast.dataset.kind = 'info';

  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), lower.includes('warning evolution') ? 3200 : 2200);
}

function bindBattleLog(log: Element) {
  if ((log as HTMLElement).dataset.effectBound === '1') return;
  (log as HTMLElement).dataset.effectBound = '1';
  let previous = log.textContent?.trim() ?? '';

  const observer = new MutationObserver(() => {
    const current = log.textContent?.trim() ?? '';
    if (current && current !== previous) {
      previous = current;
      showEffectToast(current);
    }
  });
  observer.observe(log, { childList: true, characterData: true, subtree: true });
}

function scanBattle() {
  document.querySelectorAll('.battle-log').forEach(bindBattleLog);
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target) return;

  const card = target.closest('.battle .card, .battle .field-card') as HTMLElement | null;
  if (!card) return;
  showInspector(card);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeInspector();
});

const battleObserver = new MutationObserver(scanBattle);
battleObserver.observe(document.documentElement, { childList: true, subtree: true });
scanBattle();
