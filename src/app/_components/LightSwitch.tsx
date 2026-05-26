"use client";

import styles from "../page.module.css";

export function LightSwitch({
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
