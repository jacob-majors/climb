import { NextRequest } from "next/server";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getOrCreateDbUser();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { sessionId, question } = (await req.json()) as { sessionId: string; question: string };
  if (!question?.trim()) return new Response("Bad request", { status: 400 });

  // Load session + athlete profile for context
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      trainingPlan: {
        select: {
          userId: true,
          title: true,
          user: {
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
          },
        },
      },
    },
  });

  if (!session || session.trainingPlan.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  const profile = session.trainingPlan.user.profile;
  const name = session.trainingPlan.user.name ?? "the athlete";

  const systemPrompt = `You are a concise, practical climbing coach. The athlete is about to do or is mid-way through a training session. Give direct, actionable answers in 2–4 sentences max. No fluff, no bullet lists unless asked. Speak to the athlete in second person.

Athlete context:
- Name: ${name}
- Experience: ${profile?.experienceLevel ?? "intermediate"}
- Primary discipline: ${profile?.primaryDiscipline ?? "not specified"}
- Route redpoint: ${profile?.redpointGrade ?? "unknown"}, flash: ${profile?.flashGrade ?? "unknown"}
- Boulder max: ${profile?.boulderMaxGrade ?? "unknown"}, flash: ${profile?.boulderFlashGrade ?? "unknown"}

Today's session:
- Title: ${session.title}
- Type: ${session.sessionType.replace(/_/g, " ").toLowerCase()}
- Intensity: ${session.intensity}
- Duration: ${session.durationMinutes} minutes
- Load score: ${session.loadScore}
- Warmup: ${session.warmup}
- Main work: ${session.mainWork}
- Cooldown: ${session.cooldown}
- Why chosen: ${session.whyChosen}
- Recovery notes: ${session.recoveryNotes}`.trim();

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
