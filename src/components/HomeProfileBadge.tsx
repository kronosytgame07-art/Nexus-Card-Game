import { Link, useLocation } from 'react-router-dom';
import { ALL_CARDS, useGame } from '../store/game';
import { ProfileFrame } from './ProfileFrame';

const GEM_ICON = `${import.meta.env.BASE_URL}ui/nexus-gem.webp`;
const COIN_ICON = `${import.meta.env.BASE_URL}ui/nexus-coin.webp`;

export default function HomeProfileBadge() {
  const location = useLocation();
  const state = useGame();
  if (location.pathname !== '/') return null;

  const avatar = ALL_CARDS.find((card) => card.id === state.avatarCardId);
  return (
    <Link to="/profil" className="home-profile-badge" aria-label="Ouvrir le profil">
      <ProfileFrame frameId={state.selectedProfileFrame} className="home-profile-avatar">
        {avatar?.image ? <img src={avatar.image} alt="" draggable={false} /> : <span className="home-profile-avatar-fallback" aria-hidden="true" />}
      </ProfileFrame>
      <span className="home-profile-main">
        <b>{state.playerName}</b>
        <small>Niveau {state.level}</small>
      </span>
      <span className="home-profile-wallet">
        <em><img src={GEM_ICON} alt="" aria-hidden="true" />{state.gems}</em>
        <em><img src={COIN_ICON} alt="" aria-hidden="true" />{state.gold}</em>
      </span>
    </Link>
  );
}
