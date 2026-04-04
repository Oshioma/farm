"use client";

import { useState } from "react";
import type { Zone, Crop, FertilisationEntry, CompostEntry } from "@/lib/farm";

type BedDef = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  zone?: string; // matches zone code or name
};

type LandmarkDef = {
  type: "circle" | "dashed-rect" | "label" | "path";
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  label?: string;
  d?: string;
};

type FarmLayout = {
  viewBox: string;
  minWidth: number;
  beds: BedDef[];
  landmarks: LandmarkDef[];
  extraSvg?: React.ReactNode;
};

// ── Mount Solomun layout ──
const mountSolBeds: BedDef[] = [
  { id: "TR1", label: "TR1", x: 420, y: 70, w: 80, h: 20 },
  { id: "TR2", label: "TR2", x: 510, y: 70, w: 80, h: 20 },
  { id: "TR3", label: "TR3", x: 600, y: 70, w: 70, h: 20 },
  { id: "TR4", label: "TR4", x: 420, y: 100, w: 80, h: 20 },
  { id: "TR5", label: "TR5", x: 510, y: 100, w: 80, h: 20 },
  { id: "TR6", label: "TR6", x: 600, y: 100, w: 70, h: 20 },
  { id: "R1", label: "R1", x: 520, y: 140, w: 160, h: 22 },
  { id: "R2", label: "R2", x: 520, y: 168, w: 160, h: 22 },
  { id: "R3", label: "R3", x: 520, y: 196, w: 160, h: 22 },
  { id: "R4", label: "R4", x: 520, y: 224, w: 160, h: 22 },
  { id: "R5", label: "R5", x: 520, y: 252, w: 160, h: 22 },
  { id: "R6", label: "R6", x: 520, y: 280, w: 150, h: 22 },
  { id: "R7", label: "R7", x: 520, y: 308, w: 140, h: 22 },
  { id: "R8", label: "R8", x: 530, y: 336, w: 120, h: 22 },
  { id: "TC1", label: "TC1", x: 280, y: 110, w: 55, h: 30 },
  { id: "TC2", label: "TC2", x: 345, y: 110, w: 55, h: 30 },
  { id: "TC3", label: "TC3", x: 280, y: 150, w: 55, h: 30 },
  { id: "TC4", label: "TC4", x: 345, y: 150, w: 55, h: 30 },
  { id: "CL1", label: "CL1", x: 120, y: 240, w: 90, h: 30 },
  { id: "CL2", label: "CL2", x: 220, y: 240, w: 90, h: 30 },
  { id: "CL3", label: "CL3", x: 120, y: 280, w: 90, h: 30 },
  { id: "CL4", label: "CL4", x: 220, y: 280, w: 90, h: 30 },
  { id: "C1", label: "C1", x: 300, y: 290, w: 70, h: 28 },
  { id: "C2", label: "C2", x: 300, y: 325, w: 70, h: 28 },
  { id: "C3", label: "C3", x: 380, y: 290, w: 50, h: 28 },
  { id: "C4", label: "C4", x: 380, y: 325, w: 50, h: 28 },
  { id: "S1", label: "S1", x: 100, y: 340, w: 35, h: 25 },
  { id: "S2", label: "S2", x: 145, y: 340, w: 35, h: 25 },
  { id: "L1", label: "L1", x: 170, y: 430, w: 50, h: 28 },
  { id: "L2", label: "L2", x: 230, y: 430, w: 50, h: 28 },
  { id: "L3", label: "L3", x: 170, y: 465, w: 130, h: 22 },
  { id: "L4", label: "L4", x: 170, y: 493, w: 130, h: 22 },
  { id: "L5", label: "L5", x: 190, y: 521, w: 120, h: 22 },
  { id: "L6", label: "L6", x: 210, y: 549, w: 100, h: 22 },
  { id: "L7", label: "L7", x: 230, y: 577, w: 80, h: 22 },
  { id: "B1", label: "B1", x: 210, y: 660, w: 55, h: 40 },
  { id: "B2", label: "B2", x: 275, y: 660, w: 55, h: 40 },
  { id: "B3", label: "B3", x: 340, y: 660, w: 55, h: 40 },
  { id: "E1", label: "E1", x: 560, y: 500, w: 35, h: 30 },
  { id: "E2", label: "E2", x: 605, y: 500, w: 35, h: 30 },
  { id: "LS1", label: "LS1", x: 85, y: 450, w: 30, h: 50, rotate: -15 },
  { id: "LS2", label: "LS2", x: 120, y: 440, w: 30, h: 40 },
];

