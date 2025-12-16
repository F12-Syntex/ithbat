"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
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

interface ConversationLog {
  id: string;
  session_id: string;
  query: string;
  response: string;
  sources: Array<{ id: number; title: string; url: string; domain: string }>;
  is_follow_up: boolean;
  created_at: string;
  device_type?: string;
  country?: string;
  country_code?: string;
}

// Get country flag emoji from country code
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

// Device type icons
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

export default function LogsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const limit = 50;

  useEffect(() => {
    const auth = sessionStorage.getItem(AUTH_KEY);

    if (auth === "true") setIsAuthenticated(true);
    setCheckingAuth(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/logs?limit=${limit}&offset=${(page - 1) * limit}`,
      );

      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();

      setLogs(data.logs);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isAuthenticated) fetchLogs();
  }, [isAuthenticated, fetchLogs]);

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

  // Group logs by session and compute statistics
  const { groupedSessions, stats } = useMemo(() => {
    const groups: Record<string, ConversationLog[]> = {};

    logs.forEach((log) => {
      if (!groups[log.session_id]) groups[log.session_id] = [];
      groups[log.session_id].push(log);
    });

    // Compute country stats
    const countryStats: Record<string, number> = {};
    const deviceStats: Record<string, number> = {};

    logs.forEach((log) => {
      const cc = log.country_code || "XX";

      countryStats[cc] = (countryStats[cc] || 0) + 1;
      const dt = log.device_type || "desktop";

      deviceStats[dt] = (deviceStats[dt] || 0) + 1;
    });

    const sessions = Object.entries(groups)
      .map(([sessionId, conversations]) => {
        const sorted = conversations.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        return {
          sessionId,
          firstQuery: sorted[0]?.query || "",
          lastUpdated: sorted[sorted.length - 1]?.created_at || "",
          totalMessages: sorted.length,
          deviceType: sorted[0]?.device_type,
          country: sorted[0]?.country,
          countryCode: sorted[0]?.country_code,
          isFollowUp: sorted.some((c) => c.is_follow_up),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
      );

    return {
      groupedSessions: sessions,
      stats: { countries: countryStats, devices: deviceStats },
    };
  }, [logs]);

  const formatDate = (dateStr: string) => {
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
  };

  const totalPages = Math.ceil(total / limit);

  const openDeleteModal = (id: string, label: string) => {
    setDeleteTarget({ id, label });
    onOpen();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: deleteTarget.id }),
      });

      if (!res.ok) throw new Error("Delete failed");
      await fetchLogs();
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-lg"
              href="/"
            >
              &larr;
            </Link>
            <span className="text-base font-medium text-neutral-800 dark:text-neutral-200">
              Research Logs
            </span>
            <Chip color="primary" size="sm" variant="flat">
              {total} entries
            </Chip>
          </div>
          <Button
            isLoading={loading}
            size="sm"
            variant="light"
            onPress={fetchLogs}
          >
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        {logs.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Sessions:</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {groupedSessions.length}
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
                      title={`${code}: ${count} messages`}
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
        )}

        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <Button color="danger" variant="flat" onPress={fetchLogs}>
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500 mb-2">No conversations logged yet</p>
            <p className="text-sm text-neutral-400">
              Conversations will appear here after users search
            </p>
          </div>
        ) : (
          <Table
            aria-label="Research logs"
            classNames={{
              wrapper: "bg-transparent shadow-none p-0",
              th: "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wider",
              td: "py-3",
            }}
            selectionMode="none"
          >
            <TableHeader>
              <TableColumn>QUERY</TableColumn>
              <TableColumn width={60}>MSGS</TableColumn>
              <TableColumn width={80}>LOCATION</TableColumn>
              <TableColumn width={80}>DEVICE</TableColumn>
              <TableColumn width={100}>TIME</TableColumn>
              <TableColumn width={50}> </TableColumn>
            </TableHeader>
            <TableBody>
              {groupedSessions.map((session) => (
                <TableRow
                  key={session.sessionId}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  onClick={() => router.push(`/chat/${session.sessionId}`)}
                >
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-1 text-neutral-800 dark:text-neutral-200 font-medium">
                        {session.firstQuery}
                      </span>
                      {session.totalMessages > 1 && (
                        <span className="text-xs text-neutral-500">
                          {session.totalMessages - 1} follow-up
                          {session.totalMessages > 2 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={session.totalMessages > 1 ? "primary" : "default"}
                      size="sm"
                      variant="flat"
                    >
                      {session.totalMessages}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg leading-none">
                        {getCountryFlag(session.countryCode)}
                      </span>
                      <span className="text-xs text-neutral-500 uppercase">
                        {session.countryCode || "--"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">
                        {getDeviceIcon(session.deviceType)}
                      </span>
                      <span className="text-xs text-neutral-500 capitalize">
                        {session.deviceType || "desktop"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-500">
                      {formatDate(session.lastUpdated)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-lg"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(
                          session.sessionId,
                          session.firstQuery.slice(0, 30),
                        );
                      }}
                    >
                      &times;
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              showControls
              page={page}
              total={totalPages}
              onChange={setPage}
            />
          </div>
        )}
      </main>

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
              isLoading={deleting === deleteTarget?.id}
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
