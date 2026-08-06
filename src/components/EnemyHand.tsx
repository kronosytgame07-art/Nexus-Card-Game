import React, { useMemo } from "react";
import styles from "../styles/hand.module.css";
import type { CardData } from "./PlayerHand";

type Props = {
  cards: CardData[];
  isOpen: boolean;
};

const EnemyHand: React.FC<Props> = ({ cards, isOpen }) => {
  const count = cards.length;
  const spacing = useMemo(() => {
    const max = 56;
    const base = Math.max(-20, Math.min(max, Math.round(max - Math.max(0, count - 5) * 6)));
    return base;
  }, [count]);
  const centerIndex = (count - 1) / 2;

  return (
    <div className={`${styles.enemyHandRoot} ${isOpen ? styles.open : styles.closed}`} role="region" aria-label="Enemy hand">
      <div className={styles.handInner}>
        {cards.map((card, i) => {
          const offset = Math.round((i - centerIndex) * spacing);
          const style: React.CSSProperties = {
            left: "50%",
            transform: `translateX(calc(-50% + ${offset}px))`,
            zIndex: 2000 + i,
            width: "var(--card-width)",
            height: `calc(var(--card-height) * 1.08)`,
            position: 'absolute'
          };
          return (
            <div key={card.id} className={styles.cardBackWrapper} style={style} aria-hidden>
              <img src={card.image ?? ''} alt="" className={styles.cardImgBack} />
            </div>
          );
        })}
        <div className={styles.enemyCount}>{cards.length}</div>
      </div>
    </div>
  );
};

export default EnemyHand;
