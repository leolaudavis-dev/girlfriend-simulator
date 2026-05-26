"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";
import { CODE_LINES, DERP_MENU_ITEMS } from "../_components/constants";
import { useShell } from "../_components/Shell";

export default function DerpRoute() {
  const router = useRouter();
  const { triggerTransition } = useShell();
  const [phase, setPhase] = useState<"image" | "code">("image");
  const [derpMenuOpen, setDerpMenuOpen] = useState(false);
  const [negativeFlash, setNegativeFlash] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPhase("code"), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.derpPage}>
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
              <div key={i}>{line || " "}</div>
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
      <button
        type="button"
        className={styles.derpClose}
        onClick={() => router.push("/")}
      >
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
            {DERP_MENU_ITEMS.map((item) => {
              if (item.kind === "link") {
                return (
                  <Link
                    key={item.label}
                    className={styles.derpMenuItem}
                    role="menuitem"
                    href={item.href}
                    onClick={() => setDerpMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  className={styles.derpMenuItem}
                  role="menuitem"
                  onClick={() => {
                    setDerpMenuOpen(false);
                    if (item.kind === "transition") triggerTransition();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
