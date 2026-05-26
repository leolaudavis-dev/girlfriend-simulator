"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../page.module.css";
import { WEBPICS, STICKERS } from "./constants";

export function AboutPage({ onClose }: { onClose: () => void }) {
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
