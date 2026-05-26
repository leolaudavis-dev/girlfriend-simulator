"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "../page.module.css";
import {
  BLOOD_DRIPS,
  BLOOD_DROPLETS,
  TRANSITION_VIDEO_ID,
  TRANSITION_RANGE_SEC,
} from "./constants";

export function GlitterTrail() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastSpawn = 0;
    let lastX = 0;
    let lastY = 0;
    let hasLast = false;

    function onMove(e: PointerEvent) {
      const now = performance.now();
      const dx = hasLast ? e.clientX - lastX : 0;
      const dy = hasLast ? e.clientY - lastY : 0;
      const moved = Math.hypot(dx, dy);
      lastX = e.clientX;
      lastY = e.clientY;
      hasLast = true;

      if (now - lastSpawn < 35 || moved < 4) return;
      lastSpawn = now;

      const container = containerRef.current;
      if (!container) return;

      const count = Math.random() < 0.25 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const el = document.createElement("div");
        el.className = styles.glitterParticle;
        const size = 12 + Math.random() * 22;
        const offsetX = (Math.random() - 0.5) * 18;
        const offsetY = (Math.random() - 0.5) * 18;
        const drift = (Math.random() - 0.5) * 80;
        const fall = 30 + Math.random() * 60;
        const rotStart = Math.random() * 360;
        const rotEnd = rotStart + (Math.random() - 0.5) * 540;
        const dur = 1100 + Math.random() * 700;
        el.style.left = `${e.clientX + offsetX}px`;
        el.style.top = `${e.clientY + offsetY}px`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.animationDuration = `${dur}ms`;
        el.style.setProperty("--drift-x", `${drift}px`);
        el.style.setProperty("--fall-y", `${fall}px`);
        el.style.setProperty("--rot-start", `${rotStart}deg`);
        el.style.setProperty("--rot-end", `${rotEnd}deg`);
        container.appendChild(el);
        el.addEventListener(
          "animationend",
          () => el.remove(),
          { once: true },
        );
      }
    }

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={containerRef} className={styles.glitterContainer} aria-hidden />
  );
}

export function KodakFlash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer = 0;
    let hideTimer = 0;

    function scheduleShow() {
      const delay = 6000 + Math.random() * 18000;
      showTimer = window.setTimeout(() => {
        setVisible(true);
        const duration = 350 + Math.random() * 1400;
        hideTimer = window.setTimeout(() => {
          setVisible(false);
          scheduleShow();
        }, duration);
      }, delay);
    }

    scheduleShow();
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className={styles.kodakFlash} aria-hidden>
      <Image
        src="/myname.png"
        alt=""
        fill
        sizes="100vw"
        className={styles.kodakFlashImg}
        priority
        unoptimized
      />
    </div>
  );
}

export function BloodScene() {
  return (
    <>
      <div className={styles.bloodTint} />
      <div className={styles.bloodBand} />
      {BLOOD_DRIPS.map((d, i) => (
        <div
          key={`drip-${i}`}
          className={styles.bloodDrip}
          style={{
            left: d.left,
            width: d.width,
            height: d.height,
            animationDelay: d.delay,
            animationDuration: d.duration,
          }}
        />
      ))}
      {BLOOD_DROPLETS.map((d, i) => (
        <div
          key={`drop-${i}`}
          className={styles.bloodDroplet}
          style={{
            left: d.left,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            animationDuration: d.duration,
          }}
        />
      ))}
    </>
  );
}

export function PageTransition({ onDone }: { onDone?: () => void }) {
  const [segment] = useState(() => ({
    start: Math.floor(Math.random() * TRANSITION_RANGE_SEC),
  }));
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(true);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  function handleDismiss() {
    if (fading) return;
    setFading(true);
    window.setTimeout(() => {
      setMounted(false);
      onDoneRef.current?.();
    }, 700);
  }

  if (!mounted) return null;

  const { start } = segment;
  const src =
    `https://www.youtube.com/embed/${TRANSITION_VIDEO_ID}` +
    `?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&rel=0` +
    `&playsinline=1&loop=1&start=${start}` +
    `&playlist=${TRANSITION_VIDEO_ID}`;

  return (
    <button
      type="button"
      className={`${styles.pageTransition} ${
        fading ? styles.pageTransitionFading : ""
      }`}
      onClick={handleDismiss}
      aria-label="Close video"
    >
      <iframe
        className={styles.pageTransitionVideo}
        src={src}
        title="transition"
        allow="autoplay; encrypted-media"
        loading="eager"
      />
    </button>
  );
}
