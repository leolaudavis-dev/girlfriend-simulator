"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../page.module.css";
import type { FlyPhase } from "./types";
import { SWATTER_PAD_D } from "./constants";

export function Fly({
  paused,
  onPhaseChange,
}: {
  paused: boolean;
  onPhaseChange?: (phase: FlyPhase) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const slapBufferRef = useRef<AudioBuffer | null>(null);
  const [phase, setPhase] = useState<FlyPhase>("walk");
  const [swatPos, setSwatPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  function ensureCtx(): AudioContext | null {
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    return audioCtxRef.current;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSlap() {
      const ctx = ensureCtx();
      if (!ctx) return;
      try {
        const res = await fetch("/slap.wav");
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        if (!cancelled) slapBufferRef.current = buf;
      } catch {
        // ignore — fly will just be silent
      }
    }

    function unlock() {
      ensureCtx();
      audioCtxRef.current?.resume().catch(() => {});
      if (!slapBufferRef.current) loadSlap();
    }

    loadSlap();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  function playSmack() {
    const ctx = ensureCtx();
    const buf = slapBufferRef.current;
    if (!ctx || !buf) return;
    ctx.resume().catch(() => {});
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  }

  useEffect(() => {
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: target.x, y: target.y };
    let baseRotation = 0;
    let stepIdx = 0;
    let lastStepTime = 0;
    let lastMoveTime = -Infinity;
    let phaseLocal: FlyPhase = "walk";
    let phaseStart = 0;
    let hasChased = false;
    let raf = 0;
    let lastTick = performance.now();

    const STEP_MS = 75;
    const STEP_DIST = 4;
    const STOP_RADIUS = 9;
    const MOVE_TIMEOUT = 3000;
    const WADDLE = [-3, 0, 3, 0];
    const SWAT_MS = 440;
    const SQUISH_MS = 2300;

    function apply() {
      if (!ref.current) return;
      const rot = baseRotation + WADDLE[stepIdx];
      ref.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) rotate(${rot}deg)`;
    }

    function onMove(e: MouseEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
      lastMoveTime = performance.now();
    }

    function respawn() {
      let nx = pos.x;
      let ny = pos.y;
      for (let i = 0; i < 12; i++) {
        nx = 50 + Math.random() * (window.innerWidth - 100);
        ny = 50 + Math.random() * (window.innerHeight - 100);
        if (Math.hypot(nx - target.x, ny - target.y) > 220) break;
      }
      pos.x = nx;
      pos.y = ny;
      baseRotation = Math.random() * 360;
      stepIdx = 0;
      hasChased = false;
      apply();
    }

    function tick(now: number) {
      if (pausedRef.current) {
        const delta = now - lastTick;
        lastTick = now;
        phaseStart += delta;
        lastStepTime += delta;
        lastMoveTime += delta;
        raf = requestAnimationFrame(tick);
        return;
      }
      lastTick = now;
      if (phaseLocal === "walk") {
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);
        if (hasChased && dist <= STOP_RADIUS) {
          phaseLocal = "swat";
          phaseStart = now;
          setSwatPos({ x: pos.x, y: pos.y });
          setPhase("swat");
        } else {
          const mouseMoving = now - lastMoveTime < MOVE_TIMEOUT;
          if (mouseMoving && dist > STOP_RADIUS && now - lastStepTime >= STEP_MS) {
            const stepLen = Math.min(STEP_DIST, dist);
            pos.x += (dx / dist) * stepLen;
            pos.y += (dy / dist) * stepLen;
            baseRotation = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            stepIdx = (stepIdx + 1) % WADDLE.length;
            hasChased = true;
            apply();
            lastStepTime = now;
          }
        }
      } else if (phaseLocal === "swat") {
        if (now - phaseStart >= SWAT_MS) {
          phaseLocal = "squished";
          phaseStart = now;
          setPhase("squished");
          playSmack();
        }
      } else if (phaseLocal === "squished") {
        if (now - phaseStart >= SQUISH_MS) {
          respawn();
          phaseLocal = "walk";
          phaseStart = now;
          setSwatPos(null);
          setPhase("walk");
        }
      }
      raf = requestAnimationFrame(tick);
    }

    apply();
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ref} className={styles.fly} aria-hidden>
        {phase === "squished" ? <SplatSvg /> : <FlySvg />}
      </div>
      {swatPos && (
        <div
          className={styles.swatterAnchor}
          style={{ left: swatPos.x, top: swatPos.y }}
          aria-hidden
        >
          <div className={styles.swatter}>
            <SwatterSvg />
          </div>
        </div>
      )}
    </>
  );
}

function SplatSvg() {
  return (
    <svg
      viewBox="0 0 60 50"
      className={`${styles.flySvg} ${styles.splatPop}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="30" cy="29" rx="23" ry="16" fill="rgba(38,52,22,0.22)" />
      <ellipse
        cx="17"
        cy="27"
        rx="18"
        ry="5"
        fill="rgba(205,214,224,0.5)"
        transform="rotate(-14 17 27)"
      />
      <ellipse
        cx="43"
        cy="27"
        rx="18"
        ry="5"
        fill="rgba(205,214,224,0.5)"
        transform="rotate(14 43 27)"
      />
      <path
        d="M 25 32 L 12 45"
        stroke="#090b04"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M 35 32 L 48 44"
        stroke="#090b04"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M 23 28 L 8 30"
        stroke="#090b04"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M 37 28 L 52 31"
        stroke="#090b04"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M 18 23 Q 13 20, 11 17"
        stroke="#1b2410"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 43 26 Q 48 23, 52 21"
        stroke="#1b2410"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 40 36 Q 43 41, 46 45"
        stroke="#1b2410"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 21 37 Q 19 42, 17 45"
        stroke="#1b2410"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 30 13 C 41 12, 47 21, 44 29 C 49 31, 47 40, 39 38 C 38 45, 23 45, 21 38 C 13 40, 11 31, 16 29 C 13 21, 19 14, 30 13 Z"
        fill="#1b2410"
      />
      <circle cx="11" cy="16" r="2.7" fill="#1b2410" />
      <circle cx="52" cy="20" r="3.2" fill="#1b2410" />
      <circle cx="46" cy="45" r="2.2" fill="#1b2410" />
      <circle cx="17" cy="45" r="2.4" fill="#1b2410" />
      <ellipse cx="30" cy="20" rx="4" ry="3" fill="#0a0c05" />
      <ellipse cx="27.5" cy="20" rx="1.6" ry="2" fill="#6b2a2a" />
      <ellipse cx="32.5" cy="20" rx="1.6" ry="2" fill="#6b2a2a" />
      <ellipse
        cx="25"
        cy="22"
        rx="7"
        ry="3.6"
        fill="rgba(255,255,255,0.3)"
        transform="rotate(-22 25 22)"
      />
      <ellipse
        cx="38"
        cy="31"
        rx="3.2"
        ry="1.7"
        fill="rgba(255,255,255,0.22)"
      />
      <circle cx="50.6" cy="18.8" r="1" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function SwatterSvg() {
  const rowYs = [22, 31, 40, 49, 58, 67, 76, 85];
  const slots: { x: number; y: number; w: number }[] = [];
  for (const cy of rowYs) {
    const t = (cy - 14) / (96 - 14);
    const innerL = 18 + t * (30 - 18) + 7;
    const innerR = 102 - t * (102 - 90) - 7;
    const slotW = 6.4;
    const gap = 3;
    for (let x = innerL; x + slotW <= innerR; x += slotW + gap) {
      const centerRow = cy >= 40 && cy <= 67;
      const centerX = x + slotW > 45 && x < 75;
      if (centerRow && centerX) continue;
      slots.push({ x, y: cy - 1.5, w: slotW });
    }
  }

  return (
    <svg
      viewBox="0 0 120 312"
      className={styles.swatterSvg}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="swatterCut">
          <rect x="0" y="0" width="120" height="312" fill="#000000" />
          <path d={SWATTER_PAD_D} fill="#ffffff" />
          <rect x="54" y="92" width="12" height="212" rx="6" fill="#ffffff" />
          {slots.map((s, i) => (
            <rect
              key={`slot-${i}`}
              x={s.x}
              y={s.y}
              width={s.w}
              height="3"
              rx="1"
              fill="#000000"
            />
          ))}
          <circle cx="60" cy="297" r="3.2" fill="#000000" />
        </mask>
      </defs>

      <g mask="url(#swatterCut)">
        <rect x="0" y="0" width="120" height="312" fill="#e6228a" />
      </g>

      <path
        d={SWATTER_PAD_D}
        fill="none"
        stroke="#b81a6e"
        strokeWidth="1.4"
      />
      <rect
        x="54"
        y="92"
        width="12"
        height="212"
        rx="6"
        fill="none"
        stroke="#b81a6e"
        strokeWidth="1.4"
      />

      <rect
        x="56.5"
        y="100"
        width="2.6"
        height="186"
        rx="1.3"
        fill="rgba(255,255,255,0.4)"
      />
      <path
        d="M 30 16 Q 44 9 60 9"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlySvg() {
  return (
    <svg
      viewBox="0 0 60 50"
      className={styles.flySvg}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="flyBody" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4a5235" />
          <stop offset="55%" stopColor="#171a0e" />
          <stop offset="100%" stopColor="#080a04" />
        </radialGradient>
        <linearGradient id="flyWing" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(225,232,240,0.78)" />
          <stop offset="100%" stopColor="rgba(150,168,180,0.5)" />
        </linearGradient>
      </defs>

      <ellipse
        cx="18"
        cy="22"
        rx="16"
        ry="8"
        fill="url(#flyWing)"
        stroke="rgba(70,80,92,0.4)"
        strokeWidth="0.3"
      />
      <ellipse
        cx="42"
        cy="22"
        rx="16"
        ry="8"
        fill="url(#flyWing)"
        stroke="rgba(70,80,92,0.4)"
        strokeWidth="0.3"
      />

      <path
        d="M 30 22 Q 22 18, 8 19"
        stroke="rgba(50,60,70,0.45)"
        strokeWidth="0.3"
        fill="none"
      />
      <path
        d="M 30 22 Q 22 22, 5 23"
        stroke="rgba(50,60,70,0.45)"
        strokeWidth="0.3"
        fill="none"
      />
      <path
        d="M 30 22 Q 22 26, 9 28"
        stroke="rgba(50,60,70,0.45)"
        strokeWidth="0.3"
        fill="none"
      />
      <path
        d="M 30 22 Q 38 18, 52 19"
        stroke="rgba(50,60,70,0.45)"
        strokeWidth="0.3"
        fill="none"
      />
      <path
        d="M 30 22 Q 38 22, 55 23"
        stroke="rgba(50,60,70,0.45)"
        strokeWidth="0.3"
        fill="none"
      />
      <path
        d="M 30 22 Q 38 26, 51 28"
        stroke="rgba(50,60,70,0.45)"
        strokeWidth="0.3"
        fill="none"
      />

      <path
        d="M 26 22 Q 19 26, 13 33"
        stroke="#090b04"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 27 25 Q 21 31, 17 40"
        stroke="#090b04"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 28 28 Q 25 36, 22 46"
        stroke="#090b04"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 34 22 Q 41 26, 47 33"
        stroke="#090b04"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 33 25 Q 39 31, 43 40"
        stroke="#090b04"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 32 28 Q 35 36, 38 46"
        stroke="#090b04"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx="30" cy="34" rx="8" ry="12" fill="url(#flyBody)" />
      <path
        d="M 23 30 Q 30 32.5, 37 30"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.4"
        fill="none"
      />
      <path
        d="M 22 36 Q 30 38.5, 38 36"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.4"
        fill="none"
      />
      <path
        d="M 24 42 Q 30 44.5, 36 42"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.4"
        fill="none"
      />

      <ellipse cx="30" cy="20" rx="6.5" ry="6" fill="url(#flyBody)" />

      <ellipse cx="30" cy="10" rx="5" ry="4.5" fill="#0a0c05" />

      <ellipse cx="27" cy="9.2" rx="2.3" ry="3" fill="#6b2a2a" />
      <ellipse cx="33" cy="9.2" rx="2.3" ry="3" fill="#6b2a2a" />
      <ellipse
        cx="26.4"
        cy="8.2"
        rx="0.6"
        ry="0.8"
        fill="#ffffff"
        opacity="0.75"
      />
      <ellipse
        cx="32.4"
        cy="8.2"
        rx="0.6"
        ry="0.8"
        fill="#ffffff"
        opacity="0.75"
      />

      <path
        d="M 28.5 6 Q 27.5 4, 27 1.8"
        stroke="#0a0c05"
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 31.5 6 Q 32.5 4, 33 1.8"
        stroke="#0a0c05"
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
