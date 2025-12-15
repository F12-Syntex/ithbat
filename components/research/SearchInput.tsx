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
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
          placeholder="what would you like to know?"
          className="w-full px-4 py-3 bg-default-100 dark:bg-default-50/10 border border-default-200 dark:border-default-700 rounded-lg font-mono text-sm placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-mono text-default-500 hover:text-foreground disabled:opacity-30 disabled:hover:text-default-500 transition-colors"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-1">
              <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          ) : (
            "search"
          )}
        </button>
      </div>
    </form>
  );
}
