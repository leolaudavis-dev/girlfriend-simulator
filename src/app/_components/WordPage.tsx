"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";
import { WORD_BALL_LAYOUT } from "./constants";

export function WordPage({ onBack }: { onBack: () => void }) {
  const [stage, setStage] = useState<"closed" | "open" | "settled">("closed");

  useEffect(() => {
    const r1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStage("open"));
    });
    const t = window.setTimeout(() => setStage("settled"), 1500);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      className={`${styles.wordPage} ${
        stage !== "closed" ? styles.wordBallOpen : ""
      } ${stage === "settled" ? styles.wordPageSettled : ""}`}
    >
      <div className={styles.wordBall} aria-hidden>
        {WORD_BALL_LAYOUT.map((item, i) => (
          <span
            key={i}
            className={styles.wordBallWord}
            style={
              {
                "--x": `${item.x}px`,
                "--y": `${item.y}px`,
                "--rot": `${item.rot}deg`,
                "--size": `${item.size}rem`,
                "--delay": `${item.delay}s`,
                "--tilt-x": `${item.tiltX}px`,
                "--tilt-y": `${item.tiltY}px`,
              } as React.CSSProperties
            }
          >
            {item.word}
          </span>
        ))}
      </div>
      <div className={styles.wordPageContent}>
        <h2 className={styles.wordPageHeading}>untitled</h2>
        <p className={styles.wordPageBody}>
          placeholder — content goes here
        </p>
      </div>
      <button
        type="button"
        className={styles.wordPageBack}
        onClick={onBack}
      >
        ← back
      </button>
    </div>
  );
}
