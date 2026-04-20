import { Card } from "@/components/ui/card";

type LoadChartProps = {
  sessions: { dayLabel: string; loadScore: number }[];
};

export function LoadChart({ sessions }: LoadChartProps) {
  const maxLoad = Math.max(...sessions.map((session) => session.loadScore), 1);

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-ink">Training load</p>
        <p className="text-sm text-ink/60">See where the bigger climbing days and lower-load days land this week.</p>
      </div>
      <div className="grid gap-3">
        {sessions.map((session) => (
          <div key={session.dayLabel} className="grid grid-cols-[72px_1fr_32px] items-center gap-2 sm:grid-cols-[90px_1fr_40px] sm:gap-3">
            <span className="text-xs text-ink/70 sm:text-sm">{session.dayLabel.slice(0, 3)}</span>
            <div className="h-3 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(8, (session.loadScore / maxLoad) * 100)}%` }} />
            </div>
            <span className="text-right text-xs font-medium text-ink sm:text-sm">{session.loadScore}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
