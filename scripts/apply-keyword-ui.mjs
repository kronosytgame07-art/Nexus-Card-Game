import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[keyword-ui] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[keyword-ui] ' + label);
}

patch(
  'src/App.tsx',
  '<span className="field-card-tags">{card.flying && <em>VOL</em>}{card.ranged && <em>À DISTANCE</em>}{card.blitz && <em>BLITZ</em>}{unit.taunt && <em>PROVOCATION</em>}{unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}</span>',
  '<span className="field-card-tags">{card.flying && <em>VOL</em>}{card.ranged && <em>À DISTANCE</em>}{card.blitz && <em>BLITZ</em>}{card.attackDelayTurns && unit.turnsOnField < card.attackDelayTurns && <em>INERTIE {card.attackDelayTurns - unit.turnsOnField}</em>}{unit.taunt && <em>PROVOCATION</em>}{unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}</span>',
  'inertie visible sur carte terrain'
);

console.log('[keyword-ui] Mots-clés de combat synchronisés.');
