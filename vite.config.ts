import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le jeu est publié sur GitHub Pages à https://<user>.github.io/Nexus-Card-Game/,
// donc tous les chemins générés (scripts, styles, manifest, icônes) doivent être
// préfixés par ce sous-dossier plutôt que de supposer un déploiement à la racine.
export default defineConfig({
  base: '/Nexus-Card-Game/',
  plugins: [react()],
});
