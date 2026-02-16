import { NextRequest, NextResponse } from "next/server";

import { getChatBySlug } from "@/lib/conversation-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json(
      { error: "Slug is required" },
      { status: 400 },
    );
  }

  try {
    const chatData = await getChatBySlug(slug);

    if (!chatData) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversations: chatData.conversations,
      slug: chatData.slug,
      sessionId: chatData.sessionId,
    });
  } catch (error) {
    console.error("Error fetching chat:", error);

    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 },
    );
  }
}
