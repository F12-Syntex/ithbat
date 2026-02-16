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

interface ConversationEntry {
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
  isFollowUp: boolean;
  createdAt: string;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchChat();
  }, [slug]);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = () => setShowExportMenu(false);

    window.addEventListener("click", handleClick);

    return () => window.removeEventListener("click", handleClick);
  }, [showExportMenu]);

  const fetchChat = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/${slug}`);

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

  const exportAsJSON = () => {
    const data = {
      slug,
      exportedAt: new Date().toISOString(),
      conversations: conversations.map((c) => ({
        query: c.query,
        response: c.response,
        isFollowUp: c.isFollowUp,
        createdAt: c.createdAt,
        sources: c.sources,
        steps: c.steps,
      })),
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `ithbat-${slug}.json`,
      "application/json",
    );
    setShowExportMenu(false);
  };

  const exportAsMarkdown = () => {
    let md = `# Ithbat Research Chat\n\n`;

    md += `**Chat:** ${slug}\n`;
    md += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    conversations.forEach((c, i) => {
      md += `## ${c.isFollowUp ? "Follow-up " : ""}Question ${i + 1}\n\n`;
      md += `**${c.query}**\n\n`;
      md += `*${formatDate(c.createdAt)}*\n\n`;
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

    downloadFile(md, `ithbat-${slug}.md`, "text/markdown");
    setShowExportMenu(false);
  };

  const exportAsText = () => {
    let text = `ITHBAT RESEARCH CHAT\n`;

    text += `${"=".repeat(50)}\n\n`;
    text += `Chat: ${slug}\n`;
    text += `Exported: ${new Date().toLocaleString()}\n\n`;
    text += `${"=".repeat(50)}\n\n`;

    conversations.forEach((c, i) => {
      text += `${c.isFollowUp ? "FOLLOW-UP " : ""}QUESTION ${i + 1}\n`;
      text += `${"-".repeat(30)}\n`;
      text += `${c.query}\n\n`;
      text += `Date: ${formatDate(c.createdAt)}\n\n`;
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

    downloadFile(text, `ithbat-${slug}.txt`, "text/plain");
    setShowExportMenu(false);
  };

  const firstQuery = conversations[0]?.query || "Shared Chat";

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
          <div className="flex items-center gap-3 min-w-0">
            <Link
              className="w-8 h-8 rounded-full bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-center hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95 flex-shrink-0"
              href="/"
            >
              <ArrowLeft
                className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400"
                strokeWidth={2}
              />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                {firstQuery}
              </h1>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate">
                {slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Share Button */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all active:scale-95"
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
                    className="absolute right-0 mt-2 w-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg overflow-hidden z-20"
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300"
                      onClick={exportAsMarkdown}
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      Markdown
                    </button>
                    <button
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300"
                      onClick={exportAsJSON}
                    >
                      <FileJson className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                      JSON
                    </button>
                    <button
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300"
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
        <div className="space-y-6">
          {conversations.map((conv, index) => (
            <motion.div
              key={index}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 p-4 sm:p-6"
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
                    {conv.isFollowUp && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded-full">
                        <CornerDownRight className="w-2.5 h-2.5" strokeWidth={2} />
                        Follow-up
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {formatDate(conv.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 font-medium">
                    {conv.query}
                  </p>
                </div>
              </div>

              {/* Sources */}
              {conv.sources && conv.sources.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {conv.sources.slice(0, 8).map((source, i) => (
                      <a
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 border border-accent-200/50 dark:border-accent-800/50 rounded-full hover:border-accent-400 dark:hover:border-accent-500 transition-all"
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
              <div>
                <ResearchResponse
                  content={conv.response}
                  isStreaming={false}
                />
              </div>
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
