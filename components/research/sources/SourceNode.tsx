"use client";

import { motion } from "framer-motion";

import { SourceTypeBadge, SourceType, typeConfig } from "./SourceTypeBadge";
import { TrustIndicator, HadithAuthenticity } from "./TrustIndicator";

export interface SourceNodeData {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  domain: string;
  trusted?: boolean;
  authenticity?: HadithAuthenticity;
  arabicText?: string;
  scholarName?: string;
  reference?: string;
}

interface SourceNodeProps {
  source: SourceNodeData;
  index: number;
  isActive?: boolean;
  isConnected?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (source: SourceNodeData) => void;
  size?: "sm" | "md" | "lg";
}

const gradientsByType: Record<SourceType, string> = {
  quran: "from-sky-400 via-blue-500 to-indigo-600",
  hadith: "from-amber-400 via-orange-500 to-red-500",
  scholarly_opinion: "from-purple-400 via-violet-500 to-purple-600",
  fatwa: "from-emerald-400 via-green-500 to-teal-600",
  tafsir: "from-cyan-400 via-teal-500 to-emerald-600",
  fiqh: "from-rose-400 via-pink-500 to-purple-600",
  unknown: "from-neutral-400 via-neutral-500 to-neutral-600",
};

// Glow effects by source type (for hover states)
export const glowByType: Record<SourceType, string> = {
  quran: "shadow-sky-500/25",
  hadith: "shadow-amber-500/25",
  scholarly_opinion: "shadow-purple-500/25",
  fatwa: "shadow-emerald-500/25",
  tafsir: "shadow-cyan-500/25",
  fiqh: "shadow-rose-500/25",
  unknown: "shadow-neutral-500/25",
};

export function SourceNode({
  source,
  index,
  isActive = false,
  isConnected = false,
  onHover,
  onClick,
  size = "md",
}: SourceNodeProps) {
  const gradient = gradientsByType[source.type] || gradientsByType.unknown;
  const config = typeConfig[source.type] || typeConfig.unknown;

  const sizeClasses = {
    sm: "w-full h-full p-[1.5px]",
    md: "w-full h-full p-[2px]",
    lg: "w-full h-full p-[2px]",
  };

  const contentPadding = {
    sm: "p-2.5",
    md: "p-3",
    lg: "p-4",
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`relative ${sizeClasses[size]} rounded-xl bg-gradient-to-br ${gradient} cursor-pointer group`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        delay: index * 0.08,
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={() => onClick?.(source)}
      onMouseEnter={() => onHover?.(source.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Glow effect on hover */}
      <motion.div
        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 -z-10`}
      />

      {/* Inner content */}
      <div
        className={`bg-white dark:bg-neutral-900 rounded-[10px] ${contentPadding[size]} h-full flex flex-col`}
      >
        {/* Header with type badge and trust indicator */}
        <div className="flex items-center justify-between mb-2">
          <SourceTypeBadge size="sm" type={source.type} />
          {source.authenticity ? (
            <TrustIndicator
              authenticity={source.authenticity}
              showLabel={size !== "sm"}
              size="sm"
            />
          ) : (
            <TrustIndicator
              showLabel={false}
              size="sm"
              trusted={source.trusted}
            />
          )}
        </div>

        {/* Title */}
        <h4
          className={`font-medium text-neutral-800 dark:text-neutral-100 line-clamp-2 mb-1.5 ${
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
          }`}
        >
          {source.title}
        </h4>

        {/* Reference or Scholar */}
        {(source.reference || source.scholarName) && (
          <p
            className={`text-neutral-500 dark:text-neutral-400 mb-2 ${
              size === "sm" ? "text-[10px]" : "text-xs"
            }`}
          >
            {source.reference || source.scholarName}
          </p>
        )}

        {/* Arabic text preview (if available) */}
        {source.arabicText && size !== "sm" && (
          <p
            className="text-right font-arabic text-neutral-600 dark:text-neutral-300 text-sm mb-2 line-clamp-2 leading-relaxed"
            dir="rtl"
          >
            {source.arabicText}
          </p>
        )}

        {/* Footer with domain and link */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span
            className={`text-neutral-400 dark:text-neutral-500 ${
              size === "sm" ? "text-[10px]" : "text-xs"
            }`}
          >
            {source.domain}
          </span>
          <a
            className={`flex items-center gap-1 ${config.text} hover:underline ${
              size === "sm" ? "text-[10px]" : "text-xs"
            }`}
            href={source.url}
            rel="noopener noreferrer"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Open</span>
            <svg
              className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"}
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
        </div>
      </div>

      {/* Connection dot indicator */}
      {isConnected && (
        <motion.div
          animate={{ scale: 1 }}
          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`}
          initial={{ scale: 0 }}
          transition={{ delay: index * 0.08 + 0.2 }}
        />
      )}

      {/* Active ring indicator */}
      {isActive && (
        <motion.div
          animate={{ opacity: 1 }}
          className={`absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950 ${config.text.replace("text-", "ring-")}`}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
}
