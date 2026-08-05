import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next !== source) writeFileSync(path, next);
}

patch(new URL('../src/App.tsx', import.meta.url), (source) => {
  let next = source;

  if (!next.includes("window.addEventListener('nexus:play-card'")) {
    next = next.replace(
      "  const [reported, setReported] = useState(false);",
      "  const [reported, setReported] = useState(false);\n  const [inspectedHandCard, setInspectedHandCard] = useState<string | null>(null);\n  const [effectHint, setEffectHint] = useState<string>('');"
    );

    next = next.replace(
      "  const restart = () => {",
      "  useEffect(() => {\n    const onPlayCard = (event: Event) => {\n      const cardId = (event as CustomEvent<string>).detail;\n      if (!cardId) return;\n      setMatch((current) => playCard(current, 'player', cardId));\n      setInspectedHandCard(null);\n      setEffectHint('');\n    };\n    window.addEventListener('nexus:play-card', onPlayCard);\n    return () => window.removeEventListener('nexus:play-card', onPlayCard);\n  }, []);\n\n  useEffect(() => {\n    if (match.activePlayer !== 'player' || match.winner) return;\n    const affordable = match.player.hand\n      .map((id) => ALL_CARDS.find((card) => card.id === id))\n      .filter((card): card is CardDef => Boolean(card && card.cost <= match.player.mana));\n    const lethal = affordable.find((card) => card.effect?.kind === 'damage' && match.enemy.field.some((unit) => unit.health <= (card.effect?.value ?? 0)));\n    const protect = affordable.find((card) => card.effect?.kind === 'protect' && match.player.field.some((unit) => unit.health <= Math.ceil(unit.maxHealth / 2)));\n    const draw = affordable.find((card) => (card.effect?.kind === 'draw' || card.effect?.kind === 'search') && match.player.hand.length <= 2);\n    const summon = affordable.find((card) => card.effect?.kind === 'summon' && match.player.field.length < 3);\n    const recommended = lethal || protect || draw || summon;\n    setEffectHint(recommended ? `C'est le moment d'activer ${recommended.name}.` : '');\n  }, [match]);\n\n  const restart = () => {"
    );
  }

  next = next.replace(
    /onClick=\{\(\) => playFromHand\(([^)]+)\)\}/g,
    "onClick={() => { const card = ALL_CARDS.find((entry) => entry.id === $1); if (card?.type === 'spell') setInspectedHandCard($1); else playFromHand($1); }}"
  );

  next = next.replace(
    /onClick=\{\(\) => setMatch\(playCard\(match, 'player', ([^)]+)\)\)\}/g,
    "onClick={() => { const card = ALL_CARDS.find((entry) => entry.id === $1); if (card?.type === 'spell') setInspectedHandCard($1); else setMatch(playCard(match, 'player', $1)); }}"
  );

  if (!next.includes('spell-preview-proxy')) {
    next = next.replace(
      "      {match.winner && (",
      "      {inspectedHandCard && (() => {\n        const card = ALL_CARDS.find((entry) => entry.id === inspectedHandCard);\n        if (!card) return null;\n        return (\n          <button\n            type=\"button\"\n            className=\"card spell-preview-proxy\"\n            data-card-id={card.id}\n            data-hand-card=\"true\"\n            data-effect-text={card.text}\n            data-card-type=\"Sort\"\n            data-card-cost={card.cost}\n            data-card-rarity={card.rarity}\n            onClick={() => {}}\n          >\n            <i>{card.faction}</i>\n            <b>{card.name}</b>\n            <img className=\"card-art\" src={card.image} alt={card.name} />\n            <p>{card.text}</p>\n            <footer><span>{card.cost} ◆</span><span>Sort</span></footer>\n          </button>\n        );\n      })()}\n\n      {effectHint && <div className=\"effect-hint\">💡 {effectHint}</div>}\n\n      {match.winner && ("
    );
  }

  return next;
});

patch(new URL('../src/combat-enhancements.ts', import.meta.url), (source) => {
  let next = source;

  if (!next.includes('handCard')) {
    next = next.replace(
      "  const instanceId = card.dataset.instanceId;",
      "  const instanceId = card.dataset.instanceId;\n  const handCard = card.dataset.handCard === 'true';\n  const cardId = card.dataset.cardId;"
    );

    next = next.replace(
      "        ${evolvable && instanceId ? `<button class=\"evolve-action\" type=\"button\">ÉVOLUER EN ${evolutionName.toUpperCase()}</button>` : ''}",
      "        ${handCard && cardId ? `<button class=\"play-card-action\" type=\"button\">ACTIVER L'EFFET</button>` : ''}\n        ${evolvable && instanceId ? `<button class=\"evolve-action\" type=\"button\">ÉVOLUER EN ${evolutionName.toUpperCase()}</button>` : ''}"
    );

    next = next.replace(
      "  panel.querySelector('.evolve-action')?.addEventListener('click', () => {",
      "  panel.querySelector('.play-card-action')?.addEventListener('click', () => {\n    if (!cardId) return;\n    window.dispatchEvent(new CustomEvent('nexus:play-card', { detail: cardId }));\n    closeInspector();\n  });\n  panel.querySelector('.evolve-action')?.addEventListener('click', () => {"
    );
  }

  next = next.replace(
    "  const card = target.closest('.battle .card, .battle .field-card') as HTMLElement | null;",
    "  const card = target.closest('.battle .card, .battle .field-card, .spell-preview-proxy') as HTMLElement | null;"
  );

  return next;
});

patch(new URL('../src/arena.css', import.meta.url), (source) => {
  if (source.includes('.effect-hint')) return source;
  return source + `\n.spell-preview-proxy{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:61;opacity:0;pointer-events:none;width:140px;height:190px}.effect-hint{position:fixed;left:50%;bottom:250px;transform:translateX(-50%);z-index:65;padding:10px 16px;border:1px solid #ffe08a;border-radius:999px;background:#0b1214ee;color:#ffe08a;font:700 10px \"DM Mono\";box-shadow:0 0 26px #ffc94744;animation:hintPulse 1.8s ease-in-out infinite}.play-card-action{width:100%;margin-top:10px;padding:11px 14px;border:1px solid #ffe08a;border-radius:9px;background:linear-gradient(90deg,#7d5b12,#d9a22e);color:#fff;font-weight:900;text-transform:uppercase}.play-card-action:hover{filter:brightness(1.1)}@keyframes hintPulse{0%,100%{transform:translateX(-50%) scale(1);box-shadow:0 0 18px #ffc94733}50%{transform:translateX(-50%) scale(1.03);box-shadow:0 0 34px #ffc94766}}\n`;
});
