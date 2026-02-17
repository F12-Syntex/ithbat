"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  MessageCircle,
  Clock,
  Search,
  X,
  ChevronDown,
  User,
  Lock,
  ImageIcon,
} from "lucide-react";

const LOGS_PASSWORD = "ithbat2024";
const AUTH_KEY = "ithbat_logs_auth";

interface ChatSession {
  sessionId: string;
  slug: string;
  userHash?: string;
  conversations: Array<{
    query: string;
    response: string;
    images?: string[];
    isFollowUp: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface UserGroup {
  userHash: string;
  sessions: ChatSession[];
  latestUpdate: string;
  totalMessages: number;
}

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

function truncateResponse(response: string, maxLen = 120): string {
  const plain = response
    .replace(/[#*_~`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plain.length <= maxLen) return plain;

  return plain.slice(0, maxLen).replace(/\s+\S*$/, "") + "...";
}

function ChatCard({
  session,
  index,
  deleting,
  onDelete,
  onClick,
}: {
  session: ChatSession;
  index: number;
  deleting: string | null;
  onDelete: (slug: string, label: string) => void;
  onClick: (slug: string) => void;
}) {
  const firstQuery = session.conversations[0]?.query || "Untitled";
  const lastResponse =
    session.conversations[session.conversations.length - 1]?.response || "";
  const msgCount = session.conversations.length;
  const isDeleting = deleting === session.slug;
  const totalImages = session.conversations.reduce(
    (sum, c) => sum + (c.images?.length || 0),
    0,
  );
  const firstImages = session.conversations.find(
    (c) => c.images?.length,
  )?.images;

  return (
    <motion.div
      layout
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-2xl border transition-all cursor-pointer ${
        isDeleting
          ? "opacity-50 pointer-events-none"
          : "bg-white/60 dark:bg-neutral-900/60 border-neutral-200/50 dark:border-neutral-800/50 hover:border-accent-400/50 dark:hover:border-accent-500/50"
      }`}
      exit={{ opacity: 0, x: -20 }}
      initial={{ opacity: 0, y: 12 }}
      transition={{
        delay: index * 0.02,
        duration: 0.25,
        layout: { duration: 0.2 },
      }}
      onClick={() => onClick(session.slug)}
    >
      <div className="px-3 sm:px-4 py-3 sm:py-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
            {firstQuery}
          </h3>
          <button
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.slug, firstQuery.slice(0, 40));
            }}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
          {truncateResponse(lastResponse)}
        </p>

        {/* Image thumbnails */}
        {firstImages && firstImages.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {firstImages.slice(0, 3).map((img, i) => (
              <img
                key={i}
                alt={`Attachment ${i + 1}`}
                className="w-8 h-8 rounded-lg object-cover border border-neutral-200/80 dark:border-neutral-700"
                src={img}
              />
            ))}
            {totalImages > 3 && (
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-0.5">
                +{totalImages - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          {totalImages > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md font-medium">
              <ImageIcon className="w-2.5 h-2.5" strokeWidth={2} />
              {totalImages}
            </span>
          )}
          {msgCount > 1 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-1.5 py-0.5 rounded-md font-medium">
              <MessageCircle className="w-2.5 h-2.5" strokeWidth={2} />
              {msgCount}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            <Clock className="w-2.5 h-2.5" strokeWidth={2} />
            {formatRelativeTime(session.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function LogsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    label: string;
  } | null>(null);
  const [filter, setFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const auth = sessionStorage.getItem(AUTH_KEY);

    if (auth === "true") setIsAuthenticated(true);
    setCheckingAuth(false);
  }, []);

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/logs?limit=50&offset=0");

      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();

      setSessions(data.sessions || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchSessions();
  }, [isAuthenticated, fetchSessions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === LOGS_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.slug);
    try {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: deleteTarget.slug }),
      });

      if (!res.ok) throw new Error("Delete failed");
      await fetchSessions();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const filtered = filter
    ? sessions.filter((s) =>
        s.conversations.some((c) =>
          c.query.toLowerCase().includes(filter.toLowerCase()),
        ),
      )
    : sessions;

  // Group sessions by userHash
  const userGroups = useMemo((): UserGroup[] => {
    const groupMap = new Map<string, ChatSession[]>();

    for (const session of filtered) {
      const hash = session.userHash || "unknown";
      const existing = groupMap.get(hash);

      if (existing) {
        existing.push(session);
      } else {
        groupMap.set(hash, [session]);
      }
    }

    return Array.from(groupMap.entries())
      .map(([userHash, grpSessions]) => ({
        userHash,
        sessions: grpSessions,
        latestUpdate: grpSessions[0]?.updatedAt || "",
        totalMessages: grpSessions.reduce(
          (sum, s) => sum + s.conversations.length,
          0,
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.latestUpdate).getTime() -
          new Date(a.latestUpdate).getTime(),
      );
  }, [filtered]);

  const toggleGroup = (hash: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);

      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }

      return next;
    });
  };

  // Loading auth check
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <motion.div
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-700 border-t-accent-500 dark:border-t-accent-400 rounded-full"
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            Loading...
          </span>
        </motion.div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs"
          initial={{ opacity: 0, y: 10 }}
        >
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm dark:shadow-none p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-10 h-10 rounded-2xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <Lock
                  className="w-4 h-4 text-accent-600 dark:text-accent-400"
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-neutral-100 text-center mb-1">
              Research Logs
            </h1>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mb-6">
              Enter password to view conversations
            </p>
            <form className="space-y-3" onSubmit={handleLogin}>
              <div className="relative">
                <input
                  className={`w-full h-10 px-4 text-base sm:text-sm bg-white dark:bg-neutral-800 border rounded-full outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-200 ${
                    authError
                      ? "border-red-300 dark:border-red-700 focus:border-red-400"
                      : "border-neutral-200/80 dark:border-neutral-700 focus:border-accent-400 dark:focus:border-accent-500"
                  }`}
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(false);
                  }}
                />
                {authError && (
                  <p className="text-xs text-red-500 mt-1.5 ml-3">
                    Incorrect password
                  </p>
                )}
              </div>
              <button
                className="w-full h-10 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-full transition-colors active:scale-[0.98]"
                type="submit"
              >
                Continue
              </button>
            </form>
            <div className="text-center mt-5">
              <Link
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                href="/"
              >
                <ArrowLeft className="w-3 h-3" strokeWidth={2} />
                Back to search
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main logs view
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
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
              Logs
            </span>
            {total > 0 && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                {total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userGroups.length > 0 && (
              <span className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                {userGroups.length} user{userGroups.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              className="w-8 h-8 rounded-full bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95 disabled:opacity-50"
              disabled={refreshing}
              type="button"
              onClick={() => fetchSessions(true)}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5">
        {/* Search filter */}
        {sessions.length > 3 && (
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400"
              strokeWidth={2}
            />
            <input
              className="w-full h-9 pl-9 pr-8 text-base sm:text-sm bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl outline-none focus:border-accent-400 dark:focus:border-accent-500 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-neutral-200"
              placeholder="Filter conversations..."
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
        {loading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <motion.div animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
              <motion.div
                animate={{ rotate: 360 }}
                className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-700 border-t-accent-500 dark:border-t-accent-400 rounded-full"
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              Loading conversations...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-1">
              <MessageCircle
                className="w-5 h-5 text-red-500 dark:text-red-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">
              {error}
            </p>
            <button
              className="text-xs text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
              type="button"
              onClick={() => fetchSessions()}
            >
              Try again
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <div className="w-10 h-10 rounded-2xl bg-neutral-200/50 dark:bg-neutral-800/50 flex items-center justify-center mb-1">
              <MessageCircle
                className="w-5 h-5 text-neutral-400 dark:text-neutral-500"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm text-neutral-500">No conversations yet</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Conversations will appear here after research queries
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <p className="text-sm text-neutral-500">No matches</p>
            <button
              className="text-xs text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
              type="button"
              onClick={() => setFilter("")}
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {userGroups.map((group, groupIndex) => {
              const isCollapsed = !expandedGroups.has(group.userHash);
              const label =
                group.userHash === "unknown" ? "Unknown" : group.userHash;

              return (
                <motion.div
                  key={group.userHash}
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 12 }}
                  transition={{ delay: groupIndex * 0.05, duration: 0.3 }}
                >
                  {/* Group header */}
                  <button
                    className="w-full flex items-center gap-2.5 px-3 sm:px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 hover:border-accent-400/50 dark:hover:border-accent-500/50 transition-all active:scale-[0.99]"
                    type="button"
                    onClick={() => toggleGroup(group.userHash)}
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                      <User
                        className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400"
                        strokeWidth={2}
                      />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-200 truncate">
                        {label}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500">
                        {group.sessions.length} chat
                        {group.sessions.length !== 1 ? "s" : ""}
                        {" \u00b7 "}
                        {group.totalMessages} msg
                        {group.totalMessages !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                        {formatRelativeTime(group.latestUpdate)}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {/* Group chats */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2 mt-2 ml-4 sm:ml-5 border-l-2 border-neutral-200/50 dark:border-neutral-800/50 pl-3 sm:pl-4"
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        {group.sessions.map((session, index) => (
                          <ChatCard
                            key={session.slug}
                            deleting={deleting}
                            index={index}
                            session={session}
                            onClick={(slug) => router.push(`/chat/${slug}`)}
                            onDelete={(slug, lbl) =>
                              setDeleteTarget({ slug, label: lbl })
                            }
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xs bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                Delete conversation?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 leading-relaxed">
                &ldquo;{deleteTarget.label}&rdquo; and all follow-ups will be
                permanently removed.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="h-8 px-4 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="h-8 px-4 text-xs text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors disabled:opacity-50 active:scale-[0.98]"
                  disabled={!!deleting}
                  type="button"
                  onClick={handleDelete}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
