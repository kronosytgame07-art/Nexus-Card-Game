export type Rarity='Commune'|'Rare'|'Épique'|'Légendaire'|'Mythique';
export type Card={id:string;name:string;cost:number;attack:number;health:number;type:string;faction:string;rarity:Rarity;text:string;art:string;image:string};
export const cards:Card[]=[
  ['paladin','Paladin du Royaume',3,4,5,'Créature','Ordre','Rare','Provocation. Cri de guerre : gagne +1 attaque.','♜','./assets/cards/paladin.png'],
  ['loup','Loup Alpha',2,4,2,'Créature','Meute','Commune','Charge. Attaque dès son arrivée.','◈','./assets/cards/loup.png'],
  ['oracle','Oracle de Verre',4,3,4,'Créature','Arcane','Épique','Cri de guerre : pioche 2 cartes.','◉','./assets/cards/oracle.png'],
  ['nexus','Éclat de Nexus',2,3,0,'Sort','Arcane','Rare','Inflige 3 dégâts.','✧','./assets/cards/nexus.png'],
  ['dragon','Dragon d\'Obsidienne',7,8,8,'Créature','Cendre','Légendaire','Vol. Dernier souffle : invoque un œuf.','♛','./assets/cards/dragon.png'],
  ['reine','La Reine Effacée',9,10,10,'Héros','Ombre','Mythique','Évolution : le champ s\'embrase.','♕','./assets/cards/reine.png']
].map(([id,name,cost,attack,health,type,faction,rarity,text,art,image])=>({id,name,cost,attack,health,type,faction,rarity,text,art,image} as Card));
