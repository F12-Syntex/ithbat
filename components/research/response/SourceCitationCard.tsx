"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";

interface SourceCitation {
  number: number;
  title: string;
  url: string;
  domain: string;
}

interface SourceCitationCardProps {
  sources: SourceCitation[];
  title?: string;
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export function SourceCitationCard({
  sources,
}: SourceCitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sources.length === 0) return null;

  // Deduplicate by domain for the circle row
  const uniqueDomains = Array.from(
    new Map(sources.map((s) => [s.domain, s])).values(),
  );

  return (
    <div className="mt-6">
      {/* Collapsed: Favicon circles row + expand button */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Stacked favicon circles */}
        <div className="flex items-center -space-x-1.5 flex-shrink-0">
          {uniqueDomains.slice(0, 5).map((source) => (
            <div
              key={source.domain}
              className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-white dark:border-neutral-900 flex items-center justify-center overflow-hidden"
              title={source.domain}
            >
              <img
                alt=""
                className="w-4 h-4 rounded-full"
                src={getFaviconUrl(source.domain)}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.parentElement!.innerHTML = `<span class="text-[8px] font-bold text-neutral-400">${source.domain.charAt(0).toUpperCase()}</span>`;
                }}
              />
            </div>
          ))}
          {uniqueDomains.length > 5 && (
            <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-white dark:border-neutral-900 flex items-center justify-center">
              <span className="text-[9px] font-medium text-neutral-400">
                +{uniqueDomains.length - 5}
              </span>
            </div>
          )}
        </div>

        {/* Label */}
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {sources.length} source{sources.length !== 1 ? "s" : ""}
        </span>

        {/* Expand icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="ml-auto"
          transition={{ duration: 0.2 }}
        >
          <ChevronDown
            className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors"
            strokeWidth={2}
          />
        </motion.div>
      </button>

      {/* Expanded: Full source list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mt-2 flex flex-col gap-1">
              {sources.map((source, index) => (
                <motion.a
                  key={source.number}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
                  href={source.url}
                  initial={{ opacity: 0, y: 4 }}
                  rel="noopener noreferrer"
                  target="_blank"
                  transition={{ delay: index * 0.03 }}
                >
                  {/* Favicon */}
                  <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      alt=""
                      className="w-3.5 h-3.5 rounded-full"
                      src={getFaviconUrl(source.domain)}
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<span class="text-[7px] font-bold text-neutral-400">${source.domain.charAt(0).toUpperCase()}</span>`;
                      }}
                    />
                  </div>

                  {/* Title + domain */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                      {source.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                      {source.domain}
                    </p>
                  </div>

                  {/* External link */}
                  <ExternalLink
                    className="w-3 h-3 text-neutral-300 dark:text-neutral-600 group-hover:text-accent-500 transition-colors flex-shrink-0"
                    strokeWidth={2}
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
