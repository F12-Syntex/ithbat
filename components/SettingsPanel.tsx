"use client";

import { motion, AnimatePresence } from "framer-motion";

import { useTheme, type ThemeAccent } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";

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
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-x-4 top-[10%] sm:inset-auto sm:right-4 sm:top-4 sm:w-80 max-h-[80vh] bg-white dark:bg-neutral-900 z-50 rounded-2xl shadow-2xl overflow-hidden"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Settings
              </h2>
              <button
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
                onClick={onClose}
              >
                <svg
                  className="w-4 h-4 text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-5 space-y-6 overflow-y-auto max-h-[calc(80vh-60px)]">
              {/* Theme Colors */}
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
                  Theme
                </p>

                {/* Color Selection */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  {["emerald", "blue", "purple", "rose", "amber", "cyan"].map((accent) => (
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
                          (t) => t.accent === accent && t.mode === theme.mode
                        );
                        if (newTheme) setTheme(newTheme);
                      }}
                    />
                  ))}
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
                      const newTheme = lightThemes.find((t) => t.accent === theme.accent);
                      if (newTheme) setTheme(newTheme);
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
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
                      const newTheme = darkThemes.find((t) => t.accent === theme.accent);
                      if (newTheme) setTheme(newTheme);
                    }}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
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

                {/* Sources Slider */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Max sources
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded-md">
                      {settings.maxWebsiteNodes}
                    </span>
                  </div>
                  <input
                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    max="15"
                    min="3"
                    type="range"
                    value={settings.maxWebsiteNodes}
                    onChange={(e) =>
                      updateSetting("maxWebsiteNodes", parseInt(e.target.value))
                    }
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-2">
                    <span>Faster</span>
                    <span>More thorough</span>
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Auto-expand steps
                    </span>
                    <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                      settings.autoExpandSteps ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings.autoExpandSteps ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </div>
                    <input
                      checked={settings.autoExpandSteps}
                      className="sr-only"
                      type="checkbox"
                      onChange={(e) =>
                        updateSetting("autoExpandSteps", e.target.checked)
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      Show timestamps
                    </span>
                    <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                      settings.showTimestamps ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settings.showTimestamps ? "translate-x-4" : "translate-x-0"
                      }`} />
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
                  <span className="text-xs text-neutral-400">v0.1</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
