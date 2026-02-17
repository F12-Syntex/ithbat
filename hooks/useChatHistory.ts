"use client";

import { useState, useEffect, useCallback } from "react";

export interface ChatHistoryEntry {
  slug: string;
  query: string;
  messageCount: number;
  updatedAt: string;
}

const STORAGE_KEY = "ithbat-chat-history";
const MAX_ENTRIES = 50;

function loadEntries(): ChatHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed as ChatHistoryEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: ChatHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable
  }
}

export function useChatHistory() {
  const [entries, setEntries] = useState<ChatHistoryEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const addEntry = useCallback(
    (slug: string, query: string, messageCount = 1) => {
      setEntries((prev) => {
        const now = new Date().toISOString();
        const existing = prev.findIndex((e) => e.slug === slug);

        let next: ChatHistoryEntry[];

        if (existing >= 0) {
          // Update existing
          next = [...prev];
          next[existing] = {
            ...next[existing],
            messageCount,
            updatedAt: now,
          };
        } else {
          // Add new
          next = [{ slug, query, messageCount, updatedAt: now }, ...prev];
        }

        // Sort newest first, cap at max
        next.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        next = next.slice(0, MAX_ENTRIES);

        saveEntries(next);

        return next;
      });
    },
    [],
  );

  const removeEntry = useCallback((slug: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.slug !== slug);

      saveEntries(next);

      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    saveEntries([]);
  }, []);

  return { entries, addEntry, removeEntry, clearAll };
}
