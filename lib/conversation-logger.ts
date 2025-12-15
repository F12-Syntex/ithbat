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
  } catch (err) {
    console.error("Error logging conversation:", err);
  }
}

export async function getConversationLogs(
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: ConversationLog[]; total: number }> {
  const supabase = createServerClient();

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
