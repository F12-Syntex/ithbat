"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form className="w-full max-w-2xl" onSubmit={handleSubmit}>
      <motion.div
        animate={{
          boxShadow: isFocused
            ? "0 0 0 1px rgba(16, 185, 129, 0.3), 0 4px 20px rgba(16, 185, 129, 0.1)"
            : "0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 10px rgba(0, 0, 0, 0.03)",
        }}
        className="relative bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden"
        transition={{ duration: 0.2 }}
      >
        {/* Gradient border effect */}
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
            isFocused ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))",
          }}
        />

        <div className="relative flex items-center">
          {/* Search icon */}
          <div className="pl-5 pr-2">
            <motion.svg
              animate={{ scale: isFocused ? 1.1 : 1 }}
              className={`w-5 h-5 transition-colors duration-200 ${
                isFocused
                  ? "text-emerald-500"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
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
            </motion.svg>
          </div>

          <input
            className="flex-1 py-4 pr-4 bg-transparent text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none text-base disabled:opacity-50"
            disabled={isLoading}
            placeholder="Ask about Islamic rulings, hadith, or Quran..."
            type="text"
            value={query}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />

          {/* Submit button */}
          <div className="pr-3">
            <motion.button
              animate={{
                scale: query.trim() && !isLoading ? 1 : 0.95,
                opacity: query.trim() ? 1 : 0.5,
              }}
              className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-xl disabled:cursor-not-allowed transition-all duration-200"
              disabled={!query.trim() || isLoading}
              type="submit"
              whileHover={{ scale: query.trim() && !isLoading ? 1.02 : 0.95 }}
              whileTap={{ scale: query.trim() && !isLoading ? 0.98 : 0.95 }}
            >
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  Research
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </form>
  );
}
