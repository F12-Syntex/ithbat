"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  ChevronDown,
  ChevronUp,
  Globe,
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
    const idx = text.toLowerCase().indexOf(scholarMatch[1].toLowerCase());
    const context = text
      .slice(idx, idx + 80)
      .replace(/[^\w\s]/g, " ")
      .trim();

    return context;
  }

  return text
    .slice(0, 100)
    .replace(/[*_#\[\]]/g, "")
    .trim();
}

// Inline verification panel component
function InlineVerifyPanel({
  evidenceText,
  referenceType,
  isExpanded,
  onClose,
}: VerifyEvidenceProps & { isExpanded: boolean; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<VerifyResult[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const doSearch = useCallback(async () => {
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

      setSummary(data.summary || "");

      const mappedResults: VerifyResult[] = (data.results || []).map(
        (r: {
          title: string;
          url: string;
          content: string;
          source: string;
          verified?: boolean;
        }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          domain: r.source,
          verified: r.verified,
        }),
      );

      setResults(mappedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  }, [evidenceText, referenceType]);

  // Start search when expanded
  useEffect(() => {
    if (isExpanded) {
      doSearch();
    }
  }, [isExpanded, doSearch]);

  if (!isExpanded) return null;

  return (
    <motion.div
      animate={{ height: "auto", opacity: 1 }}
      className="overflow-hidden"
      exit={{ height: 0, opacity: 0 }}
      initial={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="mt-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 overflow-hidden">
        {/* Content */}
        <div className="p-2.5">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 text-accent-500 animate-spin" />
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Verifying...
              </span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[11px] text-red-600 dark:text-red-400">
                {error}
              </span>
              <button
                className="ml-auto text-[10px] font-medium text-accent-600 hover:text-accent-700"
                onClick={doSearch}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Results */}
              {results.length === 0 ? (
                <div className="flex items-center gap-2 py-1 text-[11px] text-neutral-500">
                  <Globe className="w-3.5 h-3.5" />
                  No sources found
                </div>
              ) : (
                <div className="space-y-1.5">
                  {results.slice(0, 3).map((result, idx) => (
                    <a
                      key={idx}
                      className="flex items-center gap-2 p-1.5 -mx-1 rounded-md
                        hover:bg-neutral-100 dark:hover:bg-neutral-800
                        transition-colors group"
                      href={result.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {result.verified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      )}
                      <span className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate group-hover:text-accent-600 dark:group-hover:text-accent-400">
                        {result.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 ml-auto flex-shrink-0">
                        {result.domain}
                      </span>
                      <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-accent-500 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function VerifyButton({
  evidenceText,
  referenceType,
}: VerifyEvidenceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Verify Button */}
      <button
        className={`inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[10px] font-medium
          rounded-full transition-all duration-200
          ${
            isExpanded
              ? "bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400 opacity-100"
              : "text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-accent-100 dark:hover:bg-accent-900/30 hover:text-accent-600 dark:hover:text-accent-400 sm:opacity-0 sm:group-hover:opacity-100"
          }`}
        title={isExpanded ? "Hide verification" : "Verify this reference"}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Shield className="w-3 h-3" />
        {isExpanded ? "Hide" : "Verify"}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Inline Verification Panel */}
      <AnimatePresence>
        {isExpanded && (
          <InlineVerifyPanel
            evidenceText={evidenceText}
            isExpanded={isExpanded}
            referenceType={referenceType}
            onClose={() => setIsExpanded(false)}
          />
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

  return (
    <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed my-4">
      {children}
    </p>
  );
}

// Detect evidence type from text
function detectEvidenceType(
  text: string,
): "hadith" | "quran" | "scholar" | "general" {
  if (
    /bukhari|muslim|tirmidhi|abu dawud|nasa['']?i|ibn majah|ahmad|malik|darimi|hadith|sunnah\.com|narrated|prophet.*said|messenger.*said/i.test(
      text,
    )
  ) {
    return "hadith";
  }

  if (
    /quran|surah|ayah|verse\s*\d+:\d+|^\d+:\d+|al-baqarah|an-nisa|al-imran|al-maidah|quran\.com/i.test(
      text,
    )
  ) {
    return "quran";
  }

  if (
    /sheikh|imam|scholar|ibn taymiyyah|ibn qayyim|al-nawawi|ibn kathir|fatwa|ruling|opinion|islamqa/i.test(
      text,
    )
  ) {
    return "scholar";
  }

  return "general";
}
