# Nexus Card Arena

Jeu de cartes stratégique dark fantasy (Meute contre Chevalier), en React +
TypeScript + Vite. Déployé en PWA sur GitHub Pages, et packagé en app
native iOS/Android via [Capacitor](https://capacitorjs.com/).

## Développement web

```shell
npm ci
npm run dev        # serveur de dev
npm run build       # build de prod (GitHub Pages, base "/Nexus-Card-Game/")
npm run preview     # sert le build de prod en local
```

Le déploiement sur `https://<user>.github.io/Nexus-Card-Game/` se fait
automatiquement à chaque push sur `main` (voir `.github/workflows/deploy.yml`).

## App mobile (iOS / Android via Capacitor)

Le jeu tourne aussi en app native grâce à Capacitor, qui embarque le même
build web dans une WebView native. Le code source ne change pas — seul le
mode de build et d'empaquetage diffère.

### Builds automatiques (recommandé)

Chaque push sur `main` déclenche deux workflows GitHub Actions qui compilent
l'app pour les deux plateformes et publient le résultat comme artefact
téléchargeable, sans avoir besoin d'installer Xcode ou Android Studio :

- **`build-android.yml`** (runner `ubuntu-latest`, SDK Android déjà installé)
  → produit un `.apk` de debug, installable directement sur un téléphone
  Android (il faut autoriser les sources inconnues dans les réglages du
  téléphone) ou dans un émulateur.
- **`build-ios.yml`** (runner `macos-latest`, Xcode déjà installé) → compile
  pour le simulateur iOS (aucune signature — voir *Limites* ci-dessous) et
  publie l'app `.app` compilée en `.zip`, utilisable dans le Simulateur iOS
  sur un Mac.

Les artefacts sont téléchargeables depuis l'onglet **Actions** du dépôt,
sur l'exécution du workflow correspondante.

### Build local

Nécessite Node 22, et selon la plateforme : Android Studio + SDK Android
(Android), ou un Mac avec Xcode (iOS).

```shell
npm ci
npm run build:capacitor   # build web (base "/") + copie des illustrations + cap sync
npx cap open android      # ouvre le projet dans Android Studio
npx cap open ios          # ouvre le projet dans Xcode (Mac uniquement)
```

`npm run build:capacitor` régénère `dist/` avec la bonne base d'URL pour un
bundle natif (`/` au lieu de `/Nexus-Card-Game/`), copie les illustrations
de cartes (`scripts/copy-card-art.sh`, partagé avec le déploiement web), puis
synchronise `android/` et `ios/` avec ce build.

### Identifiant d'application

`com.nexuscardarena.app` (défini dans `capacitor.config.ts`) — c'est
l'identifiant utilisé sur les deux stores. Il ne doit plus changer une fois
l'app publiée.

### Limites de ce qui est automatisé

- Les builds CI ne sont **pas signés** : il n'y a pas de compte développeur
  Apple (99$/an) ni Google Play (25$ une fois) configuré dans ce dépôt. Ça
  suffit pour tester (APK debug sur un téléphone Android, `.app` dans le
  Simulateur iOS), mais pas pour publier sur les stores.
- Pour publier réellement sur l'App Store / le Play Store, il faut : un
  compte développeur de chaque côté, des certificats de signature
  (configurables comme secrets GitHub Actions pour automatiser la
  signature), des captures d'écran et fiches de présentation pour chaque
  store, et une politique de confidentialité. Aucune de ces étapes ne peut
  être faite automatiquement — elles nécessitent des comptes et des
  décisions qui appartiennent au porteur du projet.
- Les icônes et écrans de démarrage natifs sont générés depuis
  `src/assets/brand/logo-source.webp` via `@capacitor/assets` (déjà fait,
  commité dans `android/` et `ios/`) — à regénérer avec
  `npx capacitor-assets generate --iconBackgroundColor '#050d0d' --iconBackgroundColorDark '#050d0d' --splashBackgroundColor '#050d0d' --splashBackgroundColorDark '#050d0d'`
  si le logo change.
