"use client";

import { useState } from "react";
import type { Zone, Crop } from "@/lib/farm";

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

// Beds mapped from the farm layout image
const beds: BedDef[] = [
  // === TOP RIGHT — horizontal bed rows ===
  { id: "TR1", label: "TR1", x: 420, y: 70, w: 80, h: 20 },
  { id: "TR2", label: "TR2", x: 510, y: 70, w: 80, h: 20 },
  { id: "TR3", label: "TR3", x: 600, y: 70, w: 70, h: 20 },
  { id: "TR4", label: "TR4", x: 420, y: 100, w: 80, h: 20 },
  { id: "TR5", label: "TR5", x: 510, y: 100, w: 80, h: 20 },
  { id: "TR6", label: "TR6", x: 600, y: 100, w: 70, h: 20 },

  // Right side stacked beds
  { id: "R1", label: "R1", x: 520, y: 140, w: 160, h: 22 },
  { id: "R2", label: "R2", x: 520, y: 168, w: 160, h: 22 },
  { id: "R3", label: "R3", x: 520, y: 196, w: 160, h: 22 },
  { id: "R4", label: "R4", x: 520, y: 224, w: 160, h: 22 },
  { id: "R5", label: "R5", x: 520, y: 252, w: 160, h: 22 },
  { id: "R6", label: "R6", x: 520, y: 280, w: 150, h: 22 },
  { id: "R7", label: "R7", x: 520, y: 308, w: 140, h: 22 },
  { id: "R8", label: "R8", x: 530, y: 336, w: 120, h: 22 },

  // === TOP CENTER beds ===
  { id: "TC1", label: "TC1", x: 280, y: 110, w: 55, h: 30 },
  { id: "TC2", label: "TC2", x: 345, y: 110, w: 55, h: 30 },
  { id: "TC3", label: "TC3", x: 280, y: 150, w: 55, h: 30 },
  { id: "TC4", label: "TC4", x: 345, y: 150, w: 55, h: 30 },

  // === CENTER LEFT — beds near guava trees ===
  { id: "CL1", label: "CL1", x: 120, y: 240, w: 90, h: 30 },
  { id: "CL2", label: "CL2", x: 220, y: 240, w: 90, h: 30 },
  { id: "CL3", label: "CL3", x: 120, y: 280, w: 90, h: 30 },
  { id: "CL4", label: "CL4", x: 220, y: 280, w: 90, h: 30 },

  // === CENTER beds ===
  { id: "C1", label: "C1", x: 300, y: 290, w: 70, h: 28 },
  { id: "C2", label: "C2", x: 300, y: 325, w: 70, h: 28 },
  { id: "C3", label: "C3", x: 380, y: 290, w: 50, h: 28 },
  { id: "C4", label: "C4", x: 380, y: 325, w: 50, h: 28 },

  // === CENTER-LEFT small beds ===
  { id: "S1", label: "S1", x: 100, y: 340, w: 35, h: 25 },
  { id: "S2", label: "S2", x: 145, y: 340, w: 35, h: 25 },

  // === LOWER CENTER — angled/fan beds ===
  { id: "L1", label: "L1", x: 170, y: 430, w: 50, h: 28 },
  { id: "L2", label: "L2", x: 230, y: 430, w: 50, h: 28 },
  { id: "L3", label: "L3", x: 170, y: 465, w: 130, h: 22 },
  { id: "L4", label: "L4", x: 170, y: 493, w: 130, h: 22 },
  { id: "L5", label: "L5", x: 190, y: 521, w: 120, h: 22 },
  { id: "L6", label: "L6", x: 210, y: 549, w: 100, h: 22 },
  { id: "L7", label: "L7", x: 230, y: 577, w: 80, h: 22 },

  // === BOTTOM beds ===
  { id: "B1", label: "B1", x: 210, y: 660, w: 55, h: 40 },
  { id: "B2", label: "B2", x: 275, y: 660, w: 55, h: 40 },
  { id: "B3", label: "B3", x: 340, y: 660, w: 55, h: 40 },

  // === BOTTOM RIGHT — near entrance ===
  { id: "E1", label: "E1", x: 560, y: 500, w: 35, h: 30 },
  { id: "E2", label: "E2", x: 605, y: 500, w: 35, h: 30 },

  // === LEFT small beds ===
  { id: "LS1", label: "LS1", x: 85, y: 450, w: 30, h: 50, rotate: -15 },
  { id: "LS2", label: "LS2", x: 120, y: 440, w: 30, h: 40 },
];

