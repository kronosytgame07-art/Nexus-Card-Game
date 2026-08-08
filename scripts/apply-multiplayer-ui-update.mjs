import fs from 'node:fs';

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { label, from, to } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) { console.warn(`[multiplayer-ui] motif introuvable: ${label}`); continue; }
    source = source.replace(from, to);
    changed = true;
    console.log(`[multiplayer-ui] ${label}`);
  }
  if (changed) fs.writeFileSync(path, source);
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, `\n${content}\n`);
}

patchFile('src/App.tsx', [
  {
    label: 'Importer le système de rangs',
    from: "import { CardDef, Faction, FieldUnit, GameState, SupportCard } from './engine/types';",
    to: "import { CardDef, Faction, FieldUnit, GameState, SupportCard } from './engine/types';\nimport { DEFAULT_RANKED_RATING, RANKED_LADDER, formatRank, rankForRating } from './engine/ranked';",
  },
  {
    label: 'Bouton multijoueur actif sur accueil',
    from: `<button className="menu-card locked" disabled title="Arrive dans une future mise à jour"><span className="menu-card-icon red">👥</span><span className="menu-card-body"><small>BIENTÔT</small><b>Multijoueur</b><em>Affronte d'autres joueurs en direct</em></span><span className="menu-card-lock">🔒</span></button>`,
    to: `<button className="menu-card" onClick={() => go('/multijoueur')}><span className="menu-card-icon red">👥</span><span className="menu-card-body"><small>EN LIGNE</small><b>Multijoueur</b><em>Classique ou Classé</em></span><span className="menu-card-arrow">→</span></button>`,
  },
  {
    label: 'Écran multijoueur classique et classé',
    from: `function Leaderboard() {`,
    to: `function Multiplayer() {
  const currentRating = DEFAULT_RANKED_RATING;
  const rank = rankForRating(currentRating);
  const next = RANKED_LADDER.find((entry) => entry.minRating > currentRating);
  return <section className="multiplayer-page"><h2>Multijoueur</h2><p className="hint">Choisis ton format. La couche de matchmaking temps réel doit encore être reliée au backend ; aucune fausse partie en ligne n'est simulée.</p><div className="multiplayer-modes"><article className="multiplayer-mode"><span className="menu-card-icon teal">⚔</span><h3>Classique</h3><p>Duels sans impact sur le rang. Idéal pour tester un deck hybride, apprendre un nouvel archétype ou jouer entre amis.</p><button className="primary" disabled title="Serveur de matchmaking requis">RECHERCHER UN ADVERSAIRE</button><small>Matchmaking serveur non connecté</small></article><article className="multiplayer-mode ranked"><span className="menu-card-icon gold">✦</span><h3>Classé</h3><p>Les victoires et défaites font évoluer ton statut dans le Nexus.</p><div className="rank-card"><b>{formatRank(rank)}</b><span>{currentRating} points</span>{next && <small>Prochain palier à {next.minRating} points</small>}</div><button className="primary" disabled title="Serveur de matchmaking requis">LANCER UN DUEL CLASSÉ</button><small>Matchmaking classé serveur non connecté</small></article></div><h3>Rangs du Nexus</h3><div className="rank-ladder">{RANKED_LADDER.filter((entry, index, arr) => index === 0 || arr[index - 1].tier !== entry.tier).map((entry) => <div key={entry.tier}><b>{entry.tier}</b><span>{entry.tier === 'Légende du Nexus' ? String(entry.minRating) + '+' : String(entry.minRating) + '–' + String(RANKED_LADDER.filter((r) => r.tier === entry.tier).at(-1)?.maxRating ?? '')}</span></div>)}</div></section>;
}

function Leaderboard() {`,
  },
  {
    label: 'Route multijoueur',
    from: `<Route path="/combat" element={<Combat />} /><Route path="/paramètres"`,
    to: `<Route path="/combat" element={<Combat />} /><Route path="/multijoueur" element={<Multiplayer />} /><Route path="/paramètres"`,
  },
]);

appendOnce('src/styles.css', 'NEXUS MULTIPLAYER MODES', `
/* NEXUS MULTIPLAYER MODES */
.multiplayer-modes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin:18px 0 28px; }
.multiplayer-mode { display:flex; flex-direction:column; gap:10px; padding:20px; border:1px solid #ffffff1c; border-radius:18px; background:linear-gradient(145deg,#0b1719ee,#071012f7); box-shadow:0 18px 40px #0006; }
.multiplayer-mode.ranked { border-color:#e6bd6355; background:linear-gradient(145deg,#211a0cee,#0b1012f7); }
.multiplayer-mode h3,.multiplayer-mode p { margin:0; }
.multiplayer-mode small { color:#80958e; font:10px "DM Mono"; }
.rank-card { display:flex; flex-direction:column; gap:4px; padding:12px; border:1px solid #e6bd6355; border-radius:12px; background:#e6bd630d; }
.rank-card b { color:#ffe19a; }
.rank-card span,.rank-card small { color:#b9c8c2; }
.rank-ladder { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; }
.rank-ladder > div { display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:10px; background:#ffffff08; border:1px solid #ffffff10; }
.rank-ladder b { color:#e9f1ed; font-size:12px; }.rank-ladder span { color:#8da39b; font:10px "DM Mono"; }
@media(max-width:760px){.multiplayer-modes{grid-template-columns:1fr}}
`);

console.log('[multiplayer-ui] Migration terminée.');
