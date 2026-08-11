import type { ReactNode } from 'react';
import type { ProfileFrameId } from '../store/game';

export function ProfileFrame({ frameId, className = '', children }: { frameId: ProfileFrameId; className?: string; children: ReactNode }) {
  const art = `${import.meta.env.BASE_URL}ui/frames/profile-${frameId}.webp`;
  return (
    <span className={`profile-frame profile-frame-${frameId} ${className}`.trim()} data-profile-frame={frameId}>
      <span className="profile-frame-vfx" aria-hidden="true" />
      <span className="profile-frame-portrait">{children}</span>
      <img className="profile-frame-art" src={art} alt="" aria-hidden="true" draggable={false} />
    </span>
  );
}
