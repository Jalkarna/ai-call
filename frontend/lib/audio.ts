/**
 * Global Audio Manager for Incoming Call Notifications
 * Preloads audio files so they're ready to play instantly
 */

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private isLoaded = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudio();
    }
  }

  private initAudio() {
    console.log("🎵 Initializing notification audio...");
    this.audio = new Audio("/teamstone.mp3");
    this.audio.loop = false;
    this.audio.volume = 0.7;
    this.audio.preload = "auto"; // Preload the entire audio file

    // Set loaded flag when audio is ready
    this.audio.addEventListener("canplaythrough", () => {
      this.isLoaded = true;
      console.log("📢 Notification audio preloaded and ready to play!");
    });

    this.audio.addEventListener("loadeddata", () => {
      console.log("📥 Audio data loaded");
    });

    this.audio.addEventListener("error", (e) => {
      console.error("❌ Failed to load notification audio:", e);
    });

    // Explicitly trigger loading
    this.audio.load();
    console.log("⏳ Loading notification audio file...");
  }

  playNotification(): Promise<void> {
    if (!this.audio) {
      console.warn("Audio not initialized");
      return Promise.reject(new Error("Audio not initialized"));
    }

    // Reset to beginning in case it was played before
    this.audio.currentTime = 0;

    console.log("🔊 Playing notification sound...");
    return this.audio.play()
      .then(() => {
        console.log("✅ Notification sound playing");
      })
      .catch((err) => {
        console.warn("⚠️ Audio play blocked:", err.message);
        console.log("💡 Tip: Browser may require user interaction before playing audio");
        throw err;
      });
  }

  stopNotification() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  isReady(): boolean {
    return this.isLoaded;
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManager && typeof window !== "undefined") {
    audioManager = new AudioManager();
  }
  return audioManager!;
}
