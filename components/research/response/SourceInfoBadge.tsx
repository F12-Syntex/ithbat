"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, ExternalLink } from "lucide-react";

interface SourceInfoBadgeProps {
  href: string;
  title: string;
}

// Detect source type from domain for color coding
function getSourceStyle(domain: string): {
  color: string;
  bg: string;
  label: string;
  dot: string;
} {
  if (domain.includes("quran"))
    return {
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/40",
      label: "Quran",
      dot: "bg-sky-400",
    };
  if (domain.includes("sunnah") || domain.includes("hadith"))
    return {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40",
      label: "Hadith",
      dot: "bg-amber-400",
    };
  if (domain.includes("islamqa"))
    return {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40",
      label: "Fatwa",
      dot: "bg-emerald-400",
    };
  if (domain.includes("seekersguidance"))
    return {
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40",
      label: "Scholarly",
      dot: "bg-purple-400",
    };
  if (domain.includes("islamweb"))
    return {
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200/60 dark:border-teal-800/40",
      label: "Islamic",
      dot: "bg-teal-400",
    };
  return {
    color: "text-neutral-600 dark:text-neutral-400",
    bg: "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/60 dark:border-neutral-700/40",
    label: "Source",
    dot: "bg-neutral-400",
  };
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "source";
  }
}

export function SourceInfoBadge({ href, title }: SourceInfoBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const domain = getDomain(href);
  const style = getSourceStyle(domain);

  return (
    <span className="relative inline-flex align-baseline">
      <a
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium no-underline transition-all hover:shadow-sm ${style.bg} ${style.color}`}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info className="w-3 h-3 flex-shrink-0 opacity-70" strokeWidth={2} />
        <span className="truncate max-w-[120px]">{title}</span>
        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50" strokeWidth={2} />
      </a>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
            exit={{ opacity: 0, y: 4 }}
            initial={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
          >
            <div className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-2 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 whitespace-nowrap">
              <p className="text-xs font-medium">{title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {domain}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mx-0.5">·</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {style.label}
                </span>
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-white dark:border-t-neutral-800" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