const mountSolLandmarks: LandmarkDef[] = [
  { type: "dashed-rect", x: 40, y: 40, w: 100, h: 60 },
  { type: "dashed-rect", x: 20, y: 530, w: 50, h: 50 },
  { type: "dashed-rect", x: 450, y: 640, w: 60, h: 45 },
  { type: "circle", x: 55, y: 200, r: 10 },
  { type: "circle", x: 680, y: 80, r: 8 },
  { type: "circle", x: 680, y: 140, r: 8 },
  { type: "circle", x: 680, y: 200, r: 8 },
  { type: "circle", x: 430, y: 220, r: 10 },
  { type: "circle", x: 300, y: 410, r: 8 },
  { type: "circle", x: 480, y: 400, r: 18 },
  { type: "circle", x: 130, y: 660, r: 25 },
  { type: "circle", x: 540, y: 470, r: 8 },
  { type: "circle", x: 620, y: 470, r: 8 },
  { type: "circle", x: 660, y: 520, r: 8 },
  { type: "label", x: 140, y: 320, label: "GUAVA\nTREES" },
  { type: "label", x: 530, y: 590, label: "LEMON-\nGRASS" },
  { type: "label", x: 510, y: 660, label: "ENTRANCE" },
  { type: "circle", x: 510, y: 555, r: 10 },
  { type: "circle", x: 530, y: 575, r: 10 },
  { type: "circle", x: 510, y: 615, r: 10 },
];

// ── Top Land layout ──
// Syntropic rows: vertical planting rows running north-south
// The layout is wider than tall (~45m wide x 40m deep)
const topLandBeds: BedDef[] = [
  // === Section A — rows A1–A5 ===
  { id: "A1", label: "A1", x: 310, y: 30, w: 14, h: 520 },
  { id: "A2", label: "A2", x: 332, y: 30, w: 14, h: 520 },
  { id: "A3", label: "A3", x: 354, y: 30, w: 14, h: 520 },
  { id: "A4", label: "A4", x: 384, y: 30, w: 14, h: 520 },
  { id: "A5", label: "A5", x: 414, y: 30, w: 14, h: 520 },

  // === Section B — rows B1–B5 ===
  { id: "B1", label: "B1", x: 452, y: 30, w: 14, h: 520 },
  { id: "B2", label: "B2", x: 474, y: 30, w: 14, h: 520 },
  { id: "B3", label: "B3", x: 496, y: 30, w: 14, h: 520 },
  { id: "B4", label: "B4", x: 526, y: 30, w: 14, h: 470 },
  { id: "B5", label: "B5", x: 556, y: 30, w: 14, h: 470 },

  // === Section C — rows C1–C5 ===
  { id: "C1", label: "C1", x: 680, y: 30, w: 14, h: 540 },
  { id: "C2", label: "C2", x: 706, y: 30, w: 14, h: 540 },
  { id: "C3", label: "C3", x: 732, y: 30, w: 14, h: 540 },
  { id: "C4", label: "C4", x: 758, y: 30, w: 14, h: 540 },
  { id: "C5", label: "C5", x: 784, y: 30, w: 14, h: 540 },

  // === Section D — rows D1–D5 ===
  { id: "D1", label: "D1", x: 830, y: 30, w: 14, h: 540 },
  { id: "D2", label: "D2", x: 856, y: 30, w: 14, h: 540 },
  { id: "D3", label: "D3", x: 882, y: 30, w: 14, h: 540 },
  { id: "D4", label: "D4", x: 916, y: 30, w: 14, h: 540 },
  { id: "D5", label: "D5", x: 946, y: 30, w: 14, h: 540 },
];

const topLandLandmarks: LandmarkDef[] = [
  // Upper-left large paddock (outer)
  { type: "dashed-rect", x: 30, y: 50, w: 240, h: 170 },
  // Upper-left large paddock (inner)
  { type: "dashed-rect", x: 40, y: 70, w: 220, h: 130 },

  // Middle-left paddock
  { type: "dashed-rect", x: 30, y: 300, w: 170, h: 110 },

  // Center structure (between B5 and C1)
  { type: "dashed-rect", x: 590, y: 260, w: 70, h: 60 },

  // Tree (bottom left)
  { type: "circle", x: 50, y: 510, r: 18 },

  // Height markers
  { type: "label", x: 276, y: 48, label: "40M" },
  { type: "label", x: 276, y: 108, label: "35M" },
  { type: "label", x: 276, y: 168, label: "30M" },
  { type: "label", x: 276, y: 268, label: "25M" },
  { type: "label", x: 276, y: 328, label: "20M" },
  { type: "label", x: 276, y: 388, label: "15M" },
  { type: "label", x: 276, y: 448, label: "10M" },
  { type: "label", x: 276, y: 508, label: "5M" },

  // PA label (planting area, right side)
  { type: "label", x: 820, y: 395, label: "PA" },
  // PL label (bottom right)
  { type: "label", x: 950, y: 570, label: "PL" },
];

