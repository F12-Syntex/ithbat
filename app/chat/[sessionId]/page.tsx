"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  Check,
  Download,
  ChevronDown,
  FileText,
  FileJson,
  FileType,
  MessageCircle,
  CornerDownRight,
} from "lucide-react";

import { ResearchResponse } from "@/components/research/ResearchResponse";

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
  const [conversations, setConversations] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchChat();
  }, [sessionId]);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = () => setShowExportMenu(false);

    window.addEventListener("click", handleClick);

    return () => window.removeEventListener("click", handleClick);
  }, [showExportMenu]);

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

  // Loading state
  if (loading) {
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
            Loading conversation...
          </span>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
        >
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-5 h-5 text-red-500 dark:text-red-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium mb-1">
            {error}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">
            This conversation may have been removed
          </p>
          <Link
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
            href="/"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Back to search
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
              href="/"
            >
              <ArrowLeft
                className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400"
                strokeWidth={2}
              />
            </Link>
            <div>
              <h1 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Shared Chat
              </h1>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                {conversations.length} {conversations.length === 1 ? "message" : "messages"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Share Button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
              onClick={handleShare}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-green-600 dark:text-green-400"
                    exit={{ opacity: 0, scale: 0.8 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    Copied
                  </motion.span>
                ) : (
                  <motion.span
                    key="share"
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5"
                    exit={{ opacity: 0, scale: 0.8 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                  >
                    <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                    Share
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Export Button */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
              >
                <Download className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Export</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
              </button>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-lg overflow-hidden z-20"
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300"
                      onClick={exportAsMarkdown}
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      Markdown
                    </button>
                    <button
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300"
                      onClick={exportAsJSON}
                    >
                      <FileJson className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      JSON
                    </button>
                    <button
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300"
                      onClick={exportAsText}
                    >
                      <FileType className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      Plain Text
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        <div className="space-y-0">
          {conversations.map((conv, index) => (
            <motion.div
              key={conv.id}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 16 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
            >
              {/* Query */}
              <div className="flex items-start gap-2.5 mb-3">
                <span className="w-5 h-5 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                    {index + 1}
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {conv.is_follow_up && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded-full">
                        <CornerDownRight className="w-2.5 h-2.5" strokeWidth={2} />
                        Follow-up
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {formatDate(conv.created_at)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 font-medium">
                    {conv.query}
                  </p>
                </div>
              </div>

              {/* Sources */}
              {conv.sources && conv.sources.length > 0 && (
                <div className="ml-[30px] mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {conv.sources.slice(0, 8).map((source, i) => (
                      <a
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border border-neutral-200/80 dark:border-neutral-700 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all"
                        href={source.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {source.domain}
                      </a>
                    ))}
                    {conv.sources.length > 8 && (
                      <span className="px-2 py-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                        +{conv.sources.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Response */}
              <div className="ml-[30px]">
                <ResearchResponse
                  content={conv.response}
                  isStreaming={false}
                />
              </div>

              {/* Divider */}
              {index < conversations.length - 1 && (
                <div className="flex items-center gap-3 my-6 ml-[30px]">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Follow-up
                  </span>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <div className="flex-shrink-0 py-2 sm:py-3 text-center border-t border-neutral-200/50 dark:border-neutral-800/50">
        <div className="flex items-center justify-center gap-2">
          <Link
            className="text-[10px] text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
            href="/"
          >
            Start a new research on ithbat
          </Link>
        </div>
      </div>
    </div>
  );
}
