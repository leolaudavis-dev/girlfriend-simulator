"use client";

import { useState } from "react";
import styles from "./page.module.css";
import type { Stage } from "./_components/types";
import { CLIPS, FLAP_CLASS } from "./_components/constants";
import { KodakFlash } from "./_components/effects";
import { PixelHeart } from "./_components/PixelHeart";
import { useShell } from "./_components/Shell";

export default function Home() {
  const [stage, setStage] = useState<Stage>("closed");
  const { playMusic } = useShell();

  function handleClick() {
    setStage("envelope");
    setTimeout(() => setStage("open"), 700);
    playMusic();
  }

  return (
    <main className={styles.main}>
      {stage === "closed" && (
        <>
          <KodakFlash />
          <button className={styles.homeButton} onClick={handleClick}>
            Girlfriend Simulator
          </button>
        </>
      )}
      {stage !== "closed" && (
        <div
          className={`${styles.envelope} ${
            stage === "open" ? styles.envelopeOpen : ""
          }`}
        >
          {(["top", "bottom", "left", "right"] as const).map((corner) => (
            <div
              key={corner}
              className={`${styles.flap} ${FLAP_CLASS[corner]}`}
              style={{ clipPath: CLIPS[corner] }}
            >
              <PixelHeart />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
