import type { StoryDuel } from './types';

const panel = (name: string) => `${import.meta.env.BASE_URL}story/chapter-1/${name}.png`;
const world = (name: 'ranked-hall' | 'collection-archive') => `${import.meta.env.BASE_URL}backgrounds/${name}.png`;

/**
 * Campagne narrative principale. Le nom historique du fichier est conservé pour
 * éviter de casser les imports existants, mais la liste couvre désormais les
 * premiers grands arcs d'Elyndra, jusqu'au réveil draconique.
 */
export const CHAPTER_ONE: StoryDuel[] = [
  {
    id: 0,
    opponent: 'lyra',
    faction: 'Meute',
    title: 'Chapitre I — Le fragment de la forêt',
    rewardCodex: ['nexus', 'meute', 'lyra'],
    lines: [
      { speaker: 'narrator', text: 'Dans la forêt d’Elyndra, un fragment bleu pulse près de ta main.', panel: panel('scene-01-nexus-fragment'), speakerSide: 'center', emotion: 'Un éclat dans la nuit' },
      { speaker: 'lyra', text: 'Retire ta main de cette pierre. Qui t’a envoyé ?', panel: panel('scene-02-lyra-warning'), speakerSide: 'left', emotion: 'Méfiance', choices: [
        { id: 'sarcastic', text: 'J’allais justement te poser la même question.', tone: 'sarcastic', affinity: { lyra: 1 } },
        { id: 'lost', text: 'Personne. Je ne sais même pas où je suis.', tone: 'pragmatic' },
        { id: 'calm', text: 'Tu pourrais commencer par baisser ton arme.', tone: 'heroic' },
      ] },
      { speaker: 'lyra', text: 'Alors montre-moi ce que ce fragment t’a appris.', panel: panel('scene-03-lyra-challenge'), speakerSide: 'left', emotion: 'Défi' },
    ],
  },
  {
    id: 1,
    opponent: 'kael',
    faction: 'Chevalier',
    title: 'Chapitre I — L’épreuve de Valdoren',
    rewardCodex: ['valdoren', 'kael'],
    lines: [
      { speaker: 'kael', text: 'Croc-de-Lune affirme que tu peux manipuler une Évosphère.', panel: panel('scene-04-kael-interrogation'), speakerSide: 'right', emotion: 'Interrogatoire' },
      { speaker: 'lyra', text: 'Je n’ai pas dit que je comprenais comment.', panel: panel('scene-05-lyra-doubt'), speakerSide: 'left', emotion: 'Scepticisme' },
      { speaker: 'kael', text: 'Dans ce cas, prouvons ce que tu es.', panel: panel('scene-06-kael-challenge'), speakerSide: 'right', emotion: 'Résolution' },
    ],
  },
  {
    id: 2,
    opponent: 'gribz',
    faction: 'Gobelin',
    title: 'Chapitre I — Les archives éventrées',
    rewardCodex: ['gobelins', 'fracture', 'gribz'],
    lines: [
      { speaker: 'gribz', text: 'PERSONNE NE BOUGE ! … C’était pas cette salle.', panel: panel('scene-07-gribz-wrong-room'), speakerSide: 'left', emotion: 'Entrée explosive' },
      { speaker: 'kael', text: 'Vous avez fait exploser les Archives.', panel: panel('scene-08-kael-accuses'), speakerSide: 'right', emotion: 'Incrédulité' },
      { speaker: 'gribz', text: 'Techniquement, elles étaient déjà très archivées.', panel: panel('scene-09-gribz-shrug'), speakerSide: 'left', emotion: 'Aucun remords' },
    ],
  },
  {
    id: 3,
    opponent: 'rakh',
    faction: 'Orc',
    title: 'Chapitre II — Le Sang et la Cendre',
    rewardCodex: ['orcs', 'rakh', 'terres-cendres'],
    lines: [
      { speaker: 'narrator', text: 'Les signaux du Nexus convergent vers les Terres de Cendre. Des tambours répondent à votre arrivée.', panel: world('ranked-hall'), speakerSide: 'center', emotion: 'Frontière orque' },
      { speaker: 'rakh', text: 'Vous entrez armés sur mes terres et vous appelez cela une enquête ?', panel: world('ranked-hall'), speakerSide: 'right', emotion: 'Autorité calme', choices: [
        { id: 'rakh-honor', text: 'Je suis venu chercher la vérité, pas ton territoire.', tone: 'heroic', affinity: { rakh: 1 } },
        { id: 'rakh-joke', text: 'Gribz avait dit qu’il connaissait un raccourci.', tone: 'sarcastic' },
        { id: 'rakh-proof', text: 'Ton clan possède un fragment qui émet le même signal que le nôtre.', tone: 'pragmatic', affinity: { rakh: 1 } },
      ] },
      { speaker: 'rakh', text: 'Alors gagne le droit de poser tes questions. Chez nous, une parole vaut ce que vaut celui qui la porte.', panel: world('ranked-hall'), speakerSide: 'right', emotion: 'Défi rituel' },
    ],
  },
  {
    id: 4,
    opponent: 'vaeloryx',
    faction: 'Dragon',
    title: 'Chapitre III — L’Œil dans la montagne',
    rewardCodex: ['dragons', 'vaeloryx', 'lies'],
    lines: [
      { speaker: 'narrator', text: 'Sous la montagne, le signal devient une voix. Une présence ancienne ouvre les yeux avant même que vous n’entriez.', panel: panel('scene-01-nexus-fragment'), speakerSide: 'center', emotion: 'Quelque chose se réveille' },
      { speaker: 'vaeloryx', text: 'Un Lié. Après tout ce temps… et vous ignorez encore ce que ce mot signifie.', panel: panel('scene-01-nexus-fragment'), speakerSide: 'right', emotion: 'Reconnaissance' },
      { speaker: 'kael', text: 'Tu étais vivant pendant la Fracture.', panel: world('collection-archive'), speakerSide: 'left', emotion: 'Certitude brisée' },
      { speaker: 'vaeloryx', text: 'J’étais là quand vos royaumes ont choisi le mensonge. Montre-moi si toi aussi tu choisis la peur.', panel: world('collection-archive'), speakerSide: 'right', emotion: 'Épreuve ancestrale', choices: [
        { id: 'dragon-courage', text: 'Alors montre-moi ce que l’Histoire a effacé.', tone: 'heroic', affinity: { vaeloryx: 1 } },
        { id: 'dragon-sarcasm', text: 'Tu pouvais commencer par “bonjour”.', tone: 'sarcastic' },
        { id: 'dragon-facts', text: 'Je veux des faits. Pas une autre légende.', tone: 'pragmatic', affinity: { vaeloryx: 1 } },
      ] },
    ],
  },
  {
    id: 5,
    opponent: 'morvane',
    faction: 'Squelette',
    title: 'Chapitre IV — Le Tombeau sans fin',
    rewardCodex: ['squelettes', 'morvane', 'memoire-des-morts'],
    lines: [
      { speaker: 'narrator', text: 'Le fragment de Vaeloryx réveille sous Valdoren une nécropole absente de toutes les cartes du royaume.', panel: world('collection-archive'), speakerSide: 'center', emotion: 'Une histoire enterrée' },
      { speaker: 'morvane', text: 'Ne nous appelez pas monstres. Nous sommes les noms que vos archives ont supprimés.', panel: world('collection-archive'), speakerSide: 'right', emotion: 'Colère froide' },
      { speaker: 'lyra', text: 'Le Nexus ne les ramène pas à la vie. Il refuse simplement de les oublier.', panel: panel('scene-05-lyra-doubt'), speakerSide: 'left', emotion: 'Compréhension' },
      { speaker: 'morvane', text: 'Lié, si tu veux entendre les morts, prouve d’abord que tu sais écouter leurs coups.', panel: world('collection-archive'), speakerSide: 'right', emotion: 'Jugement', choices: [
        { id: 'dead-respect', text: 'Je me souviendrai de vos noms.', tone: 'heroic', affinity: { morvane: 2 } },
        { id: 'dead-joke', text: 'J’espérais une conversation un peu moins mortelle.', tone: 'sarcastic' },
        { id: 'dead-truth', text: 'Dis-moi ce que Valdoren a effacé.', tone: 'pragmatic', affinity: { morvane: 1 } },
      ] },
    ],
  },
  {
    id: 6,
    opponent: 'kael',
    faction: 'Chevalier',
    title: 'Chapitre V — La Reine effacée',
    rewardCodex: ['reine-effacee', 'archives-interdites'],
    lines: [
      { speaker: 'kael', text: 'Les sceaux portent la signature de ma propre couronne. Quelqu’un à Valdoren savait.', panel: world('collection-archive'), speakerSide: 'right', emotion: 'Loyauté fracturée' },
      { speaker: 'gribz', text: 'Bonne nouvelle : j’ai trouvé la porte secrète. Mauvaise nouvelle : j’ai aussi trouvé ce qui la gardait.', panel: panel('scene-09-gribz-shrug'), speakerSide: 'left', emotion: 'Très mauvaise nouvelle' },
      { speaker: 'kael', text: 'Avant d’ouvrir cette porte, affronte-moi une dernière fois. Je dois savoir que je ne livre pas mon royaume au mauvais Lié.', panel: panel('scene-06-kael-challenge'), speakerSide: 'right', emotion: 'Serment renouvelé' },
    ],
  },
  {
    id: 7,
    opponent: 'rakh',
    faction: 'Orc',
    title: 'Chapitre VI — Les Tambours de guerre',
    rewardCodex: ['guerre-des-cendres', 'pacte-rakh'],
    lines: [
      { speaker: 'rakh', text: 'Les armées de Valdoren marchent vers mes frontières. Quelqu’un veut que nos peuples recommencent l’ancienne guerre.', panel: world('ranked-hall'), speakerSide: 'right', emotion: 'Ultimatum' },
      { speaker: 'kael', text: 'Ce ne sont pas mes ordres.', panel: world('ranked-hall'), speakerSide: 'left', emotion: 'Trahison' },
      { speaker: 'rakh', text: 'Alors bats-toi à mes côtés après ce duel. Je veux savoir si ton groupe vaut le risque d’une alliance.', panel: world('ranked-hall'), speakerSide: 'right', emotion: 'Respect guerrier' },
    ],
  },
  {
    id: 8,
    opponent: 'vaeloryx',
    faction: 'Dragon',
    title: 'Chapitre VII — Le Tyran des cieux',
    rewardCodex: ['tyran-des-cieux', 'prison-du-nexus'],
    lines: [
      { speaker: 'vaeloryx', text: 'Vous avez réveillé ce qui dormait au-dessus des nuages. Ce n’est pas un roi. C’est une clef.', panel: panel('scene-01-nexus-fragment'), speakerSide: 'right', emotion: 'Avertissement' },
      { speaker: 'lyra', text: 'Une clef pour quoi ?', panel: panel('scene-05-lyra-doubt'), speakerSide: 'left', emotion: 'Peur contenue' },
      { speaker: 'vaeloryx', text: 'Pour la prison que vous appelez le Nexus.', panel: world('collection-archive'), speakerSide: 'right', emotion: 'Première vérité' },
      { speaker: 'vaeloryx', text: 'Survis à mon pouvoir, Lié. Ensuite seulement je te dirai ce qui frappe depuis l’autre côté.', panel: world('ranked-hall'), speakerSide: 'right', emotion: 'Dernière épreuve' },
    ],
  },
];
