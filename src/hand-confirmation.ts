const HAND_DIALOG_ID = 'nexus-hand-confirmation';
const bypassCards = new WeakSet<HTMLElement>();

function closeHandDialog() {
  document.getElementById(HAND_DIALOG_ID)?.remove();
}

function cardText(card: HTMLElement, selector: string) {
  return card.querySelector(selector)?.textContent?.trim() ?? '';
}

function actionLabel(card: HTMLElement) {
  return card.dataset.cardType === 'unit' ? 'INVOQUER' : 'ACTIVER';
}

function openHandDialog(card: HTMLElement) {
  closeHandDialog();
  const name = card.dataset.cardName || cardText(card, 'b') || 'Carte';
  const rules = card.dataset.effectText || cardText(card, 'p') || 'Aucun texte disponible.';
  const image = card.querySelector('img') as HTMLImageElement | null;
  const action = actionLabel(card);

  const overlay = document.createElement('div');
  overlay.id = HAND_DIALOG_ID;
  overlay.className = 'hand-confirmation-overlay';
  overlay.innerHTML = `
    <div class="hand-confirmation" role="dialog" aria-modal="true" aria-label="Aperçu de ${name.replace(/"/g, '&quot;')}">
      <button class="hand-confirmation-close" type="button" aria-label="Fermer">×</button>
      <div class="hand-confirmation-preview">
        ${image ? `<img src="${image.currentSrc || image.src}" alt="">` : ''}
      </div>
      <div class="hand-confirmation-info">
        <small>APERÇU DE LA CARTE</small>
        <h3>${name}</h3>
        <p>${rules}</p>
        <div class="hand-confirmation-actions">
          <button class="secondary hand-cancel" type="button">ANNULER</button>
          <button class="primary hand-play" type="button">${action}</button>
        </div>
      </div>
    </div>`;

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || (event.target as Element).closest('.hand-confirmation-close, .hand-cancel')) closeHandDialog();
  });
  overlay.querySelector('.hand-play')?.addEventListener('click', () => {
    bypassCards.add(card);
    closeHandDialog();
    card.click();
  });
  document.body.appendChild(overlay);
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  const card = target?.closest('.battle .hand.open .card') as HTMLElement | null;
  if (!card) return;
  if (bypassCards.has(card)) {
    bypassCards.delete(card);
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openHandDialog(card);
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeHandDialog();
});
