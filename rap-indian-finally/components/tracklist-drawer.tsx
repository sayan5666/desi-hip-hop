"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, Play, Pause, Music, Volume2 } from "lucide-react";
import Image from "next/image";
import { Track, Playlist, cleanTrackTitle, cleanTrackArtist } from "@/lib/data";

interface TracklistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playlist?: Playlist;
  activeTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  dominantColor?: string;
}

function formatDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TracklistDrawer({
  isOpen,
  onClose,
  playlist,
  activeTrackIndex,
  isPlaying,
  onSelectTrack,
  dominantColor = "#F27D26",
}: TracklistDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Scroll active track into view on open
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      const timer = setTimeout(() => {
        activeItemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTrackIndex]);

  const tracks = playlist?.tracks || [];
  
  const filteredTracksWithIndices = tracks
    .map((track, originalIndex) => ({ track, originalIndex }))
    .filter(({ track }) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q)
      );
    });

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="tracklist-drawer-root" className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
          {/* Backdrop */}
          <motion.div
            id="tracklist-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Slide-out Drawer Panel (Mobile Bottom Sheet / Desktop Right Drawer) */}
          <motion.div
            id="tracklist-drawer-panel"
            initial={{ y: "100%", x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: "100%", x: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="relative z-10 flex h-[85vh] sm:h-full w-full sm:max-w-md flex-col rounded-t-[32px] sm:rounded-t-none sm:rounded-l-[32px] bg-[#0c0c0e]/95 border-t sm:border-t-0 sm:border-l border-white/15 shadow-[0_-10px_40px_rgba(0,0,0,0.9)] sm:shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-3xl text-white pt-2 sm:pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="sm:hidden flex justify-center py-2 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-white/25 active:bg-white/40 cursor-grab" onClick={onClose} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 sm:py-4 shrink-0">
              <div className="flex flex-col min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] shrink-0">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight truncate text-white">
                    {playlist?.name || "Playlist Tracks"}
                  </h2>
                </div>
                <p className="text-xs text-white/50 mt-0.5 font-medium flex items-center gap-1.5">
                  <span>{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span>
                  <span>•</span>
                  <span>Tap song to play</span>
                </p>
              </div>

              <button
                id="tracklist-drawer-close-button"
                onClick={onClose}
                aria-label="Close tracklist drawer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 active:scale-90 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-5 py-3 border-b border-white/5 shrink-0 bg-black/20">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  id="tracklist-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search songs or artists..."
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-8 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-accent)] focus:bg-white/10 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 text-white/40 hover:text-white rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Track List */}
            <div
              ref={listContainerRef}
              id="tracklist-items-container"
              className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
            >
              {filteredTracksWithIndices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <p className="text-sm font-medium text-white/50">No tracks found</p>
                  <p className="text-xs text-white/30 mt-1">Try searching for a different keyword</p>
                </div>
              ) : (
                filteredTracksWithIndices.map(({ track, originalIndex }) => {
                  const isActive = originalIndex === activeTrackIndex;
                  const thumb = `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;

                  return (
                    <button
                      key={`${track.id || track.videoId}-${originalIndex}`}
                      ref={isActive ? activeItemRef : null}
                      id={`track-item-${originalIndex}`}
                      onClick={() => {
                        onSelectTrack(originalIndex);
                      }}
                      className={`group relative flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-150 ${
                        isActive
                          ? "bg-white/[0.12] border border-white/20 shadow-lg ring-1 ring-white/15"
                          : "hover:bg-white/[0.06] border border-transparent active:scale-[0.99]"
                      }`}
                    >
                      {/* Track Index or Playing Indicator */}
                      <div className="flex w-6 shrink-0 items-center justify-center text-xs font-semibold tabular-nums">
                        {isActive ? (
                          isPlaying ? (
                            <div className="flex items-end gap-[2px] h-3.5 w-3.5">
                              <span className="w-1 bg-[var(--color-accent)] rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
                              <span className="w-1 bg-[var(--color-accent)] rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-2/3" />
                              <span className="w-1 bg-[var(--color-accent)] rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4/5" />
                            </div>
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                          )
                        ) : (
                          <span className="text-white/40 group-hover:hidden">
                            {originalIndex + 1}
                          </span>
                        )}
                        {!isActive && (
                          <Play className="hidden w-3.5 h-3.5 fill-current text-white/80 group-hover:block" />
                        )}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-inner">
                        <Image
                          src={thumb}
                          alt={track.title}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5 text-white fill-current drop-shadow" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-white fill-current drop-shadow ml-0.5" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div
                          className={`truncate text-xs font-semibold ${
                            isActive ? "text-white drop-shadow-sm font-bold" : "text-white/90 group-hover:text-white"
                          }`}
                        >
                          {cleanTrackTitle(track.title)}
                        </div>
                        <div className="truncate text-[11px] text-white/50 group-hover:text-white/70 mt-0.5">
                          {cleanTrackArtist(track.artist, track.title)}
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`text-[11px] tabular-nums ${
                            isActive ? "text-[var(--color-accent)] font-semibold" : "text-white/40 group-hover:text-white/60"
                          }`}
                        >
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary / Quick Now Playing Bar */}
            {playlist?.tracks[activeTrackIndex] && (
              <div className="border-t border-white/10 bg-black/40 px-4 py-3 shrink-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse shrink-0" />
                  <div className="truncate text-xs">
                    <span className="text-white/50">Current: </span>
                    <span className="font-semibold text-white">
                      {playlist.tracks[activeTrackIndex].title}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-white/60 tabular-nums shrink-0">
                  #{activeTrackIndex + 1} / {tracks.length}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
