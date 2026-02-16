"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { ResearchContainer } from "@/components/research";
import { useResearch } from "@/hooks/useResearch";

export default function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { hydrateChat, state } = useResearch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only hydrate if the context doesn't already have this chat loaded
    if (state.status !== "idle" && state.query) {
      setLoading(false);

      return;
    }

    let cancelled = false;

    async function load() {
      const success = await hydrateChat(slug);

      if (cancelled) return;

      if (!success) {
        setError("Chat not found");
      }
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
        >
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <MessageCircle
              className="w-5 h-5 text-red-500 dark:text-red-400"
              strokeWidth={1.5}
            />
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

  // Once hydrated, render the exact same UI as the main page
  return <ResearchContainer />;
}
