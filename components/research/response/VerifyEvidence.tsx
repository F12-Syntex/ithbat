"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";

interface VerifyResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  verified?: boolean;
}

interface VerifyEvidenceProps {
  evidenceText: string;
  referenceType: "hadith" | "quran" | "scholar" | "general";
}

// Extract searchable reference from evidence text
function extractSearchQuery(text: string): string {
  // Try to find hadith reference
  const hadithMatch = text.match(
    /(Sahih\s+)?(Bukhari|Muslim|Tirmidhi|Abu Dawud|Nasa['']?i|Ibn Majah|Ahmad|Malik|Darimi)\s*:?\s*(\d+)/i,
  );

  if (hadithMatch) {
    return `${hadithMatch[2]} ${hadithMatch[3]} hadith`;
  }

  // Try to find Quran reference
  const quranMatch = text.match(/(?:Quran|Surah|Ayah)\s*(\d+):(\d+)/i);

  if (quranMatch) {
    return `Quran ${quranMatch[1]}:${quranMatch[2]}`;
  }

  // Try to find scholar name
  const scholarMatch = text.match(
    /(Ibn Taymiyyah|Ibn Qayyim|Al-Nawawi|Ibn Kathir|Imam Malik|Imam Shafi['']?i|Imam Ahmad)/i,
  );

  if (scholarMatch) {
    // Extract first 50 chars after scholar name for context
    const idx = text.toLowerCase().indexOf(scholarMatch[1].toLowerCase());
    const context = text
      .slice(idx, idx + 80)
      .replace(/[^\w\s]/g, " ")
      .trim();

    return context;
  }

  // Fallback: use first 60 characters, cleaned up
  return text
    .slice(0, 100)
    .replace(/[*_#\[\]]/g, "")
    .trim();
}

export function VerifyButton({
  evidenceText,
  referenceType,
}: VerifyEvidenceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<VerifyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleVerify = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    const query = extractSearchQuery(evidenceText);

    setSearchQuery(query);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          claimType: referenceType,
          originalClaim: evidenceText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify reference");
      }

      const data = await response.json();
      // Map API results to our interface
      const mappedResults: VerifyResult[] = (data.results || []).map(
        (r: {
          title: string;
          url: string;
          content: string;
          source: string;
          relevance: string;
        }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          domain: r.source,
          verified: r.relevance === "high",
        }),
      );

      setResults(mappedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  }, [evidenceText, referenceType]);

  return (
    <>
      {/* Verify Button */}
      <button
        className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[10px] font-medium
          text-neutral-500 dark:text-neutral-400
          bg-neutral-100 dark:bg-neutral-800
          hover:bg-accent-100 dark:hover:bg-accent-900/30
          hover:text-accent-600 dark:hover:text-accent-400
          rounded-full transition-all duration-200
          opacity-0 group-hover:opacity-100"
        title="Verify this reference"
        onClick={handleVerify}
      >
        <Shield className="w-3 h-3" />
        Verify
      </button>

      {/* Verification Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-2xl max-h-[80vh]
                bg-white dark:bg-neutral-900
                rounded-2xl shadow-2xl z-50 overflow-hidden
                flex flex-col"
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Reference Verification
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Cross-checking with authentic sources
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Search Query Display */}
              <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-sm">
                  <Search className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Searching:
                  </span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {searchQuery || "..."}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-accent-500 animate-spin mb-4" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Searching authentic Islamic sources...
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                    <button
                      className="mt-4 px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors"
                      onClick={handleVerify}
                    >
                      Try Again
                    </button>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-4" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      No results found. Try a different reference.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result, idx) => (
                      <motion.a
                        key={idx}
                        animate={{ opacity: 1, y: 0 }}
                        className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800
                          hover:border-accent-300 dark:hover:border-accent-700
                          hover:bg-accent-50/50 dark:hover:bg-accent-900/10
                          transition-all duration-200 group"
                        href={result.url}
                        initial={{ opacity: 0, y: 10 }}
                        rel="noopener noreferrer"
                        target="_blank"
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {result.verified && (
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-accent-600 dark:group-hover:text-accent-400">
                                {result.title}
                              </h3>
                            </div>
                            <p className="text-xs text-accent-600 dark:text-accent-400 mb-2 truncate">
                              {result.domain}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                              {result.snippet}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-accent-500 flex-shrink-0 mt-1" />
                        </div>
                      </motion.a>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
                  Results from sunnah.com, quran.com, islamqa.info and other
                  trusted Islamic sources
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Wrapper component that makes a paragraph hoverable with verify button
export function EvidenceParagraph({
  children,
  evidenceText,
}: {
  children: React.ReactNode;
  evidenceText: string;
}) {
  const referenceType = detectEvidenceType(evidenceText);

  // Only show verify button for actual evidence (not regular paragraphs)
  if (referenceType === "general") {
    return (
      <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed my-4">
        {children}
      </p>
    );
  }

  return (
    <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed my-4 group relative">
      {children}
      <VerifyButton evidenceText={evidenceText} referenceType={referenceType} />
    </p>
  );
}

// Detect evidence type from text
function detectEvidenceType(
  text: string,
): "hadith" | "quran" | "scholar" | "general" {
  // Check for Hadith indicators
  if (
    /bukhari|muslim|tirmidhi|abu dawud|nasa['']?i|ibn majah|ahmad|malik|darimi|hadith|sunnah\.com|narrated|prophet.*said|messenger.*said/i.test(
      text,
    )
  ) {
    return "hadith";
  }

  // Check for Quran indicators
  if (
    /quran|surah|ayah|verse\s*\d+:\d+|^\d+:\d+|al-baqarah|an-nisa|al-imran|al-maidah|quran\.com/i.test(
      text,
    )
  ) {
    return "quran";
  }

  // Check for Scholar indicators
  if (
    /sheikh|imam|scholar|ibn taymiyyah|ibn qayyim|al-nawawi|ibn kathir|fatwa|ruling|opinion|islamqa/i.test(
      text,
    )
  ) {
    return "scholar";
  }

  return "general";
}
