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
  images?: string[];
  isFollowUp: boolean;
  createdAt: string;
}

export interface ChatData {
  sessionId: string;
  slug: string;
  userHash?: string;
  conversations: ConversationEntry[];
  createdAt: string;
  updatedAt: string;
}

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
  userHash?: string,
  images?: string[],
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
      userHash,
      conversations: [
        {
          query,
          response,
          steps,
          sources,
          ...(images && images.length > 0 ? { images } : {}),
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
  images?: string[],
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
      ...(images && images.length > 0 ? { images } : {}),
      isFollowUp: true,
      createdAt: new Date().toISOString(),
    });
    chatData.updatedAt = new Date().toISOString();

    await blobSet(`chat:${slug}`, chatData);
  } catch (err) {
    console.error("Failed to append to chat:", err);
  }
}

/** Get chat data by slug */
export async function getChatBySlug(slug: string): Promise<ChatData | null> {
  return blobGet<ChatData>(`chat:${slug}`);
}

/** Reverse lookup: get slug from sessionId */
export async function getSlugBySessionId(
  sessionId: string,
): Promise<string | null> {
  return blobGet<string>(`session:${sessionId}`);
}

/** Get all sessions by listing all chat: blobs directly (no index needed) */
export async function getAllSessions(
  offset: number = 0,
  limit: number = 50,
): Promise<{ sessions: ChatData[]; total: number }> {
  if (!isBlobConfigured) return { sessions: [], total: 0 };

  try {
    // List all chat blobs directly — no fragile index to lose entries
    const keys = await blobList("chat:");

    if (keys.length === 0) {
      return { sessions: [], total: 0 };
    }

    // Fetch all chat data in parallel
    const chatPromises = keys.map((key) => blobGet<ChatData>(key));
    const chats = await Promise.all(chatPromises);

    // Filter nulls, sort newest first by updatedAt
    const allSessions = chats
      .filter((c): c is ChatData => c !== null)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

    const total = allSessions.length;
    const page = allSessions.slice(offset, offset + limit);

    return { sessions: page, total };
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

    return true;
  } catch (err) {
    console.error("Failed to delete chat:", err);

    return false;
  }
}
