"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ChevronDown, ExternalLink } from "lucide-react";

import { SourceType, SourceTypeBadge } from "../sources/SourceTypeBadge";

interface SourceCitation {
  number: number;
  title: string;
  url: string;
  domain: string;
  type?: SourceType;
}

interface SourceCitationCardProps {
  sources: SourceCitation[];
  title?: string;
}

// Helper to detect source type from domain
function getSourceTypeFromDomain(domain: string): SourceType {
  const lowerDomain = domain.toLowerCase();

  if (lowerDomain.includes("quran")) return "quran";
  if (lowerDomain.includes("sunnah") || lowerDomain.includes("hadith"))
    return "hadith";
  if (
    lowerDomain.includes("islamqa") ||
    lowerDomain.includes("fatwa") ||
    lowerDomain.includes("askimam")
  )
    return "fatwa";
  if (lowerDomain.includes("tafsir")) return "tafsir";
  if (
    lowerDomain.includes("scholar") ||
    lowerDomain.includes("imam") ||
    lowerDomain.includes("sheikh")
  )
    return "scholarly_opinion";

  return "unknown";
}

export function SourceCitationCard({
  sources,
  title = "Sources",
}: SourceCitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0) {
    return null;
  }

  // Enrich sources with type detection
  const enrichedSources = sources.map((source) => ({
    ...source,
    type: source.type || getSourceTypeFromDomain(source.domain),
  }));

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900"
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {title}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            ({sources.length})
          </span>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-neutral-400 dark:text-neutral-500" strokeWidth={2} />
        </motion.div>
      </button>

      {/* Source list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              {enrichedSources.map((source, index) => (
                <motion.a
                  key={source.number}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 group"
                  href={source.url}
                  initial={{ opacity: 0, x: -10 }}
                  rel="noopener noreferrer"
                  target="_blank"
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Number badge */}
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                    {source.number}
                  </span>

                  {/* Source info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200 truncate group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                      {source.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        {source.domain}
                      </span>
                    </div>
                  </div>

                  {/* Type badge */}
                  <SourceTypeBadge
                    showLabel={false}
                    size="sm"
                    type={source.type}
                  />

                  {/* External link icon */}
                  <ExternalLink
                    className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-accent-500 transition-colors flex-shrink-0"
                    strokeWidth={2}
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
