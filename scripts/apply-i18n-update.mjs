import fs from 'node:fs';

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { from, to, label } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[nexus-i18n] Motif introuvable: ${label}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
    console.log(`[nexus-i18n] ${label}`);
  }
  if (changed) fs.writeFileSync(path, source);
}

patchFile('src/App.tsx', [
  {
    label: 'import du moteur i18n',
    from: "import HomeSparkles from './components/HomeSparkles';",
    to: "import HomeSparkles from './components/HomeSparkles';\nimport { t, type UiKey } from './i18n';",
  },
  {
    label: 'helper navigation traduite',
    from: "function Shell({ children }: { children: React.ReactNode }) {\n  const location = useLocation();",
    to: "function navTranslationKey(label: string): UiKey | null {\n  const map: Record<string, UiKey> = { Jouer: 'nav.play', Collection: 'nav.collection', Social: 'nav.social', Boutique: 'nav.shop', Paramètres: 'nav.settings' };\n  return map[label] ?? null;\n}\n\nfunction Shell({ children }: { children: React.ReactNode }) {\n  const location = useLocation();\n  const language = useGame((state) => state.language);",
  },
  {
    label: 'labels de navigation traduits',
    from: "<span className=\"nav-link-icon\">{section.icon}</span>{section.label}",
    to: "<span className=\"nav-link-icon\">{section.icon}</span>{navTranslationKey(section.label) ? t(language, navTranslationKey(section.label)!) : section.label}",
  },
  {
    label: 'sous-onglets collection traduits',
    from: "<Link to=\"/collection\" className={'subtab' + (tab === 'cartes' ? ' active' : '')}>Cartes</Link>\n      <Link to=\"/decks\" className={'subtab' + (tab === 'decks' ? ' active' : '')}>Mes Decks</Link>",
    to: "<Link to=\"/collection\" className={'subtab' + (tab === 'cartes' ? ' active' : '')}>{t(useGame.getState().language, 'common.cards')}</Link>\n      <Link to=\"/decks\" className={'subtab' + (tab === 'decks' ? ' active' : '')}>{t(useGame.getState().language, 'common.decks')}</Link>",
  },
  {
    label: 'sous-onglets social traduits',
    from: "<Link to=\"/profil\" className={'subtab' + (tab === 'profil' ? ' active' : '')}>Profil</Link>\n      <Link to=\"/échanges\" className={'subtab' + (tab === 'echanges' ? ' active' : '')}>Échanges</Link>\n      <Link to=\"/classement\" className={'subtab' + (tab === 'classement' ? ' active' : '')}>Classement</Link>",
    to: "<Link to=\"/profil\" className={'subtab' + (tab === 'profil' ? ' active' : '')}>{t(useGame.getState().language, 'common.profile')}</Link>\n      <Link to=\"/échanges\" className={'subtab' + (tab === 'echanges' ? ' active' : '')}>{t(useGame.getState().language, 'common.trades')}</Link>\n      <Link to=\"/classement\" className={'subtab' + (tab === 'classement' ? ' active' : '')}>{t(useGame.getState().language, 'common.ranking')}</Link>",
  },
  {
    label: 'titre paramètres traduit',
    from: "  return <section><h2>Options</h2><div className=\"options-grid settings-grid\">",
    to: "  return <section><h2>{t(s.language, 'settings.title')}</h2><div className=\"options-grid settings-grid\">",
  },
  {
    label: 'sections paramètres principales traduites',
    from: "<span className=\"menu-card-icon teal\">🔊</span><b>Audio</b>",
    to: "<span className=\"menu-card-icon teal\">🔊</span><b>{t(s.language, 'settings.audio')}</b>",
  },
  {
    label: 'section affichage traduite',
    from: "<span className=\"menu-card-icon violet\">🖥</span><b>Affichage & performance</b>",
    to: "<span className=\"menu-card-icon violet\">🖥</span><b>{t(s.language, 'settings.display')}</b>",
  },
  {
    label: 'section langue traduite',
    from: "<span className=\"menu-card-icon gold\">🌐</span><b>Langue</b>",
    to: "<span className=\"menu-card-icon gold\">🌐</span><b>{t(s.language, 'settings.language')}</b>",
  },
  {
    label: 'sélecteur langue réellement annoncé',
    from: "<div className=\"option-row\"><div className=\"option-row-text\"><b>Langue de l'interface</b></div><select value={s.language}",
    to: "<div className=\"option-row\"><div className=\"option-row-text\"><b>{t(s.language, 'settings.interfaceLanguage')}</b></div><select value={s.language}",
  },
  {
    label: 'suppression du placeholder traduction future',
    from: "      <p className=\"hint\">La traduction complète de l'interface arrive dans une prochaine passe — la langue choisie est déjà mémorisée.</p>",
    to: "      <p className=\"hint\">Interface multilingue active — les écrans principaux utilisent immédiatement la langue choisie.</p>",
  },
  {
    label: 'titre boutique traduit',
    from: "      <h2>Boutique</h2>",
    to: "      <h2>{t(s.language, 'shop.title')}</h2>",
  },
  {
    label: 'titres avatars et terrains traduits',
    from: "      <h3>Images de profil</h3>",
    to: "      <h3>{t(s.language, 'shop.avatars')}</h3>",
  },
  {
    label: 'titre terrains traduit',
    from: "      <h3>Terrains</h3>",
    to: "      <h3>{t(s.language, 'shop.terrains')}</h3>",
  },
  {
    label: 'lang HTML synchronisée',
    from: "    root.dataset.uiScale = s.interfaceScale;",
    to: "    root.dataset.uiScale = s.interfaceScale;\n    root.lang = s.language === 'zh' ? 'zh-CN' : s.language;",
  },
]);

console.log('[nexus-i18n] Interface principale branchée.');
