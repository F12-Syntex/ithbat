"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import { SourceNode, SourceNodeData } from "./SourceNode";
import { SourceType, typeConfig } from "./SourceTypeBadge";

const INITIAL_SOURCES_COUNT = 4;
const MOBILE_INITIAL_COUNT = 3;

interface SourceFlowProps {
  sources: SourceNodeData[];
  title?: string;
  isLoading?: boolean;
}

// Helper to detect source type from URL
function getSourceTypeFromUrl(url: string, domain: string): SourceType {
  const lowerUrl = url.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  if (lowerDomain.includes("quran") || lowerUrl.includes("quran")) {
    return "quran";
  }
  if (
    lowerDomain.includes("sunnah") ||
    lowerUrl.includes("hadith") ||
    lowerUrl.includes("bukhari") ||
    lowerUrl.includes("muslim")
  ) {
    return "hadith";
  }
  if (
    lowerDomain.includes("islamqa") ||
    lowerDomain.includes("fatwa") ||
    lowerUrl.includes("fatwa")
  ) {
    return "fatwa";
  }
  if (lowerUrl.includes("tafsir") || lowerDomain.includes("tafsir")) {
    return "tafsir";
  }
  if (lowerUrl.includes("fiqh") || lowerDomain.includes("fiqh")) {
    return "fiqh";
  }
  if (
    lowerDomain.includes("scholar") ||
    lowerDomain.includes("imam") ||
    lowerDomain.includes("sheikh")
  ) {
    return "scholarly_opinion";
  }

  return "unknown";
}

// Color dots by type
const dotColorsByType: Record<SourceType, string> = {
  quran: "bg-sky-500",
  hadith: "bg-amber-500",
  scholarly_opinion: "bg-purple-500",
  fatwa: "bg-emerald-500",
  tafsir: "bg-cyan-500",
  fiqh: "bg-rose-500",
  unknown: "bg-neutral-400",
};

export function SourceFlow({
  sources,
  title = "Sources Found",
  isLoading = false,
}: SourceFlowProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Enrich sources with type detection
  const enrichedSources: SourceNodeData[] = useMemo(
    () =>
      sources.map((source, index) => ({
        ...source,
        id: source.id || `source-${index}`,
        type: source.type || getSourceTypeFromUrl(source.url, source.domain),
      })),
    [sources]
  );

  // Get visible sources based on expanded state (different counts for mobile/desktop)
  const mobileVisibleSources = isExpanded
    ? enrichedSources
    : enrichedSources.slice(0, MOBILE_INITIAL_COUNT);

  const desktopVisibleSources = isExpanded
    ? enrichedSources
    : enrichedSources.slice(0, INITIAL_SOURCES_COUNT);

  const hasMobileMore = enrichedSources.length > MOBILE_INITIAL_COUNT;
  const hasDesktopMore = enrichedSources.length > INITIAL_SOURCES_COUNT;
  const mobileRemainingCount = enrichedSources.length - MOBILE_INITIAL_COUNT;
  const desktopRemainingCount = enrichedSources.length - INITIAL_SOURCES_COUNT;

  // Handle source click - open URL
  const handleSourceClick = (source: SourceNodeData) => {
    window.open(source.url, "_blank", "noopener,noreferrer");
  };

  if (enrichedSources.length === 0 && !isLoading) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="relative"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" />
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {title}
          </h3>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            ({enrichedSources.length})
          </span>
        </div>

        {/* Legend - Desktop only */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Quran
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Hadith
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Fatwa
          </span>
        </div>
      </div>

      {/* Mobile: Compact list view */}
      <div className="sm:hidden">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <AnimatePresence mode="popLayout">
              {mobileVisibleSources.map((source, index) => (
                <MobileSourceRow
                  key={source.id}
                  index={index}
                  source={source}
                  onClick={handleSourceClick}
                />
              ))}
            </AnimatePresence>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="p-3 flex items-center gap-3 animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex-1">
                  <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
              </div>
            )}
          </div>

          {/* Show more/less button */}
          {hasMobileMore && (
            <button
              className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-t border-neutral-100 dark:border-neutral-800"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Show {mobileRemainingCount} more</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop: Grid of cards */}
      <div className="hidden sm:block relative">
        {/* Source nodes - responsive grid */}
        <div className="relative z-10 grid grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {desktopVisibleSources.map((source, index) => (
              <div key={source.id} className="h-[140px]">
                <SourceNode
                  index={index}
                  isActive={hoveredId === source.id}
                  isConnected={false}
                  size="sm"
                  source={source}
                  onClick={handleSourceClick}
                  onHover={setHoveredId}
                />
              </div>
            ))}
          </AnimatePresence>

          {/* Loading skeleton */}
          {isLoading && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="h-[140px] rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
              initial={{ opacity: 0, scale: 0.9 }}
            >
              <div className="p-2.5 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                  <div className="h-4 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                </div>
                <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Show more/less button */}
        {hasDesktopMore && (
          <motion.div
            animate={{ opacity: 1 }}
            className="mt-4 flex justify-center"
            initial={{ opacity: 0 }}
          >
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Show {desktopRemainingCount} more</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Mobile compact source row
function MobileSourceRow({
  source,
  index,
  onClick,
}: {
  source: SourceNodeData;
  index: number;
  onClick: (source: SourceNodeData) => void;
}) {
  const config = typeConfig[source.type] || typeConfig.unknown;
  const dotColor = dotColorsByType[source.type] || dotColorsByType.unknown;

  return (
    <motion.button
      animate={{ opacity: 1, x: 0 }}
      className="w-full p-3 flex items-center gap-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      exit={{ opacity: 0, x: -10 }}
      initial={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onClick(source)}
    >
      {/* Type indicator dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />

      {/* Source info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
          {source.title}
        </p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          {source.domain}
        </p>
      </div>

      {/* Open icon */}
      <ExternalLink className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
    </motion.button>
  );
}

// Export index file
export { SourceNode } from "./SourceNode";
export { SourceTypeBadge } from "./SourceTypeBadge";
export { TrustIndicator } from "./TrustIndicator";
export { SourceConnections } from "./SourceConnections";
export type { SourceNodeData } from "./SourceNode";
export type { SourceType } from "./SourceTypeBadge";
export type { HadithAuthenticity } from "./TrustIndicator";
