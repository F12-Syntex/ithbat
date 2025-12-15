"use client";

import { motion, AnimatePresence } from "framer-motion";

import { useTheme, type ThemeAccent } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";

const ACCENT_COLORS: Record<ThemeAccent, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 z-50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-neutral-900 z-50 shadow-2xl"
            exit={{ opacity: 0, x: 100 }}
            initial={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Settings
              </h2>
              <button
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors"
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

            <div className="p-4 space-y-6">
              {/* Theme Selection */}
              <div>
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-3">
                  Appearance
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs border transition-all ${
                        theme.id === t.id
                          ? "border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800"
                          : "border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                      onClick={() => setTheme(t)}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${ACCENT_COLORS[t.accent]}`}
                      />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Research Settings */}
              <div>
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-3">
                  Research
                </p>
                <div className="space-y-4">
                  {/* Max Website Nodes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Max sources to crawl
                      </span>
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                        {settings.maxWebsiteNodes}
                      </span>
                    </div>
                    <input
                      className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                      max="15"
                      min="3"
                      type="range"
                      value={settings.maxWebsiteNodes}
                      onChange={(e) =>
                        updateSetting(
                          "maxWebsiteNodes",
                          parseInt(e.target.value),
                        )
                      }
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Faster</span>
                      <span>More thorough</span>
                    </div>
                  </div>

                  <label className="flex items-center justify-between py-2">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      Auto-expand steps
                    </span>
                    <input
                      checked={settings.autoExpandSteps}
                      className="w-4 h-4 rounded accent-emerald-500"
                      type="checkbox"
                      onChange={(e) =>
                        updateSetting("autoExpandSteps", e.target.checked)
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between py-2">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      Show timestamps
                    </span>
                    <input
                      checked={settings.showTimestamps}
                      className="w-4 h-4 rounded accent-emerald-500"
                      type="checkbox"
                      onChange={(e) =>
                        updateSetting("showTimestamps", e.target.checked)
                      }
                    />
                  </label>
                </div>
              </div>

              {/* About */}
              <div>
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-3">
                  About
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Ithbat - Islamic Knowledge Research
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  Version 1.0.0
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
