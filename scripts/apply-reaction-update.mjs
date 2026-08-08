import fs from 'node:fs';

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const { from, to, label } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      console.warn(`[reaction-update] motif introuvable: ${label}`);
      continue;
    }
    source = source.replace(from, to);
    changed = true;
    console.log(`[reaction-update] ${label}`);
  }
  if (changed) fs.writeFileSync(path, source);
}

function appendOnce(path, marker, content) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(marker)) return;
  fs.appendFileSync(path, `\n${content}\n`);
  console.log(`[reaction-update] ${marker}`);
}

patchFile('src/engine/engine.ts', [
  {
    label: 'helpers de fenêtre de réaction',
    from: "export type AiAttackStep = { state: GameState; attackerId: string; targetId: string | null; skipped: boolean };",
    to: `export function availableReactionSupportIds(state: GameState, respondingPlayer: PlayerId, trigger: import('./types').ReactionTrigger): string[] {
  const p = state[respondingPlayer];
  return p.support
    .filter((support) => {
      const def = getCard(support.cardId);
      return def.supportKind === 'reaction' && Boolean(def.reactionTriggers?.includes(trigger)) && Boolean(def.effect) && def.cost <= p.mana;
    })
    .map((support) => support.instanceId);
}

export function passReactionWindow(rawState: GameState, respondingPlayer: PlayerId): GameState {
  const state = clone(rawState);
  if (!state.reactionWindow || state.reactionWindow.respondingPlayer !== respondingPlayer) return state;
  pushLog(state, \`${'${labelFor(respondingPlayer)}'} passe sans activer de Sortilège.\`);
  delete state.reactionWindow;
  return state;
}

export type AiAttackStep = { state: GameState; attackerId: string; targetId: string | null; skipped: boolean; pendingReaction?: boolean };`,
  },
  {
    label: 'attaque IA suspendue si réponse disponible',
    from: "  const before = currentAttacker.canAttack;\n  const next = declareAttack(state, 'enemy', attackerId, targetId);\n  const after = findUnit(next.enemy, attackerId)?.canAttack;\n  return { state: next, attackerId, targetId, skipped: before === after };",
    to: `  const reactionIds = availableReactionSupportIds(state, 'player', 'attack_declared');
  if (reactionIds.length > 0 && !state.reactionWindow) {
    state.reactionWindow = {
      trigger: 'attack_declared',
      actingPlayer: 'enemy',
      respondingPlayer: 'player',
      sourceInstanceId: attackerId,
      targetInstanceId: targetId,
      sourceCardId: currentAttacker.cardId,
    };
    pushLog(state, \`Fenêtre de réponse : ${'${getCard(currentAttacker.cardId).name}'} déclare une attaque.\`);
    return { state, attackerId, targetId, skipped: false, pendingReaction: true };
  }

  const before = currentAttacker.canAttack;
  const next = declareAttack(state, 'enemy', attackerId, targetId);
  const after = findUnit(next.enemy, attackerId)?.canAttack;
  return { state: next, attackerId, targetId, skipped: before === after };`,
  },
  {
    label: 'support réactif activable pendant le tour adverse',
    from: `export function activateSupportCard(rawState: GameState, playerId: PlayerId, supportInstanceId: string): GameState {
  const state = clone(rawState);
  if (state.winner || state.activePlayer !== playerId) return state;
  const p = state[playerId];
  const idx = p.support.findIndex((s) => s.instanceId === supportInstanceId);
  if (idx < 0) return state;
  const support = p.support[idx];
  const def = getCard(support.cardId);
  if (!def.effect) return state;
  if (def.cost > p.mana) {
    pushLog(state, \`${'${def.name}'} reste face cachée : pas assez de runes pour l'activer (${'${def.cost}'}◆).\`);
    return state;
  }

  const succeeded = resolveEffect(state, playerId, def.effect);
  if (succeeded) {
    p.mana -= def.cost;
    p.support.splice(idx, 1);
    p.graveyard.push(def.id);
    pushLog(state, \`${'${def.name}'} se révèle et son effet s'active.\`);
  } else {
    pushLog(state, \`${'${def.name}'} reste face cachée : conditions non réunies pour l'activer.\`);
  }
  applyPackBonuses(state);
  return state;
}`,
    to: `export function activateSupportCard(rawState: GameState, playerId: PlayerId, supportInstanceId: string): GameState {
  const state = clone(rawState);
  if (state.winner) return state;
  const p = state[playerId];
  const idx = p.support.findIndex((s) => s.instanceId === supportInstanceId);
  if (idx < 0) return state;
  const support = p.support[idx];
  const def = getCard(support.cardId);
  if (!def.effect) return state;

  const ownTurn = state.activePlayer === playerId;
  const reactionWindow = state.reactionWindow;
  const validReaction = !ownTurn && Boolean(
    reactionWindow &&
    reactionWindow.respondingPlayer === playerId &&
    def.supportKind === 'reaction' &&
    def.reactionTriggers?.includes(reactionWindow.trigger)
  );
  if (!ownTurn && !validReaction) return state;
  if (ownTurn && def.supportKind === 'reaction') {
    pushLog(state, \`${'${def.name}'} est un Sortilège : il attend une action adverse pour se déclencher.\`);
    return state;
  }
  if (def.cost > p.mana) {
    pushLog(state, \`${'${def.name}'} reste face cachée : pas assez de runes pour l'activer (${'${def.cost}'}◆).\`);
    return state;
  }

  const succeeded = resolveEffect(state, playerId, def.effect);
  if (succeeded) {
    p.mana -= def.cost;
    p.support.splice(idx, 1);
    p.graveyard.push(def.id);
    pushLog(state, \`${'${def.name}'} se révèle et son effet s'active.\`);
    if (validReaction) delete state.reactionWindow;
  } else {
    pushLog(state, \`${'${def.name}'} reste face cachée : conditions non réunies pour l'activer.\`);
  }
  applyPackBonuses(state);
  return state;
}`,
  },
]);

