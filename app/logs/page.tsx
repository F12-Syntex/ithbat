"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";

const LOGS_PASSWORD = "ithbat2024";
const AUTH_KEY = "ithbat_logs_auth";

interface ChatSession {
  sessionId: string;
  slug: string;
  conversations: Array<{
    query: string;
    response: string;
    isFollowUp: boolean;
    createdAt: string;
  }>;
  deviceInfo: {
    deviceType?: string;
    country?: string;
    countryCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

function getCountryFlag(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2 || countryCode === "XX") {
    return "";
  }
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

function getDeviceIcon(deviceType?: string): string {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return "\ud83d\udcf1";
    case "tablet":
      return "\ud83d\udccb";
    case "desktop":
    default:
      return "\ud83d\udcbb";
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    label: string;
  } | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const auth = sessionStorage.getItem(AUTH_KEY);

    if (auth === "true") setIsAuthenticated(true);
    setCheckingAuth(false);
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
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

  const openDeleteModal = (slug: string, label: string) => {
    setDeleteTarget({ slug, label });
    onOpen();
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
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  // Compute stats
  const stats = (() => {
    const countries: Record<string, number> = {};
    const devices: Record<string, number> = {};

    sessions.forEach((s) => {
      const cc = s.deviceInfo?.countryCode || "XX";

      countries[cc] = (countries[cc] || 0) + 1;
      const dt = s.deviceInfo?.deviceType || "desktop";

      devices[dt] = (devices[dt] || 0) + 1;
    });

    return { countries, devices };
  })();

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs"
          initial={{ opacity: 0, y: 10 }}
        >
          <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 p-6">
            <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 text-center mb-6">
              Research Logs
            </h1>
            <form className="space-y-4" onSubmit={handleLogin}>
              <Input
                errorMessage={authError ? "Wrong password" : undefined}
                isInvalid={authError}
                placeholder="Password"
                type="password"
                value={password}
                variant="bordered"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError(false);
                }}
              />
              <Button className="w-full" color="primary" type="submit">
                Continue
              </Button>
            </form>
            <div className="text-center mt-4">
              <Link
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                href="/"
              >
                Back
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="w-8 h-8 rounded-full bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
              href="/"
            >
              <span className="text-neutral-500 dark:text-neutral-400 text-lg">&larr;</span>
            </Link>
            <span className="text-base font-medium text-neutral-800 dark:text-neutral-200">
              Research Logs
            </span>
            <Chip color="primary" size="sm" variant="flat">
              {total} sessions
            </Chip>
          </div>
          <Button
            isLoading={loading}
            size="sm"
            variant="light"
            onPress={fetchSessions}
          >
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Stats */}
        {sessions.length > 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 p-4"
            initial={{ opacity: 0, y: 8 }}
          >
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Sessions:</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {sessions.length}
                </span>
              </div>
              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Countries:</span>
                <div className="flex items-center gap-1">
                  {Object.entries(stats.countries)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([code, count]) => (
                      <span
                        key={code}
                        className="text-lg"
                        title={`${code}: ${count}`}
                      >
                        {getCountryFlag(code)}
                      </span>
                    ))}
                  {Object.keys(stats.countries).length > 8 && (
                    <span className="text-xs text-neutral-500">
                      +{Object.keys(stats.countries).length - 8}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Devices:</span>
                <div className="flex items-center gap-2 text-sm">
                  {Object.entries(stats.devices).map(([type, count]) => (
                    <span
                      key={type}
                      className="text-neutral-600 dark:text-neutral-400"
                      title={`${type}: ${count}`}
                    >
                      {getDeviceIcon(type)} {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {loading && sessions.length === 0 ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <Button color="danger" variant="flat" onPress={fetchSessions}>
              Retry
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500 mb-2">No conversations logged yet</p>
            <p className="text-sm text-neutral-400">
              Conversations will appear here after users search
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sessions.map((session, index) => {
                const firstQuery = session.conversations[0]?.query || "Untitled";
                const msgCount = session.conversations.length;

                return (
                  <motion.div
                    key={session.slug}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 p-4 cursor-pointer hover:border-accent-400/50 dark:hover:border-accent-500/50 transition-all group"
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, y: 12 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    onClick={() => router.push(`/chat/${session.slug}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                          {firstQuery}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Chip
                            color={msgCount > 1 ? "primary" : "default"}
                            size="sm"
                            variant="flat"
                          >
                            {msgCount} {msgCount === 1 ? "msg" : "msgs"}
                          </Chip>
                          {session.deviceInfo?.countryCode && (
                            <span className="text-base leading-none" title={session.deviceInfo.country}>
                              {getCountryFlag(session.deviceInfo.countryCode)}
                            </span>
                          )}
                          <span className="text-xs leading-none" title={session.deviceInfo?.deviceType}>
                            {getDeviceIcon(session.deviceInfo?.deviceType)}
                          </span>
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            {formatRelativeTime(session.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <button
                        className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-lg flex-shrink-0 opacity-0 group-hover:opacity-100"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(
                            session.slug,
                            firstQuery.slice(0, 30),
                          );
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      <Modal isOpen={isOpen} size="sm" onClose={onClose}>
        <ModalContent>
          <ModalHeader className="text-base">Delete Session?</ModalHeader>
          <ModalBody>
            <p className="text-neutral-500 text-sm">
              This will permanently delete the session &quot;
              {deleteTarget?.label}...&quot; and all its messages.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button size="sm" variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={deleting === deleteTarget?.slug}
              size="sm"
              onPress={handleDelete}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
