"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { ResearchResponse } from "@/components/research/ResearchResponse";

const LOGS_PASSWORD = "ithbat2024";
const AUTH_KEY = "ithbat_logs_auth";

interface ConversationLog {
  id: string;
  session_id: string;
  query: string;
  response: string;
  steps: Array<{
    id: string;
    type: string;
    status: string;
    title: string;
  }>;
  sources: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
  }>;
  is_follow_up: boolean;
  created_at: string;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [conversations, setConversations] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const auth = sessionStorage.getItem(AUTH_KEY);

    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchChat();
    }
  }, [sessionId, isAuthenticated]);

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

  const fetchChat = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/${sessionId}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Chat not found");
        }
        throw new Error("Failed to fetch chat");
      }
      const data = await res.json();

      setConversations(data.conversations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleShare = async () => {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");

      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportAsJSON = () => {
    const data = {
      sessionId,
      exportedAt: new Date().toISOString(),
      conversations: conversations.map((c) => ({
        query: c.query,
        response: c.response,
        isFollowUp: c.is_follow_up,
        createdAt: c.created_at,
        sources: c.sources,
        steps: c.steps,
      })),
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `ithbat-chat-${sessionId.slice(0, 8)}.json`,
      "application/json",
    );
    setShowExportMenu(false);
  };

  const exportAsMarkdown = () => {
    let md = `# Ithbat Research Chat\n\n`;

    md += `**Session:** ${sessionId}\n`;
    md += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    conversations.forEach((c, i) => {
      md += `## ${c.is_follow_up ? "Follow-up " : ""}Question ${i + 1}\n\n`;
      md += `**${c.query}**\n\n`;
      md += `*${formatDate(c.created_at)}*\n\n`;
      md += `### Answer\n\n`;
      md += `${c.response}\n\n`;

      if (c.sources && c.sources.length > 0) {
        md += `### Sources\n\n`;
        c.sources.forEach((s) => {
          md += `- [${s.title}](${s.url}) (${s.domain})\n`;
        });
        md += `\n`;
      }

      md += `---\n\n`;
    });

    downloadFile(
      md,
      `ithbat-chat-${sessionId.slice(0, 8)}.md`,
      "text/markdown",
    );
    setShowExportMenu(false);
  };

  const exportAsText = () => {
    let text = `ITHBAT RESEARCH CHAT\n`;

    text += `${"=".repeat(50)}\n\n`;
    text += `Session: ${sessionId}\n`;
    text += `Exported: ${new Date().toLocaleString()}\n\n`;
    text += `${"=".repeat(50)}\n\n`;

    conversations.forEach((c, i) => {
      text += `${c.is_follow_up ? "FOLLOW-UP " : ""}QUESTION ${i + 1}\n`;
      text += `${"-".repeat(30)}\n`;
      text += `${c.query}\n\n`;
      text += `Date: ${formatDate(c.created_at)}\n\n`;
      text += `ANSWER:\n`;
      text += `${c.response}\n\n`;

      if (c.sources && c.sources.length > 0) {
        text += `SOURCES:\n`;
        c.sources.forEach((s) => {
          text += `- ${s.title}: ${s.url}\n`;
        });
        text += `\n`;
      }

      text += `${"=".repeat(50)}\n\n`;
    });

    downloadFile(
      text,
      `ithbat-chat-${sessionId.slice(0, 8)}.txt`,
      "text/plain",
    );
    setShowExportMenu(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Password prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[280px]"
          initial={{ opacity: 0, y: 8 }}
        >
          <div className="text-center mb-5">
            <h1 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              Chat Thread
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              Protected area
            </p>
          </div>

          <form className="space-y-2.5" onSubmit={handleLogin}>
            <input
              autoFocus
              className={`w-full px-3 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all placeholder:text-neutral-400 ${
                authError
                  ? "border-red-200 dark:border-red-900"
                  : "border-neutral-200 dark:border-neutral-800"
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
              <p className="text-[11px] text-red-500 text-center">
                Wrong password
              </p>
            )}

            <button
              className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              type="submit"
            >
              Continue
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              href="/"
            >
              ← Back
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              href="/logs"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Chat Thread
              </h1>
              <p className="text-[10px] text-neutral-400 font-mono">
                {sessionId.slice(0, 8)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              onClick={handleShare}
            >
              {copied ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-green-600 dark:text-green-400">
                    Copied!
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>

            {/* Export Button */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Export</span>
                <svg
                  className={`w-3 h-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 9l-7 7-7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-lg overflow-hidden z-20">
                  <button
                    className="w-full px-3 py-2 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                    onClick={exportAsMarkdown}
                  >
                    <span className="text-neutral-400">.md</span>
                    <span>Markdown</span>
                  </button>
                  <button
                    className="w-full px-3 py-2 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                    onClick={exportAsJSON}
                  >
                    <span className="text-neutral-400">.json</span>
                    <span>JSON</span>
                  </button>
                  <button
                    className="w-full px-3 py-2 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                    onClick={exportAsText}
                  >
                    <span className="text-neutral-400">.txt</span>
                    <span>Plain Text</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-800 dark:border-t-neutral-200 rounded-full"
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <Link
              className="text-sm text-accent-500 hover:text-accent-600 transition-colors"
              href="/logs"
            >
              Back to logs
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {conversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Query */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                      {index + 1}
                    </span>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {conv.is_follow_up && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded">
                          Follow-up
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400">
                        {formatDate(conv.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-100 font-medium">
                      {conv.query}
                    </p>
                  </div>
                </div>

                {/* Sources */}
                {conv.sources && conv.sources.length > 0 && (
                  <div className="ml-9 mb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {conv.sources.slice(0, 8).map((source, i) => (
                        <a
                          key={i}
                          className="px-2 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          href={source.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {source.domain}
                        </a>
                      ))}
                      {conv.sources.length > 8 && (
                        <span className="px-2 py-0.5 text-[10px] text-neutral-400">
                          +{conv.sources.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Response */}
                <div className="ml-9">
                  <ResearchResponse
                    content={conv.response}
                    isStreaming={false}
                  />
                </div>

                {/* Divider */}
                {index < conversations.length - 1 && (
                  <div className="flex items-center gap-3 mt-6 ml-9">
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-neutral-200/50 dark:border-neutral-800/50 mt-8">
        <Link
          className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          href="/"
        >
          Start a new research on ithbat
        </Link>
      </footer>
    </div>
  );
}
