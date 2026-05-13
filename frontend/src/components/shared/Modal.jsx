// frontend/src/components/shared/Modal.jsx
// Generic accessible modal overlay.

import { useEffect } from "react";
import styles from "./Modal.module.css";

export default function Modal({ title, onClose, children, wide = false }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.dialog} ${wide ? styles.wide : ""}`} role="dialog" aria-modal aria-label={title}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
