type ProgressRingProps = {
  label: string;
  helper: string;
  valueLabel: string;
  percent: number;
  tone?: "pine" | "clay" | "ink";
};

function toneClass(tone: NonNullable<ProgressRingProps["tone"]>) {
  switch (tone) {
    case "clay":
      return "text-clay";
    case "ink":
      return "text-ink";
    default:
      return "text-pine";
  }
}

export function ProgressRing({
  label,
  helper,
  valueLabel,
  percent,
  tone = "pine",
}: ProgressRingProps) {
  const size = 118;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedPercent = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - normalizedPercent / 100);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className={`relative ${toneClass(tone)}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold tracking-tight text-ink">{Math.round(normalizedPercent)}%</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">{valueLabel}</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="max-w-[11rem] text-xs leading-5 text-ink/60">{helper}</p>
      </div>
    </div>
  );
}
