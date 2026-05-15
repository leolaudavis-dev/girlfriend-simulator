"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

type Stage = "closed" | "envelope" | "open";
type Corner = "top" | "bottom" | "left" | "right";

const AUDIO_VIDEO_ID = "t4_5P_sWGyA";

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: object) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const N = 32;
const HALF = N / 2;

function steppedTriangle(corner: Corner): string {
  const pts: [number, number][] = [];

  if (corner === "top") {
    pts.push([0, 0], [N, 0]);
    let x = N, y = 0;
    for (let i = 0; i < HALF; i++) {
      y++;
      pts.push([x, y]);
      x--;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      x--;
      pts.push([x, y]);
      y--;
      pts.push([x, y]);
    }
  } else if (corner === "bottom") {
    pts.push([N, N]);
    let x = N, y = N;
    for (let i = 0; i < HALF; i++) {
      y--;
      pts.push([x, y]);
      x--;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      x--;
      pts.push([x, y]);
      y++;
      pts.push([x, y]);
    }
  } else if (corner === "left") {
    pts.push([0, 0]);
    let x = 0, y = 0;
    for (let i = 0; i < HALF; i++) {
      x++;
      pts.push([x, y]);
      y++;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      y++;
      pts.push([x, y]);
      x--;
      pts.push([x, y]);
    }
  } else {
    pts.push([N, 0]);
    let x = N, y = 0;
    for (let i = 0; i < HALF; i++) {
      x--;
      pts.push([x, y]);
      y++;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      y++;
      pts.push([x, y]);
      x++;
      pts.push([x, y]);
    }
  }

  return `polygon(${pts
    .map(([x, y]) => `${(x / N) * 100}% ${(y / N) * 100}%`)
    .join(", ")})`;
}

const CLIPS: Record<Corner, string> = {
  top: steppedTriangle("top"),
  bottom: steppedTriangle("bottom"),
  left: steppedTriangle("left"),
  right: steppedTriangle("right"),
};

const FLAP_CLASS: Record<Corner, string> = {
  top: styles.flapTop,
  bottom: styles.flapBottom,
  left: styles.flapLeft,
  right: styles.flapRight,
};

