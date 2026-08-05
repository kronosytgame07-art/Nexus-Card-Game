const INSPECTOR_ID = 'nexus-card-inspector';
const EFFECT_TOAST_ID = 'nexus-effect-toast';

function closeInspector() {
  document.getElementById(INSPECTOR_ID)?.remove();
}

function textOf(root: Element, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
}

function showInspector(card: HTMLElement) {
  closeInspector();

  const name = textOf(card, 'b') || textOf(card, '.field-card-name') || 'Carte';
  const faction = card.dataset.cardFaction || textOf(card, 'i') || textOf(card, '.field-card-faction');
  const rules = card.dataset.cardText || textOf(card, 'p') || textOf(card, '.field-card-text') || 'Aucun effet spécial.';
  const footer = textOf(card, 'footer') || textOf(card, '.fu-stats') ||
    `${textOf(card, '.field-card-atk')}  ${textOf(card, '.field-card-hp')}`;
  const tags = Array.from(card.querySelectorAll('.fu-tag, .field-card-tags em'))
    .map((x) => x.textContent?.trim())
    .filter(Boolean) as string[];
  const image = card.querySelector('img') as HTMLImageElement | null;
  const evolvable = card.dataset.evolvable === 'true';
  const evolutionName = card.dataset.evolutionName || '';
  const instanceId = card.dataset.instanceId;
  const waitTurns = Number(card.dataset.waitTurns || 0);
  const turnsOnField = Number(card.dataset.turnsOnField || 0);
  const cost = card.dataset.cardCost;
  const rarity = card.dataset.cardRarity;
  const effectUses = Number(card.dataset.effectUses || 0);
  const effectMax = Number(card.dataset.effectMax || 0);
  const hasEffect = card.dataset.hasEffect === 'true' || rules !== 'Aucun effet spécial.';

  const evolutionInfo = evolutionName
    ? `<div class="card-inspector-evolution"><b>ÉVOLUTION</b><span>${escapeHtml(evolutionName)}</span><small>${evolvable ? 'Prête maintenant' : `Disponible après ${waitTurns} tours sur le terrain · progression ${Math.min(turnsOnField, waitTurns)}/${waitTurns}`}</small></div>`
    : '<div class="card-inspector-evolution muted"><b>ÉVOLUTION</b><span>Aucune évolution</span></div>';

  const activationInfo = effectMax > 0
    ? `<div class="card-inspector-usage"><b>ACTIVATION</b><span>${effectUses}/${effectMax} utilisée(s) ce tour</span></div>`
    : hasEffect
      ? '<div class="card-inspector-usage"><b>DÉCLENCHEMENT</b><span>Automatique selon la condition de la carte</span></div>'
      : '';

  const panel = document.createElement('div');
  panel.id = INSPECTOR_ID;
  panel.className = 'card-inspector';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', `Aperçu de ${name}`);
  panel.innerHTML = `
    <button class="card-inspector-close" aria-label="Fermer">×</button>
    <div class="card-inspector-frame">
      ${image ? `<img src="${image.currentSrc || image.src}" alt="${escapeHtml(name)}">` : '<div class="card-inspector-placeholder">✦</div>'}
      <div class="card-inspector-body">
        <small>${escapeHtml(faction)}${rarity ? ` · ${escapeHtml(rarity)}` : ''}${cost ? ` · Coût ${escapeHtml(cost)}` : ''}</small>
        <h3>${escapeHtml(name)}</h3>
        <div class="card-inspector-stats">${footer}</div>
        <div class="card-inspector-rules"><b>EFFET</b><p>${escapeHtml(rules)}</p></div>
        ${activationInfo}
        ${evolutionInfo}
        ${tags.length ? `<div class="card-inspector-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        ${evolvable && instanceId ? `<button class="evolve-action" type="button">ÉVOLUER EN ${escapeHtml(evolutionName.toUpperCase())}</button>` : ''}
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
  const battle = document.querySelector('.battle');
  if (!battle) {
    closeInspector();
    return;
  }
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
