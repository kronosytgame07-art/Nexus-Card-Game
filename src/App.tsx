@@
-import cardBack from './assets/cards/nexus-card-back.jpg';
+import cardBack from './assets/cards/nexus-card-back.jpg';
+import PlayerHand from './components/PlayerHand';
+import EnemyHand from './components/EnemyHand';
+import Profile from './components/Profile';
@@
 function Combat() {
   const s = useGame(); const location = useLocation(); const go = useNavigate();
@@
-  const [match, setMatch] = useState<GameState>(startMatch); const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null); const [reported, setReported] = useState(false); const [...]
+  const [match, setMatch] = useState<GameState>(startMatch);
+  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
+  const [reported, setReported] = useState(false);
+  const [handOpen, setHandOpen] = useState(false);
+  const [...]
@@
-  const play = (id: string) => { if (match.activePlayer !== 'player' || match.winner) return; if (!handOpen) { setHandOpen(true); return; } if (phase !== 'main') { showHint('Passe en Main Phase p[...]
+  const play = (id: string) => { if (match.activePlayer !== 'player' || match.winner) return; if (!handOpen) { setHandOpen(true); return; } if (phase !== 'main') { showHint('Passe en Main Phase p[...]
@@
-  const pileCards: CardDef[] = pileOpen === 'grave' ? match.player.graveyard.map((id: string) => getCard(id)) : pileOpen === 'evo' ? match.player.evosphere.map((id: string) => getCard(id)) : [];
-  return <section className="battle" onClick={(event) => { if (handOpen && !(event.target as HTMLElement).closest('.hand')) setHandOpen(false); }}><div className="battle-meta"><b>{chapter ? `Chap[...]
+  const pileCards: CardDef[] = pileOpen === 'grave' ? match.player.graveyard.map((id: string) => getCard(id)) : pileOpen === 'evo' ? match.player.evosphere.map((id: string) => getCard(id)) : [];
+
+  // Prepare hand objects for the new components
+  const makeCardData = (id: string) => { const c = getCard(id); return { id, name: c?.name ?? id, image: c?.image ?? CARD_BACK_URL }; };
+  const playerHandObjects = match.player.hand.map(makeCardData);
+  const enemyHandObjects = match.enemy.hand.map(makeCardData);
+
+  return <section className="battle" onClick={(event) => { if (handOpen && !(event.target as HTMLElement).closest('.hand')) setHandOpen(false); }}><div className="battle-meta"><b>{chapter ? `Chap[...]