patchFile('src/App.tsx', [
  {
    label: 'imports moteur réaction',
    from: "import { activateSupportCard, activateUnitEffect, aiDrawPhase, aiEndPhase, aiMainPhase, aiPrepareBattlePlan, aiResolveOneAttack, declareAttack, evolveUnit, MAX_FIELD_UNITS, MAX_SUPPORT, newGame, playCard } from './engine/engine';",
    to: "import { activateSupportCard, activateUnitEffect, aiDrawPhase, aiEndPhase, aiMainPhase, aiPrepareBattlePlan, aiResolveOneAttack, availableReactionSupportIds, declareAttack, evolveUnit, MAX_FIELD_UNITS, MAX_SUPPORT, newGame, passReactionWindow, playCard } from './engine/engine';",
  },
  {
    label: 'état UI de réaction et callback reprise IA',
    from: "const [placingCard, setPlacingCard] = useState<{ id: string; type: 'unit' | 'spell' } | null>(null);",
    to: "const [placingCard, setPlacingCard] = useState<{ id: string; type: 'unit' | 'spell' } | null>(null); const [reactionPrompt, setReactionPrompt] = useState<{ attackerId: string; targetId: string | null } | null>(null); const reactionResumeRef = useRef<((state: GameState) => void) | null>(null);",
  },
  {
    label: 'pause attaque IA sur fenêtre de réponse',
    from: `    const attackerId = plan.attackerIds[index];
    const step = aiResolveOneAttack(state, attackerId, plan.lethal, plan.keepBackId);
    if (step.skipped) { runAiAttackStep(token, state, plan, index + 1, onDone); return; }
    const measured = measureStrike('enemy', attackerId, step.targetId);`,
    to: `    const attackerId = plan.attackerIds[index];
    const step = aiResolveOneAttack(state, attackerId, plan.lethal, plan.keepBackId);
    if (step.skipped) { runAiAttackStep(token, state, plan, index + 1, onDone); return; }
    if (step.pendingReaction && step.state.reactionWindow) {
      updateMatch(step.state);
      setReactionPrompt({ attackerId, targetId: step.targetId });
      reactionResumeRef.current = (reactedState: GameState) => {
        if (turnTokenRef.current !== token) return;
        const beforeAttack = reactedState;
        const afterAttack = declareAttack(reactedState, 'enemy', attackerId, step.targetId);
        updateMatch(afterAttack);
        pulseFromDiff(beforeAttack, afterAttack);
        setReactionPrompt(null);
        reactionResumeRef.current = null;
        window.setTimeout(() => runAiAttackStep(token, afterAttack, plan, index + 1, onDone), 280);
      };
      return;
    }
    const measured = measureStrike('enemy', attackerId, step.targetId);`,
  },
  {
    label: 'handlers activation/passe Sortilège',
    from: "  const nextTurn = () => {",
    to: `  const resolveReaction = (supportInstanceId?: string) => {
    if (!reactionPrompt || !match.reactionWindow) return;
    const before = match;
    const next = supportInstanceId ? activateSupportCard(match, 'player', supportInstanceId) : passReactionWindow(match, 'player');
    if (supportInstanceId && next.reactionWindow) { showHint('Ce Sortilège ne peut pas être activé dans cette fenêtre.'); return; }
    updateMatch(next);
    pulseFromDiff(before, next);
    if (supportInstanceId) {
      const support = before.player.support.find((item) => item.instanceId === supportInstanceId);
      if (support) { const def = getCard(support.cardId); setSupportReveal({ cardId: def.id, name: def.name }); window.setTimeout(() => setSupportReveal(null), 850); }
    }
    const resume = reactionResumeRef.current;
    window.setTimeout(() => resume?.(next), supportInstanceId ? 500 : 100);
  };
  const nextTurn = () => {`,
  },
  {
    label: 'reset nettoie fenêtre de réaction',
    from: "setSupportPreview(null); setEvoSeq(null); setInspectedEnemyId(null);",
    to: "setSupportPreview(null); setReactionPrompt(null); reactionResumeRef.current = null; setEvoSeq(null); setInspectedEnemyId(null);",
  },
  {
    label: 'panneau de réponse Sortilège',
    from: "{supportReveal && (() => { const def = getCard(supportReveal.cardId);",
    to: `{reactionPrompt && match.reactionWindow && (() => { const ids = availableReactionSupportIds(match, 'player', match.reactionWindow.trigger); const attacker = match.enemy.field.find((u) => u.instanceId === reactionPrompt.attackerId); const attackerDef = attacker ? getCard(attacker.cardId) : undefined; return <div className="reaction-window" role="dialog" aria-modal="true"><div className="reaction-window-head"><span>⚡ RÉPONSE</span><b>{attackerDef ? \`${'${attackerDef.name}'} attaque\` : 'Action adverse'}</b><small>Active un Sortilège ou laisse l'action se résoudre.</small></div><div className="reaction-window-cards">{ids.map((id) => { const support = match.player.support.find((s) => s.instanceId === id); if (!support) return null; const def = getCard(support.cardId); return <button key={id} onClick={() => resolveReaction(id)}><img src={def.image} alt={def.name} /><span><b>{def.name}</b><small>{def.text}</small><em>◆ {def.cost}</em></span></button>; })}</div><button className="secondary reaction-pass" onClick={() => resolveReaction()}>PASSER</button></div>; })()}{supportReveal && (() => { const def = getCard(supportReveal.cardId);`,
  },
]);

