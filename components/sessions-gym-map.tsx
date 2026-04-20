"use client";

import { SESSIONS_ZONES, type SessionsZoneId } from "@/lib/sessions-map";

function countLabel(count: number) {
  if (count <= 0) return "+";
  if (count > 99) return "99+";
  return String(count);
}

export function SessionsGymMap({
  selectedZoneId,
  onSelect,
  zoneCounts,
}: {
  selectedZoneId: SessionsZoneId | "";
  onSelect: (zoneId: SessionsZoneId) => void;
  zoneCounts: Partial<Record<SessionsZoneId, number>>;
}) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-ink/10 bg-[linear-gradient(180deg,#f9fafb_0%,#f4f7f7_100%)]">
      <svg viewBox="0 0 840 520" className="h-auto w-full">
        <defs>
          <filter id="zone-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        <rect x="0" y="0" width="840" height="520" fill="transparent" />

        {SESSIONS_ZONES.map((zone) => {
          const isActive = selectedZoneId === zone.id;
          const count = zoneCounts[zone.id] ?? 0;

          return (
            <g key={zone.id}>
              <path
                d={zone.path}
                filter="url(#zone-shadow)"
                className="cursor-pointer transition-all duration-200"
                fill={isActive ? "#244f48" : "#d5d6d5"}
                stroke={isActive ? "#0f2824" : "#c2d0de"}
                strokeWidth={isActive ? 4 : 3}
                onClick={() => onSelect(zone.id)}
              />
              <text
                x={zone.labelX}
                y={zone.labelY}
                textAnchor="middle"
                className="pointer-events-none select-none fill-current text-[16px] font-semibold"
                style={{ color: isActive ? "#f8f4ee" : "#111827" }}
              >
                {zone.label}
              </text>
              <g
                className="cursor-pointer"
                transform={`translate(${zone.badgeX}, ${zone.badgeY})`}
                onClick={() => onSelect(zone.id)}
              >
                <circle
                  cx="0"
                  cy="0"
                  r={count > 0 ? 26 : 22}
                  fill={isActive ? "#111827" : "#ffffff"}
                  stroke={isActive ? "#111827" : "#e5e7eb"}
                  strokeWidth="4"
                />
                <text
                  x="0"
                  y="7"
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-current text-[18px] font-semibold"
                  style={{ color: isActive ? "#f8f4ee" : count > 0 ? "#81889b" : "#244f48" }}
                >
                  {countLabel(count)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
