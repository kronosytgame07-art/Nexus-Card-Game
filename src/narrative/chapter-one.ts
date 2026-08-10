import type { StoryDuel } from './types';

const panel = (name: string) => `${import.meta.env.BASE_URL}story/chapter-1/${name}.png`;
const cinematic = (name: string) => `${import.meta.env.BASE_URL}story/cinematics/${name}.svg`;

export const CHAPTER_ONE: StoryDuel[] = [
  {
    id: 0,
    opponent: 'lyra',
    faction: 'Meute',
    title: 'Chapitre I — Le fragment de la forêt',
    rewardCodex: ['nexus', 'meute', 'lyra'],
    lines: [
      { speaker: 'narrator', text: 'Dans la forêt d’Elyndra, un fragment bleu pulse près de ta main.', panel: panel('scene-01-nexus-fragment'), speakerSide: 'center', emotion: 'Un éclat dans la nuit', cinematic:{camera:'push',atmosphere:'mist',intensity:1} },
      { speaker: 'lyra', text: 'Retire ta main de cette pierre. Qui t’a envoyé ?', panel: panel('scene-02-lyra-warning'), speakerSide: 'left', emotion: 'Méfiance', cinematic:{camera:'pan-right',atmosphere:'mist',intensity:1}, choices: [
        { id: 'sarcastic', text: 'J’allais justement te poser la même question.', tone: 'sarcastic', affinity: { lyra: 1 } },
        { id: 'lost', text: 'Personne. Je ne sais même pas où je suis.', tone: 'pragmatic' },
        { id: 'calm', text: 'Tu pourrais commencer par baisser ton arme.', tone: 'heroic' },
      ] },
      { speaker: 'lyra', text: 'Alors montre-moi ce que ce fragment t’a appris.', panel: panel('scene-03-lyra-challenge'), speakerSide: 'left', emotion: 'Défi', cinematic:{camera:'push',atmosphere:'mist',intensity:2} },
    ],
  },
  {
    id: 1,
    opponent: 'kael',
    faction: 'Chevalier',
    title: 'Chapitre I — L’épreuve de Valdoren',
    rewardCodex: ['valdoren', 'kael'],
    lines: [
      { speaker: 'kael', text: 'Croc-de-Lune affirme que tu peux manipuler une Évosphère.', panel: panel('scene-04-kael-interrogation'), speakerSide: 'right', emotion: 'Interrogatoire', cinematic:{camera:'pan-left',atmosphere:'none',intensity:1} },
      { speaker: 'lyra', text: 'Je n’ai pas dit que je comprenais comment.', panel: panel('scene-05-lyra-doubt'), speakerSide: 'left', emotion: 'Scepticisme', cinematic:{camera:'pull',atmosphere:'mist',intensity:1} },
      { speaker: 'kael', text: 'Dans ce cas, prouvons ce que tu es.', panel: panel('scene-06-kael-challenge'), speakerSide: 'right', emotion: 'Résolution', cinematic:{camera:'push',atmosphere:'none',intensity:2,flash:true} },
    ],
  },
  {
    id: 2,
    opponent: 'gribz',
    faction: 'Gobelin',
    title: 'Chapitre I — Les archives éventrées',
    rewardCodex: ['gobelins', 'fracture', 'gribz'],
    lines: [
      { speaker: 'gribz', text: 'PERSONNE NE BOUGE ! … C’était pas cette salle.', panel: panel('scene-07-gribz-wrong-room'), speakerSide: 'left', emotion: 'Entrée explosive', cinematic:{camera:'push',atmosphere:'embers',intensity:2,shake:true,flash:true} },
      { speaker: 'kael', text: 'Vous avez fait exploser les Archives.', panel: panel('scene-08-kael-accuses'), speakerSide: 'right', emotion: 'Incrédulité', cinematic:{camera:'pan-left',atmosphere:'embers',intensity:1} },
      { speaker: 'gribz', text: 'Techniquement, elles étaient déjà très archivées.', panel: panel('scene-09-gribz-shrug'), speakerSide: 'left', emotion: 'Aucun remords', cinematic:{camera:'pull',atmosphere:'embers',intensity:1} },
    ],
  },
  {
    id: 3,
    opponent: 'rakh',
    faction: 'Orc',
    title: 'Chapitre II — Le Sang et la Cendre',
    rewardCodex: ['orcs', 'rakh', 'terres-cendres'],
    lines: [
      { speaker: 'narrator', text: 'Les terres changent avant même la frontière : le ciel devient rouge et les tambours font vibrer la cendre sous vos pas.', panel: cinematic('orcs-arrival'), speakerSide: 'center', emotion: 'Terres de Cendre', cinematic:{camera:'rise',atmosphere:'embers',intensity:2} },
      { speaker: 'rakh', text: 'Vous entrez armés sur mes terres et vous appelez cela une enquête ?', panel: cinematic('orcs-arrival'), speakerSide: 'right', emotion: 'Autorité calme', cinematic:{camera:'push',atmosphere:'embers',intensity:2}, choices: [
        { id: 'rakh-honor', text: 'Je suis venu chercher la vérité, pas ton territoire.', tone: 'heroic', affinity: { rakh: 1 } },
        { id: 'rakh-joke', text: 'Gribz avait dit qu’il connaissait un raccourci.', tone: 'sarcastic' },
        { id: 'rakh-proof', text: 'Ton clan possède un fragment qui émet le même signal que le nôtre.', tone: 'pragmatic', affinity: { rakh: 1 } },
      ] },
      { speaker: 'gribz', text: 'Pour ma défense, le raccourci était beaucoup moins gardé sur ma carte.', panel: cinematic('orcs-arrival'), speakerSide: 'left', emotion: 'Très mauvais timing', cinematic:{camera:'pan-right',atmosphere:'embers',intensity:1} },
      { speaker: 'rakh', text: 'Alors gagne le droit de poser tes questions. Chez nous, une parole vaut ce que vaut celui qui la porte.', panel: cinematic('orcs-arrival'), speakerSide: 'right', emotion: 'Défi rituel', cinematic:{camera:'push',atmosphere:'embers',intensity:3,shake:true,flash:true} },
    ],
  },
  {
    id: 4,
    opponent: 'vaeloryx',
    faction: 'Dragon',
    title: 'Chapitre III — L’Œil dans la montagne',
    rewardCodex: ['dragons', 'vaeloryx', 'lies'],
    lines: [
      { speaker: 'narrator', text: 'La montagne avale les derniers bruits du monde. Puis un œil s’ouvre dans l’orage.', panel: cinematic('dragon-awakening'), speakerSide: 'center', emotion: 'Quelque chose se réveille', cinematic:{camera:'push',atmosphere:'storm',intensity:3,shake:true,flash:true} },
      { speaker: 'vaeloryx', text: 'Un Lié. Après tout ce temps… et vous ignorez encore ce que ce mot signifie.', panel: cinematic('dragon-awakening'), speakerSide: 'right', emotion: 'Reconnaissance', cinematic:{camera:'pull',atmosphere:'storm',intensity:2} },
      { speaker: 'kael', text: 'Tu étais vivant pendant la Fracture.', panel: cinematic('dragon-awakening'), speakerSide: 'left', emotion: 'Certitude brisée', cinematic:{camera:'pan-left',atmosphere:'storm',intensity:1} },
      { speaker: 'vaeloryx', text: 'Vivant ? Non. J’étais témoin. C’est bien plus lourd à porter.', panel: cinematic('dragon-awakening'), speakerSide: 'right', emotion: 'Mémoire ancienne', cinematic:{camera:'push',atmosphere:'storm',intensity:2} },
      { speaker: 'vaeloryx', text: 'Montre-moi si toi aussi tu choisis la peur.', panel: cinematic('dragon-awakening'), speakerSide: 'right', emotion: 'Épreuve ancestrale', cinematic:{camera:'push',atmosphere:'storm',intensity:3,flash:true}, choices: [
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
      { speaker: 'narrator', text: 'Sous Valdoren existe une ville que personne n’a dessinée sur une carte. Ses habitants, eux, se souviennent de chaque nom.', panel: cinematic('morvane-tomb'), speakerSide: 'center', emotion: 'La nécropole oubliée', cinematic:{camera:'fall',atmosphere:'necrotic',intensity:2} },
      { speaker: 'morvane', text: 'Ne nous appelez pas monstres. Nous sommes les noms que vos archives ont supprimés.', panel: cinematic('morvane-tomb'), speakerSide: 'right', emotion: 'Colère froide', cinematic:{camera:'push',atmosphere:'necrotic',intensity:2} },
      { speaker: 'lyra', text: 'Le Nexus ne les ramène pas à la vie. Il refuse simplement de les oublier.', panel: cinematic('morvane-tomb'), speakerSide: 'left', emotion: 'Compréhension', cinematic:{camera:'pan-right',atmosphere:'necrotic',intensity:1} },
      { speaker: 'morvane', text: 'Écoute bien, Lié. Sous chaque pierre de cette cité, votre royaume a enterré une phrase qu’il ne voulait plus entendre.', panel: cinematic('morvane-tomb'), speakerSide: 'right', emotion: 'Accusation', cinematic:{camera:'rise',atmosphere:'necrotic',intensity:2} },
      { speaker: 'morvane', text: 'Si tu veux entendre les morts, prouve d’abord que tu sais survivre à leur mémoire.', panel: cinematic('morvane-tomb'), speakerSide: 'right', emotion: 'Jugement', cinematic:{camera:'push',atmosphere:'necrotic',intensity:3,flash:true}, choices: [
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
      { speaker: 'narrator', text: 'Au-delà des sceaux interdits, Valdoren apparaît comme personne ne l’a jamais racontée : une cité construite sur un souvenir amputé.', panel: cinematic('queen-forgotten'), speakerSide: 'center', emotion: 'La cité oubliée', cinematic:{camera:'rise',atmosphere:'mist',intensity:2} },
      { speaker: 'kael', text: 'Les sceaux portent la signature de ma propre couronne. Quelqu’un à Valdoren savait.', panel: cinematic('queen-forgotten'), speakerSide: 'right', emotion: 'Loyauté fracturée', cinematic:{camera:'push',atmosphere:'mist',intensity:1} },
      { speaker: 'narrator', text: 'Une silhouette couronnée traverse le reflet d’une fenêtre. Elle n’est sur aucun portrait officiel.', panel: cinematic('queen-forgotten'), speakerSide: 'center', emotion: 'Une mémoire impossible', cinematic:{camera:'pan-left',atmosphere:'nexus',intensity:2,flash:true} },
      { speaker: 'gribz', text: 'Bonne nouvelle : j’ai trouvé la porte secrète. Mauvaise nouvelle : j’ai aussi trouvé ce qui la gardait.', panel: cinematic('queen-forgotten'), speakerSide: 'left', emotion: 'Très mauvaise nouvelle', cinematic:{camera:'pull',atmosphere:'mist',intensity:1} },
      { speaker: 'kael', text: 'Avant d’ouvrir cette porte, affronte-moi une dernière fois. Je dois savoir que je ne livre pas mon royaume au mauvais Lié.', panel: cinematic('queen-forgotten'), speakerSide: 'right', emotion: 'Serment renouvelé', cinematic:{camera:'push',atmosphere:'nexus',intensity:3,flash:true} },
    ],
  },
  {
    id: 7,
    opponent: 'rakh',
    faction: 'Orc',
    title: 'Chapitre VI — Les Tambours de guerre',
    rewardCodex: ['guerre-des-cendres', 'pacte-rakh'],
    lines: [
      { speaker: 'narrator', text: 'Les feux de guerre s’allument sur toute la vallée. Quelqu’un a réussi à faire marcher deux peuples vers le même massacre.', panel: cinematic('orcs-war'), speakerSide: 'center', emotion: 'La guerre approche', cinematic:{camera:'pull',atmosphere:'embers',intensity:3,shake:true} },
      { speaker: 'rakh', text: 'Les armées de Valdoren marchent vers mes frontières. Quelqu’un veut que nos peuples recommencent l’ancienne guerre.', panel: cinematic('orcs-war'), speakerSide: 'right', emotion: 'Ultimatum', cinematic:{camera:'push',atmosphere:'embers',intensity:2} },
      { speaker: 'kael', text: 'Ce ne sont pas mes ordres.', panel: cinematic('orcs-war'), speakerSide: 'left', emotion: 'Trahison', cinematic:{camera:'pan-left',atmosphere:'embers',intensity:1} },
      { speaker: 'rakh', text: 'Alors nous allons découvrir qui porte ta bannière sans porter ton serment.', panel: cinematic('orcs-war'), speakerSide: 'right', emotion: 'Alliance improbable', cinematic:{camera:'rise',atmosphere:'embers',intensity:2} },
      { speaker: 'rakh', text: 'Bats-toi à mes côtés après ce duel. Je veux savoir si ton groupe vaut le risque d’une alliance.', panel: cinematic('orcs-war'), speakerSide: 'right', emotion: 'Respect guerrier', cinematic:{camera:'push',atmosphere:'embers',intensity:3,flash:true} },
    ],
  },
  {
    id: 8,
    opponent: 'vaeloryx',
    faction: 'Dragon',
    title: 'Chapitre VII — Le Tyran des cieux',
    rewardCodex: ['tyran-des-cieux', 'prison-du-nexus'],
    lines: [
      { speaker: 'narrator', text: 'Le ciel se fend avant que le dragon n’apparaisse. Les chaînes du Nexus vibrent dans chaque fragment d’Elyndra.', panel: cinematic('tyrant-skies'), speakerSide: 'center', emotion: 'Le ciel se déchire', cinematic:{camera:'pull',atmosphere:'storm',intensity:3,shake:true,flash:true} },
      { speaker: 'vaeloryx', text: 'Vous avez réveillé ce qui dormait au-dessus des nuages. Ce n’est pas un roi. C’est une clef.', panel: cinematic('tyrant-skies'), speakerSide: 'right', emotion: 'Avertissement', cinematic:{camera:'push',atmosphere:'storm',intensity:3} },
      { speaker: 'lyra', text: 'Une clef pour quoi ?', panel: cinematic('nexus-prison'), speakerSide: 'left', emotion: 'Peur contenue', cinematic:{camera:'push',atmosphere:'nexus',intensity:2} },
      { speaker: 'vaeloryx', text: 'Pour la prison que vous appelez le Nexus.', panel: cinematic('nexus-prison'), speakerSide: 'right', emotion: 'Première vérité', cinematic:{camera:'rise',atmosphere:'nexus',intensity:3,flash:true,shake:true} },
      { speaker: 'narrator', text: 'Dans le violet des fissures, quelque chose frappe de l’autre côté. Une fois. Puis deux.', panel: cinematic('nexus-prison'), speakerSide: 'center', emotion: 'Quelque chose répond', cinematic:{camera:'push',atmosphere:'nexus',intensity:3,shake:true} },
      { speaker: 'vaeloryx', text: 'Survis à mon pouvoir, Lié. Ensuite seulement je te dirai ce qui frappe depuis l’autre côté.', panel: cinematic('tyrant-skies'), speakerSide: 'right', emotion: 'Dernière épreuve', cinematic:{camera:'push',atmosphere:'storm',intensity:3,flash:true} },
    ],
  },
];
