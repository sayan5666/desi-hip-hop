"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, X, Plus, Minus, Check, TimerReset } from "lucide-react";

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingSeconds: number | null;
  onSetTimer: (minutes: number | null) => void;
  dominantColor?: string;
}

const PRESETS = [15, 30, 45, 60, 90];

function formatCountdown(totalSecs: number) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SleepTimerModal({
  isOpen,
  onClose,
  remainingSeconds,
  onSetTimer,
  dominantColor = "#F27D26",
}: SleepTimerModalProps) {
  const [customMinutes, setCustomMinutes] = useState(30);

  // Sync custom minutes with active timer if running
  useEffect(() => {
    if (remainingSeconds !== null && remainingSeconds > 0) {
      setCustomMinutes(Math.ceil(remainingSeconds / 60));
    }
  }, [remainingSeconds]);

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

  const adjustCustom = (delta: number) => {
    setCustomMinutes((prev) => Math.max(5, Math.min(180, prev + delta)));
  };

  const isTimerActive = remainingSeconds !== null && remainingSeconds > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Subtle blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Compact modern glass card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/85 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl text-white z-10"
          >
            {/* Minimal Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white"
                  style={{ color: dominantColor }}
                >
                  <Moon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold tracking-wide text-white">Sleep Timer</h3>
                  {isTimerActive && (
                    <span className="text-[10px] font-medium text-[var(--color-accent)]">
                      Active
                    </span>
                  )}
                </div>
              </div>

              <button
                id="close-sleep-timer"
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors active:scale-95"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Active Live Countdown Banner (when running) */}
            {isTimerActive ? (
              <div className="my-2 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Stopping in
                </span>
                <span className="text-2xl font-bold tracking-tight text-white tabular-nums my-0.5">
                  {formatCountdown(remainingSeconds)}
                </span>
                
                <div className="mt-2.5 flex items-center gap-2 w-full">
                  <button
                    id="add-5m-sleep-timer"
                    onClick={() => {
                      const newMins = Math.ceil((remainingSeconds + 300) / 60);
                      onSetTimer(newMins);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white transition-colors active:scale-95"
                  >
                    +5 min
                  </button>
                  <button
                    id="cancel-active-sleep-timer"
                    onClick={() => {
                      onSetTimer(null);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-[11px] font-medium text-red-300 transition-colors active:scale-95"
                  >
                    Turn Off
                  </button>
                </div>
              </div>
            ) : null}

            {/* Quick Segment Presets */}
            <div className="mt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">
                Quick Presets
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESETS.map((mins) => {
                  const isCurrent = isTimerActive && Math.ceil(remainingSeconds / 60) === mins;
                  return (
                    <button
                      key={mins}
                      id={`preset-sleep-timer-${mins}`}
                      onClick={() => {
                        onSetTimer(mins);
                        onClose();
                      }}
                      className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                        isCurrent
                          ? "bg-[var(--color-accent)] text-black shadow-[0_0_12px_var(--color-accent)]"
                          : "bg-white/5 hover:bg-white/15 border border-white/5 text-white/90 hover:text-white"
                      }`}
                    >
                      <span>{mins}</span>
                      <span className="text-[9px] font-normal opacity-60">min</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Minutes Stepper */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
                <button
                  id="decrement-custom-timer"
                  onClick={() => adjustCustom(-5)}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors active:scale-90"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs font-semibold tabular-nums px-2 min-w-[52px] text-center text-white">
                  {customMinutes} m
                </span>
                <button
                  id="increment-custom-timer"
                  onClick={() => adjustCustom(5)}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors active:scale-90"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <button
                id="set-custom-sleep-timer"
                onClick={() => {
                  onSetTimer(customMinutes);
                  onClose();
                }}
                className="py-1.5 px-3.5 rounded-lg bg-[var(--color-accent)] text-black text-xs font-bold transition-transform active:scale-95 hover:brightness-110 shadow-[0_0_14px_rgba(242,125,38,0.3)]"
              >
                Start
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
