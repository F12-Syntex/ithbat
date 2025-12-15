"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useTheme, type ThemeAccent } from "@/context/ThemeContext";

const ACCENT_COLORS: Record<ThemeAccent, { bg: string; ring: string }> = {
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-500" },
  blue: { bg: "bg-blue-500", ring: "ring-blue-500" },
  purple: { bg: "bg-purple-500", ring: "ring-purple-500" },
  rose: { bg: "bg-rose-500", ring: "ring-rose-500" },
  amber: { bg: "bg-amber-500", ring: "ring-amber-500" },
  cyan: { bg: "bg-cyan-500", ring: "ring-cyan-500" },
};

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className={`w-4 h-4 rounded-full ${ACCENT_COLORS[theme.accent].bg}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <button
              aria-label="Close theme selector"
              className="fixed inset-0 z-40 cursor-default bg-transparent border-none"
              type="button"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-2 z-50"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl p-3 min-w-[200px]">
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
                  Theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        theme.id === t.id
                          ? "bg-neutral-100 dark:bg-neutral-800"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                      onClick={() => {
                        setTheme(t);
                        setIsOpen(false);
                      }}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${ACCENT_COLORS[t.accent].bg} ${
                          theme.id === t.id
                            ? `ring-2 ring-offset-1 ${ACCENT_COLORS[t.accent].ring}`
                            : ""
                        }`}
                      />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
