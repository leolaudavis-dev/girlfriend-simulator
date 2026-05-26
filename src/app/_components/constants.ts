import type { Corner } from "./types";
import { steppedTriangle, pseudoRandom } from "./helpers";
import styles from "../page.module.css";

export const AUDIO_VIDEO_ID = "t4_5P_sWGyA";
export const TRANSITION_VIDEO_ID = "aUrkWgakn7U";
export const TRANSITION_RANGE_SEC = 90;

export const CLIPS: Record<Corner, string> = {
  top: steppedTriangle("top"),
  bottom: steppedTriangle("bottom"),
  left: steppedTriangle("left"),
  right: steppedTriangle("right"),
};

export const FLAP_CLASS: Record<Corner, string> = {
  top: styles.flapTop,
  bottom: styles.flapBottom,
  left: styles.flapLeft,
  right: styles.flapRight,
};

export const HEART_PIXELS = [
  "0110110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];

export const SWATTER_PAD_D =
  "M 24 13 Q 60 5 96 13 Q 103 15 102 24 L 93 86 Q 92 95 84 96 L 36 96 Q 28 95 27 86 L 18 24 Q 17 15 24 13 Z";

export const CODE_LINES = [
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

export const DERP_MENU_ITEMS = [
  { label: "option 1", kind: "link", href: "/derp/option-1" },
  { label: "shrek", kind: "link", href: "/derp/shrek" },
  { label: "option 3", kind: "transition" },
  { label: "option 4", kind: "noop" },
] as const;

export const WEBPICS = [
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

export const STICKERS = [
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

export const WORD_BALL_WORDS = [
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

export const WORD_BALL_LAYOUT = WORD_BALL_WORDS.map((word, i) => {
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

export const LAMB_BLEND_MODES = [
  "difference",
  "exclusion",
  "screen",
  "multiply",
  "hard-light",
  "overlay",
  "color-dodge",
] as const;

export const LAMB_TILES = Array.from({ length: 14 }, (_, i) => {
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

export const LAMB_BLOBS = Array.from({ length: 5 }, (_, i) => ({
  x: pseudoRandom(i * 4.7 + 41.3) * 100,
  y: pseudoRandom(i * 5.9 + 42.7) * 100,
  size: 320 + pseudoRandom(i * 7.1 + 43.9) * 540,
  hueA: Math.floor(pseudoRandom(i * 9.3 + 44.5) * 360),
  hueB: Math.floor(pseudoRandom(i * 11.7 + 45.1) * 360),
  driftDur: 28 + pseudoRandom(i * 13.9 + 46.3) * 38,
  driftDelay: pseudoRandom(i * 15.1 + 47.7) * 12,
}));

export const BLOOD_DRIPS = (() => {
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

export const BLOOD_DROPLETS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(pseudoRandom(i * 1.3 + 7.7) * 100).toFixed(2)}%`,
  size: `${(5 + pseudoRandom(i * 2.1 + 4.2) * 9).toFixed(1)}px`,
  delay: `${(pseudoRandom(i * 3.7 + 9.1) * 7).toFixed(2)}s`,
  duration: `${(3.5 + pseudoRandom(i * 6.3 + 5.5) * 4).toFixed(2)}s`,
}));
