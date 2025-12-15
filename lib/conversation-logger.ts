import { createServerClient } from "./supabase";
import type { ResearchStep, Source } from "@/types/research";

export interface ConversationLog {
  id?: string;
  session_id: string;
  query: string;
  response: string;
  steps: ResearchStep[];
  sources: Source[];
  is_follow_up: boolean;
  created_at?: string;
}

const MAX_SESSIONS = 20;

async function cleanupOldSessions(): Promise<void> {
  try {
    const supabase = createServerClient();
    if (!supabase) return;

    // Get all unique sessions ordered by most recent activity
    const { data: sessions } = await supabase
      .from("conversation_logs")
      .select("session_id, created_at")
      .order("created_at", { ascending: false });

    if (!sessions || sessions.length === 0) return;

    // Get unique session IDs in order of most recent
    const uniqueSessions: string[] = [];
    const seen = new Set<string>();
    for (const s of sessions) {
      if (!seen.has(s.session_id)) {
        seen.add(s.session_id);
        uniqueSessions.push(s.session_id);
      }
    }

    // If we have more than MAX_SESSIONS, delete the oldest ones
    if (uniqueSessions.length > MAX_SESSIONS) {
      const sessionsToDelete = uniqueSessions.slice(MAX_SESSIONS);

      const { error } = await supabase
        .from("conversation_logs")
        .delete()
        .in("session_id", sessionsToDelete);

      if (error) {
        console.error("Failed to cleanup old sessions:", error);
      }
    }
  } catch (err) {
    console.error("Error cleaning up old sessions:", err);
  }
}

export async function logConversation(
  sessionId: string,
  query: string,
  response: string,
  steps: ResearchStep[],
  sources: Source[],
  isFollowUp: boolean = false
): Promise<void> {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      console.warn("Supabase not configured, skipping conversation logging");
      return;
    }

    const { error } = await supabase.from("conversation_logs").insert({
      session_id: sessionId,
      query,
      response,
      steps: JSON.stringify(steps),
      sources: JSON.stringify(sources),
      is_follow_up: isFollowUp,
    });

    if (error) {
      console.error("Failed to log conversation:", error);
    }

    // Cleanup old sessions (non-blocking)
    cleanupOldSessions().catch((err) =>
      console.error("Cleanup error:", err)
    );
  } catch (err) {
    console.error("Error logging conversation:", err);
  }
}

export async function getConversationLogs(
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: ConversationLog[]; total: number }> {
  const supabase = createServerClient();
  if (!supabase) {
    console.warn("Supabase not configured");
    return { logs: [], total: 0 };
  }

  // Get total count
  const { count } = await supabase
    .from("conversation_logs")
    .select("*", { count: "exact", head: true });

  // Get paginated logs
  const { data, error } = await supabase
    .from("conversation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to fetch conversation logs:", error);
    return { logs: [], total: 0 };
  }

  const logs = (data || []).map((row) => ({
    id: row.id,
    session_id: row.session_id,
    query: row.query,
    response: row.response,
    steps: typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps,
    sources:
      typeof row.sources === "string" ? JSON.parse(row.sources) : row.sources,
    is_follow_up: row.is_follow_up,
    created_at: row.created_at,
  }));

  return { logs, total: count || 0 };
}

export async function getConversationsBySession(
  sessionId: string
): Promise<ConversationLog[]> {
  const supabase = createServerClient();
  if (!supabase) {
    console.warn("Supabase not configured");
    return [];
  }

  const { data, error } = await supabase
    .from("conversation_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch session conversations:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    session_id: row.session_id,
    query: row.query,
    response: row.response,
    steps: typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps,
    sources:
      typeof row.sources === "string" ? JSON.parse(row.sources) : row.sources,
    is_follow_up: row.is_follow_up,
    created_at: row.created_at,
  }));
}
