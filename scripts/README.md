## copy-card-art.sh (actif)

Copie les illustrations de cartes (fichiers PNG/JPEG en vrac à la racine du
dépôt) vers un dossier `cards/` de build. Appelé par le déploiement GitHub
Pages (`deploy.yml`) et par `npm run build:capacitor`, pour ne garder la
liste des ~60 fichiers qu'à un seul endroit. Usage :
`bash scripts/copy-card-art.sh dist/cards`.

# Scripts de patch (archivés, non actifs)

Ces scripts (`patch-arena.mjs`, `patch-gameplay.mjs`, `patch-combat-rules.mjs`,
`patch-spell-preview.mjs`) réécrivaient `App.tsx`/`engine.ts`/`types.ts` à
chaque `npm run build` via un hook `prebuild`, sans jamais recommettre le
résultat dans Git. Ça faisait mentir le dépôt sur l'état réel du jeu : le site
déployé contenait ces changements, mais le code source sur GitHub non.

Le hook `prebuild` a été retiré de `package.json` et leur résultat a été
figé directement dans les fichiers sources (commit du 5 août 2026). Ces
scripts sont conservés ici pour référence uniquement — ne pas les relancer,
ils ne correspondent plus à l'état actuel du code et risquent de le casser.
