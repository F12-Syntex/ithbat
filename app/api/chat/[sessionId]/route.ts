import { NextRequest, NextResponse } from "next/server";
import { getConversationsBySession } from "@/lib/conversation-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  try {
    const conversations = await getConversationsBySession(sessionId);

    if (conversations.length === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversations, sessionId });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}
