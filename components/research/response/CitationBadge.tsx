"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { SourceType, typeConfig } from "../sources/SourceTypeBadge";

interface CitationBadgeProps {
  number: number;
  url: string;
  title: string;
  sourceType?: SourceType;
  domain?: string;
}

export function CitationBadge({
  number,
  url,
  title,
  sourceType = "unknown",
  domain,
}: CitationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = typeConfig[sourceType] || typeConfig.unknown;

  return (
    <span className="relative inline-block">
      <motion.a
        className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-medium rounded-full cursor-pointer transition-all ${config.bg} ${config.text} hover:ring-2 hover:ring-offset-1 hover:ring-current/30`}
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {number}
      </motion.a>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-2 rounded-lg shadow-lg max-w-xs">
              <p className="text-xs font-medium line-clamp-2">{title}</p>
              {domain && (
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  {domain}
                </p>
              )}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// Inline citation for use in markdown - simpler version
interface InlineCitationProps {
  number: number;
  url: string;
}

export function InlineCitation({ number, url }: InlineCitationProps) {
  return (
    <a
      className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-medium rounded bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 hover:bg-accent-200 dark:hover:bg-accent-800/40 transition-colors align-super"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {number}
    </a>
  );
}
