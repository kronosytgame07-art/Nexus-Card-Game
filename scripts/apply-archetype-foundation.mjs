import fs from 'node:fs';

function patch(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn('[archetypes] motif introuvable: ' + label);
    return;
  }
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
  console.log('[archetypes] ' + label);
}

// Les nouvelles factions sont déjà déclarées dans types.ts, mais aucune carte
// définitive n'est créée ici : on prépare seulement le moteur pour leurs futures données/assets.
patch(
  'src/engine/cards.ts',
  'const evolutionNames: Record<Faction,string[]> =',
  'const evolutionNames: Partial<Record<Faction,string[]>> =',
  'évolutions compatibles avec factions futures'
);

patch(
  'src/engine/cards.ts',
  'const evolutionNameById=new Map(rows.filter(([id])=>evolvableIds.has(id)).map(([id],i)=>[id,evolutionNames[faction][i]]));',
  'const namesForFaction=evolutionNames[faction] ?? [];\n const evolutionNameById=new Map(rows.filter(([id])=>evolvableIds.has(id)).map(([id],i)=>[id,namesForFaction[i]]));',
  'noms évolution tolèrent archétype sans cartes'
);

patch(
  'src/engine/cards.ts',
  "const base:CardDef[]=rows.map(([id,name,cost,attack,health,effect,boosterOnly])=>({id,name,faction,level:1,type:health>0?'unit':'spell',supportKind:health<=0?(REACTION_IDS.has(id)?'reaction':'enchantment'):undefined,reactionTriggers:REACTION_IDS.has(id)?['attack_declared']:undefined,cost,attack,health,effect,blitz:BLITZ_IDS.has(id)||undefined,ranged:RANGED_IDS.has(id)||undefined,waitTurns:evolvableIds.has(id)?3:undefined,evolvesTo:evolvableIds.has(id)?`evo-${id}`:undefined,copies:3,rarity:rarityForCost(cost),image:`${import.meta.env.BASE_URL}cards/${id}.png`,text:describeEffect(effect)+(BLITZ_IDS.has(id)?' Blitz.':'')+(RANGED_IDS.has(id)?' À distance.':'')+(evolvableIds.has(id)?` Évolue en ${evolutionNameById.get(id)}.`:''),boosterOnly:boosterOnly||undefined}));",
  "const base:CardDef[]=rows.map(([id,name,cost,attack,health,effect,boosterOnly])=>{const nativeGoblinBlitz=faction==='Gobelin'&&health>0;const dragonDelay=faction==='Dragon'&&health>0&&cost>=2?2:undefined;const hasBlitz=BLITZ_IDS.has(id)||nativeGoblinBlitz;return {id,name,faction,level:1,type:health>0?'unit':'spell',supportKind:health<=0?(REACTION_IDS.has(id)?'reaction':'enchantment'):undefined,reactionTriggers:REACTION_IDS.has(id)?['attack_declared']:undefined,cost,attack,health,effect,blitz:hasBlitz||undefined,ranged:RANGED_IDS.has(id)||undefined,attackDelayTurns:dragonDelay,waitTurns:evolvableIds.has(id)?3:undefined,evolvesTo:evolvableIds.has(id)?`evo-${id}`:undefined,copies:3,rarity:rarityForCost(cost),image:`${import.meta.env.BASE_URL}cards/${id}.png`,text:describeEffect(effect)+(hasBlitz?' Blitz.':'')+(dragonDelay?' Inertie draconique : attend 2 tours avant de pouvoir attaquer.':'')+(RANGED_IDS.has(id)?' À distance.':'')+(evolvableIds.has(id)?` Évolue en ${evolutionNameById.get(id)}.`:''),boosterOnly:boosterOnly||undefined};});",
  'Blitz Gobelin natif et inertie Dragon future'
);

patch(
  'src/engine/cards.ts',
  'const evolvables=base.filter(c=>evolvableIds.has(c.id)); const names=evolutionNames[faction];',
  'const evolvables=base.filter(c=>evolvableIds.has(c.id)); const names=evolutionNames[faction] ?? [];',
  'liste évolution future sûre'
);

patch(
  'src/engine/engine.ts',
  "  const attackerDef = getCard(attacker.cardId);\n  const canAttackDirectly = attackerDef.text.toLowerCase().includes('attaque directe');",
  "  const attackerDef = getCard(attacker.cardId);\n  if ((attackerDef.attackDelayTurns ?? 0) > attacker.turnsOnField) {\n    const remaining = (attackerDef.attackDelayTurns ?? 0) - attacker.turnsOnField;\n    pushLog(state, attackerDef.name + ' doit encore attendre ' + remaining + ' tour(s) avant de pouvoir attaquer.');\n    return state;\n  }\n  const canAttackDirectly = attackerDef.text.toLowerCase().includes('attaque directe');",
  'inertie Dragon contrôlée à la déclaration attaque'
);

patch(
  'src/engine/engine.ts',
  "    unit.canAttack = true;\n    unit.effectUsesThisTurn = 0;\n    unit.turnsOnField += 1;",
  "    unit.effectUsesThisTurn = 0;\n    unit.turnsOnField += 1;\n    const unitDef = getCard(unit.cardId);\n    unit.canAttack = (unitDef.attackDelayTurns ?? 0) <= unit.turnsOnField;",
  'réveil automatique des unités après délai'
);

patch(
  'src/engine/engine.ts',
  "  const attackers = rawState.enemy.field.filter((u) => u.canAttack && u.stunnedTurns === 0);",
  "  const attackers = rawState.enemy.field.filter((u) => {\n    const def = getCard(u.cardId);\n    return u.canAttack && u.stunnedTurns === 0 && (def.attackDelayTurns ?? 0) <= u.turnsOnField;\n  });",
  'IA ignore Dragons encore en inertie'
);

console.log('[archetypes] Fondations Dragon/Gobelin prêtes sans faux assets.');
