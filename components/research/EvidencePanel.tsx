"use client";

import { ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { StreamedEvidence } from "@/types/research";

interface EvidencePanelProps {
  evidence: StreamedEvidence[];
}

const typeConfig = {
  hadith: {
    label: "Hadith",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    textColor: "text-green-700 dark:text-green-400",
    icon: "📖",
  },
  quran: {
    label: "Quran",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    textColor: "text-blue-700 dark:text-blue-400",
    icon: "📜",
  },
  scholar: {
    label: "Scholar",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    textColor: "text-purple-700 dark:text-purple-400",
    icon: "🎓",
  },
  fatwa: {
    label: "Fatwa",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    textColor: "text-amber-700 dark:text-amber-400",
    icon: "⚖️",
  },
};

const gradeColors: Record<string, string> = {
  sahih: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  hasan: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  daif: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  unknown: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Evidence Found ({evidence.length})
        </h3>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <AnimatePresence mode="popLayout">
            {evidence.map((item, index) => {
              const config = typeConfig[item.type];

              return (
                <motion.div
                  key={`${item.type}-${index}`}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  layout
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.bgColor} ${config.textColor}`}>
                          {config.label}
                        </span>
                        {item.grade && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${gradeColors[item.grade] || gradeColors.unknown}`}>
                            {item.grade}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-xs text-neutral-800 dark:text-neutral-200">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {item.content}
                      </p>
                      {item.url && (
                        <a
                          className="inline-flex items-center gap-1 text-[10px] text-accent-600 dark:text-accent-400 hover:underline mt-1"
                          href={item.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {item.source}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
