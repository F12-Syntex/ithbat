"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  User,
  MessageSquare,
  ExternalLink,
  Search,
  Globe,
} from "lucide-react";
import { VerifyClaimModal } from "./VerifyClaimModal";

type QuoteType = "hadith" | "quran" | "scholar" | "general";

/**
 * Build a Google search URL to find the source of a quote
 */
function buildGoogleSearchUrl(text: string, type: QuoteType): string {
  // Extract key phrases for search
  let searchQuery = text
    .replace(/["""'']/g, "") // Remove quotes
    .replace(/\([^)]*\)/g, "") // Remove parenthetical notes
    .replace(/\[[^\]]*\]/g, "") // Remove bracket references
    .trim();

  // Take first 100 chars or first sentence for search
  const firstSentence = searchQuery.split(/[.!?]/)[0];
  if (firstSentence.length > 20 && firstSentence.length < 150) {
    searchQuery = firstSentence;
  } else if (searchQuery.length > 100) {
    searchQuery = searchQuery.slice(0, 100);
  }

  // Add type-specific keywords to improve search
  const typeKeywords: Record<QuoteType, string> = {
    hadith: "hadith sunnah",
    quran: "quran verse",
    scholar: "islamic scholar fatwa",
    general: "",
  };

  const fullQuery = `${searchQuery} ${typeKeywords[type]}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(fullQuery)}`;
}

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
    iconBg: string;
    iconColor: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  quran: {
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-gradient-to-br from-sky-50/80 to-blue-50/50 dark:from-sky-950/30 dark:to-blue-950/20",
    border: "border-sky-200/50 dark:border-sky-800/50",
    iconBg: "bg-sky-100 dark:bg-sky-900/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    icon: <BookOpen className="w-4 h-4" strokeWidth={1.5} />,
    label: "Quran",
  },
  hadith: {
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20",
    border: "border-amber-200/50 dark:border-amber-800/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    icon: <FileText className="w-4 h-4" strokeWidth={1.5} />,
    label: "Hadith",
  },
  scholar: {
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-gradient-to-br from-purple-50/80 to-violet-50/50 dark:from-purple-950/30 dark:to-violet-950/20",
    border: "border-purple-200/50 dark:border-purple-800/50",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    icon: <User className="w-4 h-4" strokeWidth={1.5} />,
    label: "Scholar",
  },
  general: {
    gradient: "from-neutral-400 to-neutral-600",
    bg: "bg-gradient-to-br from-neutral-50/80 to-neutral-100/50 dark:from-neutral-900/50 dark:to-neutral-800/30",
    border: "border-neutral-200/50 dark:border-neutral-700/50",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-500 dark:text-neutral-400",
    icon: <MessageSquare className="w-4 h-4" strokeWidth={1.5} />,
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
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Extract text content from children for verification
  const getTextContent = useCallback((): string => {
    if (typeof children === "string") return children;
    // Try to extract text from React elements
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === "string") return node;
      if (typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(extractText).join(" ");
      if (node && typeof node === "object" && "props" in node) {
        return extractText((node as React.ReactElement).props.children);
      }
      return "";
    };
    return extractText(children);
  }, [children]);

  // Only show verify button for hadith and quran types
  const canVerify = type === "hadith" || type === "quran" || type === "scholar";

  return (
    <>
      <VerifyClaimModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        claimText={getTextContent()}
        claimType={type}
      />
    <motion.blockquote
      animate={{ opacity: 1, y: 0 }}
      className={`relative my-5 rounded-xl overflow-hidden ${config.bg} ${config.border} border shadow-sm`}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient left border */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${config.gradient}`}
      />

      {/* Header with type indicator */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2 pl-5">
        <span
          className={`p-1.5 rounded-lg ${config.iconBg} ${config.iconColor}`}
        >
          {config.icon}
        </span>
        <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
          {config.label}
        </span>
      </div>

      {/* Arabic text (if provided) */}
      {arabicText && (
        <div className="px-5 pb-3">
          <p
            className="text-right text-xl leading-loose text-neutral-800 dark:text-neutral-100 font-arabic"
            dir="rtl"
          >
            {arabicText}
          </p>
        </div>
      )}

      {/* Main content (translation or quote) */}
      <div className="px-5 pb-4 pl-5">
        <div className="text-sm sm:text-[15px] text-neutral-700 dark:text-neutral-200 leading-relaxed">
          {children}
        </div>
      </div>

      {/* Footer with source, reference, and verify button */}
      <div className="flex items-center justify-between px-5 py-3 bg-white/50 dark:bg-black/10 border-t border-neutral-200/30 dark:border-neutral-700/30">
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {source && <span className="font-medium">{source}</span>}
          {source && reference && (
            <span className="mx-1.5 text-neutral-400">•</span>
          )}
          {reference && (
            <span className="font-mono text-[11px]">{reference}</span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {/* Find Source button - opens Google search */}
          <a
            href={buildGoogleSearchUrl(getTextContent(), type)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Globe className="w-3 h-3" strokeWidth={2} />
            <span>Find Source</span>
          </a>

          {/* Verify button */}
          {canVerify && (
            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/30 transition-colors"
            >
              <Search className="w-3 h-3" strokeWidth={2} />
              <span>Verify</span>
            </button>
          )}

          {url && (
            <a
              className="flex items-center gap-1.5 text-xs font-medium text-accent-600 dark:text-accent-400 hover:underline"
              href={url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>View source</span>
              <ExternalLink className="w-3 h-3" strokeWidth={2} />
            </a>
          )}
        </div>
      </div>
    </motion.blockquote>
    </>
  );
}
