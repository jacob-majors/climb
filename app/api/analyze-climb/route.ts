import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ClimbAnalysis = {
  movementType: string;
  holdTypes: string;
  styleTags: string[];
  feltStrong: string;
  feltWeak: string;
  mainChallenges: string;
  weaknessSummary: string;
};

const STYLE_TAGS = [
  "Overhang","Slab","Vertical","Cave","Roof",
  "Crimpy","Slopey","Pinchy","Jugy","Pockets",
  "Dynamic","Static","Powerful","Technical","Balancy",
  "Compression","Heel hook","Toe hook","Drop knee","Flag",
  "Pump","Power endurance","Sustained","Bouldery",
  "Mental","Committing",
];

export async function POST(req: Request) {
  try {
    const { frames } = (await req.json()) as { frames: string[] };
    if (!frames?.length) return NextResponse.json({ error: "no frames" }, { status: 400 });

    const imageContent = frames.slice(0, 8).map((b64) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data: b64 },
    }));

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `These are frames from a climbing video. Analyze the climber's technique and return ONLY a JSON object with these exact keys:
- movementType: brief movement style description (e.g. "Static, technical footwork", "Dynamic, powerful pulls")
- holdTypes: comma-separated holds visible (e.g. "crimps, sidepulls, slopers")
- styleTags: array of tags from this list only: ${JSON.stringify(STYLE_TAGS)}
- feltStrong: what appeared to go well (1-2 sentences)
- feltWeak: what appeared limiting or difficult (1-2 sentences)
- mainChallenges: main crux or challenge (1 sentence)
- weaknessSummary: one sentence training-focused weakness

Return only the JSON object, no other text.`,
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "parse failed" }, { status: 500 });

    const analysis = JSON.parse(jsonMatch[0]) as ClimbAnalysis;
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("analyze-climb error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
