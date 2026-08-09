import type { StoryDuel } from './types';

const panel = (name: string) => `${import.meta.env.BASE_URL}story/chapter-1/${name}.png`;

export const CHAPTER_ONE: StoryDuel[] = [
  {
    id: 0,
    opponent: 'lyra',
    faction: 'Meute',
    title: 'Les Éclats du Serment — Lyra',
    rewardCodex: ['nexus', 'meute', 'lyra'],
    lines: [
      {
        speaker: 'narrator',
        text: 'Dans la forêt d’Elyndra, un fragment bleu pulse près de ta main.',
        panel: panel('scene-01-nexus-fragment'),
        speakerSide: 'center',
        emotion: 'Un éclat dans la nuit',
      },
      {
        speaker: 'lyra',
        text: 'Retire ta main de cette pierre. Qui t’a envoyé ?',
        panel: panel('scene-02-lyra-warning'),
        speakerSide: 'left',
        emotion: 'Méfiance',
        choices: [
          { id: 'sarcastic', text: 'J’allais justement te poser la même question.', tone: 'sarcastic', affinity: { lyra: 1 } },
          { id: 'lost', text: 'Personne. Je ne sais même pas où je suis.', tone: 'pragmatic' },
          { id: 'calm', text: 'Tu pourrais commencer par baisser ton arme.', tone: 'heroic' },
        ],
      },
      {
        speaker: 'lyra',
        text: 'Alors montre-moi ce que ce fragment t’a appris.',
        panel: panel('scene-03-lyra-challenge'),
        speakerSide: 'left',
        emotion: 'Défi',
      },
    ],
  },
  {
    id: 1,
    opponent: 'kael',
    faction: 'Chevalier',
    title: 'Les Éclats du Serment — Kael',
    rewardCodex: ['valdoren', 'kael'],
    lines: [
      {
        speaker: 'kael',
        text: 'Croc-de-Lune affirme que tu peux manipuler une Évosphère.',
        panel: panel('scene-04-kael-interrogation'),
        speakerSide: 'right',
        emotion: 'Interrogatoire',
      },
      {
        speaker: 'lyra',
        text: 'Je n’ai pas dit que je comprenais comment.',
        panel: panel('scene-05-lyra-doubt'),
        speakerSide: 'left',
        emotion: 'Scepticisme',
      },
      {
        speaker: 'kael',
        text: 'Dans ce cas, prouvons ce que tu es.',
        panel: panel('scene-06-kael-challenge'),
        speakerSide: 'right',
        emotion: 'Résolution',
      },
    ],
  },
  {
    id: 2,
    opponent: 'gribz',
    faction: 'Gobelin',
    title: 'Les Éclats du Serment — Gribz',
    rewardCodex: ['gobelins', 'fracture'],
    lines: [
      {
        speaker: 'gribz',
        text: 'PERSONNE NE BOUGE ! … C’était pas cette salle.',
        panel: panel('scene-07-gribz-wrong-room'),
        speakerSide: 'left',
        emotion: 'Entrée explosive',
      },
      {
        speaker: 'kael',
        text: 'Vous avez fait exploser les Archives.',
        panel: panel('scene-08-kael-accuses'),
        speakerSide: 'right',
        emotion: 'Incrédulité',
      },
      {
        speaker: 'gribz',
        text: 'Techniquement, elles étaient déjà très archivées.',
        panel: panel('scene-09-gribz-shrug'),
        speakerSide: 'left',
        emotion: 'Aucun remords',
      },
    ],
  },
];
