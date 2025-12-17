"use client";

import { motion } from "framer-motion";

type QuoteType = "hadith" | "quran" | "scholar" | "general";

interface QuoteBlockProps {
  children: React.ReactNode;
  type?: QuoteType;
  source?: string;
  reference?: string;
  arabicText?: string;
  url?: string;
}

const typeConfig: Record<
  QuoteType,
  {
    gradient: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  quran: {
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-sky-50/50 dark:bg-sky-900/10",
    border: "border-sky-200 dark:border-sky-800",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Quran",
  },
  hadith: {
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    border: "border-amber-200 dark:border-amber-800",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Hadith",
  },
  scholar: {
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-50/50 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Scholar",
  },
  general: {
    gradient: "from-neutral-400 to-neutral-600",
    bg: "bg-neutral-50/50 dark:bg-neutral-900/20",
    border: "border-neutral-200 dark:border-neutral-800",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Quote",
  },
};

export function QuoteBlock({
  children,
  type = "general",
  source,
  reference,
  arabicText,
  url,
}: QuoteBlockProps) {
  const config = typeConfig[type];

  return (
    <motion.blockquote
      animate={{ opacity: 1, x: 0 }}
      className={`relative my-4 rounded-r-xl overflow-hidden ${config.bg} ${config.border} border-l-0 border`}
      initial={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient left border */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${config.gradient}`}
      />

      {/* Header with type indicator */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className={`text-neutral-500 dark:text-neutral-400`}>
          {config.icon}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-500 dark:text-neutral-400">
          {config.label}
        </span>
      </div>

      {/* Arabic text (if provided) */}
      {arabicText && (
        <div className="px-4 pb-2">
          <p
            className="text-right text-lg leading-loose text-neutral-800 dark:text-neutral-200 font-arabic"
            dir="rtl"
          >
            {arabicText}
          </p>
        </div>
      )}

      {/* Main content (translation or quote) */}
      <div className="px-4 pb-3">
        <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
          {children}
        </div>
      </div>

      {/* Footer with source and reference */}
      {(source || reference || url) && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-100/50 dark:bg-neutral-800/30 border-t border-neutral-200/50 dark:border-neutral-700/50">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {source && <span className="font-medium">{source}</span>}
            {source && reference && " • "}
            {reference && <span>{reference}</span>}
          </span>

          {url && (
            <a
              className="flex items-center gap-1 text-xs text-accent-600 dark:text-accent-400 hover:underline"
              href={url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>View</span>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}
        </div>
      )}
    </motion.blockquote>
  );
}
