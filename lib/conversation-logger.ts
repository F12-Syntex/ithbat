import type { ResearchStep, Source } from "@/types/research";

import {
  blobSet,
  blobGet,
  blobDel,
  blobExists,
  blobList,
  isBlobConfigured,
} from "./kv";
import { generateSlug, appendTimestamp } from "./slug";

export interface ConversationEntry {
  query: string;
  response: string;
  steps: ResearchStep[];
  sources: Source[];
  isFollowUp: boolean;
  createdAt: string;
}

export interface ChatData {
  sessionId: string;
  slug: string;
  conversations: ConversationEntry[];
  createdAt: string;
  updatedAt: string;
}

const MAX_SESSIONS = 20;

/** Check if a slug already exists */
export async function isSlugTaken(slug: string): Promise<boolean> {
  return blobExists(`chat:${slug}`);
}

/** Generate a unique slug for a query, appending timestamp if needed */
export async function resolveUniqueSlug(query: string): Promise<string> {
  let slug = generateSlug(query);

  if (!slug) slug = "chat";
  if (await isSlugTaken(slug)) {
    slug = appendTimestamp(slug);
  }

  return slug;
}

/** Create a new chat with the first conversation entry */
export async function createChat(
  slug: string,
  sessionId: string,
  query: string,
  response: string,
  steps: ResearchStep[],
  sources: Source[],
): Promise<void> {
  if (!isBlobConfigured) {
    console.warn("Blob not configured, skipping chat creation");

    return;
  }

  try {
    const now = new Date().toISOString();
    const chatData: ChatData = {
      sessionId,
      slug,
      conversations: [
        {
          query,
          response,
          steps,
          sources,
          isFollowUp: false,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await Promise.all([
      blobSet(`chat:${slug}`, chatData),
      blobSet(`session:${sessionId}`, slug),
    ]);

    // Update the sessions index
    await updateSessionsIndex(slug, Date.now());

    // Cleanup old sessions
    cleanupOldSessions().catch((err) =>
      console.error("Cleanup error:", err),
    );
  } catch (err) {
    console.error("Failed to create chat:", err);
  }
}

/** Append a follow-up conversation to an existing chat */
export async function appendToChat(
  slug: string,
  query: string,
  response: string,
  steps: ResearchStep[],
  sources: Source[],
): Promise<void> {
  if (!isBlobConfigured) {
    console.warn("Blob not configured, skipping chat append");

    return;
  }

  try {
    const chatData = await blobGet<ChatData>(`chat:${slug}`);

    if (!chatData) {
      console.error("Chat not found for slug:", slug);

      return;
    }

    chatData.conversations.push({
      query,
      response,
      steps,
      sources,
      isFollowUp: true,
      createdAt: new Date().toISOString(),
    });
    chatData.updatedAt = new Date().toISOString();

    await blobSet(`chat:${slug}`, chatData);
    await updateSessionsIndex(slug, Date.now());
  } catch (err) {
    console.error("Failed to append to chat:", err);
  }
}

/** Get chat data by slug */
export async function getChatBySlug(
  slug: string,
): Promise<ChatData | null> {
  return blobGet<ChatData>(`chat:${slug}`);
}

/** Reverse lookup: get slug from sessionId */
export async function getSlugBySessionId(
  sessionId: string,
): Promise<string | null> {
  return blobGet<string>(`session:${sessionId}`);
}

// Sessions index: a single blob storing { slug: timestamp } for ordering
interface SessionsIndex {
  entries: Record<string, number>; // slug -> timestamp
}

async function getSessionsIndex(): Promise<SessionsIndex> {
  const index = await blobGet<SessionsIndex>("sessions-index");

  return index || { entries: {} };
}

async function updateSessionsIndex(
  slug: string,
  timestamp: number,
): Promise<void> {
  const index = await getSessionsIndex();

  index.entries[slug] = timestamp;
  await blobSet("sessions-index", index);
}

async function removeFromSessionsIndex(slug: string): Promise<void> {
  const index = await getSessionsIndex();

  delete index.entries[slug];
  await blobSet("sessions-index", index);
}

/** Get all sessions for admin listing (paginated, newest first) */
export async function getAllSessions(
  offset: number = 0,
  limit: number = 50,
): Promise<{ sessions: ChatData[]; total: number }> {
  if (!isBlobConfigured) return { sessions: [], total: 0 };

  try {
    const index = await getSessionsIndex();
    const sorted = Object.entries(index.entries)
      .sort((a, b) => b[1] - a[1]) // newest first
      .map(([slug]) => slug);

    const total = sorted.length;
    const page = sorted.slice(offset, offset + limit);

    if (page.length === 0) {
      return { sessions: [], total };
    }

    const chatPromises = page.map((slug) => blobGet<ChatData>(`chat:${slug}`));
    const chats = await Promise.all(chatPromises);

    const sessions = chats.filter((c): c is ChatData => c !== null);

    return { sessions, total };
  } catch (err) {
    console.error("Failed to get all sessions:", err);

    return { sessions: [], total: 0 };
  }
}

/** Delete a chat by slug */
export async function deleteChat(slug: string): Promise<boolean> {
  if (!isBlobConfigured) return false;

  try {
    const chatData = await blobGet<ChatData>(`chat:${slug}`);

    if (!chatData) return false;

    await Promise.all([
      blobDel(`chat:${slug}`),
      blobDel(`session:${chatData.sessionId}`),
    ]);

    await removeFromSessionsIndex(slug);

    return true;
  } catch (err) {
    console.error("Failed to delete chat:", err);

    return false;
  }
}

/** Cleanup old sessions beyond MAX_SESSIONS */
async function cleanupOldSessions(): Promise<void> {
  if (!isBlobConfigured) return;

  try {
    const index = await getSessionsIndex();
    const sorted = Object.entries(index.entries)
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => slug);

    if (sorted.length <= MAX_SESSIONS) return;

    const toDelete = sorted.slice(MAX_SESSIONS);

    for (const slug of toDelete) {
      await deleteChat(slug);
    }
  } catch (err) {
    console.error("Error cleaning up old sessions:", err);
  }
}
