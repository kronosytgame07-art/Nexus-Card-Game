import fs from 'node:fs';

const path = 'src/styles.css';
let source = fs.readFileSync(path, 'utf8');
const marker = 'NEXUS MOBILE-FIRST TCG UI';
if (!source.includes(marker)) {
  source += `

/* NEXUS MOBILE-FIRST TCG UI */
@media (max-width: 980px), (orientation: landscape) and (max-height: 620px) {
  :root { --mobile-touch: 44px; }
  button, .nav-link, .menu-card, .faction-button, .deck-row, .avatar-choice, .terrain-card button { min-height: var(--mobile-touch); }
  button { touch-action: manipulation; }
  main { padding: 18px 20px 26px; }
  h2 { font-size: clamp(28px, 5vw, 40px); line-height: 1; margin-bottom: 14px; }
  .hint { line-height: 1.45; }
  .primary { min-height: 46px; padding: 12px 18px; margin: 12px 0; border-radius: 12px; font-size: 12px; }
  .menu-card { border-radius: 16px; min-height: 78px; padding: 12px 14px; box-shadow: 0 8px 22px rgba(0,0,0,.28); }
  .menu-card-icon { width: 44px; height: 44px; min-width: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 20px; }
  .menu-card-body { min-width: 0; }
  .menu-card-body b { font-size: 15px; }
  .menu-card-body small { font-size: 8px; letter-spacing: 1.1px; }
  .menu-card-body em { font-size: 10px; line-height: 1.25; }
  .menu-card-arrow { font-size: 18px; opacity: .8; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 10px; margin-top: 14px; }
  .card { height: 210px; border-radius: 12px; }
  .terrain-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .terrain-preview { height: 92px; }
  .profile { gap: 14px; padding: 12px; }
  .profile-avatar { width: 78px; height: 78px; }
  .profile > b { font-size: 38px; }
  input, select { min-height: 44px; font-size: 16px; }
}

@media (max-width: 700px), (orientation: landscape) and (max-height: 520px) {
  .app-sidebar { width: 72px; padding: 8px 5px; gap: 2px; border-right-color: rgba(255,255,255,.12); background: rgba(4,14,16,.96); }
  .nav-link { min-height: 48px; padding: 6px 3px; gap: 1px; font-size: 7px; line-height: 1.05; justify-content: center; }
  .nav-link-icon { font-size: 18px; }
  .nav-link.active { background: linear-gradient(90deg, rgba(76,225,187,.22), rgba(76,225,187,.04)); box-shadow: inset 3px 0 0 #56dab8, inset 0 0 0 1px rgba(86,218,184,.28); }
  main { padding: 12px 14px 18px; }
  .home-hero { padding: 12px 0 20px; min-height: calc(100dvh - 24px); }
  .home-copy > p { max-width: 520px; font-size: 11px; }
  .stats { padding: 10px; gap: 12px; }
  .multiplayer-modes { gap: 10px; margin: 10px 0 16px; }
  .multiplayer-mode { padding: 13px; border-radius: 14px; gap: 7px; }
  .builder { gap: 12px; }
  .deck-row { border-radius: 8px; margin-bottom: 3px; padding: 8px 10px; }
  .trade-card-row { min-height: 42px; padding: 7px 8px; }
  .avatar-grid { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
  .avatar-choice img { width: 54px; height: 54px; }
}

@media (pointer: coarse) {
  .nav-link:hover, .primary:hover, .menu-card:hover, .onboarding-card:hover { transform: none; }
  .nav-link:active, .menu-card:active, .avatar-choice:active, .faction-button:active { filter: brightness(1.16); }
  .card-name-tooltip { opacity: 1; transform: none; }
}
`;
  fs.writeFileSync(path, source);
  console.log('[mobile-ui] Interface tactile mobile améliorée.');
} else {
  console.log('[mobile-ui] Déjà appliqué.');
}
