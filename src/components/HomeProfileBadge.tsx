import { Link, useLocation } from 'react-router-dom';
import { ALL_CARDS, useGame } from '../store/game';

export default function HomeProfileBadge() {
  const location = useLocation();
  const state = useGame();
  if (location.pathname !== '/') return null;

  const avatar = ALL_CARDS.find((card) => card.id === state.avatarCardId);
  return (
    <Link to="/profil" className="home-profile-badge" aria-label="Ouvrir le profil">
      <span className="home-profile-avatar">
        {avatar?.image ? <img src={avatar.image} alt="" draggable={false} /> : <b>✦</b>}
      </span>
      <span className="home-profile-main">
        <b>{state.playerName}</b>
        <small>Niveau {state.level}</small>
      </span>
      <span className="home-profile-wallet">
        <em>💎 {state.gems}</em>
        <em>🪙 {state.gold}</em>
      </span>
    </Link>
  );
}