function getLayout(farmName?: string): FarmLayout {
  const isTopLand = farmName?.toLowerCase().includes("top land");
  if (isTopLand) {
    return {
      viewBox: "0 0 980 600",
      minWidth: 500,
      beds: topLandBeds,
      landmarks: topLandLandmarks,
    };
  }
  return {
    viewBox: "0 0 740 730",
    minWidth: 400,
    beds: mountSolBeds,
    landmarks: mountSolLandmarks,
    extraSvg: (
      <>
        <path
          d="M 660,540 Q 580,580 450,620 Q 350,650 200,640 Q 140,635 100,620"
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="4"
          strokeDasharray="8,4"
        />
        <path
          d="M 660,540 L 700,580"
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="4"
        />
        <text x="410" y="200" textAnchor="middle" className="text-[14px] font-bold" fill="#71717a">
          x
        </text>
      </>
    ),
  };
}

type Props = {
  zones: Zone[];
  crops: Crop[];
  fertilisations?: FertilisationEntry[];
  compostEntries?: CompostEntry[];
  farmName?: string;
  onSelectBed?: (bedId: string) => void;
};

export function FarmMap({ zones, crops, fertilisations = [], compostEntries = [], farmName, onSelectBed }: Props) {
  const [hoveredBed, setHoveredBed] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);

  const layout = getLayout(farmName);

  // Try to match beds to zones by code
  function getZoneForBed(bedId: string): Zone | undefined {
    const id = bedId.toUpperCase();
    return zones.find(
      (z) => {
        const code = z.code?.toUpperCase() ?? "";
        const name = z.name.toUpperCase();
        return code === id || name === id ||
          code.replace(/^ROW\s*/i, "") === id ||
          name.replace(/^ROW\s*/i, "") === id;
      }
    );
  }

  function getCropsForZone(zoneId: string): Crop[] {
    return crops.filter((c) => c.zone_id === zoneId);
  }

  function getFertilisationsForZone(zoneId: string): FertilisationEntry[] {
    return fertilisations
      .filter((f) => f.zone_id === zoneId)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  function getCompostForZone(zoneId: string): CompostEntry[] {
    return compostEntries
      .filter((c) => c.zone_id === zoneId)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  function fmtDate(d: string | null) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  function bedColor(bedId: string): string {
    const zone = getZoneForBed(bedId);
    if (!zone) return "#f4f4f5"; // zinc-100 — unmapped
    const zoneCrops = getCropsForZone(zone.id);
    if (zoneCrops.length === 0) return "#e4e4e7"; // zinc-200 — empty zone
    const status = zoneCrops[0].status;
    if (status === "harvest_ready") return "#bbf7d0"; // green-200
    if (status === "growing") return "#d9f99d"; // lime-200
    if (status === "planted" || status === "germinating") return "#fef08a"; // yellow-200
    return "#e0f2fe"; // sky-100 — planned
  }

  function bedStroke(bedId: string): string {
    if (selectedBed === bedId) return "#18181b"; // zinc-900
    if (hoveredBed === bedId) return "#52525b"; // zinc-600
    const zone = getZoneForBed(bedId);
    return zone ? "#a1a1aa" : "#d4d4d8"; // zinc-400 : zinc-300
  }

  // For vertical rows, render label rotated
  const isVerticalLayout = farmName?.toLowerCase().includes("top land");

  const selected = selectedBed ? getZoneForBed(selectedBed) : null;
  const selectedCrops = selected ? getCropsForZone(selected.id) : [];
  const selectedFertilisations = selected ? getFertilisationsForZone(selected.id) : [];
  const selectedCompost = selected ? getCompostForZone(selected.id) : [];

  return (
    <div>
      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 overflow-auto rounded-2xl border border-zinc-200 bg-white">
          <svg
            viewBox={layout.viewBox}
            className="w-full"
            style={{ minWidth: layout.minWidth }}
          >
          {/* Background */}
          <rect width="100%" height="100%" fill="#fafaf9" />

          {/* Farm-specific extra SVG (e.g. driveway for Mount Sol) */}
          {layout.extraSvg}

          {/* Landmarks */}
          {layout.landmarks.map((lm, i) => {
            if (lm.type === "dashed-rect") {
              return (
                <rect
                  key={i}
                  x={lm.x}
                  y={lm.y}
                  width={lm.w}
                  height={lm.h}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  rx="3"
                />
              );
            }
            if (lm.type === "circle") {
              return (
                <circle
                  key={i}
                  cx={lm.x}
                  cy={lm.y}
                  r={lm.r}
                  fill={lm.label === "tree-filled" ? "#92400e" : "none"}
                  stroke="#a1a1aa"
                  strokeWidth="1.2"
                />
              );
            }
            if (lm.type === "label") {
              const lines = (lm.label ?? "").split("\n");
              return (
                <text
                  key={i}
                  x={lm.x}
                  y={lm.y}
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  fill="#71717a"
                >
                  {lines.map((line, li) => (
                    <tspan key={li} x={lm.x} dy={li === 0 ? 0 : 14}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            }
            return null;
          })}

          {/* Brown filled tree for Top Land */}
          {isVerticalLayout && (
            <circle cx={50} cy={510} r={18} fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
          )}

          {/* Beds */}
          {layout.beds.map((bed) => (
            <g
              key={bed.id}
              transform={
                bed.rotate
                  ? `rotate(${bed.rotate}, ${bed.x + bed.w / 2}, ${bed.y + bed.h / 2})`
                  : undefined
              }
              onClick={() => {
                setSelectedBed(selectedBed === bed.id ? null : bed.id);
                onSelectBed?.(bed.id);
              }}
              onMouseEnter={() => setHoveredBed(bed.id)}
              onMouseLeave={() => setHoveredBed(null)}
              className="cursor-pointer"
            >
              <rect
                x={bed.x}
                y={bed.y}
                width={bed.w}
                height={bed.h}
                rx="2"
                fill={bedColor(bed.id)}
                stroke={bedStroke(bed.id)}
                strokeWidth={selectedBed === bed.id ? 2 : 1.2}
              />
              {isVerticalLayout ? (
                // Vertical rows: label at the top, horizontal
                <text
                  x={bed.x + bed.w / 2}
                  y={bed.y - 6}
                  textAnchor="middle"
                  className="pointer-events-none text-[9px] font-semibold"
                  fill="#52525b"
                >
                  {bed.label}
                </text>
              ) : (
                <text
                  x={bed.x + bed.w / 2}
                  y={bed.y + bed.h / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none text-[8px] font-medium"
                  fill="#52525b"
                >
                  {bed.label}
                </text>
              )}
            </g>
          ))}
        </svg>
        </div>

        {/* Side panel — bed info */}
        <div className="w-56 shrink-0 space-y-3">
          {selectedBed ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              <div className="text-lg font-semibold">{isVerticalLayout ? "Row" : "Bed"} {selectedBed}</div>
              {selected ? (
                <>
                  <div className="mt-1 text-zinc-500">
                    Zone: {selected.name}
                    {selected.size_acres ? ` · ${selected.size_acres} ac` : ""}
                  </div>
                  {selectedCrops.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {selectedCrops.map((c) => (
                        <div key={c.id} className="rounded-xl border border-zinc-100 p-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${
                                c.status === "harvest_ready"
                                  ? "bg-green-500"
                                  : c.status === "growing"
                                  ? "bg-lime-500"
                                  : c.status === "planted" || c.status === "germinating"
                                  ? "bg-yellow-500"
                                  : "bg-sky-400"
                              }`}
                            />
                            <span className="font-medium">
                              {c.crop_name}
                              {c.variety ? ` · ${c.variety}` : ""}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-zinc-400 capitalize">{c.status}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-zinc-400">No crops in this zone</div>
                  )}
                  {selectedFertilisations.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Fertiliser</div>
                      <div className="mt-1.5 space-y-1.5">
                        {selectedFertilisations.map((f) => (
                          <div key={f.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-medium text-amber-800">{f.fertiliser}</span>
                              <span className="text-[10px] text-amber-600">{fmtDate(f.date)}</span>
                            </div>
                            {f.notes && <div className="mt-0.5 text-[10px] text-amber-600/70">{f.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCompost.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Compost</div>
                      <div className="mt-1.5 space-y-1.5">
                        {selectedCompost.map((c) => (
                          <div key={c.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-medium text-emerald-800">{c.compost_type ?? "Compost"}</span>
                              <span className="text-[10px] text-emerald-600">{fmtDate(c.date)}</span>
                            </div>
                            {c.materials_used && <div className="mt-0.5 text-[10px] text-emerald-600/70">{c.materials_used}</div>}
                            {c.notes && <div className="mt-0.5 text-[10px] text-emerald-600/70">{c.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-2 text-xs text-zinc-400">
                  Not mapped to a zone. Create a zone with code &quot;{selectedBed}&quot; to link it.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
              Click a {isVerticalLayout ? "row" : "bed"} on the map to see details
            </div>
          )}

          {/* Legend */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-zinc-500">Legend</div>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-zinc-100" /> Unmapped
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-sky-100" /> Planned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-yellow-200" /> Planted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-lime-200" /> Growing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-green-200" /> Harvest ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
