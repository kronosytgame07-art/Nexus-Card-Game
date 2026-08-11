import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le jeu est publié sur GitHub Pages à https://<user>.github.io/Nexus-Card-Game/,
// donc tous les chemins générés (scripts, styles, manifest, icônes) doivent être
// préfixés par ce sous-dossier plutôt que de supposer un déploiement à la racine.
// L'app Capacitor (iOS/Android), elle, sert les fichiers depuis la racine du
// bundle natif — CAPACITOR_BUILD=1 (posé par `npm run build:capacitor`) bascule
// donc la base à "/" sans toucher au build GitHub Pages par défaut.
// itch.io sert le contenu du zip uploadé à la racine de son propre chemin de
// diffusion dédié (comme l'app Capacitor sert depuis la racine du bundle
// natif) : ITCH_BUILD=1 (posé par `npm run build:itch`) bascule donc la base
// à "/" comme pour Capacitor — jamais "./" (chemin relatif), qui casse le
// basename de React Router (qui a besoin d'un chemin absolu, pas relatif,
// pour faire correspondre l'URL courante à ses routes). Sort dans dist-itch/
// pour ne jamais mélanger les deux builds.
export default defineConfig({
  base: process.env.CAPACITOR_BUILD || process.env.ITCH_BUILD ? '/' : '/Nexus-Card-Game/',
  plugins: [react()],
  build: process.env.ITCH_BUILD ? { outDir: 'dist-itch' } : undefined,
});