appendOnce('src/arena.css', 'NEXUS REACTION WINDOW', `
/* NEXUS REACTION WINDOW */
.reaction-window {
  position: fixed;
  z-index: 470;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  width: min(430px, 42vw);
  max-height: 76vh;
  padding: 14px;
  border: 1px solid rgba(105, 225, 255, .72);
  border-radius: 16px;
  background: linear-gradient(155deg, rgba(5,18,26,.97), rgba(12,8,26,.97));
  box-shadow: 0 0 0 1px rgba(170,90,255,.25), 0 0 38px rgba(80,210,255,.22), 0 20px 55px rgba(0,0,0,.62);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.reaction-window-head { display: flex; flex-direction: column; gap: 3px; }
.reaction-window-head span { color: #74e9ff; font: 900 11px "DM Mono"; letter-spacing: 2px; }
.reaction-window-head b { color: white; font: 800 18px "Space Grotesk"; }
.reaction-window-head small { color: #adc5cb; }
.reaction-window-cards { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.reaction-window-cards > button { display: grid; grid-template-columns: 62px 1fr; gap: 10px; align-items: center; padding: 7px; border: 1px solid rgba(116,233,255,.35); border-radius: 12px; background: rgba(255,255,255,.05); color: white; text-align: left; cursor: pointer; }
.reaction-window-cards > button:hover { border-color: #74e9ff; box-shadow: 0 0 20px rgba(116,233,255,.22); }
.reaction-window-cards img { width: 62px; aspect-ratio: .7; object-fit: cover; border-radius: 7px; }
.reaction-window-cards span { display: flex; flex-direction: column; gap: 3px; }
.reaction-window-cards b { color: #e8fbff; }
.reaction-window-cards small { color: #b6cbd0; line-height: 1.3; }
.reaction-window-cards em { color: #ffe49a; font-style: normal; font: 700 10px "DM Mono"; }
.reaction-pass { margin: 0; }
@media (max-width: 900px), (orientation: landscape) and (max-height: 600px) {
  .reaction-window { width: min(360px, 46vw); max-height: 88vh; padding: 10px; }
  .reaction-window-head b { font-size: 14px; }
  .reaction-window-cards > button { grid-template-columns: 46px 1fr; }
  .reaction-window-cards img { width: 46px; }
  .reaction-window-cards small { font-size: 9px; }
}
`);

console.log('[reaction-update] terminé');
