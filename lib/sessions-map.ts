export const SESSIONS_GYM_NAME = "Sessions";

export type SessionsZoneId =
  | "zone-1"
  | "zone-2"
  | "zone-4"
  | "zone-5"
  | "zone-6"
  | "zone-7"
  | "zone-8"
  | "zone-9"
  | "zone-10"
  | "zone-11";

export type SessionsZoneDefinition = {
  id: SessionsZoneId;
  label: string;
  path: string;
  labelX: number;
  labelY: number;
  badgeX: number;
  badgeY: number;
};

export const SESSIONS_ZONES: SessionsZoneDefinition[] = [
  {
    id: "zone-1",
    label: "Zone 1",
    path: "M34 354 L94 348 L152 398 L104 444 L34 444 Z",
    labelX: 102,
    labelY: 402,
    badgeX: 92,
    badgeY: 330,
  },
  {
    id: "zone-2",
    label: "Zone 2",
    path: "M112 304 L196 294 L244 350 L228 426 L156 426 L110 376 Z",
    labelX: 172,
    labelY: 360,
    badgeX: 170,
    badgeY: 314,
  },
  {
    id: "zone-4",
    label: "Zone 4",
    path: "M30 142 L80 106 L150 124 L138 202 L88 222 L40 206 Z",
    labelX: 92,
    labelY: 178,
    badgeX: 108,
    badgeY: 116,
  },
  {
    id: "zone-5",
    label: "Zone 5",
    path: "M144 106 L494 108 L526 184 L474 184 L198 184 L144 164 Z",
    labelX: 302,
    labelY: 162,
    badgeX: 304,
    badgeY: 102,
  },
  {
    id: "zone-6",
    label: "Zone 6",
    path: "M474 184 L526 184 L552 242 L532 356 L470 324 L446 232 Z",
    labelX: 460,
    labelY: 236,
    badgeX: 472,
    badgeY: 184,
  },
  {
    id: "zone-7",
    label: "Zone 7",
    path: "M444 242 L526 242 L592 266 L560 420 L470 418 L418 360 Z",
    labelX: 548,
    labelY: 316,
    badgeX: 544,
    badgeY: 250,
  },
  {
    id: "zone-8",
    label: "Zone 8",
    path: "M594 266 L704 260 L650 432 L558 418 Z",
    labelX: 632,
    labelY: 362,
    badgeX: 616,
    badgeY: 288,
  },
  {
    id: "zone-9",
    label: "Zone 9",
    path: "M704 260 L796 262 L822 298 L820 360 L784 448 L702 474 L650 432 L730 392 Z",
    labelX: 740,
    labelY: 382,
    badgeX: 748,
    badgeY: 300,
  },
  {
    id: "zone-10",
    label: "Zone 10",
    path: "M586 182 L744 184 L794 262 L704 260 L594 266 L552 242 Z",
    labelX: 628,
    labelY: 250,
    badgeX: 614,
    badgeY: 202,
  },
  {
    id: "zone-11",
    label: "Zone 11",
    path: "M616 106 L808 106 L808 182 L712 170 L712 146 L616 146 Z",
    labelX: 700,
    labelY: 172,
    badgeX: 744,
    badgeY: 104,
  },
];

export function getSessionsZoneLabel(zoneId: string | null | undefined) {
  return SESSIONS_ZONES.find((zone) => zone.id === zoneId)?.label ?? null;
}
