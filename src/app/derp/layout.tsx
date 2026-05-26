"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function DerpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const onDerpMain = pathname === "/derp";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (onDerpMain) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [onDerpMain]);

  return (
    <>
      <audio ref={audioRef} src="/i-love-my-life.wav" loop />
      {children}
    </>
  );
}
