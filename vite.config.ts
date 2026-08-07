import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le jeu est publié sur GitHub Pages à https://<user>.github.io/Nexus-Card-Game/,
// donc tous les chemins générés (scripts, styles, manifest, icônes) doivent être
// préfixés par ce sous-dossier plutôt que de supposer un déploiement à la racine.
// L'app Capacitor (iOS/Android), elle, sert les fichiers depuis la racine du
// bundle natif — CAPACITOR_BUILD=1 (posé par `npm run build:capacitor`) bascule
// donc la base à "/" sans toucher au build GitHub Pages par défaut.
export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? '/' : '/Nexus-Card-Game/',
  plugins: [react()],
});
