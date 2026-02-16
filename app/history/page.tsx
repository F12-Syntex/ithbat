"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  Trash2,
} from "lucide-react";

import { useChatHistory } from "@/hooks/useChatHistory";

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

function groupEntries(
  entries: { slug: string; query: string; messageCount: number; updatedAt: string }[],
) {
  const now = new Date();
  const groups: { label: string; items: typeof entries }[] = [];
  const today: typeof entries = [];
  const yesterday: typeof entries = [];
  const thisWeek: typeof entries = [];
  const older: typeof entries = [];

  for (const entry of entries) {
    const date = new Date(entry.updatedAt);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays < 1) today.push(entry);
    else if (diffDays < 2) yesterday.push(entry);
    else if (diffDays < 7) thisWeek.push(entry);
    else older.push(entry);
  }

  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (thisWeek.length) groups.push({ label: "This week", items: thisWeek });
  if (older.length) groups.push({ label: "Older", items: older });

  return groups;
}

export default function HistoryPage() {
  const router = useRouter();
  const { entries, removeEntry, clearAll } = useChatHistory();
  const groups = groupEntries(entries);

  return (
    <div className="h-screen h-[100dvh] bg-neutral-100 dark:bg-neutral-950 flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="w-7 h-7 -ml-1 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-all active:scale-90"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              History
            </span>
            {entries.length > 0 && (
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 bg-neutral-200/60 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full tabular-nums">
                {entries.length}
              </span>
            )}
          </div>

          {entries.length > 0 && (
            <button
              className="text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              onClick={clearAll}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">
              No conversations yet
            </p>
            <button
              className="px-3.5 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-full shadow-sm dark:shadow-none hover:text-accent-600 dark:hover:text-accent-400 transition-colors active:scale-95"
              onClick={() => router.push("/")}
            >
              Start researching
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-2 sm:px-4 py-2">
            {groups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
                <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-1">
                  {group.label}
                </p>

                {group.items.map((entry) => (
                  <div
                    key={entry.slug}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-neutral-900 transition-colors"
                    onClick={() => router.push(`/chat/${entry.slug}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-neutral-700 dark:text-neutral-300 truncate group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                        {entry.query}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.messageCount > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-600 dark:text-accent-400">
                            <MessageCircle className="w-2.5 h-2.5" strokeWidth={2} />
                            {entry.messageCount}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                          <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                          {formatRelativeTime(entry.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-transparent group-hover:text-neutral-300 dark:group-hover:text-neutral-600 hover:!text-red-500 dark:hover:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEntry(entry.slug);
                      }}
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            ))}

            <p className="text-[10px] text-neutral-300 dark:text-neutral-700 px-3 mt-6 mb-4">
              Stored in this browser only
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
