"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  Trash2,
  Search,
  X,
} from "lucide-react";

import { useChatHistory } from "@/hooks/useChatHistory";
import { useTranslation } from "@/lib/i18n";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const { entries, removeEntry, clearAll } = useChatHistory();
  const [filter, setFilter] = useState("");
  const { t } = useTranslation();

  const filtered = filter
    ? entries.filter((e) =>
        e.query.toLowerCase().includes(filter.toLowerCase()),
      )
    : entries;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="w-8 h-8 rounded-full bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
              href="/"
            >
              <ArrowLeft
                className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400"
                strokeWidth={2}
              />
            </Link>
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {t("history.title")}
            </span>
            {entries.length > 0 && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                {entries.length}
              </span>
            )}
          </div>

          {entries.length > 0 && (
            <button
              className="text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              onClick={clearAll}
            >
              {t("history.clearAll")}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Search filter */}
        {entries.length > 3 && (
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400"
              strokeWidth={2}
            />
            <input
              className="w-full h-9 pl-9 pr-8 text-sm bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl outline-none focus:border-accent-400 dark:focus:border-accent-500 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-200"
              placeholder={t("history.filterPlaceholder")}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {filter && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                type="button"
                onClick={() => setFilter("")}
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <div className="w-10 h-10 rounded-2xl bg-neutral-200/50 dark:bg-neutral-800/50 flex items-center justify-center mb-1">
              <MessageCircle
                className="w-5 h-5 text-neutral-400 dark:text-neutral-500"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm text-neutral-500">
              {t("history.noConversations")}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {t("history.emptyDesc")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <p className="text-sm text-neutral-500">{t("history.noMatches")}</p>
            <button
              className="text-xs text-accent-500 hover:text-accent-600"
              type="button"
              onClick={() => setFilter("")}
            >
              {t("history.clearFilter")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((entry, index) => (
                <motion.div
                  key={entry.slug}
                  layout
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative rounded-2xl border transition-all cursor-pointer bg-white/60 dark:bg-neutral-900/60 border-neutral-200/50 dark:border-neutral-800/50 hover:border-accent-400/50 dark:hover:border-accent-500/50"
                  exit={{ opacity: 0, x: -20 }}
                  initial={{ opacity: 0, y: 12 }}
                  transition={{
                    delay: index * 0.02,
                    duration: 0.25,
                    layout: { duration: 0.2 },
                  }}
                  onClick={() => router.push(`/chat/${entry.slug}`)}
                >
                  <div className="px-4 py-3.5">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                        {entry.query}
                      </h3>
                      <button
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEntry(entry.slug);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2">
                      {entry.messageCount > 1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-1.5 py-0.5 rounded-md font-medium">
                          <MessageCircle
                            className="w-2.5 h-2.5"
                            strokeWidth={2}
                          />
                          {entry.messageCount}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                        {formatRelativeTime(entry.updatedAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {entries.length > 0 && (
          <p className="text-[10px] text-neutral-300 dark:text-neutral-700 px-3 mt-6 mb-4">
            {t("history.storedLocally")}
          </p>
        )}
      </main>
    </div>
  );
}
