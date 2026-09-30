import styles from "./Shimmer.module.css";

type ShimmerProps = {
  /** Rows to render for a table-shaped skeleton. */
  rows?: number;
  /** Card-shaped skeleton instead of rows (for stat cards, profile cards, etc.) */
  variant?: "rows" | "cards";
  /** How many cards, when variant="cards". */
  count?: number;
};

// A content-shaped loading placeholder, used in place of plain "Loading…"
// text. This is most of what makes a page feel fast: the layout doesn't
// jump once real data arrives, because the skeleton already occupies the
// right shape.
export default function Shimmer({ rows = 4, variant = "rows", count = 3 }: ShimmerProps) {
  if (variant === "cards") {
    return (
      <div className={styles.cardGrid} role="status" aria-label="Loading">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.card}>
            <div className={`${styles.bar} ${styles.short}`} />
            <div className={`${styles.bar} ${styles.medium}`} />
            <div className={`${styles.bar} ${styles.short}`} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={styles.rows} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.row}>
          <div className={`${styles.bar} ${styles.avatar}`} />
          <div className={styles.rowBody}>
            <div className={`${styles.bar} ${styles.medium}`} />
            <div className={`${styles.bar} ${styles.long}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
