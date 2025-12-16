import { NextRequest, NextResponse } from "next/server";

import {
  getConversationLogs,
  deleteSession,
  deleteLog,
} from "@/lib/conversation-logger";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const { logs, total } = await getConversationLogs(limit, offset);

    return NextResponse.json({ logs, total, limit, offset });
  } catch (error) {
    console.error("Error fetching logs:", error);

    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId, logId } = await request.json();

    if (sessionId) {
      const success = await deleteSession(sessionId);

      if (!success) {
        return NextResponse.json(
          { error: "Failed to delete session" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, deleted: "session" });
    }

    if (logId) {
      const success = await deleteLog(logId);

      if (!success) {
        return NextResponse.json(
          { error: "Failed to delete log" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, deleted: "log" });
    }

    return NextResponse.json(
      { error: "sessionId or logId required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error deleting:", error);

    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
