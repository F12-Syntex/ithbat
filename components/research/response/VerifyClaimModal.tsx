"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  BookOpen,
  FileText,
} from "lucide-react";

interface VerificationResult {
  url: string;
  title: string;
  content: string;
  source: string;
  relevance: "high" | "medium" | "low";
}

interface VerifyClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimText: string;
  claimType: "hadith" | "quran" | "scholar" | "general";
}

export function VerifyClaimModal({
  isOpen,
  onClose,
  claimText,
  claimType,
}: VerifyClaimModalProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Extract a searchable query from the claim text
  const extractSearchQuery = useCallback((text: string): string => {
    // Remove common prefixes and clean up
    let query = text
      .replace(/^(the prophet|messenger of allah|he|she|it)\s+(said|stated|mentioned|reported)/gi, "")
      .replace(/^(narrated|reported|related)\s+(by|from)\s+\w+\s*:?\s*/gi, "")
      .replace(/\([^)]*\)/g, "") // Remove parenthetical notes
      .replace(/\[[^\]]*\]/g, "") // Remove bracket notes
      .trim();

    // Take first 100 chars or first sentence
    const firstSentence = query.split(/[.!?]/)[0];
    if (firstSentence.length > 20) {
      query = firstSentence;
    }

    // Limit length
    if (query.length > 100) {
      query = query.slice(0, 100).trim();
    }

    return query;
  }, []);

  const handleVerify = useCallback(async () => {
    const query = searchQuery || extractSearchQuery(claimText);
    if (!query) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          claimType,
          originalClaim: claimText,
        }),
      });

      if (!response.ok) {
        throw new Error("Verification failed");
      }

      const data = await response.json();
      setResults(data.results || []);

      if (data.results.length === 0) {
        setError("No matching sources found. Try a different search query.");
      }
    } catch (err) {
      setError("Failed to verify claim. Please try again.");
      console.error("Verification error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, claimText, claimType, extractSearchQuery]);

  // Auto-search on open
  const handleOpen = useCallback(() => {
    if (isOpen && results.length === 0 && !isSearching) {
      const query = extractSearchQuery(claimText);
      setSearchQuery(query);
      // Don't auto-search, let user confirm
    }
  }, [isOpen, results.length, isSearching, claimText, extractSearchQuery]);

  // Set initial query when modal opens
  useState(() => {
    if (isOpen) {
      setSearchQuery(extractSearchQuery(claimText));
    }
  });

  if (!isOpen) return null;

  const typeIcon = claimType === "quran" ? (
    <BookOpen className="w-4 h-4" />
  ) : (
    <FileText className="w-4 h-4" />
  );

  const typeLabel = claimType === "quran" ? "Quran verse" : claimType === "hadith" ? "Hadith" : "Claim";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:max-h-[80vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400">
                  <Search className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                    Verify {typeLabel}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Search trusted Islamic sources
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Original claim */}
            <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-start gap-2">
                <span className="p-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mt-0.5">
                  {typeIcon}
                </span>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">
                  {claimText.slice(0, 300)}{claimText.length > 300 ? "..." : ""}
                </p>
              </div>
            </div>

            {/* Search input */}
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    placeholder="Search query..."
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                </div>
                <button
                  onClick={handleVerify}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Searching sunnah.com, quran.com, and islamqa.info
              </p>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-3" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Searching trusted sources...
                  </p>
                </div>
              )}

              {error && !isSearching && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
                </div>
              )}

              {!isSearching && results.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Found {results.length} result{results.length !== 1 ? "s" : ""}
                  </p>
                  {results.map((result, index) => (
                    <motion.a
                      key={index}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-accent-300 dark:hover:border-accent-700 hover:bg-accent-50/50 dark:hover:bg-accent-900/20 transition-all group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {result.relevance === "high" && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                High match
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                              {result.source}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors line-clamp-1">
                            {result.title}
                          </h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                            {result.content}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-accent-500 flex-shrink-0 mt-1" />
                      </div>
                    </motion.a>
                  ))}
                </div>
              )}

              {!isSearching && !error && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-3">
                    <Search className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Click &quot;Search&quot; to find sources
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    We&apos;ll search trusted Islamic databases
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
