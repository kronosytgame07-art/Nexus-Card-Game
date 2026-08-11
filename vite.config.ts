import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le jeu est publié sur GitHub Pages à https://<user>.github.io/Nexus-Card-Game/,
// donc tous les chemins générés (scripts, styles, manifest, icônes) doivent être
// préfixés par ce sous-dossier plutôt que de supposer un déploiement à la racine.
// L'app Capacitor (iOS/Android), elle, sert les fichiers depuis la racine du
// bundle natif — CAPACITOR_BUILD=1 (posé par `npm run build:capacitor`) bascule
// donc la base à "/" sans toucher au build GitHub Pages par défaut.
// itch.io NE sert PAS le zip uploadé à la racine de son domaine : le contenu
// est extrait sous un sous-dossier généré (ex: /html/1234567/nom-du-jeu/), qui
// change à chaque upload. Des chemins absolus ("/assets/...") pointeraient donc
// vers la racine du CDN itch.zone au lieu du bon sous-dossier → tout renvoie
// 404 et le jeu ne démarre jamais. ITCH_BUILD=1 (posé par `npm run build:itch`)
// utilise donc une base RELATIVE ("./"), qui se résout correctement quel que
// soit le sous-dossier réel. React Router bascule alors sur HashRouter (voir
// main.tsx) puisque son basename a besoin d'un chemin absolu connu à l'avance,
// ce qu'on n'a justement pas ici. Sort dans dist-itch/ pour ne jamais mélanger
// les deux builds.
export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? '/' : process.env.ITCH_BUILD ? './' : '/Nexus-Card-Game/',
  plugins: [react()],
  define: {
    __USE_HASH_ROUTER__: JSON.stringify(Boolean(process.env.ITCH_BUILD)),
  },
  build: process.env.ITCH_BUILD ? { outDir: 'dist-itch' } : undefined,
});
