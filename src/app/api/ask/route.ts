import { askSettings } from "@/lib/ask/gemini";
import { handleAsk } from "@/lib/ask/handle";
import type { AskIndex } from "@/lib/ask/sections";
// Built from content/ by scripts/build-ask-index.ts before every dev and build run.
import askIndex from "@/lib/generated/ask-index.json";

const index = askIndex as unknown as AskIndex;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the question as JSON." }, { status: 400 });
  }
  const result = await handleAsk(body, index, askSettings());
  return Response.json(result.body, { status: result.status });
}
