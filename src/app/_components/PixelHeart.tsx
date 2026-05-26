import styles from "../page.module.css";
import { HEART_PIXELS } from "./constants";

export function PixelHeart() {
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
