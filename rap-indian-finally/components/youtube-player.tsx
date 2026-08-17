"use client";

import { useEffect, useRef, useState } from "react";
import { Track } from "@/lib/data";
import { backgroundAudio } from "@/lib/background-audio";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YouTubePlayerProps {
  track: Track;
  isPlaying: boolean;
  isMuted?: boolean;
  onStateChange: (playing: boolean) => void;
  onEnded: () => void;
  onProgress: (currentTime: number, duration: number) => void;
  onError: () => void;
  seekTo?: number;
}

export function YouTubePlayer({
  track,
  isPlaying,
  isMuted = false,
  onStateChange,
  onEnded,
  onProgress,
  onError,
  seekTo,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundWatchRef = useRef<NodeJS.Timeout | null>(null);
  const isExplicitUserPauseRef = useRef(false);

  // Keep a mutable ref of the latest callbacks to avoid stale closures in YT Player events
  const callbacksRef = useRef({ onStateChange, onEnded, onError, isPlaying, isMuted });
  useEffect(() => {
    callbacksRef.current = { onStateChange, onEnded, onError, isPlaying, isMuted };
  }, [onStateChange, onEnded, onError, isPlaying, isMuted]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setApiReady(true);
      };
    } else {
      setApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (!apiReady || !containerRef.current) return;

    if (playerRef.current) {
      if (typeof playerRef.current.loadVideoById === "function") {
        playerRef.current.loadVideoById({
          videoId: track.videoId,
          startSeconds: 0,
        });

        try {
          if (callbacksRef.current.isMuted) {
            if (typeof playerRef.current.mute === "function") playerRef.current.mute();
          } else {
            if (typeof playerRef.current.unMute === "function") playerRef.current.unMute();
            if (typeof playerRef.current.setVolume === "function") playerRef.current.setVolume(100);
          }

          if (callbacksRef.current.isPlaying) {
            backgroundAudio.start();
            playerRef.current.playVideo();
          }
        } catch (e) {
          console.warn("Error setting volume/play on track load:", e);
        }
      }
    } else {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: track.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: callbacksRef.current.isPlaying ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          origin: typeof window !== "undefined" ? window.location.origin : "",
          widget_referrer: typeof window !== "undefined" ? window.location.href : "",
        },
        events: {
          onReady: (event: any) => {
            try {
              // Ensure iframe attributes allow background autoplay and picture-in-picture
              const iframe = event.target.getIframe?.();
              if (iframe) {
                iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
                iframe.setAttribute("playsinline", "true");
                iframe.setAttribute("webkit-playsinline", "true");
              }

              if (callbacksRef.current.isMuted) {
                if (typeof event.target.mute === "function") event.target.mute();
              } else {
                if (typeof event.target.unMute === "function") event.target.unMute();
                if (typeof event.target.setVolume === "function") event.target.setVolume(100);
              }
              if (callbacksRef.current.isPlaying) {
                backgroundAudio.start();
                event.target.playVideo();
              }
            } catch (e) {
              console.warn("onReady audio setup error:", e);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5, ENDED = 0
            if (event.data === 1) {
              isExplicitUserPauseRef.current = false;
              backgroundAudio.start();
              try {
                if (!callbacksRef.current.isMuted) {
                  if (typeof event.target.unMute === "function") event.target.unMute();
                  if (typeof event.target.setVolume === "function") event.target.setVolume(100);
                }
              } catch (e) {}
              callbacksRef.current.onStateChange(true);
            } else if (event.data === 2) {
              // If isPlaying is still desired and user didn't explicitly pause in UI,
              // or document is hidden / locked, immediately maintain playback
              if (callbacksRef.current.isPlaying && !isExplicitUserPauseRef.current) {
                try {
                  backgroundAudio.start();
                  event.target.playVideo();
                } catch {}
                return;
              }
              callbacksRef.current.onStateChange(false);
            } else if (event.data === 0) {
              callbacksRef.current.onEnded();
            }
          },
          onError: (event: any) => {
            console.warn("YouTube Player Error code:", event.data);
            callbacksRef.current.onError();
          },
        },
      });
    }
  }, [track.videoId, apiReady]);

  // Continuous background watchdog to prevent involuntary pause when locked or minimized
  useEffect(() => {
    const keepAlive = () => {
      if (callbacksRef.current.isPlaying && playerRef.current) {
        try {
          const state = typeof playerRef.current.getPlayerState === "function" 
            ? playerRef.current.getPlayerState() 
            : -1;
          
          if (state === 2 && !isExplicitUserPauseRef.current) {
            // Involuntary pause detected (mobile lockscreen / background suspension)
            backgroundAudio.start();
            playerRef.current.playVideo();
            if (!callbacksRef.current.isMuted && typeof playerRef.current.unMute === "function") {
              playerRef.current.unMute();
              playerRef.current.setVolume(100);
            }
          }
        } catch {}
      }
    };

    backgroundWatchRef.current = setInterval(keepAlive, 500);

    const handleVisibilityChange = () => {
      if (callbacksRef.current.isPlaying) {
        backgroundAudio.start();
        if (playerRef.current) {
          try {
            if (!callbacksRef.current.isMuted && typeof playerRef.current.unMute === "function") {
              playerRef.current.unMute();
              playerRef.current.setVolume(100);
            }
            if (typeof playerRef.current.playVideo === "function") {
              playerRef.current.playVideo();
            }
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("pageshow", handleVisibilityChange);
    window.addEventListener("pagehide", handleVisibilityChange);

    return () => {
      if (backgroundWatchRef.current) clearInterval(backgroundWatchRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("pageshow", handleVisibilityChange);
      window.removeEventListener("pagehide", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      try {
        if (isMuted) {
          if (typeof playerRef.current.mute === "function") playerRef.current.mute();
        } else {
          if (typeof playerRef.current.unMute === "function") playerRef.current.unMute();
          if (typeof playerRef.current.setVolume === "function") playerRef.current.setVolume(100);
        }
      } catch (e) {}
    }
  }, [isMuted]);

  useEffect(() => {
    if (isPlaying) {
      isExplicitUserPauseRef.current = false;
      backgroundAudio.start();
      if (playerRef.current && typeof playerRef.current.playVideo === "function") {
        try {
          if (!isMuted) {
            if (typeof playerRef.current.unMute === "function") playerRef.current.unMute();
            if (typeof playerRef.current.setVolume === "function") playerRef.current.setVolume(100);
          }
          playerRef.current.playVideo();
        } catch {}
      }
    } else {
      isExplicitUserPauseRef.current = true;
      backgroundAudio.pause();
      if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
    }
  }, [isPlaying, isMuted]);

  useEffect(() => {
    if (seekTo !== undefined && playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(seekTo, true);
    }
  }, [seekTo]);

  // High-frequency polling (100ms) for 60fps buttery-smooth playback slider progress
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration() || track.duration;
            if (typeof currentTime === "number" && !isNaN(currentTime)) {
              onProgress(currentTime, duration);
            }
          } catch {}
        }
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, onProgress, track.duration]);

  return (
    <div className="w-full h-full overflow-hidden pointer-events-none">
      <div
        ref={containerRef}
        className="w-full h-full pointer-events-none"
      />
    </div>
  );
}
