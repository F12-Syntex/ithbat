"use client";

import { ExternalLink, BookOpen, FileText, User, Scale, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import type { StreamedEvidence } from "@/types/research";

interface EvidencePanelProps {
  evidence: StreamedEvidence[];
}

const typeConfig = {
  hadith: {
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20",
    border: "border-amber-200/50 dark:border-amber-800/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    icon: <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />,
    label: "Hadith",
  },
  quran: {
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-gradient-to-br from-sky-50/80 to-blue-50/50 dark:from-sky-950/30 dark:to-blue-950/20",
    border: "border-sky-200/50 dark:border-sky-800/50",
    iconBg: "bg-sky-100 dark:bg-sky-900/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    icon: <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />,
    label: "Quran",
  },
  scholar: {
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-gradient-to-br from-purple-50/80 to-violet-50/50 dark:from-purple-950/30 dark:to-violet-950/20",
    border: "border-purple-200/50 dark:border-purple-800/50",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    icon: <User className="w-3.5 h-3.5" strokeWidth={1.5} />,
    label: "Scholar",
  },
  fatwa: {
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20",
    border: "border-emerald-200/50 dark:border-emerald-800/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    icon: <Scale className="w-3.5 h-3.5" strokeWidth={1.5} />,
    label: "Fatwa",
  },
};

const gradeConfig: Record<string, { bg: string; text: string; label: string }> = {
  sahih: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-700 dark:text-green-400",
    label: "Sahih",
  },
  hasan: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
    label: "Hasan",
  },
  daif: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-700 dark:text-red-400",
    label: "Da'if",
  },
};

function EvidenceCard({ item, index }: { item: StreamedEvidence; index: number }) {
  const config = typeConfig[item.type];
  const grade = item.grade ? gradeConfig[item.grade] : null;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl overflow-hidden ${config.bg} ${config.border} border shadow-sm`}
      initial={{ opacity: 0, y: 10 }}
      layout
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      {/* Gradient left border */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${config.gradient}`}
      />

      {/* Content */}
      <div className="pl-4 pr-3 py-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <span className={`p-1 rounded-md ${config.iconBg} ${config.iconColor} flex-shrink-0 mt-0.5`}>
            {config.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                {config.label}
              </span>
              {grade && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${grade.bg} ${grade.text}`}>
                  {grade.label}
                </span>
              )}
            </div>
            <h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-100 mt-0.5 leading-tight">
              {item.title}
            </h4>
          </div>
        </div>

        {/* Quote content */}
        {item.content && (
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed line-clamp-3 pl-7">
            "{item.content}"
          </p>
        )}

        {/* Footer with source */}
        {item.url && (
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-neutral-200/30 dark:border-neutral-700/30">
            <a
              className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-600 dark:text-accent-400 hover:underline"
              href={item.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {item.source || "View source"}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (evidence.length === 0) {
    return null;
  }

  // Group evidence by type
  const grouped = evidence.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, StreamedEvidence[]>);

  const typeOrder: Array<keyof typeof typeConfig> = ["quran", "hadith", "scholar", "fatwa"];
  const sortedTypes = typeOrder.filter(type => grouped[type]?.length > 0);

  return (
    <div className="mb-6">
      {/* Header */}
      <button
        className="flex items-center gap-2 mb-3 group w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-accent-600 dark:text-accent-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Evidence Found
          </h3>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            ({evidence.length})
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
      </button>

      {/* Evidence grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-4">
              {sortedTypes.map(type => (
                <div key={type}>
                  {/* Type section header - only show if multiple types */}
                  {sortedTypes.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`p-1 rounded-md ${typeConfig[type].iconBg} ${typeConfig[type].iconColor}`}>
                        {typeConfig[type].icon}
                      </span>
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {typeConfig[type].label} ({grouped[type].length})
                      </span>
                    </div>
                  )}
                  {/* Evidence cards for this type */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {grouped[type].map((item, index) => (
                        <EvidenceCard
                          key={`${item.type}-${item.title}-${index}`}
                          index={index}
                          item={item}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
