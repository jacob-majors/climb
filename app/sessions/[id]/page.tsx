import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SessionPlayer } from "@/components/session-player";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const session = await prisma.trainingSession.findUnique({
    where: { id },
    include: { trainingPlan: { select: { userId: true, title: true } } },
  });

  if (!session || session.trainingPlan.userId !== userId) redirect("/dashboard");

  return (
    <SessionPlayer
      session={{
        id: session.id,
        title: session.title,
        planTitle: session.trainingPlan.title,
        warmup: session.warmup,
        mainWork: session.mainWork,
        cooldown: session.cooldown,
        durationMinutes: session.durationMinutes,
        recoveryNotes: session.recoveryNotes,
        whyChosen: session.whyChosen,
      }}
    />
  );
}