const HEART_PIXELS = [
  "0110110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];

function PixelHeart() {
  return (
    <svg
      className={styles.heart}
      viewBox={`0 0 ${HEART_PIXELS[0].length} ${HEART_PIXELS.length}`}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {HEART_PIXELS.flatMap((row, y) =>
        row
          .split("")
          .map((c, x) =>
            c === "1" ? (
              <rect
                key={`${x},${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill="#d63a3a"
              />
            ) : null,
          ),
      )}
    </svg>
  );
}

type FlyPhase = "walk" | "swat" | "squished";

function Fly({
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
      {/* wet spread halo */}
      <ellipse cx="30" cy="29" rx="23" ry="16" fill="rgba(38,52,22,0.22)" />
      {/* flattened wings */}
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
      {/* squished legs */}
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
      {/* sticky strands stretching to droplets */}
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
      {/* main sticky blob */}
      <path
        d="M 30 13 C 41 12, 47 21, 44 29 C 49 31, 47 40, 39 38 C 38 45, 23 45, 21 38 C 13 40, 11 31, 16 29 C 13 21, 19 14, 30 13 Z"
        fill="#1b2410"
      />
      {/* gooey droplets */}
      <circle cx="11" cy="16" r="2.7" fill="#1b2410" />
      <circle cx="52" cy="20" r="3.2" fill="#1b2410" />
      <circle cx="46" cy="45" r="2.2" fill="#1b2410" />
      <circle cx="17" cy="45" r="2.4" fill="#1b2410" />
      {/* head smear */}
      <ellipse cx="30" cy="20" rx="4" ry="3" fill="#0a0c05" />
      <ellipse cx="27.5" cy="20" rx="1.6" ry="2" fill="#6b2a2a" />
      <ellipse cx="32.5" cy="20" rx="1.6" ry="2" fill="#6b2a2a" />
      {/* wet glossy highlights */}
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

const SWATTER_PAD_D =
  "M 24 13 Q 60 5 96 13 Q 103 15 102 24 L 93 86 Q 92 95 84 96 L 36 96 Q 28 95 27 86 L 18 24 Q 17 15 24 13 Z";

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

      {/* hot-pink swatter, slots + hang hole punched out */}
      <g mask="url(#swatterCut)">
        <rect x="0" y="0" width="120" height="312" fill="#e6228a" />
      </g>

      {/* edge definition */}
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

      {/* glossy plastic highlights */}
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

        {/* wings (behind body) */}
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

        {/* wing veins */}
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

        {/* legs */}
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

        {/* abdomen */}
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

        {/* thorax */}
        <ellipse cx="30" cy="20" rx="6.5" ry="6" fill="url(#flyBody)" />

        {/* head */}
        <ellipse cx="30" cy="10" rx="5" ry="4.5" fill="#0a0c05" />

        {/* compound eyes */}
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

        {/* antennae */}
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

function LightSwitch({
  on,
  onToggle,
  side,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  side: "left" | "right";
  label: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.lightSwitch} ${
        side === "left" ? styles.lightSwitchLeft : styles.lightSwitchRight
      }`}
      onClick={onToggle}
      aria-label={label}
      aria-pressed={on}
    >
      <svg
        viewBox="0 0 70 110"
        className={styles.lightSwitchSvg}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* wall plate */}
        <rect
          x="2"
          y="2"
          width="66"
          height="106"
          rx="8"
          fill="#e6228a"
          stroke="#b81a6e"
          strokeWidth="1.5"
        />
        {/* screws */}
        <circle
          cx="35"
          cy="13"
          r="3.2"
          fill="#c4156f"
          stroke="#9c1158"
          strokeWidth="0.8"
        />
        <line
          x1="32.5"
          y1="13"
          x2="37.5"
          y2="13"
          stroke="#7a0d44"
          strokeWidth="0.9"
        />
        <circle
          cx="35"
          cy="97"
          r="3.2"
          fill="#c4156f"
          stroke="#9c1158"
          strokeWidth="0.8"
        />
        <line
          x1="32.5"
          y1="97"
          x2="37.5"
          y2="97"
          stroke="#7a0d44"
          strokeWidth="0.9"
        />
        {/* recessed switch housing */}
        <rect
          x="25"
          y="30"
          width="20"
          height="50"
          rx="3"
          fill="#c4156f"
          stroke="#9c1158"
          strokeWidth="1"
        />
        {/* toggle lever */}
        <g className={on ? styles.toggleOn : styles.toggleOff}>
          <rect
            x="28"
            y="38"
            width="14"
            height="34"
            rx="3"
            fill="#ff8fc8"
            stroke="#b81a6e"
            strokeWidth="1"
          />
          <rect
            x="28"
            y="38"
            width="14"
            height="8"
            rx="3"
            fill="#ffffff"
            opacity="0.7"
          />
        </g>
      </svg>
    </button>
  );
}

const TRANSITION_VIDEO_ID = "aUrkWgakn7U";
const TRANSITION_RANGE_SEC = 90;

function PageTransition({ onDone }: { onDone?: () => void }) {
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

function GlitterTrail() {
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

      // throttle: spawn at most every 35ms, and only if moved enough
      if (now - lastSpawn < 35 || moved < 4) return;
      lastSpawn = now;

      const container = containerRef.current;
      if (!container) return;

      // small chance to spawn a double burst
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

function KodakFlash() {
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

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const BLOOD_DRIPS = (() => {
  const count = 16;
  const seg = 100 / count;
  return Array.from({ length: count }, (_, i) => ({
    left: `${(i * seg + pseudoRandom(i * 1.7 + 0.3) * seg * 0.55).toFixed(2)}%`,
    width: `${(10 + pseudoRandom(i * 2.3 + 1.1) * 22).toFixed(1)}px`,
    height: `${(28 + pseudoRandom(i * 3.1 + 2.6) * 120).toFixed(1)}px`,
    delay: `${(pseudoRandom(i * 4.5 + 0.9) * 3.5).toFixed(2)}s`,
    duration: `${(4 + pseudoRandom(i * 5.9 + 3.4) * 4.5).toFixed(2)}s`,
  }));
})();

const BLOOD_DROPLETS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(pseudoRandom(i * 1.3 + 7.7) * 100).toFixed(2)}%`,
  size: `${(5 + pseudoRandom(i * 2.1 + 4.2) * 9).toFixed(1)}px`,
  delay: `${(pseudoRandom(i * 3.7 + 9.1) * 7).toFixed(2)}s`,
  duration: `${(3.5 + pseudoRandom(i * 6.3 + 5.5) * 4).toFixed(2)}s`,
}));

function BloodScene() {
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

const WEBPICS = [
  "aboutme.jpg",
  "amateurhour12.jpg",
  "artverb.png",
  "ben.jpg",
  "birthday.jpg",
  "cliffhangers.jpg",
  "cutekitty.jpg",
  "cybersextant.jpg",
  "distoredmovie.png",
  "distortedmovie2.png",
  "distortion-field.jpg",
  "fantasia-vampire.png",
  "fullforce.jpg",
  "gayscience.jpg",
  "gfsim.png",
  "gfsimlogo.png",
  "goddess.png",
  "halftonesanctuary.png",
  "halloween.jpg",
  "iamlikewho.png",
  "img_5927.jpg",
  "img_6759.jpg",
  "itfeelslike.jpg",
  "iwanna.jpg",
  "johnnyfans.jpg",
  "kissyourselfb.jpg",
  "kittens.png",
  "likethelamb.png",
  "limitbreak.jpg",
  "me3.jpg",
  "mederp.jpg",
  "meturning.webp",
  "milers.png",
  "morelia.jpg",
  "mylifeis.jpg",
  "myname.png",
  "myp.png",
  "nobodyknows.jpg",
  "normiecorps.jpg",
  "p-lezgetlucky-165.jpg",
  "racks.webp",
  "smile.jpg",
  "sweetpwuss.jpg",
  "synth.jpg",
  "thotpaper.png",
  "yabujin.jpg",
];

const STICKERS = [
  { src: "bootstick.png", label: "$3.00" },
  { src: "girlfriendmommy.png", label: "$3.00" },
  { src: "ivant.png", label: "$3.00" },
  { src: "lovemylife.png", label: "$3.00" },
  { src: "gfsim.png", label: "$3.00" },
  { src: "prescription-pop.png", label: "$3.00" },
  { src: "boppers4.png", label: "$3.00" },
  { src: "knobodyknowsfr.png", label: "$3.00" },
  { src: "myp.png", label: "$3.00" },
  { src: "gfsimlogo.png", label: "$3.00" },
  { src: "kissyourselfb.jpg", label: "preorder" },
];

function AboutPage({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<
    "logo" | "goddess" | "white" | "merch"
  >("logo");
  const [engulfingIdx, setEngulfingIdx] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase("goddess"), 2400);
    return () => clearTimeout(t);
  }, []);

  function openFolder(idx: number) {
    setEngulfingIdx(idx);
    setTimeout(() => setPhase(idx === 1 ? "merch" : "white"), 750);
  }

  return (
    <div
      className={`${styles.aboutPage} ${
        phase === "logo" ? styles.aboutPageLogo : ""
      }`}
    >
      {phase === "logo" && (
        <div className={styles.aboutLogoWrap}>
          <Image
            src="/gfsimlogo.png"
            alt=""
            width={1366}
            height={768}
            sizes="70vw"
            className={styles.aboutLogo}
            priority
          />
        </div>
      )}
      {phase === "goddess" && (
        <>
          <Image
            src="/goddess.png"
            alt=""
            fill
            sizes="100vw"
            className={styles.aboutBg}
            priority
          />
          <button
            type="button"
            className={`${styles.aboutFolder} ${
              engulfingIdx === 0 ? styles.aboutFolderEngulf : ""
            }`}
            onClick={() => openFolder(0)}
            aria-label="Open taxes folder"
          >
            <Image
              src="/folder8bit.png"
              alt=""
              width={2100}
              height={1500}
              sizes="160px"
              className={styles.aboutFolderImg}
            />
            <span className={styles.aboutFolderLabel}>taxes</span>
          </button>
          <button
            type="button"
            className={`${styles.aboutFolder} ${styles.aboutFolderAbove} ${
              engulfingIdx === 1
                ? `${styles.aboutFolderEngulf} ${styles.aboutFolderEngulfDark}`
                : ""
            }`}
            onClick={() => openFolder(1)}
            aria-label="Open assets folder"
          >
            <Image
              src="/folder8bit.png"
              alt=""
              width={2100}
              height={1500}
              sizes="160px"
              className={styles.aboutFolderImg}
            />
            <span className={styles.aboutFolderLabel}>assets</span>
          </button>
        </>
      )}
      {phase === "white" && (
        <div className={styles.aboutWhite}>
          <div className={styles.whiteGrid}>
            {WEBPICS.map((name) => (
              <button
                key={name}
                type="button"
                className={styles.whiteCell}
                onClick={() => setLightbox(`/webpics/${name}`)}
              >
                <Image
                  src={`/webpics/${name}`}
                  alt=""
                  fill
                  sizes="33vw"
                  className={styles.whiteCellImg}
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}
      {phase === "merch" && (
        <div className={styles.aboutMerch}>
          <Image
            src="/merch.png"
            alt="GFSIM Merch"
            width={2100}
            height={575}
            sizes="100vw"
            className={styles.aboutMerchBanner}
            priority
          />
          <div className={styles.venmoBanner}>
            <div className={styles.venmoScroll}>
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i}>venmo:gfsim</span>
              ))}
            </div>
          </div>
          <div className={styles.merchGrid}>
            {STICKERS.map((item) => (
              <div key={item.src} className={styles.merchItem}>
                <button
                  type="button"
                  className={styles.merchCell}
                  onClick={() => setLightbox(`/stickers/${item.src}`)}
                >
                  <Image
                    src={`/stickers/${item.src}`}
                    alt=""
                    fill
                    sizes="25vw"
                    className={styles.merchCellImg}
                  />
                </button>
                <p className={styles.merchPrice}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {lightbox && (
        <button
          type="button"
          className={styles.lightbox}
          onClick={() => setLightbox(null)}
          aria-label="Close image"
        >
          <Image
            src={lightbox}
            alt=""
            fill
            sizes="100vw"
            className={styles.lightboxImg}
            unoptimized
          />
        </button>
      )}
      <button
        type="button"
        className={styles.aboutClose}
        onClick={() => {
          if (phase === "merch" || phase === "white") {
            setEngulfingIdx(null);
            setPhase("goddess");
          } else {
            onClose();
          }
        }}
      >
        ← back
      </button>
    </div>
  );
}

const CODE_LINES = [
  "i love my life",
  "but i'm living in a dream",
  "where the world just gets brighter",
  "but i'm afraid to stay alive",
  "cause everyone just leaves or dies",
  "so i'm waiting for the next best thing",
  "to wear me down.",
  "i love my life,",
  "it's getting better by the moment.",
  "i- i'm in paradise",
  "but i'm afraid to stay alive",
  "cause everyone's just picking sides",
  "and they take it from our wallets",
  "cause they're using full force to save.",
  "i love my life",
  "but i build up like a tower",
  "and then i just kick myself down",
  "cause i'm afraid to stay alive,",
  "i burn a bridge to say goodbye",
  "and i blame it on you",
  "cause you know i can't bare the shame.",
];

const DERP_MENU_ITEMS = ["option 1", "shrek", "option 3", "option 4"];

const WORD_BALL_WORDS = [
  "love",
  "life",
  "dream",
  "world",
  "brighter",
  "afraid",
  "alive",
  "everyone",
  "leaves",
  "dies",
  "waiting",
  "next",
  "best",
  "thing",
  "wear",
  "down",
  "paradise",
  "picking",
  "sides",
  "wallets",
  "full",
  "force",
  "save",
  "build",
  "tower",
  "kick",
  "myself",
  "burn",
  "bridge",
  "goodbye",
  "blame",
  "shame",
  "moment",
  "living",
  "stay",
  "getting",
  "better",
  "i love",
  "i'm",
  "me",
  "you",
  "bare",
];

const WORD_BALL_LAYOUT = WORD_BALL_WORDS.map((word, i) => {
  const angle = pseudoRandom(i * 1.7 + 0.5) * Math.PI * 2;
  const radius = 50 + pseudoRandom(i * 3.1 + 1.2) * 280;
  return {
    word,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rot: (pseudoRandom(i * 4.3 + 2.7) - 0.5) * 60,
    size: 1 + pseudoRandom(i * 5.5 + 3.4) * 2,
    delay: pseudoRandom(i * 7.1 + 4.2) * 0.45,
    tiltX: (pseudoRandom(i * 8.9 + 5.6) - 0.5) * 30,
    tiltY: (pseudoRandom(i * 11.3 + 6.1) - 0.5) * 30,
  };
});

function WordPage({ onBack }: { onBack: () => void }) {
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

const LAMB_BLEND_MODES = [
  "difference",
  "exclusion",
  "screen",
  "multiply",
  "hard-light",
  "overlay",
  "color-dodge",
] as const;

const LAMB_TILES = Array.from({ length: 14 }, (_, i) => {
  const blendIdx = Math.floor(
    pseudoRandom(i * 22.3 + 13.5) * LAMB_BLEND_MODES.length,
  );
  return {
    x: pseudoRandom(i * 1.3 + 0.7) * 100,
    y: pseudoRandom(i * 2.7 + 1.9) * 100,
    size: 200 + pseudoRandom(i * 3.5 + 2.1) * 760,
    rot: pseudoRandom(i * 4.9 + 3.5) * 360,
    spinDur: 22 + pseudoRandom(i * 7.7 + 5.1) * 70,
    spinReverse: pseudoRandom(i * 6.1 + 4.3) > 0.5,
    flip: pseudoRandom(i * 9.1 + 6.4) > 0.5,
    hue: Math.floor(pseudoRandom(i * 11.3 + 7.2) * 360),
    sat: 0.5 + pseudoRandom(i * 12.5 + 7.8) * 3.2,
    contrast: 0.5 + pseudoRandom(i * 14.1 + 8.0) * 2.5,
    bright: 0.6 + pseudoRandom(i * 16.3 + 9.2) * 1.3,
    blur:
      pseudoRandom(i * 18.5 + 10.7) > 0.55
        ? pseudoRandom(i * 19.7 + 11.4) * 28
        : 0,
    invert: pseudoRandom(i * 21.1 + 12.5) > 0.65 ? 1 : 0,
    pulseDelay: pseudoRandom(i * 13.7 + 8.1) * 6,
    pulseDur: 6 + pseudoRandom(i * 15.9 + 9.3) * 14,
    opacity: 0.55 + pseudoRandom(i * 17.1 + 10.4) * 0.45,
    blend: LAMB_BLEND_MODES[blendIdx],
  };
});

const LAMB_BLOBS = Array.from({ length: 5 }, (_, i) => ({
  x: pseudoRandom(i * 4.7 + 41.3) * 100,
  y: pseudoRandom(i * 5.9 + 42.7) * 100,
  size: 320 + pseudoRandom(i * 7.1 + 43.9) * 540,
  hueA: Math.floor(pseudoRandom(i * 9.3 + 44.5) * 360),
  hueB: Math.floor(pseudoRandom(i * 11.7 + 45.1) * 360),
  driftDur: 28 + pseudoRandom(i * 13.9 + 46.3) * 38,
  driftDelay: pseudoRandom(i * 15.1 + 47.7) * 12,
}));

function LambPage({ onBack }: { onBack: () => void }) {
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

function DerpPage({
  onClose,
  onPlayTransition,
}: {
  onClose: () => void;
  onPlayTransition: () => void;
}) {
  const [phase, setPhase] = useState<
    "image" | "code" | "wordPage" | "lambPage"
  >("image");
  const [derpMenuOpen, setDerpMenuOpen] = useState(false);
  const [negativeFlash, setNegativeFlash] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (phase !== "image" && phase !== "code") return;
    let showTimer = 0;
    let isFlashing = false;

    function scheduleFlash() {
      const delay = 2500 + Math.random() * 11000;
      showTimer = window.setTimeout(() => {
        isFlashing = true;
        setNegativeFlash(true);
      }, delay);
    }

    function onMove() {
      if (!isFlashing) return;
      isFlashing = false;
      setNegativeFlash(false);
      scheduleFlash();
    }

    scheduleFlash();
    window.addEventListener("mousemove", onMove);
    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("mousemove", onMove);
      setNegativeFlash(false);
    };
  }, [phase]);

  useEffect(() => {
    const t = setTimeout(() => setPhase("code"), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase === "image" || phase === "code") {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [phase]);

  return (
    <div className={styles.derpPage}>
      <audio ref={audioRef} src="/i-love-my-life.wav" loop />
      <Image
        src="/meturning.webp"
        alt=""
        fill
        sizes="100vw"
        className={styles.derpImage}
        priority
        unoptimized
      />
      {negativeFlash && (
        <Image
          src="/meturning.webp"
          alt=""
          fill
          sizes="100vw"
          className={styles.derpNegativeFlash}
          unoptimized
        />
      )}
      {phase === "code" && (
        <div className={styles.derpCode}>
          <div className={styles.derpCodeScroll}>
            {[...CODE_LINES, ...CODE_LINES].map((line, i) => (
              <div key={i}>{line || " "}</div>
            ))}
          </div>
          <div
            className={`${styles.derpCodeScroll} ${styles.derpCodeScrollDown}`}
          >
            {[...CODE_LINES, ...CODE_LINES].map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <Image
            src="/derp-portrait.jpg"
            alt=""
            width={1178}
            height={1277}
            sizes="60vh"
            className={styles.derpCenterImage}
          />
        </div>
      )}
      <button type="button" className={styles.derpClose} onClick={onClose}>
        ← back
      </button>
      <div className={styles.derpMenu}>
        <button
          type="button"
          className={styles.derpMenuTrigger}
          onClick={() => setDerpMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={derpMenuOpen}
        >
          menu ▾
        </button>
        {derpMenuOpen && (
          <div className={styles.derpMenuList} role="menu">
            {DERP_MENU_ITEMS.map((label) => (
              <button
                key={label}
                type="button"
                className={styles.derpMenuItem}
                role="menuitem"
                onClick={() => {
                  setDerpMenuOpen(false);
                  if (label === "option 1") setPhase("wordPage");
                  if (label === "shrek") setPhase("lambPage");
                  if (label === "option 3") onPlayTransition();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {phase === "wordPage" && (
        <WordPage onBack={() => setPhase("code")} />
      )}
      {phase === "lambPage" && (
        <LambPage onBack={() => setPhase("code")} />
      )}
    </div>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("closed");
  const [lightsOn, setLightsOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [derpOpen, setDerpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [flyPhase, setFlyPhase] = useState<FlyPhase>("walk");
  const [transitionId, setTransitionId] = useState<number | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const wantsPlayRef = useRef(false);

  useEffect(() => {
    function createPlayer() {
      if (!window.YT || !playerHostRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(playerHostRef.current, {
        videoId: AUDIO_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: 1,
          playlist: AUDIO_VIDEO_ID,
        },
        events: {
          onReady: () => {
            if (wantsPlayRef.current) playerRef.current?.playVideo();
          },
        },
      });
    }

    if (window.YT) {
      createPlayer();
    } else {
      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        )
      ) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }
  }, []);

  useEffect(() => {
    if (!wantsPlayRef.current) return;
    if (derpOpen || flyPhase === "squished") {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
    }
  }, [derpOpen, flyPhase]);

  function handleClick() {
    setStage("envelope");
    setTimeout(() => setStage("open"), 700);
    wantsPlayRef.current = true;
    playerRef.current?.playVideo();
  }

  return (
    <main className={styles.main}>
      {transitionId !== null && (
        <PageTransition
          key={transitionId}
          onDone={() => setTransitionId(null)}
        />
      )}
      <div className={styles.audioPlayer} aria-hidden>
        <div ref={playerHostRef} />
      </div>
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
      <div
        className={`${styles.bloodOverlay} ${
          lightsOn ? "" : styles.bloodActive
        }`}
        aria-hidden
      >
        <BloodScene />
      </div>
      <LightSwitch
        side="left"
        on={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        label={menuOpen ? "Close menu" : "Open menu"}
      />
      {menuOpen && (
        <div className={styles.dropdownMenu} role="menu">
          <button
            type="button"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setAboutOpen(true);
            }}
          >
            meep
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setDerpOpen(true);
            }}
          >
            derp
          </button>
        </div>
      )}
      <LightSwitch
        side="right"
        on={lightsOn}
        onToggle={() => setLightsOn((v) => !v)}
        label={lightsOn ? "Turn off the light" : "Turn on the light"}
      />
      {aboutOpen && <AboutPage onClose={() => setAboutOpen(false)} />}
      {derpOpen && (
        <DerpPage
          onClose={() => setDerpOpen(false)}
          onPlayTransition={() => setTransitionId(Date.now())}
        />
      )}
      <Fly paused={derpOpen} onPhaseChange={setFlyPhase} />
      <GlitterTrail />
    </main>
  );
}
