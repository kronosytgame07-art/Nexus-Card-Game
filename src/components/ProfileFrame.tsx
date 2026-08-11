import type { ReactNode } from 'react';
import type { ProfileFrameId } from '../store/game';

export function ProfileFrame({ frameId, className = '', children }: { frameId: ProfileFrameId; className?: string; children: ReactNode }) {
  return (
    <span className={`profile-frame profile-frame-${frameId} ${className}`.trim()} data-profile-frame={frameId}>
      <span className="profile-frame-portrait">{children}</span>
    </span>
  );
}
