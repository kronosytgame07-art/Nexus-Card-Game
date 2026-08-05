import{Evolution,evospheres}from'../data/decks';export type FieldUnit={cardId:string;turnsOnField:number;attack:number;health:number;canAttack:boolean};
export const eligibleEvolution=(unit:FieldUnit):Evolution|undefined=>unit.turnsOnField>=3?evospheres.find(e=>e.from===unit.cardId):undefined;
export const evolve=(unit:FieldUnit,evo:Evolution):FieldUnit=>({cardId:evo.id,turnsOnField:0,attack:evo.attack,health:evo.health,canAttack:false});
export const advanceField=(field:FieldUnit[])=>field.map(unit=>({...unit,turnsOnField:unit.turnsOnField+1,canAttack:true}));
