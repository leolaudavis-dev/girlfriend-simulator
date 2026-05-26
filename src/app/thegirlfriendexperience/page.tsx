"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

type Status = "idle" | "requesting" | "live" | "denied" | "error";

export default function GirlfriendExperienceRoute() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  function stopStream() {
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startStream() {
    if (status === "requesting" || status === "live") return;
    setStatus("requesting");
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Your browser doesn't support webcam access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setVideoOn(true);
      setAudioOn(true);
      setStatus("live");
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
    return () => stopStream();
  }, []);

  function toggleVideo() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !videoOn;
    for (const track of stream.getVideoTracks()) track.enabled = next;
    setVideoOn(next);
  }

  function toggleAudio() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !audioOn;
    for (const track of stream.getAudioTracks()) track.enabled = next;
    setAudioOn(next);
  }

  function handleBack() {
    stopStream();
    router.push("/");
  }

  return (
    <div className={styles.gfePage}>
      <button
        type="button"
        className={styles.gfeClose}
        onClick={handleBack}
      >
        ← back
      </button>
      <div className={styles.gfeFrame}>
        <video
          ref={videoRef}
          className={styles.gfeVideo}
          autoPlay
          playsInline
          muted
        />
        {status === "live" && (
          <div className={styles.gfeBadge} aria-live="polite">
            <span className={styles.gfeBadgeDot} aria-hidden />
            live
          </div>
        )}
        {status !== "live" && (
          <div className={styles.gfeOverlay}>
            <h1 className={styles.gfeOverlayTitle}>
              the girlfriend experience
            </h1>
            {status === "idle" && (
              <>
                <p className={styles.gfeOverlayText}>
                  go live. your browser will ask for camera + mic.
                </p>
                <button
                  type="button"
                  className={styles.gfeStartButton}
                  onClick={startStream}
                >
                  start camera
                </button>
              </>
            )}
            {status === "requesting" && (
              <p className={styles.gfeOverlayText}>connecting…</p>
            )}
            {status === "denied" && (
              <>
                <p className={`${styles.gfeOverlayText} ${styles.gfeError}`}>
                  permission denied. allow camera + mic access in your browser
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
                <p className={`${styles.gfeOverlayText} ${styles.gfeError}`}>
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
        {status === "live" && (
          <div className={styles.gfeControls}>
            <button
              type="button"
              className={styles.gfeControlButton}
              onClick={toggleVideo}
              aria-pressed={!videoOn}
            >
              {videoOn ? "camera off" : "camera on"}
            </button>
            <button
              type="button"
              className={styles.gfeControlButton}
              onClick={toggleAudio}
              aria-pressed={!audioOn}
            >
              {audioOn ? "mic off" : "mic on"}
            </button>
            <button
              type="button"
              className={styles.gfeControlButton}
              onClick={() => {
                stopStream();
                setStatus("idle");
              }}
            >
              end
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
