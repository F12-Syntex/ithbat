"use client";

import { motion } from "framer-motion";

export type SourceType =
  | "quran"
  | "hadith"
  | "scholarly_opinion"
  | "fatwa"
  | "tafsir"
  | "fiqh"
  | "unknown";

interface SourceTypeBadgeProps {
  type: SourceType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const typeConfig: Record<
  SourceType,
  {
    icon: React.ReactNode;
    label: string;
    gradient: string;
    bg: string;
    text: string;
  }
> = {
  quran: {
    icon: (
      <svg
        className="w-full h-full"
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
    gradient: "from-sky-400 to-blue-600",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    text: "text-sky-600 dark:text-sky-400",
  },
  hadith: {
    icon: (
      <svg
        className="w-full h-full"
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
    gradient: "from-amber-400 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  scholarly_opinion: {
    icon: (
      <svg
        className="w-full h-full"
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
    gradient: "from-purple-400 to-violet-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  fatwa: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Fatwa",
    gradient: "from-emerald-400 to-green-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  tafsir: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Tafsir",
    gradient: "from-cyan-400 to-teal-600",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  fiqh: {
    icon: (
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Fiqh",
    gradient: "from-rose-400 to-pink-600",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-600 dark:text-rose-400",
  },
  unknown: {
    icon: (
      <svg
        className="w-full h-full"
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
    label: "Source",
    gradient: "from-neutral-400 to-neutral-600",
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-600 dark:text-neutral-400",
  },
};

const sizeClasses = {
  sm: {
    container: "h-5 px-1.5 gap-1",
    icon: "w-3 h-3",
    text: "text-[10px]",
  },
  md: {
    container: "h-6 px-2 gap-1.5",
    icon: "w-3.5 h-3.5",
    text: "text-xs",
  },
  lg: {
    container: "h-7 px-2.5 gap-2",
    icon: "w-4 h-4",
    text: "text-sm",
  },
};

export function SourceTypeBadge({
  type,
  size = "md",
  showLabel = true,
}: SourceTypeBadgeProps) {
  const config = typeConfig[type] || typeConfig.unknown;
  const sizes = sizeClasses[size];

  return (
    <motion.div
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center rounded-full ${sizes.container} ${config.bg} ${config.text} font-medium`}
      initial={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.05 }}
    >
      <span className={sizes.icon}>{config.icon}</span>
      {showLabel && (
        <span className={`${sizes.text} uppercase tracking-wider`}>
          {config.label}
        </span>
      )}
    </motion.div>
  );
}

// Export config for use in other components
export { typeConfig };
