"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Users, Github, Shuffle, Repeat, Repeat1, Youtube, X, ListMusic, Volume2, VolumeX, Timer, Moon, Palette, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { playlists, Track, cleanTrackTitle, cleanTrackArtist } from "@/lib/data";
import { YouTubePlayer } from "@/components/youtube-player";
import { TracklistDrawer } from "@/components/tracklist-drawer";
import { SleepTimerModal } from "@/components/sleep-timer-modal";
import { SettingsModal, ACCENT_PRESETS } from "@/components/settings-modal";
import { backgroundAudio } from "@/lib/background-audio";
import Image from "next/image";
import { useDominantColor } from "@/hooks/use-dominant-color";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(now)
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return null;
  const [hour, rest] = time.split(":");
  const [min, ampm] = rest ? rest.split(" ") : ["", ""];

  return (
    <div className="text-xs sm:text-sm font-medium tracking-tight whitespace-nowrap transition-transform hover:scale-105 active:scale-95 cursor-default hover:text-white/90">
      <span className="tabular-nums drop-shadow-md">
        {hour}<span className="animate-[blink_1s_infinite] mx-[1px] opacity-70">:</span>{min} {ampm}
      </span>
      <span className="ml-1.5 text-white/40 hidden sm:inline text-xs">IST</span>
    </div>
  );
}

