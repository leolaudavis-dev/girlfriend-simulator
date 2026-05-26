"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../page.module.css";
import { AUDIO_VIDEO_ID } from "./constants";
import type { FlyPhase, YTPlayer } from "./types";
import { Fly } from "./Fly";
import { LightSwitch } from "./LightSwitch";
import { BloodScene, GlitterTrail, PageTransition } from "./effects";

interface ShellContextValue {
  playMusic: () => void;
  triggerTransition: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <Shell>");
  return ctx;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onDerp = pathname.startsWith("/derp");

  const [lightsOn, setLightsOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (onDerp || flyPhase === "squished") {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
    }
  }, [onDerp, flyPhase]);

  const playMusic = useCallback(() => {
    wantsPlayRef.current = true;
    playerRef.current?.playVideo();
  }, []);

  const triggerTransition = useCallback(() => {
    setTransitionId(Date.now());
  }, []);

  return (
    <ShellContext.Provider value={{ playMusic, triggerTransition }}>
      {transitionId !== null && (
        <PageTransition
          key={transitionId}
          onDone={() => setTransitionId(null)}
        />
      )}
      <div className={styles.audioPlayer} aria-hidden>
        <div ref={playerHostRef} />
      </div>
      {children}
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
          <Link
            className={styles.dropdownItem}
            role="menuitem"
            href="/meep"
            onClick={() => setMenuOpen(false)}
          >
            meep
          </Link>
          <Link
            className={styles.dropdownItem}
            role="menuitem"
            href="/derp"
            onClick={() => setMenuOpen(false)}
          >
            derp
          </Link>
          <Link
            className={styles.dropdownItem}
            role="menuitem"
            href="/thegirlfriendexperience"
            onClick={() => setMenuOpen(false)}
          >
            photobooth
          </Link>
        </div>
      )}
      <LightSwitch
        side="right"
        on={lightsOn}
        onToggle={() => setLightsOn((v) => !v)}
        label={lightsOn ? "Turn off the light" : "Turn on the light"}
      />
      <Fly paused={onDerp} onPhaseChange={setFlyPhase} />
      <GlitterTrail />
    </ShellContext.Provider>
  );
}