const landmarks: LandmarkDef[] = [
  // Dashed rectangles (planned areas)
  { type: "dashed-rect", x: 40, y: 40, w: 100, h: 60 },
  { type: "dashed-rect", x: 20, y: 530, w: 50, h: 50 },
  { type: "dashed-rect", x: 450, y: 640, w: 60, h: 45 },

  // Trees (circles)
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

  // Labels
  { type: "label", x: 140, y: 320, label: "GUAVA\nTREES" },
  { type: "label", x: 530, y: 590, label: "LEMON-\nGRASS" },
  { type: "label", x: 510, y: 660, label: "ENTRANCE" },

  // Lemongrass plants
  { type: "circle", x: 510, y: 555, r: 10 },
  { type: "circle", x: 530, y: 575, r: 10 },
  { type: "circle", x: 510, y: 615, r: 10 },
];

type Props = {
  zones: Zone[];
  crops: Crop[];
  onSelectBed?: (bedId: string) => void;
};

export function FarmMap({ zones, crops, onSelectBed }: Props) {
  const [hoveredBed, setHoveredBed] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);

  // Try to match beds to zones by code
  function getZoneForBed(bedId: string): Zone | undefined {
    return zones.find(
      (z) =>
        z.code?.toUpperCase() === bedId.toUpperCase() ||
        z.name.toUpperCase() === bedId.toUpperCase()
    );
  }

  function getCropsForZone(zoneId: string): Crop[] {
    return crops.filter((c) => c.zone_id === zoneId);
  }

  function bedColor(bedId: string): string {
    const zone = getZoneForBed(bedId);
    if (!zone) return "#f4f4f5"; // zinc-100 — unmapped
    const zoneCrops = getCropsForZone(zone.id);
    if (zoneCrops.length === 0) return "#e4e4e7"; // zinc-200 — empty zone
    // Color by status of first crop
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

  const selected = selectedBed ? getZoneForBed(selectedBed) : null;
  const selectedCrops = selected ? getCropsForZone(selected.id) : [];

  return (
    <div>
      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white">
        <svg
          viewBox="0 0 740 730"
          className="w-full"
          style={{ minWidth: 500, maxHeight: 600 }}
        >
          {/* Background */}
          <rect width="740" height="730" fill="#fafaf9" />

          {/* Curved path / driveway */}
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

          {/* Landmarks */}
          {landmarks.map((lm, i) => {
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
                  fill="none"
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

          {/* Beds */}
          {beds.map((bed) => (
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
                rx="3"
                fill={bedColor(bed.id)}
                stroke={bedStroke(bed.id)}
                strokeWidth={selectedBed === bed.id ? 2 : 1.2}
              />
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
            </g>
          ))}

          {/* X mark from original layout */}
          <text x="410" y="200" textAnchor="middle" className="text-[14px] font-bold" fill="#71717a">
            x
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-zinc-300 bg-zinc-100" /> Unmapped
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-zinc-300 bg-sky-100" /> Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-zinc-300 bg-yellow-200" /> Planted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-zinc-300 bg-lime-200" /> Growing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-zinc-300 bg-green-200" /> Harvest ready
        </span>
      </div>

      {/* Selected bed info */}
      {selectedBed && (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
          <div className="font-medium">Bed {selectedBed}</div>
          {selected ? (
            <>
              <div className="text-zinc-500">
                Zone: {selected.name}
                {selected.size_acres ? ` · ${selected.size_acres} acres` : ""}
              </div>
              {selectedCrops.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {selectedCrops.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          c.status === "harvest_ready"
                            ? "bg-green-500"
                            : c.status === "growing"
                            ? "bg-lime-500"
                            : c.status === "planted" || c.status === "germinating"
                            ? "bg-yellow-500"
                            : "bg-sky-400"
                        }`}
                      />
                      <span>
                        {c.crop_name}
                        {c.variety ? ` · ${c.variety}` : ""}
                      </span>
                      <span className="text-zinc-400">{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-zinc-400">No crops in this zone</div>
              )}
            </>
          ) : (
            <div className="text-zinc-400">
              Not mapped to a zone yet. Create a zone with code &quot;{selectedBed}&quot; to link it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
