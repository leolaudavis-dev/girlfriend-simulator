"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../page.module.css";
import { LAMB_TILES, LAMB_BLOBS } from "./constants";

export function LambPage({ onBack }: { onBack: () => void }) {
  const [transitioning, setTransitioning] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setTransitioning(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.lambPage}>
      <div className={styles.lambBgWrap} aria-hidden>
        <Image
          src="/iamlikewho.png"
          alt=""
          fill
          sizes="100vw"
          className={styles.lambBg}
          priority
          unoptimized
        />
      </div>
      <div
        className={`${styles.lambTransition} ${
          transitioning ? "" : styles.lambTransitionGone
        }`}
        aria-hidden
      >
        <div className={styles.lambBlobs}>
          {LAMB_BLOBS.map((b, i) => (
            <div
              key={i}
              className={styles.lambBlob}
              style={
                {
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  background: `radial-gradient(circle, hsl(${b.hueA} 80% 60% / 0.6) 0%, hsl(${b.hueB} 90% 50% / 0) 70%)`,
                  animationDuration: `${b.driftDur}s`,
                  animationDelay: `${b.driftDelay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div className={styles.lambField}>
          {LAMB_TILES.map((t, i) => (
            <div
              key={i}
              className={styles.lambTile}
              style={
                {
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  width: `${t.size}px`,
                  height: `${t.size}px`,
                  opacity: t.opacity,
                  mixBlendMode: t.blend,
                  animationDelay: `${t.pulseDelay}s`,
                  animationDuration: `${t.pulseDur}s`,
                  "--rot": `${t.rot}deg`,
                  "--flip": t.flip ? "-1" : "1",
                  "--hue": `${t.hue}deg`,
                  "--sat": `${t.sat}`,
                  "--contrast": `${t.contrast}`,
                  "--bright": `${t.bright}`,
                  "--blur": `${t.blur}px`,
                  "--invert": `${t.invert}`,
                  "--spin-dur": `${t.spinDur}s`,
                  "--spin-dir": t.spinReverse ? "reverse" : "normal",
                } as React.CSSProperties
              }
            >
              <Image
                src="/lambs.jpeg"
                alt=""
                fill
                sizes="80vw"
                className={styles.lambImg}
                unoptimized
              />
            </div>
          ))}
        </div>
        <div className={styles.lambNoise} />
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
