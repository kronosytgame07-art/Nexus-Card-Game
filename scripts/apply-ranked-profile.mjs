import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[ranked-profile] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[ranked-profile] ' + label);
}

patch(
  'src/App.tsx',
  "function Profile() {\n  const s = useGame();\n  const go = useNavigate();",
  "function Profile() {\n  const s = useGame();\n  const rankedProfile = rankForRating(s.rankedRating ?? DEFAULT_RANKED_RATING);\n  const go = useNavigate();",
  'rang calculé dans profil'
);

patch(
  'src/App.tsx',
  '<p>Niveau {s.level} · {s.wins} victoires · {s.losses} défaites</p><div className="xp-row">',
  '<p>Niveau {s.level} · {s.wins} victoires · {s.losses} défaites</p><p className="profile-rank">✦ {formatRank(rankedProfile)} · {s.rankedRating ?? 0} pts · {s.rankedWins ?? 0}V/{s.rankedLosses ?? 0}D</p><div className="xp-row">',
  'rang visible dans profil'
);

patch(
  'src/App.tsx',
  "  const winRate = total > 0 ? Math.round((s.wins / total) * 100) : 0;\n  return <section><h2>Classement</h2>",
  "  const winRate = total > 0 ? Math.round((s.wins / total) * 100) : 0;\n  const ranked = rankForRating(s.rankedRating ?? DEFAULT_RANKED_RATING);\n  return <section><h2>Classement</h2>",
  'rang calculé dans classement'
);

patch(
  'src/App.tsx',
  '<p className="hint">Taux de victoire : {winRate}%</p></article></div></section>;',
  '<p className="hint">Taux de victoire : {winRate}%</p><p className="profile-rank">Classé : {formatRank(ranked)} · {s.rankedRating ?? 0} points</p></article></div></section>;',
  'rang visible dans classement'
);

console.log('[ranked-profile] Rang affiché partout.');
