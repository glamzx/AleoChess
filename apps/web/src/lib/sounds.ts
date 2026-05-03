"use client";

/**
 * Howler.js sound hooks.
 *
 * Sounds are *defaulted on* but no audio assets are bundled in this visual
 * pass — every play() is a no-op safe fallback. The mute toggle is persisted
 * to localStorage as `aleo:soundMuted`.
 */
import { Howl } from "howler";

type SfxKey =
  | "pieceMove"
  | "capture"
  | "check"
  | "checkmate"
  | "lowTime"
  | "coinPickup"
  | "levelUp"
  | "notification";

const sfxSrc: Record<SfxKey, string> = {
  pieceMove: "/sfx/piece-move.mp3",
  capture: "/sfx/capture.mp3",
  check: "/sfx/check.mp3",
  checkmate: "/sfx/checkmate.mp3",
  lowTime: "/sfx/low-time.mp3",
  coinPickup: "/sfx/coin.mp3",
  levelUp: "/sfx/level-up.mp3",
  notification: "/sfx/notification.mp3"
};

const cache: Partial<Record<SfxKey, Howl>> = {};

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("aleo:soundMuted") === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("aleo:soundMuted", muted ? "1" : "0");
}

export function playSfx(key: SfxKey) {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    if (!cache[key]) {
      cache[key] = new Howl({
        src: [sfxSrc[key]],
        volume: 0.5,
        preload: false,
        // Asset is optional in this visual pass.
        onloaderror: () => {
          /* noop — assets ship in a later pass */
        }
      });
    }
    cache[key]?.play();
  } catch {
    /* noop */
  }
}
