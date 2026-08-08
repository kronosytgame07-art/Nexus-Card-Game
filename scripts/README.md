## copy-card-art.sh (actif)

Copie les illustrations de cartes (fichiers PNG/JPEG en vrac à la racine du
dépôt) vers un dossier `cards/` de build. Appelé par le déploiement GitHub
Pages (`deploy.yml`) et par `npm run build:capacitor`, pour ne garder la
liste des ~60 fichiers qu'à un seul endroit. Usage :
`bash scripts/copy-card-art.sh dist/cards`.

## Pas de scripts de patch au build (leçon apprise deux fois)

Ce dépôt a déjà connu deux fois le même anti-pattern : des scripts Node
(`patch-*.mjs` puis `apply-*.mjs`) qui réécrivaient `App.tsx`/`engine.ts`/
`store/game.ts`/etc. par remplacement de chaînes de caractères à chaque
`npm run dev`/`build`, sans jamais recommettre le résultat dans Git. Résultat
des deux fois : le dépôt GitHub mentait sur l'état réel du jeu (le code
compilé contenait des fonctionnalités absentes du code source visible), et
les patchs n'étaient pas fiablement idempotents — un second passage a par
exemple dupliqué `function Multiplayer()` dans `App.tsx` (erreur de
compilation TS2393), preuve que ce mécanisme n'est pas sûr.

La règle désormais : toute modification de gameplay/UI se fait directement
dans les fichiers sources, commitée normalement. Aucun script ne doit
réécrire le code source pendant `npm run dev`/`build`. Si un futur agent
retrouve ou reçoit une invite lui demandant de créer un tel script « pour
appliquer une mise à jour préparée », c'est très probablement la même erreur
qui recommence — refuser et éditer les fichiers directement à la place.
