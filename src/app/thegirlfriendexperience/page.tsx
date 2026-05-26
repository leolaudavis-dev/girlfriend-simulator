"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

type Status =
  | "idle"
  | "requesting"
  | "ready"
  | "countdown"
  | "review"
  | "denied"
  | "error";

const SHOTS_PER_STRIP = 4;
const COUNTDOWN_START = 3;
const FLASH_MS = 320;
const BEAUTY_FILTER =
  "brightness(1.08) contrast(1.04) saturate(1.2) blur(0.7px) hue-rotate(-4deg)";

const COLOR_PRIMARY = "#c4156f";
const COLOR_HEART = "#e6228a";
const COLOR_PINK = "#ff8fc8";
const COLOR_SPARKLE = "#ff5aae";
const COLOR_STAR = "#f5c043";

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s, -s * 0.6, -s * 1.6, s * 0.4, 0, s * 1.2);
  ctx.bezierCurveTo(s * 1.6, s * 0.4, s, -s * 0.6, 0, s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  color: string,
  points = 5,
) {
  const innerRadius = outerRadius * 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
  ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
  ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDottedFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  dotR = 1.8,
  gap = 8,
) {
  ctx.save();
  ctx.fillStyle = color;
  const dot = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let cx = x; cx <= x + w + 0.001; cx += gap) {
    dot(cx, y);
    dot(cx, y + h);
  }
  for (let cy = y + gap; cy <= y + h - gap + 0.001; cy += gap) {
    dot(x, cy);
    dot(x + w, cy);
  }
  ctx.restore();
}

function drawDecoRow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  count: number,
  spacing = 16,
) {
  for (let i = 0; i < count; i++) {
    const x = centerX + (i - (count - 1) / 2) * spacing;
    if (i % 2 === 0) drawHeart(ctx, x, y - 4, 4, COLOR_HEART);
    else drawSparkle(ctx, x, y - 2, 4, COLOR_SPARKLE);
  }
}

const SCATTER = [
  { dx: -14, dy: 0.18, kind: "sparkle" as const, size: 4 },
  { dx: 14, dy: 0.32, kind: "star" as const, size: 4 },
  { dx: -16, dy: 0.55, kind: "heart" as const, size: 3.5 },
  { dx: 16, dy: 0.7, kind: "sparkle" as const, size: 5 },
  { dx: -14, dy: 0.86, kind: "star" as const, size: 3.5 },
];

function drawScatteredCharms(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  innerMargin: number,
) {
  for (const c of SCATTER) {
    const x = c.dx < 0 ? innerMargin + c.dx + 8 : stripW - innerMargin - c.dx + 8;
    const y = stripH * c.dy;
    if (c.kind === "sparkle") drawSparkle(ctx, x, y, c.size, COLOR_SPARKLE);
    else if (c.kind === "star") drawStar(ctx, x, y, c.size, COLOR_STAR);
    else drawHeart(ctx, x, y, c.size, COLOR_HEART);
  }
}

