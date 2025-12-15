"use client";

import { useState, type FormEvent } from "react";

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
    <form className="w-full max-w-2xl" onSubmit={handleSubmit}>
      <div className="relative">
        <input
          className="w-full px-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all disabled:opacity-50"
          disabled={isLoading}
          placeholder="What would you like to know?"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-md disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors"
          disabled={!query.trim() || isLoading}
          type="submit"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-1 h-1 bg-current rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1 h-1 bg-current rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1 h-1 bg-current rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          ) : (
            "Search"
          )}
        </button>
      </div>
    </form>
  );
}
