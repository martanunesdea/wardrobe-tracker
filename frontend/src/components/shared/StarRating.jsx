import styles from "./StarRating.module.css";

export default function StarRating({ value = 0, max = 5, interactive = false, onChange, size = "md" }) {
  const isInteractive = interactive || !!onChange;
  return (
    <span className={`${styles.stars} ${styles[size]}`} aria-label={`${value} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return isInteractive ? (
          <button
            key={i}
            type="button"
            className={`${styles.star} ${filled ? styles.filled : styles.empty}`}
            onClick={() => onChange?.(i + 1)}
            aria-label={`Rate ${i + 1}`}
          >
            ★
          </button>
        ) : (
          <span key={i} className={`${styles.star} ${filled ? styles.filled : styles.empty}`}>
            ★
          </span>
        );
      })}
    </span>
  );
}

export function RatingBar({ avg = 0, target = 5, width = 100 }) {
  const pct = target > 0 ? Math.min((avg / target) * 100, 100) : 0;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className={styles.ratingBar}>
      <div className={styles.ratingTrack} style={{ width }}>
        <div
          className={styles.ratingFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={styles.ratingLabel}>
        {avg.toFixed(1)}/{target}
      </span>
    </div>
  );
}