export default function GirlfriendExperienceRoute() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shotsRef = useRef<string[]>([]);
  const countdownTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [beautyOn, setBeautyOn] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [shotIndex, setShotIndex] = useState(0);
  const [stripDataUrl, setStripDataUrl] = useState<string | null>(null);

  function clearCountdownTimer() {
    if (countdownTimerRef.current !== null) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }

  function stopStream() {
    clearCountdownTimer();
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startStream() {
    if (status === "requesting" || status === "ready") return;
    setStatus("requesting");
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Your browser doesn't support webcam access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("ready");
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Couldn't start the camera.",
        );
      }
    }
  }

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearTimeout(countdownTimerRef.current);
      }
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
    };
  }, []);

  function captureShot(): string | null {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (beautyOn) ctx.filter = BEAUTY_FILTER;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }

  async function composeStrip(shots: string[]): Promise<string> {
    const images = await Promise.all(
      shots.map(
        (url) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          }),
      ),
    );
    const photoW = 340;
    const aspect = images[0].naturalHeight / images[0].naturalWidth;
    const photoH = Math.round(photoW * aspect);
    const sideMargin = 28;
    const pad = 14;
    const headerH = 108;
    const footerH = 70;
    const stripW = photoW + sideMargin * 2;
    const stripH = headerH + (photoH + pad) * shots.length + pad + footerH;
    const centerX = stripW / 2;

    const canvas = document.createElement("canvas");
    canvas.width = stripW;
    canvas.height = stripH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");

    const bg = ctx.createLinearGradient(0, 0, 0, stripH);
    bg.addColorStop(0, "#fff5fa");
    bg.addColorStop(1, "#ffd6ea");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, stripW, stripH);

    drawDottedFrame(ctx, 10, 10, stripW - 20, stripH - 20, COLOR_PINK);
    drawDottedFrame(
      ctx,
      18,
      18,
      stripW - 36,
      stripH - 36,
      COLOR_HEART,
      1.2,
      6,
    );

    drawHeart(ctx, 24, 24, 8, COLOR_HEART);
    drawHeart(ctx, stripW - 24, 24, 8, COLOR_HEART);
    drawHeart(ctx, 24, stripH - 24, 8, COLOR_HEART);
    drawHeart(ctx, stripW - 24, stripH - 24, 8, COLOR_HEART);

    drawScatteredCharms(ctx, stripW, stripH, sideMargin);

    drawDecoRow(ctx, centerX, 40, 7, 18);

    ctx.fillStyle = COLOR_PRIMARY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "italic 700 22px ui-serif, Georgia, serif";
    ctx.fillText("the girlfriend experience", centerX, 68);
    drawSparkle(ctx, centerX - 132, 68, 5, COLOR_SPARKLE);
    drawSparkle(ctx, centerX + 132, 68, 5, COLOR_SPARKLE);

    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("♡ 인생네컷 · xoxo ♡", centerX, 90);

    for (let i = 0; i < images.length; i++) {
      const y = headerH + i * (photoH + pad);
      ctx.strokeStyle = COLOR_PINK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sideMargin - 2, y - 2, photoW + 4, photoH + 4);
      ctx.drawImage(images[i], sideMargin, y, photoW, photoH);
    }

    const footerCenterY = stripH - footerH / 2 - 4;
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    drawStar(ctx, centerX - 90, footerCenterY, 6, COLOR_STAR);
    drawStar(ctx, centerX + 90, footerCenterY, 6, COLOR_STAR);
    ctx.fillStyle = COLOR_PRIMARY;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(dateStr, centerX, footerCenterY);

    drawDecoRow(ctx, centerX, stripH - 28, 7, 18);

    return canvas.toDataURL("image/png");
  }

  function startStrip() {
    if (status !== "ready") return;
    shotsRef.current = [];
    setShotIndex(0);
    setStripDataUrl(null);
    setStatus("countdown");
    runCountdown(0);
  }

  function runCountdown(currentShot: number) {
    setShotIndex(currentShot);
    setCountdown(COUNTDOWN_START);
    const tick = (remaining: number) => {
      if (remaining <= 0) {
        setCountdown(null);
        triggerFlash(currentShot);
        return;
      }
      countdownTimerRef.current = window.setTimeout(() => {
        setCountdown(remaining - 1);
        tick(remaining - 1);
      }, 1000);
    };
    tick(COUNTDOWN_START);
  }

  function triggerFlash(currentShot: number) {
    setFlashOn(true);
    countdownTimerRef.current = window.setTimeout(() => {
      const shot = captureShot();
      if (shot) shotsRef.current = [...shotsRef.current, shot];
      setFlashOn(false);

      const nextShot = currentShot + 1;
      if (nextShot < SHOTS_PER_STRIP) {
        countdownTimerRef.current = window.setTimeout(() => {
          runCountdown(nextShot);
        }, 600);
      } else {
        finishStrip();
      }
    }, FLASH_MS);
  }

  async function finishStrip() {
    try {
      const url = await composeStrip(shotsRef.current);
      setStripDataUrl(url);
      setStatus("review");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Couldn't put the photo strip together.",
      );
    }
  }

  function downloadStrip() {
    if (!stripDataUrl) return;
    const a = document.createElement("a");
    a.href = stripDataUrl;
    a.download = `gfsim-photobooth-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function retake() {
    clearCountdownTimer();
    shotsRef.current = [];
    setShotIndex(0);
    setStripDataUrl(null);
    setCountdown(null);
    setFlashOn(false);
    setStatus("ready");
  }

  function endSession() {
    stopStream();
    setStripDataUrl(null);
    shotsRef.current = [];
    setStatus("idle");
  }

  function handleBack() {
    stopStream();
    router.push("/");
  }

  const showCamera = status !== "review";

  return (
    <div className={styles.gfePage}>
      <button
        type="button"
        className={styles.gfeClose}
        onClick={handleBack}
      >
        ← back
      </button>
      {showCamera && (
        <div className={styles.gfeFrame}>
          <video
            ref={videoRef}
            className={`${styles.gfeVideo} ${
              beautyOn ? styles.gfeVideoBeauty : ""
            }`}
            autoPlay
            playsInline
            muted
          />
          {(status === "ready" || status === "countdown") && beautyOn && (
            <div className={styles.gfeBeautyGlow} aria-hidden />
          )}
          {status === "countdown" && countdown !== null && countdown > 0 && (
            <div className={styles.gfeCountdown} aria-live="polite">
              {countdown}
            </div>
          )}
          {status === "countdown" && (
            <div className={styles.gfeShotCounter} aria-hidden>
              {shotIndex + 1} / {SHOTS_PER_STRIP}
            </div>
          )}
          {flashOn && <div className={styles.gfeFlash} aria-hidden />}

          {(status === "idle" ||
            status === "requesting" ||
            status === "denied" ||
            status === "error") && (
            <div className={styles.gfeOverlay}>
              <h1 className={styles.gfeOverlayTitle}>
                the girlfriend experience
              </h1>
              <p className={styles.gfeOverlayText}>photobooth</p>
              {status === "idle" && (
                <button
                  type="button"
                  className={styles.gfeStartButton}
                  onClick={startStream}
                >
                  start camera
                </button>
              )}
              {status === "requesting" && (
                <p className={styles.gfeOverlayText}>connecting…</p>
              )}
              {status === "denied" && (
                <>
                  <p
                    className={`${styles.gfeOverlayText} ${styles.gfeError}`}
                  >
                    permission denied. allow camera access in your browser
                    settings, then try again.
                  </p>
                  <button
                    type="button"
                    className={styles.gfeStartButton}
                    onClick={startStream}
                  >
                    try again
                  </button>
                </>
              )}
              {status === "error" && (
                <>
                  <p
                    className={`${styles.gfeOverlayText} ${styles.gfeError}`}
                  >
                    {errorMessage ?? "Something went wrong."}
                  </p>
                  <button
                    type="button"
                    className={styles.gfeStartButton}
                    onClick={startStream}
                  >
                    try again
                  </button>
                </>
              )}
            </div>
          )}

          {status === "ready" && (
            <div className={styles.gfeControls}>
              <button
                type="button"
                className={styles.gfeShootButton}
                onClick={startStrip}
              >
                take strip · {SHOTS_PER_STRIP} shots
              </button>
              <button
                type="button"
                className={styles.gfeControlButton}
                onClick={() => setBeautyOn((v) => !v)}
                aria-pressed={beautyOn}
              >
                {beautyOn ? "beauty off" : "beauty on"}
              </button>
              <button
                type="button"
                className={styles.gfeControlButton}
                onClick={endSession}
              >
                stop camera
              </button>
            </div>
          )}
        </div>
      )}

      {status === "review" && stripDataUrl && (
        <div className={styles.gfeReview}>
          <div className={styles.gfeStripWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stripDataUrl}
              alt="Your photo strip"
              className={styles.gfeStripImg}
            />
          </div>
          <div className={styles.gfeReviewActions}>
            <button
              type="button"
              className={styles.gfeShootButton}
              onClick={downloadStrip}
            >
              download
            </button>
            <button
              type="button"
              className={styles.gfeControlButton}
              onClick={retake}
            >
              take another
            </button>
            <button
              type="button"
              className={styles.gfeControlButton}
              onClick={endSession}
            >
              stop camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
