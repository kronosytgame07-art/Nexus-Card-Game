import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[ranked] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[ranked] ' + label);
}

patch(
  'src/store/game.ts',
  "import { CardDef, Faction, GameState, Rarity } from '../engine/types';",
  "import { CardDef, Faction, GameState, Rarity } from '../engine/types';\nimport { applyRankedResult } from '../engine/ranked';",
  'import progression classée'
);

patch(
  'src/store/game.ts',
  '  losses: number;\n  level: number;',
  '  losses: number;\n  rankedRating: number;\n  rankedWins: number;\n  rankedLosses: number;\n  level: number;',
  'état classé persistant'
);

patch(
  'src/store/game.ts',
  '  record: (win: boolean) => void;\n  addGold:',
  '  record: (win: boolean) => void;\n  recordRanked: (win: boolean) => void;\n  addGold:',
  'action résultat classé'
);

patch(
  'src/store/game.ts',
  '      losses: 0,\n      level: 1,',
  '      losses: 0,\n      rankedRating: 0,\n      rankedWins: 0,\n      rankedLosses: 0,\n      level: 1,',
  'valeurs classées initiales'
);

patch(
  'src/store/game.ts',
  '      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),',
  "      recordRanked: (win) =>\n        set((s) => ({\n          rankedRating: applyRankedResult(s.rankedRating ?? 0, win),\n          rankedWins: (s.rankedWins ?? 0) + (win ? 1 : 0),\n          rankedLosses: (s.rankedLosses ?? 0) + (win ? 0 : 1),\n        })),\n      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),",
  'enregistrement résultat classé'
);

patch(
  'src/store/game.ts',
  '          losses: 0,\n          level: 1,',
  '          losses: 0,\n          rankedRating: 0,\n          rankedWins: 0,\n          rankedLosses: 0,\n          level: 1,',
  'reset progression classée'
);

patch(
  'src/App.tsx',
  '  const currentRating = DEFAULT_RANKED_RATING;\n  const rank = rankForRating(currentRating);',
  '  const currentRating = useGame((state) => state.rankedRating ?? DEFAULT_RANKED_RATING);\n  const rankedWins = useGame((state) => state.rankedWins ?? 0);\n  const rankedLosses = useGame((state) => state.rankedLosses ?? 0);\n  const rank = rankForRating(currentRating);',
  'écran classé relié au store'
);

patch(
  'src/App.tsx',
  '<div className="rank-card"><b>{formatRank(rank)}</b><span>{currentRating} points</span>{next && <small>Prochain palier à {next.minRating} points</small>}</div>',
  '<div className="rank-card"><b>{formatRank(rank)}</b><span>{currentRating} points · {rankedWins}V / {rankedLosses}D</span>{next && <small>Prochain palier à {next.minRating} points</small>}</div>',
  'statistiques classées visibles'
);

console.log('[ranked] Progression classée persistante prête.');
