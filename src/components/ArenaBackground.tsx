import { forwardRef, useImperativeHandle, useRef } from 'react';
import ArenaBackgroundCore, { type ArenaBackgroundHandle } from './ArenaBackgroundCore';
import './BattlePassArena.css';

export type { ArenaBackgroundHandle } from './ArenaBackgroundCore';
export type ArenaTerrain = 'default' | 'frost' | 'volcanic' | 'spectral' | 'swamp' | 'ruins';

const PASS_ART: Partial<Record<ArenaTerrain, string>> = {
  swamp: `${import.meta.env.BASE_URL}arenas/swamp.svg`,
  ruins: `${import.meta.env.BASE_URL}arenas/ruins.svg`,
};

const ArenaBackground = forwardRef<ArenaBackgroundHandle, { terrain?: ArenaTerrain; className?: string; paused?: boolean }>(
  function ArenaBackground({ terrain = 'default', className, paused }, ref) {
    const coreRef = useRef<ArenaBackgroundHandle>(null);
    useImperativeHandle(ref, () => ({ triggerCrack: (x, y) => coreRef.current?.triggerCrack(x, y) }), []);
    const art = PASS_ART[terrain];
    if (!art) return <ArenaBackgroundCore ref={coreRef} terrain={terrain} className={className} paused={paused} />;
    const ambience = terrain === 'swamp' ? 'spectral' : 'frost';
    return (
      <div className={`${className ?? ''} battle-pass-arena-shell`} data-bp-terrain={terrain} aria-hidden="true">
        <img className="battle-pass-arena-art" src={art} alt="" draggable={false} />
        <ArenaBackgroundCore ref={coreRef} terrain={ambience} className="battle-pass-arena-core" paused={paused} />
      </div>
    );
  }
);

export default ArenaBackground;
