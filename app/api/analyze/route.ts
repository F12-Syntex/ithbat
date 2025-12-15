import { getOpenRouterClient } from "@/lib/openrouter";

const AI_ANALYSIS_PROMPT = `You are an Islamic research assistant. Based on the evidence already gathered, provide a brief AI analysis.

## THE QUESTION:
{query}

## EVIDENCE ALREADY PRESENTED:
{evidence}

## YOUR TASK:

Provide a brief AI analysis of the evidence above. Structure your response as:

---

## ⚠️ AI Analysis (Use with Caution)

*The following is an AI-generated summary based on the evidence above. AI can make mistakes in interpretation. This is NOT a religious ruling - consult qualified scholars for definitive guidance.*

**Summary of Evidence**: What do the sources collectively suggest about the question?

**Key Points**:
- [Main takeaway 1]
- [Main takeaway 2]
- [etc.]

**Areas of Agreement/Disagreement**: If scholars or sources differ, note this briefly.

**Limitations**: What aspects were NOT addressed by the sources? What remains unclear?

## RULES:
- Keep analysis brief and tied to the evidence
- Do NOT make claims beyond what the sources state
- Do NOT add new hadith or Quran verses
- Reference specific evidence from above when possible
- Be honest about uncertainty`;

export async function POST(request: Request) {
  const { query, evidence } = await request.json();

  if (!query || !evidence) {
    return new Response(JSON.stringify({ error: "Query and evidence required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const client = getOpenRouterClient();

    const prompt = AI_ANALYSIS_PROMPT
      .replace("{query}", query)
      .replace("{evidence}", evidence);

    let analysis = "";

    for await (const chunk of client.streamChat(
      [
        {
          role: "system",
          content: "You are a helpful Islamic research assistant that provides careful, evidence-based analysis. Always include warnings about AI limitations.",
        },
        { role: "user", content: prompt },
      ],
      "HIGH",
    )) {
      analysis += chunk;
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
