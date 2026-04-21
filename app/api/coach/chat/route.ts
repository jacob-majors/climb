import { NextRequest } from "next/server";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getOrCreateDbUser();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { sessionId, question } = (await req.json()) as { sessionId: string | null; question: string };
  if (!question?.trim()) return new Response("Bad request", { status: 400 });

  // Load athlete profile (and optionally a specific session for in-session context)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      profile: {
        select: {
          flashGrade: true,
          redpointGrade: true,
          boulderFlashGrade: true,
          boulderMaxGrade: true,
          experienceLevel: true,
          primaryDiscipline: true,
          climbingDaysPerWeek: true,
        },
      },
    },
  });

  const session = sessionId
    ? await prisma.trainingSession.findFirst({
        where: { id: sessionId, trainingPlan: { userId } },
        select: {
          title: true,
          sessionType: true,
          intensity: true,
          durationMinutes: true,
          loadScore: true,
          warmup: true,
          mainWork: true,
          cooldown: true,
          whyChosen: true,
          recoveryNotes: true,
        },
      })
    : null;

  const profile = user?.profile;
  const name = user?.name ?? "the athlete";

  const sessionBlock = session
    ? `\nToday's session:\n- Title: ${session.title}\n- Type: ${session.sessionType.replace(/_/g, " ").toLowerCase()}\n- Intensity: ${session.intensity}\n- Duration: ${session.durationMinutes} minutes\n- Main work: ${session.mainWork}\n- Why chosen: ${session.whyChosen}\n- Recovery notes: ${session.recoveryNotes}`
    : "";

  const systemPrompt = `You are a concise, practical climbing coach. Give direct, actionable answers in 2–4 sentences max. No fluff, no bullet lists unless asked. Speak to the athlete in second person.

Athlete context:
- Name: ${name}
- Experience: ${profile?.experienceLevel ?? "intermediate"}
- Primary discipline: ${profile?.primaryDiscipline ?? "not specified"}
- Route redpoint: ${profile?.redpointGrade ?? "unknown"}, flash: ${profile?.flashGrade ?? "unknown"}
- Boulder max: ${profile?.boulderMaxGrade ?? "unknown"}, flash: ${profile?.boulderFlashGrade ?? "unknown"}
- Climbing days/week: ${profile?.climbingDaysPerWeek ?? "unknown"}${sessionBlock}`.trim();

  const stream = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    stream: true,
    max_tokens: 200,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
