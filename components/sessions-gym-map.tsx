"use client";

import type { MouseEvent } from "react";
import { SESSIONS_ZONES, type SessionsZoneId } from "@/lib/sessions-map";

function countLabel(count: number) {
  if (count <= 0) return "+";
  if (count > 99) return "99+";
  return String(count);
}

type PlacedRoute = {
  id: string;
  gymZoneId: SessionsZoneId;
  title: string;
  grade: string;
  zoneMapX: number | null;
  zoneMapY: number | null;
};

export function SessionsGymMap({
  selectedZoneId,
  onSelect,
  zoneCounts,
  routes = [],
  selectedRouteId,
  placement,
  onPlacementChange,
  onRouteSelect,
}: {
  selectedZoneId: SessionsZoneId | "";
  onSelect: (zoneId: SessionsZoneId) => void;
  zoneCounts: Partial<Record<SessionsZoneId, number>>;
  routes?: PlacedRoute[];
  selectedRouteId?: string;
  placement?: { x: number; y: number } | null;
  onPlacementChange?: (coords: { x: number; y: number }) => void;
  onRouteSelect?: (routeId: string) => void;
}) {
  function coordsFromEvent(event: MouseEvent<SVGPathElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: ((event.clientX - rect.left) / rect.width) * 840,
      y: ((event.clientY - rect.top) / rect.height) * 520,
    };
  }

  function handleZoneClick(event: MouseEvent<SVGPathElement>, zoneId: SessionsZoneId) {
    const coords = coordsFromEvent(event);

    if (selectedZoneId === zoneId && onPlacementChange && coords) {
      onPlacementChange(coords);
      return;
    }

    onSelect(zoneId);
  }

  const visibleRoutes = routes.filter(
    (route) => route.gymZoneId === selectedZoneId && route.zoneMapX !== null && route.zoneMapY !== null,
  );

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
                onClick={(event) => handleZoneClick(event, zone.id)}
              />
              <path
                d={zone.path}
                className="cursor-pointer transition-all duration-200"
                fill={isActive ? "#415c57" : "#d6d6d6"}
                stroke={isActive ? "#dce9f4" : "#e4edf6"}
                strokeLinejoin="round"
                strokeWidth={isActive ? 4 : 3}
                onClick={(event) => handleZoneClick(event, zone.id)}
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
                  stroke={isActive ? "#111827" : "#dfe6ef"}
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

        {visibleRoutes.map((route) => {
          const isSelected = selectedRouteId === route.id;

          return (
            <g
              key={route.id}
              className="cursor-pointer"
              transform={`translate(${route.zoneMapX}, ${route.zoneMapY})`}
              onClick={(event) => {
                event.stopPropagation();
                onRouteSelect?.(route.id);
              }}
            >
              <circle
                cx="0"
                cy="0"
                r={isSelected ? 12 : 9}
                fill={isSelected ? "#f97316" : "#0f172a"}
                stroke="#ffffff"
                strokeWidth="3"
              />
              <circle
                cx="0"
                cy="0"
                r="3"
                fill="#ffffff"
              />
            </g>
          );
        })}

        {selectedZoneId && placement ? (
          <g transform={`translate(${placement.x}, ${placement.y})`} className="pointer-events-none">
            <circle cx="0" cy="0" r="10" fill="#dc6803" stroke="#ffffff" strokeWidth="3" />
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
