import { PeakForecast } from "@/lib/peak-forecast";
import { Card } from "@/components/ui/card";

type PeakGraphProps = {
  forecast: PeakForecast;
  title?: string;
  description?: string;
};

function pathFromSeries(values: number[], width: number, height: number) {
  if (!values.length) return "";
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / 100) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PeakGraph({
  forecast,
  title = "Peak forecast",
  description = "Projected form, readiness, and load over the next stretch.",
}: PeakGraphProps) {
  const width = 560;
  const height = 180;
  const formPath = pathFromSeries(forecast.series.map((point) => point.form), width, height);
  const readinessPath = pathFromSeries(forecast.series.map((point) => point.readiness), width, height);
  const loadPath = pathFromSeries(forecast.series.map((point) => point.load), width, height);
  const bestIndex = forecast.series.findIndex((point) => point.date.getTime() === forecast.predictedPeakDate.getTime());
  const bestX = forecast.series.length > 1 ? (bestIndex / (forecast.series.length - 1)) * width : width / 2;

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm text-ink/60">{description}</p>
        </div>
        <div className="rounded-2xl bg-mist px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">Predicted peak</p>
          <p className="mt-2 text-lg font-semibold text-ink">{forecast.predictedPeakLabel}</p>
          <p className="mt-1 text-sm text-ink/60">Score {forecast.peakScore} • confidence {forecast.confidence}%</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-ink/10 bg-white/70 p-3 sm:p-4">
        <svg viewBox={`0 0 ${width} ${height + 26}`} className="h-[230px] w-full">
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = height - (tick / 100) * height;
            return (
              <g key={tick}>
                <line x1="0" x2={width} y1={y} y2={y} stroke="rgba(16,20,24,0.08)" strokeDasharray="4 6" />
                <text x="0" y={Math.max(10, y - 6)} fontSize="10" fill="rgba(16,20,24,0.45)">
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={loadPath} fill="none" stroke="#9a5f44" strokeWidth="2.5" opacity="0.65" />
          <path d={readinessPath} fill="none" stroke="#6d8a61" strokeWidth="3" opacity="0.85" />
          <path d={formPath} fill="none" stroke="#101418" strokeWidth="3.5" />
          <line x1={bestX} x2={bestX} y1="0" y2={height} stroke="rgba(41,67,58,0.4)" strokeDasharray="6 6" />

          {forecast.series.map((point, index) => {
            const x = forecast.series.length > 1 ? (index / (forecast.series.length - 1)) * width : width / 2;
            return (
              <text key={point.label} x={x} y={height + 18} textAnchor="middle" fontSize="10" fill="rgba(16,20,24,0.55)">
                {index % 2 === 0 ? point.label : ""}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink/60">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ink" />
          Form
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-moss" />
          Readiness
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-clay" />
          Load
        </span>
      </div>

      <p className="text-sm leading-6 text-ink/70">{forecast.rationale}</p>
    </Card>
  );
}
