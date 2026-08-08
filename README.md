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

## Configurer Firebase (échanges + connexion Google + sauvegarde cloud)

L'écran **Échanges**, la **connexion Google** (bouton "Se connecter avec Google" au
lancement et dans Profil) et la **sauvegarde cloud** qui va avec ont besoin d'un projet
Firebase. Le jeu reste 100% jouable en solo sans cette configuration — ces écrans
affichent simplement un message d'indisponibilité (ou restent masqués) tant qu'elle manque.

1. Crée un projet sur [console.firebase.google.com](https://console.firebase.google.com/)
   (gratuit sur le plan Spark, largement suffisant pour ce jeu).
2. **Authentication** → onglet *Sign-in method* → active le fournisseur **Anonyme**
   (utilisé par l'écran Échanges) **et** le fournisseur **Google** (pour le bouton de
   connexion et la sauvegarde cloud).
3. **Firestore Database** → crée une base (mode production), puis dans l'onglet *Règles*,
   colle le contenu de [`firestore.rules`](firestore.rules) (déjà écrit et prêt à l'emploi,
   inclut la collection `saves/{uid}` pour la sauvegarde cloud) et publie.
4. **Paramètres du projet** (⚙️) → *Général* → section *Vos applications* → ajoute une
   application **Web** (</>) → copie les valeurs de configuration affichées.
5. En local : copie `.env.example` en `.env.local` (déjà ignoré par git) et renseigne les
   valeurs copiées à l'étape précédente.
6. En production (GitHub Pages + builds Capacitor) : dans les réglages du dépôt GitHub,
   **Settings → Secrets and variables → Actions**, ajoute un secret par variable
   (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
   `VITE_FIREBASE_APP_ID`) — les workflows (`deploy.yml`, `build-android.yml`,
   `build-ios.yml`) les injectent déjà automatiquement au build.

**Sauvegarde cloud** : à la connexion, le jeu récupère la sauvegarde Firestore du compte
si elle existe (et l'applique en écrasant la sauvegarde locale de cet appareil), sinon il
pousse la sauvegarde locale actuelle vers le cloud. Ensuite, toute modification de la
partie (or, cartes, decks, progression…) est repoussée vers Firestore après quelques
secondes d'inactivité. Voir `src/cloudSave.ts` et `src/GoogleAccount.tsx`.

**Limite connue (Échanges)** : v1 fait confiance à chaque client pour appliquer localement
le résultat d'un échange accepté (l'inventaire de cartes n'est pas stocké côté serveur,
seules les offres le sont) — adapté à des échanges entre joueurs qui se connaissent, pas une
garantie anti-triche à 100 %. Un renforcement futur possible : une Cloud Function
transactionnelle qui déplacerait l'inventaire lui-même côté serveur.

## Multijoueur (repli sur bot)

Aucun serveur de matchmaking temps réel n'est branché. Dans l'onglet **Multijoueur**, un
clic sur "Rechercher un adversaire" (Classique) ou "Lancer un duel classé" (Classé) simule
une courte recherche puis retombe systématiquement sur un bot :

- **Classique** : bot d'un niveau d'IA tiré au hasard (novice / vétéran / maître), sans
  impact sur le rang.
- **Classé** : bot dont le niveau d'IA reflète le rang actuel du joueur
  (`aiDifficultyForRating` dans `src/engine/ranked.ts`), et le résultat fait évoluer le
  classement comme un vrai duel classé.

Un vrai serveur de matchmaking pourra remplacer ce repli plus tard sans changer l'écran
Multijoueur ni le moteur de combat.

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
