"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Palette, Sparkles, Check, RotateCcw, Sliders } from "lucide-react";

export interface AccentColorPreset {
  id: string;
  name: string;
  color: string;
  isDynamic?: boolean;
}

export const ACCENT_PRESETS: AccentColorPreset[] = [
  { id: "dynamic", name: "Dynamic Art", color: "", isDynamic: true },
  { id: "flame", name: "Flame Orange", color: "#F27D26" },
  { id: "crimson", name: "Cyber Red", color: "#EF4444" },
  { id: "cyan", name: "Electric Cyan", color: "#06B6D4" },
  { id: "emerald", name: "Acid Emerald", color: "#10B981" },
  { id: "purple", name: "Ultraviolet", color: "#A855F7" },
  { id: "amber", name: "Amber Gold", color: "#F59E0B" },
  { id: "pink", name: "Hot Magenta", color: "#EC4899" },
  { id: "cobalt", name: "Cobalt Blue", color: "#3B82F6" },
  { id: "rose", name: "Neon Rose", color: "#F43F5E" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  dominantColor: string;
  effectiveColor: string;
}

export function SettingsModal({
  isOpen,
  onClose,
  selectedPresetId,
  onSelectPreset,
  dominantColor,
  effectiveColor,
}: SettingsModalProps) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black/98 p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl text-white z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white transition-colors"
                  style={{ color: effectiveColor }}
                >
                  <Palette className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-white">Player Settings</h3>
                  <p className="text-[11px] text-white/50">Custom accent colors & aesthetics</p>
                </div>
              </div>

              <button
                id="close-settings-modal"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors active:scale-95"
                title="Close settings"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Accent Color Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Accent Color Theme
                </span>
                {selectedPresetId !== "flame" && (
                  <button
                    id="reset-accent-color-btn"
                    onClick={() => onSelectPreset("flame")}
                    className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white transition-colors active:scale-95"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>

              {/* Dynamic Option Button */}
              <div className="mb-3">
                <button
                  id="preset-accent-dynamic"
                  onClick={() => onSelectPreset("dynamic")}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] ${
                    selectedPresetId === "dynamic"
                      ? "border-[var(--color-accent)] bg-white/10 shadow-[0_0_16px_rgba(255,255,255,0.06)]"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-6 w-6 rounded-lg flex items-center justify-center shadow-md transition-colors"
                      style={{ backgroundColor: dominantColor }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-black/80" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-semibold text-white block">
                        Dynamic Album Artwork
                      </span>
                      <span className="text-[10px] text-white/50">
                        Adapts palette to each track art ({dominantColor})
                      </span>
                    </div>
                  </div>
                  {selectedPresetId === "dynamic" && (
                    <Check className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
                  )}
                </button>
              </div>

              {/* Preset Palette Grid */}
              <span className="text-[10px] font-semibold text-white/40 block mb-2 px-0.5">
                Fixed Presets
              </span>
              <div className="grid grid-cols-3 gap-2">
                {ACCENT_PRESETS.filter((p) => !p.isDynamic).map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      id={`preset-accent-${preset.id}`}
                      onClick={() => onSelectPreset(preset.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 group ${
                        isSelected
                          ? "border-white/40 bg-white/15 shadow-[0_0_14px_rgba(255,255,255,0.1)] ring-1 ring-white/30"
                          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className="h-6 w-6 rounded-full shadow-md transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: preset.color,
                            boxShadow: isSelected ? `0 0 12px ${preset.color}` : "none",
                          }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-black font-bold drop-shadow" />
                          </div>
                        )}
                      </div>
                      <span className="mt-1.5 text-[10px] font-medium text-white/80 group-hover:text-white truncate max-w-full">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="mt-4 pt-3.5 border-t border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-2 px-0.5">
                Preview
              </span>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-2 w-2 rounded-full animate-ping"
                    style={{ backgroundColor: effectiveColor }}
                  />
                  <div 
                    className="h-2 w-2 rounded-full -ml-4"
                    style={{ backgroundColor: effectiveColor }}
                  />
                  <span className="text-xs font-semibold text-white">Live Accent Glow</span>
                </div>

                <div 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold text-black shadow-sm"
                  style={{ backgroundColor: effectiveColor }}
                >
                  Active
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