export default function App() {
  const [activePlaylistIndex, setActivePlaylistIndex] = useState(0);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shortcutHud, setShortcutHud] = useState<{ icon: "play" | "pause" | "next" | "prev" | "muted" | "unmuted"; label: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTo, setSeekTo] = useState<number | undefined>();
  const [listeners, setListeners] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one
  const [urlInput, setUrlInput] = useState("https://youtube.com/playlist?list=PLRLAr2zGYyeg&si=DBGWZb1Yba-c5O2H");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTracklistOpen, setIsTracklistOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("flame");
  const [errorToast, setErrorToast] = useState<string | null>(null);
  
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const scrubBarRef = useRef<HTMLDivElement | null>(null);
  const mobileScrubBarRef = useRef<HTMLDivElement | null>(null);
  const wasPlayingBeforeScrubRef = useRef(false);

  const wakeLockRef = useRef<any>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showHud = useCallback((icon: "play" | "pause" | "next" | "prev" | "muted" | "unmuted", label: string) => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setShortcutHud({ icon, label });
    hudTimeoutRef.current = setTimeout(() => {
      setShortcutHud(null);
    }, 1100);
  }, []);

  // Keep original playlists as default, but allow overriding
  const [appPlaylists, setAppPlaylists] = useState(playlists);

  const activePlaylist = appPlaylists[activePlaylistIndex];
  const activeTrack = activePlaylist?.tracks[activeTrackIndex];
  const thumbnailUrl = activeTrack ? `https://i.ytimg.com/vi/${activeTrack.videoId}/hqdefault.jpg` : "";
  const dominantColor = useDominantColor(thumbnailUrl, "#F27D26");

  // Load saved accent color preset from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dhh_accent_preset");
      if (saved && (saved === "dynamic" || ACCENT_PRESETS.some((p) => p.id === saved))) {
        setSelectedPresetId(saved);
      }
    } catch {}
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    try {
      localStorage.setItem("dhh_accent_preset", presetId);
    } catch {}
    const found = ACCENT_PRESETS.find((p) => p.id === presetId);
    showHud("unmuted", `Theme: ${found ? found.name : "Custom"}`);
  }, [showHud]);

  const effectiveAccentColor = selectedPresetId === "dynamic"
    ? dominantColor
    : (ACCENT_PRESETS.find((p) => p.id === selectedPresetId)?.color || "#F27D26");

  // Synchronize CSS custom variable across document
  useEffect(() => {
    if (typeof document !== "undefined" && effectiveAccentColor) {
      document.documentElement.style.setProperty("--color-accent", effectiveAccentColor);
    }
  }, [effectiveAccentColor]);

  useEffect(() => {
    setListeners(Math.floor(Math.random() * 50) + 120);
  }, []);

  // Manage Background Audio Session & Screen Wake Lock
  useEffect(() => {
    if (isPlaying) {
      backgroundAudio.start();

      if ("wakeLock" in navigator && !wakeLockRef.current) {
        navigator.wakeLock.request("screen").then((lock) => {
          wakeLockRef.current = lock;
          lock.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        }).catch(() => {
          // Wake lock not permitted or supported; safe to ignore
        });
      }
    } else {
      backgroundAudio.pause();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isPlaying]);

  // Handle Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerSeconds === null) return;

    if (sleepTimerSeconds <= 0) {
      setIsPlaying(false);
      setSleepTimerSeconds(null);
      showHud("pause", "Sleep Timer Ended");
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setIsPlaying(false);
          showHud("pause", "Sleep Timer Ended");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSeconds, showHud]);

  const handleSetSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerSeconds(null);
      showHud("pause", "Sleep Timer Off");
    } else {
      setSleepTimerSeconds(minutes * 60);
      showHud("play", `Timer: ${minutes}m`);
    }
  }, [showHud]);

  const handleAIImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() })
      });
      const data = await res.json();
      
      if (data.tracks && data.tracks.length > 0) {
        const newPlaylistId = "imported-" + Date.now();
        const newPlaylistName = data.name || "Imported Playlist";
        const newPlaylist = { id: newPlaylistId, name: newPlaylistName, tracks: data.tracks };
        
        setAppPlaylists((prev) => {
          const filtered = prev.filter((p) => !p.id.startsWith("imported-"));
          const updated = [...filtered, newPlaylist];
          // Immediately set active index to the newly appended playlist
          setActivePlaylistIndex(updated.length - 1);
          return updated;
        });

        setActiveTrackIndex(0);
        setIsPlaying(true);
        setCurrentTime(0);
        setIsImportOpen(false);
        showHud("play", `Imported ${data.tracks.length} Tracks`);
      } else {
        setErrorToast(data.error || "No tracks found in playlist.");
        setTimeout(() => setErrorToast(null), 4000);
      }
    } catch (err: any) {
      setErrorToast("Failed to analyze playlist: " + (err.message || "Network error"));
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        backgroundAudio.start();
      } else {
        backgroundAudio.pause();
      }
      showHud(next ? "play" : "pause", next ? "Play" : "Pause");
      return next;
    });
  }, [showHud]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      showHud(next ? "muted" : "unmuted", next ? "Mute" : "Unmute");
      return next;
    });
  }, [showHud]);

  const nextTrack = useCallback((isAuto = false) => {
    backgroundAudio.start();
    setCurrentTime(0);
    if (!activePlaylist) return;
    setIsPlaying(true); // Always play when skipping forward
    
    if (isAuto === true && repeatMode === 2) {
      setSeekTo(0);
      setTimeout(() => setSeekTo(undefined), 100);
      return;
    }

    if (isShuffle) {
      if (activePlaylist.tracks.length > 1) {
        let nextIdx = Math.floor(Math.random() * activePlaylist.tracks.length);
        while (nextIdx === activeTrackIndex) {
          nextIdx = Math.floor(Math.random() * activePlaylist.tracks.length);
        }
        setActiveTrackIndex(nextIdx);
      }
    } else {
      if (activeTrackIndex < activePlaylist.tracks.length - 1) {
        setActiveTrackIndex(activeTrackIndex + 1);
      } else {
        if (isAuto === true && repeatMode === 0) {
          setIsPlaying(false);
          setSeekTo(0);
          setTimeout(() => setSeekTo(undefined), 100);
        } else {
          setActiveTrackIndex(0);
        }
      }
    }
  }, [activeTrackIndex, activePlaylist, isShuffle, repeatMode]);

  const prevTrack = useCallback(() => {
    backgroundAudio.start();
    setCurrentTime(0);
    setIsPlaying(true); // Always play when skipping backward
    if (currentTime > 3) {
      setSeekTo(0);
    } else if (activeTrackIndex > 0) {
      setActiveTrackIndex((prev) => Math.max(0, prev - 1));
    } else {
      setSeekTo(0);
    }
    setTimeout(() => setSeekTo(undefined), 100);
  }, [currentTime, activeTrackIndex]);

  // Global MediaSession API for mobile lockscreen, notification controls, & background playback
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator && activeTrack) {
      const displayTitle = cleanTrackTitle(activeTrack.title);
      const displayArtist = cleanTrackArtist(activeTrack.artist, activeTrack.title);
      const albumName = activePlaylist?.name && activePlaylist.name !== "Default Playlist" 
        ? activePlaylist.name 
        : "Desi Hip Hop";

      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: displayArtist,
        album: albumName,
        artwork: [
          {
            src: `https://i.ytimg.com/vi/${activeTrack.videoId}/maxresdefault.jpg`,
            sizes: "1280x720",
            type: "image/jpeg",
          },
          {
            src: `https://i.ytimg.com/vi/${activeTrack.videoId}/sddefault.jpg`,
            sizes: "640x480",
            type: "image/jpeg",
          },
          {
            src: `https://i.ytimg.com/vi/${activeTrack.videoId}/hqdefault.jpg`,
            sizes: "480x360",
            type: "image/jpeg",
          },
          {
            src: `https://i.ytimg.com/vi/${activeTrack.videoId}/mqdefault.jpg`,
            sizes: "320x180",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        backgroundAudio.start();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        backgroundAudio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        backgroundAudio.start();
        prevTrack();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        backgroundAudio.start();
        nextTrack(false);
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          setSeekTo(details.seekTime);
          setCurrentTime(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const skip = details.seekOffset || 10;
        const newTime = Math.max(0, currentTime - skip);
        setSeekTo(newTime);
        setCurrentTime(newTime);
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const skip = details.seekOffset || 10;
        const totalDur = duration || activeTrack.duration || 180;
        const newTime = Math.min(totalDur, currentTime + skip);
        setSeekTo(newTime);
        setCurrentTime(newTime);
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        backgroundAudio.pause();
        setIsPlaying(false);
      });
    }
  }, [activeTrack, activePlaylist, prevTrack, nextTrack, currentTime, duration]);

  // Sync MediaSession playback state & position
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      const totalDur = duration || activeTrack?.duration;
      if (totalDur && totalDur > 0 && currentTime >= 0 && "setPositionState" in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: totalDur,
            playbackRate: 1,
            position: Math.min(currentTime, totalDur),
          });
        } catch {
          // Ignore sync discrepancies
        }
      }
    }
  }, [isPlaying, currentTime, duration, activeTrack]);

  // Global Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering player shortcuts when interacting with text inputs or interactive editable fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Spacebar -> Play / Pause
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      }
      // Arrow Right -> Skip to Next Track
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextTrack(false);
        showHud("next", "Next Track");
      }
      // Arrow Left -> Skip to Previous Track
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevTrack();
        showHud("prev", "Previous Track");
      }
      // 'M' or 'm' -> Toggle Mute
      else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause, nextTrack, prevTrack, toggleMute, showHud]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Detect horizontal swipe if deltaX > 55px and horizontal movement is greater than vertical movement
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe Left -> Next Track
        nextTrack(false);
        showHud("next", "Next Track");
      } else {
        // Swipe Right -> Previous Track
        prevTrack();
        showHud("prev", "Previous Track");
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const calculateSeekTimeFromEvent = useCallback((clientX: number, targetElement: HTMLElement) => {
    const totalDur = duration || activeTrack?.duration || 180;
    const rect = targetElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * totalDur;
  }, [duration, activeTrack]);

  const handleSeekStart = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    if (!duration && !activeTrack?.duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const newTime = calculateSeekTimeFromEvent(e.clientX, e.currentTarget);
    setScrubTime(newTime);
  };

  const handleSeekMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const newTime = calculateSeekTimeFromEvent(e.clientX, e.currentTarget);
    setScrubTime(newTime);
  };

  const handleSeekEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const finalTime = calculateSeekTimeFromEvent(e.clientX, e.currentTarget);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(false);
    setScrubTime(null);
    setSeekTo(finalTime);
    setCurrentTime(finalTime);
    setTimeout(() => setSeekTo(undefined), 100);
  };

  const handleSelectTrack = (index: number) => {
    setActiveTrackIndex(index);
    setIsPlaying(true);
    setCurrentTime(0);
    setSeekTo(0);
    setTimeout(() => setSeekTo(undefined), 100);
  };

  if (!activeTrack) return null;

  return (
    <main style={{ "--color-accent": effectiveAccentColor } as React.CSSProperties} className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden font-sans text-white">
      {/* Global Shortcut HUD Toast */}
      <AnimatePresence>
        {shortcutHud && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2.5 rounded-full bg-black/85 px-4 py-2 border border-white/20 shadow-2xl backdrop-blur-xl"
          >
            {shortcutHud.icon === "play" && <Play className="w-4 h-4 fill-white text-white" />}
            {shortcutHud.icon === "pause" && <Pause className="w-4 h-4 fill-white text-white" />}
            {shortcutHud.icon === "next" && <SkipForward className="w-4 h-4 fill-white text-white" />}
            {shortcutHud.icon === "prev" && <SkipBack className="w-4 h-4 fill-white text-white" />}
            {shortcutHud.icon === "muted" && <VolumeX className="w-4 h-4 text-red-400" />}
            {shortcutHud.icon === "unmuted" && <Volume2 className="w-4 h-4 text-white" />}
            <span className="text-xs font-semibold tracking-wide text-white">{shortcutHud.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      {errorToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/80 text-white px-4 py-2 rounded-full text-[12px] font-bold tracking-wider backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          {errorToast}
        </div>
      )}
      
      {/* Persistent Audio Engine & Embedded YouTube Player Container */}
      <div 
        aria-hidden="true"
        className="fixed top-0 left-0 w-1 h-1 pointer-events-none opacity-0 z-[-50] overflow-hidden"
      >
        <YouTubePlayer
          track={activeTrack}
          isPlaying={isPlaying}
          isMuted={isMuted}
          onStateChange={(playing) => {
            setIsPlaying(playing);
          }}
          onEnded={() => nextTrack(true)}
          onProgress={(time, dur) => {
            setCurrentTime(time);
            setDuration(dur);
          }}
          onError={() => {
            setErrorToast("Track unavailable. Skipping...");
            setTimeout(() => setErrorToast(null), 3000);
            nextTrack(true);
          }}
          seekTo={seekTo}
        />
      </div>

      {/* Backgrounds */}
      <div
        className="hero-bg fixed inset-0 -z-20 bg-cover bg-center transition-all duration-1000"
        style={{
          backgroundImage: "url('/bg/rap.png')",
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 767px) {
            .hero-bg { background-image: url('/bg/Indian%20Street%20Cypher.png') !important; }
          }
        `}} />
      </div>
      <div 
        className="fixed inset-0 -z-15 opacity-60 mix-blend-screen blur-[120px] transition-all duration-1000 pointer-events-none scale-110"
        style={{ backgroundImage: `url('${thumbnailUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/90 pointer-events-none" />
      <div className="fixed inset-0 -z-10 mix-blend-overlay opacity-30 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)"/>
        </svg>
      </div>

      {/* Top Bar - Fully Responsive for Mobile, Tablet, and Desktop */}
      <header className="w-full flex items-center justify-between p-3.5 sm:p-6 md:p-8 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.85rem,env(safe-area-inset-top))] z-20 gap-2 sm:gap-4 shrink-0">
        <div className="shrink-0">
          <Clock />
        </div>
        
        {/* Compact AI Importer and Tracklist in Nav */}
        <div className="flex-1 max-w-lg flex items-center justify-center gap-1.5 sm:gap-2">
          {isImportOpen ? (
            <form onSubmit={handleAIImport} className="flex flex-1 gap-1.5 sm:gap-2 items-center w-full animate-enter-import origin-top">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="YouTube playlist URL..."
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-accent)] focus:bg-white/10 transition-all shadow-inner min-w-0"
              />
              <button
                type="submit"
                disabled={isAiLoading}
                className="bg-[var(--color-accent)] text-black px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isAiLoading ? "Parsing..." : "Import"}
              </button>
              <button 
                type="button" 
                onClick={() => setIsImportOpen(false)}
                className="shrink-0 p-1 text-white/40 hover:text-white/80 transition-colors rounded-full"
                aria-label="Close importer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="import-playlist-nav-button"
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md active:scale-95"
                aria-label="Import Playlist"
              >
                <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/80 hidden xs:inline">Import</span>
              </button>
              <button
                id="open-tracklist-nav-button"
                onClick={() => setIsTracklistOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all backdrop-blur-md active:scale-95 shadow-sm"
                aria-label="Open Tracklist"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white font-semibold">
                  Tracks ({activePlaylist?.tracks.length || 0})
                </span>
              </button>
              <button
                id="open-sleep-timer-nav-button"
                onClick={() => setIsSleepTimerOpen(true)}
                className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full border transition-all backdrop-blur-md active:scale-95 shadow-sm ${
                  sleepTimerSeconds !== null
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-semibold'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                }`}
                aria-label="Sleep Timer"
                title={sleepTimerSeconds !== null ? `Sleep Timer: ${Math.ceil(sleepTimerSeconds / 60)}m left` : "Set Sleep Timer"}
              >
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hidden xs:inline">
                  {sleepTimerSeconds !== null ? `${Math.ceil(sleepTimerSeconds / 60)}m` : "Timer"}
                </span>
                {sleepTimerSeconds !== null && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-accent)]"></span>
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 justify-end">
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/5 bg-white/5 px-2.5 sm:px-3 py-1.5 backdrop-blur-md transition-all hover:bg-white/10 hover:scale-105 active:scale-95 cursor-default">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"></div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/80">{listeners}</span>
          </div>
        </div>
      </header>

      {/* DESKTOP & TABLET CENTER TEXT BLOCK (Hidden on mobile) */}
      <div className="hidden sm:flex flex-col items-center justify-center text-center flex-1 px-4 my-auto py-4 sm:py-6">
        <motion.h1 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-2 sm:mb-4 text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.35em] text-white/30"
        >
          Now Playing
        </motion.h1>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activePlaylist?.id}-${activeTrack.id || activeTrack.videoId}`}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center max-w-4xl px-2"
          >
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-tight text-white drop-shadow-lg text-balance line-clamp-2 leading-tight">
              {cleanTrackTitle(activeTrack.title)}
            </h2>
            <p className="mt-2 sm:mt-4 text-white/60 text-sm md:text-base max-w-xl line-clamp-1 font-medium">
              {cleanTrackArtist(activeTrack.artist, activeTrack.title)}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* MOBILE MAIN CENTER STAGE (Vinyl Showcase with Touch Gestures, hidden on tablet/desktop) */}
      <div 
        className="flex sm:hidden flex-1 w-full max-w-4xl flex-col items-center justify-center px-4 py-2 select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated Vinyl Disc Turntable Showcase */}
        <div className="relative flex flex-col items-center justify-center my-auto">
          {/* Ambient Glow behind vinyl */}
          <div 
            className="absolute -inset-4 rounded-full opacity-60 blur-3xl transition-all duration-700 pointer-events-none"
            style={{ 
              backgroundColor: dominantColor,
              transform: isPlaying ? 'scale(1.08)' : 'scale(0.95)',
              opacity: isPlaying ? 0.65 : 0.35
            }}
          />

          {/* Vinyl Record */}
          <div 
            onClick={handlePlayPause}
            className="group relative cursor-pointer active:scale-95 transition-transform duration-200"
            title={isPlaying ? "Tap to pause" : "Tap to play"}
          >
            {/* Outer Vinyl grooved ring */}
            <div 
              className="relative w-48 h-48 xs:w-56 xs:h-56 rounded-full p-2.5 bg-gradient-to-tr from-[#121214] via-[#222226] to-[#0a0a0c] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.12)] flex items-center justify-center border border-white/10"
              style={{
                animation: 'spin 12s linear infinite',
                animationPlayState: isPlaying ? 'running' : 'paused'
              }}
            >
              {/* Vinyl Groove concentric circles */}
              <div className="absolute inset-2 rounded-full border border-white/[0.07] pointer-events-none" />
              <div className="absolute inset-4 rounded-full border border-white/[0.05] pointer-events-none" />
              <div className="absolute inset-6 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/[0.03] pointer-events-none" />

              {/* Center Artwork Label */}
              <div className="relative w-24 h-24 xs:w-28 xs:h-28 rounded-full overflow-hidden border-2 border-black shadow-inner">
                <Image 
                  src={thumbnailUrl} 
                  alt={activeTrack.title} 
                  fill 
                  className="object-cover scale-[1.25]" 
                  referrerPolicy="no-referrer"
                />
                {/* Center Spindle Hole */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-5 h-5 bg-[#0c0c0e] ring-4 ring-[#1a1a1e] rounded-full shadow-inner flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Play/Pause overlay badge on hover or paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-12 w-12 rounded-full bg-black/70 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                </div>
              </div>
            )}
          </div>

          {/* Swipe Hint Pill on Mobile */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-white/35 font-medium tracking-wide">
            <span>← Swipe left/right for tracks →</span>
          </div>

          {/* Song Metadata Block */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePlaylist?.id}-${activeTrack.id || activeTrack.videoId}`}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center mt-3 max-w-lg px-2"
            >
              {/* Category / Playlist Tag */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-white/80">
                  {activePlaylist?.name || "Desi Hip Hop"}
                </span>
                <span className="text-[10px] text-white/40 font-medium">
                  Track {activeTrackIndex + 1} of {activePlaylist?.tracks.length || 0}
                </span>
              </div>

              {/* Song Title */}
              <h1 className="text-xl xs:text-2xl font-bold tracking-tight text-white drop-shadow-md text-balance line-clamp-2 leading-tight">
                {cleanTrackTitle(activeTrack.title)}
              </h1>

              {/* Artist Name */}
              <p className="mt-1 text-white/70 text-xs xs:text-sm font-medium flex items-center gap-1.5">
                <span>{cleanTrackArtist(activeTrack.artist, activeTrack.title)}</span>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Player Area */}
      <footer className="w-full max-w-xl md:max-w-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] px-3 sm:px-4 flex flex-col items-center z-10 gap-3 sm:gap-6 shrink-0">
        
        {/* Playlist Selector - Smooth Horizontal Carousel */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05, delayChildren: 0.1 }
            }
          }}
          className="flex gap-2 overflow-x-auto w-full pb-1 scrollbar-none snap-x touch-pan-x justify-start sm:justify-center px-1"
        >
          {appPlaylists.map((playlist, idx) => (
            <motion.button
              key={playlist.id}
              variants={{
                hidden: { opacity: 0, y: 10, scale: 0.95 },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1, 
                  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } 
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (idx !== activePlaylistIndex) {
                  setActivePlaylistIndex(idx);
                  setActiveTrackIndex(0);
                  setIsPlaying(true);
                  setCurrentTime(0);
                }
              }}
              className={`snap-center shrink-0 px-3.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] uppercase tracking-widest font-bold transition-all backdrop-blur-md ${
                idx === activePlaylistIndex 
                ? "bg-white/20 text-white border border-white/30 shadow-lg ring-1 ring-white/20" 
                : "bg-black/20 text-white/40 border border-white/5 hover:text-white/80"
              }`}
            >
              {playlist.name}
            </motion.button>
          ))}
        </motion.div>

        {/* The Player Container */}
        <div className="w-full">
          
          {/* DESKTOP & TABLET PILL (Original requested layout for screens >= sm) */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="hidden sm:flex items-center w-full p-3 pr-5 border border-white/10 bg-gradient-to-b from-white/[0.15] to-white/[0.055] backdrop-blur-3xl backdrop-saturate-[1.7] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] rounded-full"
          >
            {/* Artwork / Vinyl with Thumbnail */}
            <div className="relative w-[72px] h-[72px] md:w-[80px] md:h-[80px] rounded-full overflow-hidden shrink-0 border border-white/20 shadow-lg"
                 style={{ animation: 'spin 8s linear infinite', animationPlayState: isPlaying ? 'running' : 'paused' }}>
              <Image 
                src={thumbnailUrl} 
                alt="Track Thumbnail" 
                fill 
                className="object-cover scale-[1.3]" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[18px] h-[18px] bg-[#111] ring-4 ring-[#050505] rounded-full" />
              </div>
            </div>

            {/* Info & Seek */}
            <div className="flex-1 flex flex-col justify-center ml-3 md:ml-4 mr-4 md:mr-6 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTrack.videoId || activeTrack.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="min-w-0"
                >
                  <div className="truncate text-[14px] md:text-[15px] font-semibold text-white drop-shadow-sm">{activeTrack.title}</div>
                  <div className="truncate text-[12px] md:text-[12.5px] text-white/70">{activeTrack.artist}</div>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex items-center gap-2.5 md:gap-3 mt-2">
                <div className="text-[10px] md:text-[10.5px] tabular-nums text-white/40 shrink-0 select-none">
                  {formatTime(isScrubbing && scrubTime !== null ? scrubTime : currentTime)}
                </div>
                <div 
                  className="flex-1 group relative h-7 w-full cursor-pointer touch-none flex items-center select-none"
                  onPointerDown={(e) => handleSeekStart(e, false)}
                  onPointerMove={handleSeekMove}
                  onPointerUp={handleSeekEnd}
                  onPointerCancel={handleSeekEnd}
                >
                  <div className="h-[3.5px] w-full bg-white/15 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent)] rounded-full ${isScrubbing ? 'transition-none' : 'transition-all duration-100 ease-linear'}`}
                      style={{ 
                        width: `${(duration || activeTrack.duration) ? ((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / (duration || activeTrack.duration)) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <div 
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] ring-2 ring-black/30 ${isScrubbing ? 'scale-125 transition-none' : 'scale-0 group-hover:scale-100 transition-transform duration-150 ease-out'}`}
                    style={{ 
                      left: `${(duration || activeTrack.duration) ? ((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / (duration || activeTrack.duration)) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="text-[10px] md:text-[10.5px] tabular-nums text-white/40 shrink-0 select-none">
                  {formatTime(duration || activeTrack.duration)}
                </div>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center gap-3.5 md:gap-6 shrink-0">
              <button 
                id="player-shuffle-button-desktop"
                onClick={() => setIsShuffle(!isShuffle)} 
                className={`transition-colors p-1.5 rounded-full ${isShuffle ? 'text-[var(--color-accent)]' : 'text-white/40 hover:text-white/60'}`}
                title="Shuffle"
              >
                <Shuffle className="w-[17px] h-[17px] md:w-[18px] md:h-[18px]" />
              </button>
              
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  id="player-prev-button-desktop"
                  onClick={prevTrack} 
                  className="text-white/60 hover:text-white transition-colors p-1.5 rounded-full active:scale-95"
                  title="Previous Track"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>
                <button 
                  id="player-playpause-button-desktop"
                  onClick={handlePlayPause} 
                  className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95 shadow-lg"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button 
                  id="player-next-button-desktop"
                  onClick={() => nextTrack(false)} 
                  className="text-white/60 hover:text-white transition-colors p-1.5 rounded-full active:scale-95"
                  title="Next Track"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>

              <button 
                id="player-repeat-button-desktop"
                onClick={() => setRepeatMode((prev) => (prev + 1) % 3)} 
                className={`transition-colors p-1.5 rounded-full ${repeatMode > 0 ? 'text-[var(--color-accent)]' : 'text-white/40 hover:text-white/60'}`}
                title="Repeat Mode"
              >
                {repeatMode === 2 ? <Repeat1 className="w-[17px] h-[17px] md:w-[18px] md:h-[18px]" /> : <Repeat className="w-[17px] h-[17px] md:w-[18px] md:h-[18px]" />}
              </button>

              <button 
                id="player-mute-button-desktop"
                onClick={toggleMute} 
                className={`transition-colors p-1.5 rounded-full ${isMuted ? 'text-red-400 hover:text-red-300' : 'text-white/40 hover:text-white/80'}`}
                title={isMuted ? "Unmute audio (M)" : "Mute audio (M)"}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-[17px] h-[17px] md:w-[18px] md:h-[18px]" /> : <Volume2 className="w-[17px] h-[17px] md:w-[18px] md:h-[18px]" />}
              </button>

              <div className="h-4 w-[1px] bg-white/10" />

              <button 
                id="open-tracklist-player-desktop"
                onClick={() => setIsTracklistOpen(true)} 
                className="transition-all text-white/50 hover:text-white hover:scale-110 active:scale-95 p-1.5"
                title="View playlist tracks"
              >
                <ListMusic className="w-[18px] h-[18px] md:w-[19px] md:h-[19px]" />
              </button>
            </div>
          </motion.div>

          {/* MOBILE MASTER GLASS CONTROL DECK (< 640px) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex sm:hidden flex-col w-full border border-white/15 bg-gradient-to-b from-white/[0.14] via-black/40 to-black/80 backdrop-blur-2xl backdrop-saturate-[1.8] shadow-[0_16px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.25)] rounded-[26px] p-3.5 xs:p-4 gap-2.5"
          >
            {/* Progress Seek Bar with Accessible Touch Handle */}
            <div className="flex flex-col gap-1.5 w-full select-none">
              <div 
                className="group relative h-8 w-full cursor-pointer touch-none flex items-center select-none"
                onPointerDown={(e) => handleSeekStart(e, true)}
                onPointerMove={handleSeekMove}
                onPointerUp={handleSeekEnd}
                onPointerCancel={handleSeekEnd}
              >
                <div className="h-[5px] w-full bg-white/15 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)] rounded-full ${isScrubbing ? 'transition-none' : 'transition-all duration-100 ease-linear'}`}
                    style={{ 
                      width: `${(duration || activeTrack.duration) ? ((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / (duration || activeTrack.duration)) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div 
                  className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] ring-2 ring-black/40 ${isScrubbing ? 'scale-125 transition-none' : 'scale-100 transition-transform'}`}
                  style={{ 
                    left: `${(duration || activeTrack.duration) ? ((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / (duration || activeTrack.duration)) * 100 : 0}%` 
                  }}
                />
              </div>

              {/* Time Indicators */}
              <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-white/50 px-0.5 select-none">
                <span>{formatTime(isScrubbing && scrubTime !== null ? scrubTime : currentTime)}</span>
                <span>{formatTime(duration || activeTrack.duration)}</span>
              </div>
            </div>

            {/* Primary Transport Controls */}
            <div className="flex items-center justify-between w-full pt-0.5">
              {/* Shuffle Button */}
              <button 
                id="player-shuffle-button-mobile"
                onClick={() => setIsShuffle(!isShuffle)} 
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${isShuffle ? 'text-[var(--color-accent)] bg-white/10' : 'text-white/50 hover:text-white/80'}`}
                title="Shuffle"
                aria-label="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              
              {/* Previous Track */}
              <button 
                id="player-prev-button-mobile"
                onClick={prevTrack} 
                className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 hover:text-white active:scale-85 transition-all"
                title="Previous Track"
                aria-label="Previous Track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {/* Master Play / Pause Button */}
              <button 
                id="player-playpause-button-mobile"
                onClick={handlePlayPause} 
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition-all active:scale-90 shadow-[0_0_25px_rgba(255,255,255,0.35)] mx-1"
                title={isPlaying ? "Pause" : "Play"}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>

              {/* Next Track */}
              <button 
                id="player-next-button-mobile"
                onClick={() => nextTrack(false)} 
                className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 hover:text-white active:scale-85 transition-all"
                title="Next Track"
                aria-label="Next Track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              {/* Repeat Mode Button */}
              <button 
                id="player-repeat-button-mobile"
                onClick={() => setRepeatMode((prev) => (prev + 1) % 3)} 
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${repeatMode > 0 ? 'text-[var(--color-accent)] bg-white/10' : 'text-white/50 hover:text-white/80'}`}
                title={repeatMode === 2 ? "Repeat One" : repeatMode === 1 ? "Repeat All" : "Repeat Off"}
                aria-label="Repeat Mode"
              >
                {repeatMode === 2 ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Secondary Quick Action Bar (Mute, Sleep Timer, Theme & Full Tracklist Drawer trigger) */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-white/50 text-xs">
              <button
                id="player-mute-button-mobile"
                onClick={toggleMute}
                className={`flex items-center gap-1 py-1 px-2 rounded-full transition-all active:scale-95 ${isMuted ? 'text-red-400 bg-red-500/10' : 'hover:text-white hover:bg-white/5'}`}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-semibold">{isMuted ? "Muted" : "Mute"}</span>
              </button>

              <button
                id="player-sleep-timer-button-mobile"
                onClick={() => setIsSleepTimerOpen(true)}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all active:scale-95 ${sleepTimerSeconds !== null ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 font-semibold' : 'hover:text-white hover:bg-white/5'}`}
                aria-label="Sleep Timer"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">
                  {sleepTimerSeconds !== null ? `${Math.ceil(sleepTimerSeconds / 60)}m` : "Timer"}
                </span>
              </button>

              <button
                id="open-tracklist-player-footer-mobile"
                onClick={() => setIsTracklistOpen(true)}
                className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 font-semibold text-[11px]"
              >
                <ListMusic className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Queue ({activePlaylist?.tracks.length || 0})</span>
              </button>
            </div>
          </motion.div>
        </div>
      </footer>

      {/* Slide-out Tracklist Drawer */}
      <TracklistDrawer
        isOpen={isTracklistOpen}
        onClose={() => setIsTracklistOpen(false)}
        playlist={activePlaylist}
        activeTrackIndex={activeTrackIndex}
        isPlaying={isPlaying}
        onSelectTrack={handleSelectTrack}
        dominantColor={effectiveAccentColor}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
        remainingSeconds={sleepTimerSeconds}
        onSetTimer={handleSetSleepTimer}
        dominantColor={effectiveAccentColor}
      />

      {/* User Settings & Accent Theme Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        dominantColor={dominantColor}
        effectiveColor={effectiveAccentColor}
      />
    </main>
  );
}


