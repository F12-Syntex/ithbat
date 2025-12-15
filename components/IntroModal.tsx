"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INTRO_SEEN_KEY = "ithbat_intro_seen";

export function IntroModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the intro
    const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY);
    if (!hasSeenIntro) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(INTRO_SEEN_KEY, "true");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-accent-600 dark:text-accent-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                Welcome to Ithbat
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Islamic Knowledge Research
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    Research Islamic Knowledge
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Search Quran, Hadith, and scholarly sources for authentic rulings and guidance.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    Verified Sources
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Citations from sunnah.com, quran.com, islamqa.info, and other trusted Islamic resources.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    For Educational Use
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    This tool is for learning purposes. Always consult qualified scholars for personal rulings.
                  </p>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex gap-2">
                  <svg
                    className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Conversations are logged anonymously for analysis and improvement.
                    No personal data is collected. Please use this service responsibly
                    and avoid harmful or inappropriate queries.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
