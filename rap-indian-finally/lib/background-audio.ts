"use client";

/**
 * Mobile Background Audio Engine
 *
 * Coordinates background audio lifecycle without creating conflicting HTML5 Audio
 * elements that steal audio focus from the primary YouTube audio stream on Android & iOS.
 */

class BackgroundAudioManager {
  private isUnlocked = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.attachUnlockListeners();
    }
  }

  private attachUnlockListeners() {
    if (typeof window === "undefined") return;

    const unlock = () => {
      this.unlockAudio();
    };

    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
  }

  public unlockAudio() {
    if (typeof window === "undefined") return;
    this.isUnlocked = true;
  }

  public start() {
    // Keep alive indicator
  }

  public pause() {
    // Keep alive indicator
  }
}

export const backgroundAudio = new BackgroundAudioManager();


