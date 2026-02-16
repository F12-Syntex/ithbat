"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Square, Settings } from "lucide-react";

import { useTranslation } from "@/lib/i18n";

interface SearchInputProps {
  onSearch: (query: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  suggestedQuery?: string;
  onSuggestedQueryApplied?: () => void;
  onSettings?: () => void;
}

export function SearchInput({
  onSearch,
  onCancel,
  isLoading,
  suggestedQuery,
  onSuggestedQueryApplied,
  onSettings,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const lastSubmittedQuery = useRef<string | null>(null);
  const { t } = useTranslation();

  // Use refs for callbacks to avoid triggering the effect when they change
  const onSearchRef = useRef(onSearch);
  const onSuggestedQueryAppliedRef = useRef(onSuggestedQueryApplied);

  // Keep refs up to date
  useEffect(() => {
    onSearchRef.current = onSearch;
    onSuggestedQueryAppliedRef.current = onSuggestedQueryApplied;
  }, [onSearch, onSuggestedQueryApplied]);

  // Apply suggested query when it changes and submit it
  useEffect(() => {
    if (suggestedQuery && suggestedQuery !== lastSubmittedQuery.current) {
      lastSubmittedQuery.current = suggestedQuery;
      setQuery(suggestedQuery);
      // Use refs to avoid re-running this effect when callbacks change
      onSearchRef.current(suggestedQuery);
      onSuggestedQueryAppliedRef.current?.();
    }
  }, [suggestedQuery]); // Only depend on suggestedQuery, not the callbacks

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
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none focus-within:border-neutral-300 dark:focus-within:border-neutral-700 focus-within:shadow-md dark:focus-within:shadow-none transition-all">
          <input
            className="flex-1 bg-transparent text-base sm:text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-none focus:ring-0"
            placeholder={
              isLoading ? t("search.placeholderLoading") : t("search.placeholder")
            }
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {isLoading ? (
            // Stop button when loading
            <button
              className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors bg-red-500 hover:bg-red-600 text-white"
              title={t("search.stopResearch")}
              type="button"
              onClick={handleStopClick}
            >
              <Square className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" />
            </button>
          ) : (
            // Submit button when not loading
            <button
              className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
                query.trim()
                  ? "bg-neutral-100 dark:bg-neutral-800 text-accent-600 dark:text-accent-400"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
              }`}
              disabled={!query.trim()}
              type="submit"
            >
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={handleCancelDialog}
            />

            {/* Mobile: Bottom sheet */}
            <motion.div
              animate={{ y: 0 }}
              className="sm:hidden fixed inset-x-0 bottom-0 bg-white dark:bg-neutral-900 z-50 rounded-t-3xl shadow-2xl overflow-hidden"
              exit={{ y: "100%" }}
              initial={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
              </div>

              <div className="px-5 pt-2 pb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  {t("search.newSearchTitle")}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t("search.newSearchDesc")}
                </p>
              </div>

              <div className="px-5 pb-8 flex flex-col gap-2">
                <button
                  className="w-full py-3.5 text-base font-medium text-white bg-red-500 hover:bg-red-600 rounded-3xl transition-colors"
                  type="button"
                  onClick={handleConfirm}
                >
                  {t("search.stopAndSearch")}
                </button>
                <button
                  className="w-full py-3.5 text-base text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-3xl transition-colors"
                  type="button"
                  onClick={handleCancelDialog}
                >
                  {t("search.cancel")}
                </button>
              </div>
            </motion.div>

            {/* Desktop: Centered dialog */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="hidden sm:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-neutral-900 z-50 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-sm w-full overflow-hidden"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="p-5">
                <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  {t("search.newSearchTitle")}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t("search.newSearchDesc")}
                </p>
              </div>

              <div className="flex border-t border-neutral-200 dark:border-neutral-800">
                <button
                  className="flex-1 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  type="button"
                  onClick={handleCancelDialog}
                >
                  {t("search.cancel")}
                </button>
                <div className="w-px bg-neutral-200 dark:bg-neutral-800" />
                <button
                  className="flex-1 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  type="button"
                  onClick={handleConfirm}
                >
                  {t("search.stopAndSearch")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
