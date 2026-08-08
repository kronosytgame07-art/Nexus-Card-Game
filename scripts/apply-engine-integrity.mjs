import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[engine-integrity] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[engine-integrity] ' + label);
}

patch(
  'src/engine/engine.ts',
  "      const ownedUnitIds = [...new Set(owner.deckList)];\n      const pool = ownedUnitIds\n        .map((id) => getCard(id))\n        .filter((c) => c.level === 1 && c.type === 'unit' && (!effect.target || c.faction === effect.target));\n      const pick = pool[Math.floor(Math.random() * pool.length)];\n      if (pick) {\n        owner.field.push({",
  "      const eligibleDeckIndexes = owner.deck\n        .map((id, index) => ({ id, index, card: getCard(id) }))\n        .filter(({ card }) => card.level === 1 && card.type === 'unit' && (!effect.target || card.faction === effect.target));\n      const chosen = eligibleDeckIndexes[Math.floor(Math.random() * eligibleDeckIndexes.length)];\n      const pick = chosen?.card;\n      if (pick && chosen) {\n        owner.deck.splice(chosen.index, 1);\n        owner.field.push({",
  'invocation spéciale depuis le vrai deck'
);

patch(
  'src/engine/engine.ts',
  "        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name}${pick.blitz ? ' — Blitz !' : ''}.`);",
  "        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name} depuis son deck${pick.blitz ? ' — Blitz !' : ''}.`);",
  'journal invocation spéciale explicite'
);

patch(
  'src/engine/engine.ts',
  "        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name} depuis son deck${pick.blitz ? ' — Blitz !' : ''}.`);\n      } else succeeded = false;\n      break;\n    }\n  }\n  removeDead(state, other(ownerId));",
  "        pushLog(state, `${labelFor(ownerId)} invoque spécialement ${pick.name} depuis son deck${pick.blitz ? ' — Blitz !' : ''}.`);\n      } else succeeded = false;\n      break;\n    }\n    case 'board_wipe': {\n      if (opponent.field.length === 0) { succeeded = false; break; }\n      const destroyed = opponent.field.length;\n      for (const unit of opponent.field) opponent.graveyard.push(unit.cardId);\n      opponent.field = [];\n      pushLog(state, labelFor(ownerId) + ' déclenche un nettoyage de terrain : ' + destroyed + ' unité(s) adverse(s) détruite(s).');\n      break;\n    }\n  }\n  removeDead(state, other(ownerId));",
  'effet nettoyage complet du terrain adverse'
);

patch(
  'src/engine/cards.ts',
  "case'summon':return`Cri de guerre : invoque une unité ${effect.target??''}.`;default:return'Aucun effet spécial.';",
  "case'summon':return`Cri de guerre : invoque une unité ${effect.target??''}.`;case'board_wipe':return'Détruit toutes les unités adverses.';default:return'Aucun effet spécial.';",
  'description nettoyage de terrain'
);

console.log('[engine-integrity] Invocations spéciales et effets de terrain sécurisés.');
