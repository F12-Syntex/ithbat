"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon, Zap, Timer, Infinity, Check } from "lucide-react";

import { useTheme, type ThemeAccent } from "@/context/ThemeContext";
import { useSettings, type SearchDuration, type EvidenceTypeFilters } from "@/context/SettingsContext";

const DURATION_OPTIONS: { value: SearchDuration; label: string; icon: typeof Zap; desc: string }[] = [
  { value: "low", label: "Quick", icon: Zap, desc: "~30s" },
  { value: "medium", label: "Standard", icon: Timer, desc: "~1min" },
  { value: "unlimited", label: "Thorough", icon: Infinity, desc: "No limit" },
];

const EVIDENCE_TYPES: { key: keyof EvidenceTypeFilters; label: string }[] = [
  { key: "quran", label: "Quran" },
  { key: "hadith", label: "Hadith" },
  { key: "scholar", label: "Scholars" },
  { key: "fatwa", label: "Fatwas" },
];

const ACCENT_COLORS: Record<ThemeAccent, { bg: string; ring: string }> = {
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-500/30" },
  blue: { bg: "bg-blue-500", ring: "ring-blue-500/30" },
  purple: { bg: "bg-purple-500", ring: "ring-purple-500/30" },
  rose: { bg: "bg-rose-500", ring: "ring-rose-500/30" },
  amber: { bg: "bg-amber-500", ring: "ring-amber-500/30" },
  cyan: { bg: "bg-cyan-500", ring: "ring-cyan-500/30" },
};

export function SettingsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme, themes } = useTheme();
  const { settings, updateSetting } = useSettings();

  // Group themes by mode
  const darkThemes = themes.filter((t) => t.mode === "dark");
  const lightThemes = themes.filter((t) => t.mode === "light");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Mobile: Bottom sheet */}
          <motion.div
            animate={{ y: 0 }}
            className="sm:hidden fixed inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-neutral-900 z-50 rounded-t-2xl shadow-2xl overflow-hidden"
            exit={{ y: "100%" }}
            initial={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>
            <SettingsPanelContent
              darkThemes={darkThemes}
              lightThemes={lightThemes}
              setTheme={setTheme}
              settings={settings}
              theme={theme}
              themes={themes}
              updateSetting={updateSetting}
              onClose={onClose}
            />
          </motion.div>
          {/* Desktop: Side panel */}
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="hidden sm:block fixed right-4 top-4 w-80 max-h-[80vh] bg-white dark:bg-neutral-900 z-50 rounded-2xl shadow-2xl overflow-hidden"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <SettingsPanelContent
              darkThemes={darkThemes}
              lightThemes={lightThemes}
              setTheme={setTheme}
              settings={settings}
              theme={theme}
              themes={themes}
              updateSetting={updateSetting}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingsPanelContent({
  theme,
  themes,
  setTheme,
  settings,
  updateSetting,
  darkThemes,
  lightThemes,
  onClose,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
  themes: ReturnType<typeof useTheme>["themes"];
  setTheme: ReturnType<typeof useTheme>["setTheme"];
  settings: ReturnType<typeof useSettings>["settings"];
  updateSetting: ReturnType<typeof useSettings>["updateSetting"];
  darkThemes: ReturnType<typeof useTheme>["themes"];
  lightThemes: ReturnType<typeof useTheme>["themes"];
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
          Settings
        </h2>
        <button
          className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          <X className="w-4 h-4 text-neutral-500" strokeWidth={2} />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-5 overflow-y-auto max-h-[calc(80vh-60px)]">
        {/* Theme Colors */}
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Theme
          </p>

          {/* Color Selection */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {["emerald", "blue", "purple", "rose", "amber", "cyan"].map(
              (accent) => (
                <button
                  key={accent}
                  className={`w-8 h-8 rounded-full transition-all ${
                    ACCENT_COLORS[accent as ThemeAccent].bg
                  } ${
                    theme.accent === accent
                      ? `ring-4 ${ACCENT_COLORS[accent as ThemeAccent].ring} scale-110`
                      : "hover:scale-110"
                  }`}
                  onClick={() => {
                    const newTheme = themes.find(
                      (t) => t.accent === accent && t.mode === theme.mode,
                    );

                    if (newTheme) setTheme(newTheme);
                  }}
                />
              ),
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <button
              className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${
                theme.mode === "light"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
              onClick={() => {
                const newTheme = lightThemes.find(
                  (t) => t.accent === theme.accent,
                );

                if (newTheme) setTheme(newTheme);
              }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Sun className="w-4 h-4" strokeWidth={2} />
                Light
              </span>
            </button>
            <button
              className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${
                theme.mode === "dark"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
              onClick={() => {
                const newTheme = darkThemes.find(
                  (t) => t.accent === theme.accent,
                );

                if (newTheme) setTheme(newTheme);
              }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Moon className="w-4 h-4" strokeWidth={2} />
                Dark
              </span>
            </button>
          </div>
        </div>

        {/* Research Settings */}
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Research
          </p>

          {/* Search Depth - Compact horizontal layout */}
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((option) => {
              const isSelected = settings.searchDuration === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                    isSelected
                      ? "bg-accent-50 dark:bg-accent-900/20 ring-1 ring-accent-200 dark:ring-accent-800"
                      : "bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => updateSetting("searchDuration", option.value)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? "bg-accent-500 text-white"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
                  }`}>
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className={`text-xs font-medium ${
                    isSelected
                      ? "text-accent-700 dark:text-accent-300"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}>
                    {option.label}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {option.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sources Slider - Compact */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                Max sources
              </span>
              <span className="text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                {settings.maxWebsiteNodes}
              </span>
            </div>
            <input
              className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer"
              max="100"
              min="3"
              style={{ accentColor: "var(--accent-500)" }}
              type="range"
              value={settings.maxWebsiteNodes}
              onChange={(e) =>
                updateSetting("maxWebsiteNodes", parseInt(e.target.value))
              }
            />
          </div>

          {/* Evidence Type Filters */}
          <div className="mt-3">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-2">
              Include in results
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EVIDENCE_TYPES.map(({ key, label }) => {
                const isActive = settings.evidenceFilters[key];
                return (
                  <button
                    key={key}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-accent-500 text-white shadow-sm"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                    onClick={() =>
                      updateSetting("evidenceFilters", {
                        ...settings.evidenceFilters,
                        [key]: !isActive,
                      })
                    }
                  >
                    {isActive && <Check className="w-3 h-3" strokeWidth={3} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="mt-3">
            <label className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <span className="text-xs text-neutral-700 dark:text-neutral-300">
                Show timestamps
              </span>
              <div
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                  settings.showTimestamps
                    ? "bg-accent-500"
                    : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.showTimestamps ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              <input
                checked={settings.showTimestamps}
                className="sr-only"
                type="checkbox"
                onChange={(e) =>
                  updateSetting("showTimestamps", e.target.checked)
                }
              />
            </label>
          </div>
        </div>

        {/* About */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">ithbat</span>
            <span className="text-xs text-neutral-400">v0.2</span>
          </div>
        </div>
      </div>
    </>
  );
}
