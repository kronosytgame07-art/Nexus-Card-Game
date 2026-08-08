import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[i18n-extra] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[i18n-extra] ' + label);
}

patch(
  'src/i18n.ts',
  "import type { Language } from './store/game';",
  "import type { Language } from './store/game';\nimport { EXTRA_TRANSLATIONS } from './i18n-extra';",
  'import traductions complémentaires'
);

patch(
  'src/i18n.ts',
  '  return UI_TRANSLATIONS[language]?.[key] ?? fr[key] ?? key;',
  '  return EXTRA_TRANSLATIONS[language]?.[key] ?? UI_TRANSLATIONS[language]?.[key] ?? fr[key] ?? key;',
  'priorité traductions complètes'
);

console.log('[i18n-extra] Traductions secondaires complétées.');
