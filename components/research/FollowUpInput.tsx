"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

import { useTranslation } from "@/lib/i18n";

interface FollowUpInputProps {
  onSubmit: (question: string) => void;
  isLoading?: boolean;
  previousQuery: string;
}

// Generate contextual follow-up suggestion keys based on the query
function getSuggestionKeys(query: string): string[] {
  const q = query.toLowerCase();
  const keys: string[] = [];

  if (q.includes("halal") || q.includes("haram") || q.includes("permissible") || q.includes("allowed")) {
    keys.push("suggest.conditions", "suggest.differences", "suggest.quranEvidence");
  } else if (q.includes("prayer") || q.includes("salah") || q.includes("salat")) {
    keys.push("suggest.validity", "suggest.invalidates", "suggest.sunnah");
  } else if (q.includes("hadith")) {
    keys.push("suggest.authentic", "suggest.scholarsHadith", "suggest.relatedHadith");
  } else if (q.includes("quran") || q.includes("surah") || q.includes("ayah") || q.includes("verse")) {
    keys.push("suggest.tafsir", "suggest.revelation", "suggest.relatedVerses");
  } else if (q.includes("zakat") || q.includes("charity")) {
    keys.push("suggest.calculated", "suggest.eligible", "suggest.whenPaid");
  } else if (q.includes("fasting") || q.includes("ramadan") || q.includes("sawm")) {
    keys.push("suggest.breaksFast", "suggest.exemptions", "suggest.fidyah");
  } else if (q.includes("marriage") || q.includes("nikah") || q.includes("spouse") || q.includes("husband") || q.includes("wife")) {
    keys.push("suggest.rights", "suggest.scholarsSay", "suggest.quranSunnah");
  } else {
    keys.push("suggest.hadithEvidence", "suggest.differentOpinions", "suggest.moreDetail");
  }

  return keys.slice(0, 3);
}

export function FollowUpInput({
  onSubmit,
  isLoading,
  previousQuery,
}: FollowUpInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const suggestionKeys = useMemo(
    () => getSuggestionKeys(previousQuery),
    [previousQuery],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!isLoading) {
      onSubmit(suggestion);
    }
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 sm:mt-6"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-3.5 h-3.5 text-accent-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {t("research.askFollowUp")}
        </span>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {suggestionKeys.map((key, i) => {
          const text = t(key);
          return (
            <motion.button
              key={key}
              animate={{ opacity: 1, y: 0 }}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full hover:border-accent-300 dark:hover:border-accent-700 hover:text-accent-600 dark:hover:text-accent-400 transition-colors shadow-sm dark:shadow-none disabled:opacity-50"
              disabled={isLoading}
              initial={{ opacity: 0, y: 6 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              type="button"
              onClick={() => handleSuggestionClick(text)}
            >
              {text}
            </motion.button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full px-4 py-3 pr-12 text-base sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl focus:outline-none focus:border-accent-400 dark:focus:border-accent-500 focus:ring-1 focus:ring-accent-400/20 dark:focus:ring-accent-500/20 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all shadow-sm dark:shadow-none"
            disabled={isLoading}
            placeholder={`${t("research.followUp")} "${previousQuery.slice(0, 30)}${previousQuery.length > 30 ? "..." : ""}"...`}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={!value.trim() || isLoading}
            type="submit"
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
