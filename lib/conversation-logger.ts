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
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
}

export interface DeviceInfo {
  ip?: string;
  userAgent?: string;
  deviceType?: string;
}

const MAX_SESSIONS = 20;

// Parse user agent to determine device type
function parseDeviceType(userAgent?: string): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone"))
    return "mobile";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  return "desktop";
}

async function cleanupOldSessions(): Promise<void> {
  try {
    const supabase = createServerClient();
    if (!supabase) return;

    const { data: sessions } = await supabase
      .from("conversation_logs")
      .select("session_id, created_at")
      .order("created_at", { ascending: false });

    if (!sessions || sessions.length === 0) return;

    const uniqueSessions: string[] = [];
    const seen = new Set<string>();
    for (const s of sessions) {
      if (!seen.has(s.session_id)) {
        seen.add(s.session_id);
        uniqueSessions.push(s.session_id);
      }
    }

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
  isFollowUp: boolean = false,
  deviceInfo?: DeviceInfo
): Promise<void> {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      console.warn("Supabase not configured, skipping conversation logging");
      return;
    }

    const insertData: Record<string, unknown> = {
      session_id: sessionId,
      query,
      response,
      steps: JSON.stringify(steps),
      sources: JSON.stringify(sources),
      is_follow_up: isFollowUp,
    };

    // Add device info if available
    if (deviceInfo?.ip) {
      insertData.ip_address = deviceInfo.ip;
    }
    if (deviceInfo?.userAgent) {
      insertData.user_agent = deviceInfo.userAgent;
      insertData.device_type = parseDeviceType(deviceInfo.userAgent);
    }

    const { error } = await supabase
      .from("conversation_logs")
      .insert(insertData);

    if (error) {
      console.error("Failed to log conversation:", error);
    }

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

  const { count } = await supabase
    .from("conversation_logs")
    .select("*", { count: "exact", head: true });

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
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    device_type: row.device_type,
  }));

  return { logs, total: count || 0 };
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const supabase = createServerClient();
  if (!supabase) {
    console.warn("Supabase not configured");
    return false;
  }

  const { error } = await supabase
    .from("conversation_logs")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    console.error("Failed to delete session:", error);
    return false;
  }

  return true;
}

export async function deleteLog(logId: string): Promise<boolean> {
  const supabase = createServerClient();
  if (!supabase) {
    console.warn("Supabase not configured");
    return false;
  }

  const { error } = await supabase
    .from("conversation_logs")
    .delete()
    .eq("id", logId);

  if (error) {
    console.error("Failed to delete log:", error);
    return false;
  }

  return true;
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
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    device_type: row.device_type,
  }));
}
