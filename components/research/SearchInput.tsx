"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchInputProps {
  onSearch: (query: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function SearchInput({
  onSearch,
  onCancel,
  isLoading,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (isLoading) {
      // Show confirmation dialog
      setPendingQuery(query.trim());
      setShowConfirmDialog(true);
    } else {
      onSearch(query.trim());
      setQuery("");
    }
  };

  const handleConfirm = () => {
    onCancel?.();
    // Small delay to let the cancel take effect
    setTimeout(() => {
      onSearch(pendingQuery);
      setQuery("");
      setPendingQuery("");
      setShowConfirmDialog(false);
    }, 100);
  };

  const handleCancelDialog = () => {
    setPendingQuery("");
    setShowConfirmDialog(false);
  };

  const handleStopClick = () => {
    onCancel?.();
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 focus-within:border-neutral-300 dark:focus-within:border-neutral-700 transition-colors">
          <input
            className="flex-1 bg-transparent text-base sm:text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-none focus:ring-0"
            placeholder={
              isLoading ? "Type to start a new search..." : "Ask a question..."
            }
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {isLoading ? (
            // Stop button when loading
            <button
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-red-500 hover:bg-red-600 text-white"
              title="Stop research"
              type="button"
              onClick={handleStopClick}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect height="12" rx="1" width="12" x="6" y="6" />
              </svg>
            </button>
          ) : (
            // Submit button when not loading
            <button
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                query.trim()
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
              }`}
              disabled={!query.trim()}
              type="submit"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={handleCancelDialog}
            />

            {/* Dialog */}
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-sm w-full overflow-hidden"
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
            >
              <div className="p-5">
                <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Start new search?
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  This will stop the current research and discard any incomplete
                  results.
                </p>
              </div>

              <div className="flex border-t border-neutral-200 dark:border-neutral-800">
                <button
                  className="flex-1 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  type="button"
                  onClick={handleCancelDialog}
                >
                  Cancel
                </button>
                <div className="w-px bg-neutral-200 dark:bg-neutral-800" />
                <button
                  className="flex-1 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  type="button"
                  onClick={handleConfirm}
                >
                  Stop & Search
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
