import React, { useMemo } from "react";
import styles from "../styles/hand.module.css";

export type CardData = { id: string; name?: string; image?: string };

type Props = {
  cards: CardData[];
  isOpen: boolean;
  onPlayCard: (cardId: string) => void;
  onRequestClose?: () => void;
};

const PlayerHand: React.FC<Props> = ({ cards, isOpen, onPlayCard, onRequestClose }) => {
  const count = cards.length;
  const spacing = useMemo(() => {
    const max = 56;
    const base = Math.max(-24, Math.min(max, Math.round(max - Math.max(0, count - 5) * 8)));
    return base;
  }, [count]);
  const centerIndex = (count - 1) / 2;

  return (
    <div className={`${styles.handRoot} ${isOpen ? styles.open : styles.closed}`} role="region" aria-label="Player hand">
      <div className={styles.handInner}>
        {cards.map((card, i) => {
          const offset = Math.round((i - centerIndex) * spacing);
          const zIndex = 1000 + i;
          const style: React.CSSProperties = {
            left: "50%",
            transform: `translateX(calc(-50% + ${offset}px))`,
            zIndex,
            width: "var(--card-width)",
            height: "var(--card-height)",
            position: 'absolute'
          };
          return (
            <button
              key={card.id}
              className={styles.cardButton}
              style={style}
              onClick={() => { onPlayCard(card.id); onRequestClose?.(); }}
              aria-label={`Jouer ${card.name ?? card.id}`}
            >
              <img src={card.image ?? ''} alt={card.name ?? ''} className={styles.cardImg} />
              <div className={styles.cardName}>{card.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerHand;
