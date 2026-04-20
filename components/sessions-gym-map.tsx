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
    <div className="overflow-hidden rounded-[26px] border border-[#edf2f7] bg-[linear-gradient(180deg,#fbfbfc_0%,#f5f7fa_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <svg viewBox="0 0 840 520" className="h-auto w-full">
        <defs>
          <filter id="zone-shadow" x="-12%" y="-12%" width="124%" height="124%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#64748b" floodOpacity="0.12" />
          </filter>
          <filter id="badge-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#94a3b8" floodOpacity="0.22" />
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
                fill="none"
                stroke={isActive ? "#dbe9f7" : "#d5e3f2"}
                strokeLinejoin="round"
                strokeWidth={isActive ? 16 : 14}
                onClick={() => onSelect(zone.id)}
              />
              <path
                d={zone.path}
                className="cursor-pointer transition-all duration-200"
                fill={isActive ? "#415c57" : "#d6d6d6"}
                stroke={isActive ? "#dce9f4" : "#e4edf6"}
                strokeLinejoin="round"
                strokeWidth={isActive ? 4 : 3}
                onClick={() => onSelect(zone.id)}
              />
              <text
                x={zone.labelX}
                y={zone.labelY}
                textAnchor="middle"
                className="pointer-events-none select-none fill-current text-[15px] font-semibold"
                style={{ color: isActive ? "#f8f4ee" : "#101828" }}
              >
                {zone.label}
              </text>
              <g
                className="cursor-pointer"
                transform={`translate(${zone.badgeX}, ${zone.badgeY})`}
                filter="url(#badge-shadow)"
                onClick={() => onSelect(zone.id)}
              >
                <circle
                  cx="0"
                  cy="0"
                  r={count > 0 ? 26 : 22}
                  fill={isActive ? "#111827" : "#ffffff"}
                  stroke={isActive ? "#111827" : "#f3f4f6"}
                  strokeWidth="5"
                />
                <text
                  x="0"
                  y="7"
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-current text-[18px] font-semibold"
                  style={{ color: isActive ? "#f8f4ee" : "#8b92a6" }}
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
