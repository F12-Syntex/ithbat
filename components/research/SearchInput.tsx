"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 focus-within:border-neutral-300 dark:focus-within:border-neutral-700 transition-colors">
        <input
          className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-none focus:ring-0"
          disabled={isLoading}
          placeholder="Ask a question..."
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            query.trim() && !isLoading
              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
          }`}
          disabled={!query.trim() || isLoading}
          type="submit"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          ) : (
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
          )}
        </button>
      </div>
    </form>
  );
}
