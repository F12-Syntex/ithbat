import { NextRequest, NextResponse } from "next/server";

import { getAllSessions, deleteChat } from "@/lib/conversation-logger";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const { sessions, total } = await getAllSessions(offset, limit);

    return NextResponse.json({ sessions, total, limit, offset });
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
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const success = await deleteChat(slug);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete chat" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting:", error);

    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
