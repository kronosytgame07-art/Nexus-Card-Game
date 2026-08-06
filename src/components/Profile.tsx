import React from "react";
import styles from "../styles/profile.module.css";

const deckAvatarMap: Record<string, string> = {
  Meute: `${import.meta.env.BASE_URL}avatars/wolf.png`,
  Chevalier: `${import.meta.env.BASE_URL}avatars/knight.png`,
};

type Props = {
  playerName: string;
  deckKey: string;
  title?: string;
  isEnemy?: boolean;
};

const Profile: React.FC<Props> = ({ playerName, deckKey, title, isEnemy }) => {
  const avatar = deckAvatarMap[deckKey] || `${import.meta.env.BASE_URL}avatars/default.png`;
  return (
    <div className={styles.profileRoot} aria-label={isEnemy ? "Profil adversaire" : "Profil joueur"}>
      <img src={avatar} alt={`${deckKey} avatar`} className={styles.avatar} />
      <div className={styles.text}>
        <div className={styles.name}>{title ?? playerName}</div>
        <div className={styles.deck}>{deckKey ? `Deck ${deckKey}` : "Deck inconnu"}</div>
      </div>
    </div>
  );
};

export default Profile;
