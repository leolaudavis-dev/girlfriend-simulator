export type Stage = "closed" | "envelope" | "open";
export type Corner = "top" | "bottom" | "left" | "right";
export type FlyPhase = "walk" | "swat" | "squished";

export interface YTPlayer {
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
