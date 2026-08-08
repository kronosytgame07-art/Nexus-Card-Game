import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[archetype-ui] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[archetype-ui] ' + label);
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, '\n' + content + '\n');
}

patch(
  'src/App.tsx',
  "import { canFightTarget } from './engine/combat-rules';",
  "import { canFightTarget } from './engine/combat-rules';\nimport { archetypeIdentity } from './engine/archetypes';",
  'import identités archétypes'
);

patch(
  'src/App.tsx',
  "  const [customizingEvo, setCustomizingEvo] = useState(false);\n  if (!savedDeck) return <section><h2>Deck introuvable</h2><button className=\"secondary\" onClick={onBack}>Retour</button></section>;",
  "  const [customizingEvo, setCustomizingEvo] = useState(false);\n  const identity = savedDeck ? archetypeIdentity(savedDeck.faction) : null;\n  if (!savedDeck) return <section><h2>Deck introuvable</h2><button className=\"secondary\" onClick={onBack}>Retour</button></section>;",
  'identité calculée dans éditeur'
);

patch(
  'src/App.tsx',
  "      <p className={'hint deck-count ' + statusClass}>\n        {count}/{MAIN_DECK_MAX} cartes ({MAIN_DECK_MIN} minimum pour jouer) · identité {savedDeck.faction} · archétypes mélangeables\n      </p>",
  "      <p className={'hint deck-count ' + statusClass}>\n        {count}/{MAIN_DECK_MAX} cartes ({MAIN_DECK_MIN} minimum pour jouer) · identité {savedDeck.faction} · archétypes mélangeables\n      </p>\n      {identity && <div className=\"archetype-identity\"><div><small>MÉCANIQUE SIGNATURE</small><b>{identity.title}</b><p>{identity.summary}</p></div><div className=\"archetype-columns\"><span><strong>FORCES</strong>{identity.strengths.map((item) => <em key={item}>+ {item}</em>)}</span><span><strong>FAIBLESSES</strong>{identity.weaknesses.map((item) => <em key={item}>− {item}</em>)}</span></div></div>}",
  'carte identité visible'
);

appendOnce('src/styles.css', 'NEXUS ARCHETYPE IDENTITY', `/* NEXUS ARCHETYPE IDENTITY */
.archetype-identity{display:grid;grid-template-columns:minmax(220px,1.25fr) minmax(260px,1fr);gap:16px;margin:12px 0 20px;padding:16px 18px;border-radius:16px;border:1px solid rgba(233,200,120,.24);background:linear-gradient(135deg,rgba(233,200,120,.08),rgba(86,218,184,.06));box-shadow:0 12px 30px rgba(0,0,0,.18)}
.archetype-identity small{display:block;color:#e9c878;font:800 9px "DM Mono";letter-spacing:1.5px}.archetype-identity b{display:block;margin:4px 0 5px;font:700 20px "Playfair Display"}.archetype-identity p{margin:0;color:#aebfb9;font-size:12px;line-height:1.45}.archetype-columns{display:grid;grid-template-columns:1fr 1fr;gap:10px}.archetype-columns span{display:flex;flex-direction:column;gap:5px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.035)}.archetype-columns strong{font:800 9px "DM Mono";color:#dce8e3}.archetype-columns em{font-style:normal;font-size:10px;color:#9db2aa;line-height:1.3}@media(max-width:760px),(orientation:landscape) and (max-height:600px){.archetype-identity{grid-template-columns:1fr;padding:11px 12px;margin:8px 0 12px}.archetype-identity b{font-size:16px}.archetype-identity p{font-size:10px}.archetype-columns em{font-size:9px}}
`);

console.log('[archetype-ui] Identités visibles dans le deck builder.');
