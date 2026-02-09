"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  User,
  MessageSquare,
  Search,
  Globe,
} from "lucide-react";

import { VerifyClaimModal } from "./VerifyClaimModal";

type QuoteType = "hadith" | "quran" | "scholar" | "general";

function buildGoogleSearchUrl(text: string, type: QuoteType): string {
  let searchQuery = text
    .replace(/["""'']/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();

  const firstSentence = searchQuery.split(/[.!?]/)[0];

  if (firstSentence.length > 20 && firstSentence.length < 150) {
    searchQuery = firstSentence;
  } else if (searchQuery.length > 100) {
    searchQuery = searchQuery.slice(0, 100);
  }

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
    border: string;
    accent: string;
    iconColor: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  quran: {
    border: "border-l-sky-500",
    accent: "text-sky-600 dark:text-sky-400",
    iconColor: "text-sky-500 dark:text-sky-400",
    icon: <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />,
    label: "Quran",
  },
  hadith: {
    border: "border-l-amber-500",
    accent: "text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-500 dark:text-amber-400",
    icon: <FileText className="w-3.5 h-3.5" strokeWidth={2} />,
    label: "Hadith",
  },
  scholar: {
    border: "border-l-purple-500",
    accent: "text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-500 dark:text-purple-400",
    icon: <User className="w-3.5 h-3.5" strokeWidth={2} />,
    label: "Scholar",
  },
  general: {
    border: "border-l-neutral-400 dark:border-l-neutral-600",
    accent: "text-neutral-500 dark:text-neutral-400",
    iconColor: "text-neutral-400 dark:text-neutral-500",
    icon: <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />,
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

  const getTextContent = useCallback((): string => {
    if (typeof children === "string") return children;
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

  const canVerify = type === "hadith" || type === "quran" || type === "scholar";

  return (
    <>
      <VerifyClaimModal
        claimText={getTextContent()}
        claimType={type}
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
      <motion.blockquote
        animate={{ opacity: 1 }}
        className={`relative my-4 border-l-3 ${config.border} pl-4 pr-3 py-3 bg-transparent`}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Type label */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={config.iconColor}>{config.icon}</span>
          <span className={`text-[10px] uppercase tracking-widest font-semibold ${config.accent}`}>
            {config.label}
          </span>
        </div>

        {/* Arabic text */}
        {arabicText && (
          <p
            className="text-lg leading-loose text-neutral-800 dark:text-neutral-100 font-arabic mb-2"
            dir="rtl"
          >
            {arabicText}
          </p>
        )}

        {/* Quote content */}
        <div className="text-sm sm:text-[15px] text-neutral-700 dark:text-neutral-200 leading-relaxed italic">
          {children}
        </div>

        {/* Footer: source info + actions */}
        {(source || reference || canVerify) && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/30">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {source && <span className="font-medium">{source}</span>}
              {source && reference && <span className="mx-1">·</span>}
              {reference && (
                <span className="font-mono text-[10px]">{reference}</span>
              )}
            </span>

            <div className="flex items-center gap-1.5">
              <a
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                href={buildGoogleSearchUrl(getTextContent(), type)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Globe className="w-3 h-3" strokeWidth={2} />
                Find
              </a>

              {canVerify && (
                <button
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors"
                  onClick={() => setIsVerifyModalOpen(true)}
                >
                  <Search className="w-3 h-3" strokeWidth={2} />
                  Verify
                </button>
              )}

              {url && (
                <a
                  className="flex items-center gap-1 text-[10px] font-medium text-accent-600 dark:text-accent-400 hover:underline"
                  href={url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Source
                </a>
              )}
            </div>
          </div>
        )}
      </motion.blockquote>
    </>
  );
}
