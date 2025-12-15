"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface FollowUpInputProps {
  onSubmit: (question: string) => void;
  isLoading?: boolean;
  previousQuery: string;
}

export function FollowUpInput({
  onSubmit,
  isLoading,
  previousQuery,
}: FollowUpInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when component appears
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
      setValue("");
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
          Ask a follow-up question
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full px-4 py-3 pr-12 text-base sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-accent-400 dark:focus:border-accent-500 focus:ring-1 focus:ring-accent-400/20 dark:focus:ring-accent-500/20 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-all"
            disabled={isLoading}
            placeholder={`Follow up on "${previousQuery.slice(0, 30)}${previousQuery.length > 30 ? "..." : ""}"...`}
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

      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2">
        Your follow-up will be answered with context from the previous response
      </p>
    </motion.div>
  );
}
