"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SeedlingEntry } from "@/lib/farm";

type ZoneDef = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type TrayDef = {
  id: string;
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zoneId?: string;
};

// ── localStorage helpers ──
function storageKey(farmName: string) {
  return `seedling-map-layout:${farmName}`;
}

function saveLocal(farmName: string, zones: ZoneDef[], trays: TrayDef[]) {
  try {
    localStorage.setItem(storageKey(farmName), JSON.stringify({ zones, trays }));
  } catch { /* quota exceeded – ignore */ }
}

function loadLocal(farmName: string): { zones: ZoneDef[]; trays: TrayDef[] } | null {
  try {
    const raw = localStorage.getItem(storageKey(farmName));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

const VIEW_BOX = "0 0 800 600";
const MIN_WIDTH = 400;

type Props = {
  seedlings?: SeedlingEntry[];
  farmName?: string;
  farmId?: string;
};

type DragMode =
  | { kind: "zone-move"; id: string; offsetX: number; offsetY: number }
  | { kind: "zone-resize"; id: string }
  | { kind: "tray-move"; id: string; offsetX: number; offsetY: number }
  | { kind: "tray-resize"; id: string }
  | null;

export function SeedlingMap({ seedlings = [], farmName, farmId }: Props) {
  const [zones, setZones] = useState<ZoneDef[]>([]);
  const [trays, setTrays] = useState<TrayDef[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedTray, setSelectedTray] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [hoveredTray, setHoveredTray] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragMode>(null);

  const [addingZone, setAddingZone] = useState(false);
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const [addingTray, setAddingTray] = useState(false);
  const [newTrayCode, setNewTrayCode] = useState("");
  const [saving, setSaving] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Load layout from database or localStorage
  useEffect(() => {
    if (!farmName) return;

    const load = async () => {
      if (farmId && farmId !== "undefined") {
        try {
          const response = await fetch(`/api/seedling-map/load?farm_id=${farmId}`);
          const result = await response.json();
          if (response.ok && result.data) {
            const z = Array.isArray(result.data.zones) ? result.data.zones : [];
            const t = Array.isArray(result.data.trays) ? result.data.trays : [];
            if (z.length > 0 || t.length > 0) {
              console.log("[SeedlingMap] Loaded layout from database for farm:", farmId);
              setZones(z);
              setTrays(t);
              return;
            }
          }
        } catch (err) {
          console.error("[SeedlingMap] Failed to load from database:", err);
        }
      }

      const saved = loadLocal(farmName);
      if (saved) {
        console.log("[SeedlingMap] Loaded layout from localStorage for farm:", farmName);
        setZones(saved.zones ?? []);
        setTrays(saved.trays ?? []);
      } else {
        setZones([]);
        setTrays([]);
      }
    };

    setEditMode(false);
    setSelectedTray(null);
    setSelectedZone(null);
    load();
  }, [farmName, farmId]);

  // ── SVG coordinate helpers ──
  function svgPoint(e: React.MouseEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(ctm.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  // ── Save / Cancel ──
  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    // Exit edit mode immediately so the button feels responsive; the DB write
    // continues in the background and we keep the local state as source of truth.
    if (farmName) saveLocal(farmName, zones, trays);
    setEditMode(false);

    if (farmId && farmId !== "undefined") {
      try {
        const response = await fetch(`/api/seedling-map/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farm_id: farmId, zones, trays }),
        });
        if (!response.ok) {
          console.error("[SeedlingMap] Failed to save to database:", await response.text());
        } else {
          console.log("[SeedlingMap] Saved layout to database");
        }
      } catch (err) {
        console.error("[SeedlingMap] Error saving to database:", err);
      }
    }

    setSaving(false);
  }

  function cancelEdit() {
    // Reload from source of truth
    if (farmName) {
      const saved = loadLocal(farmName);
      if (saved) {
        setZones(saved.zones ?? []);
        setTrays(saved.trays ?? []);
      }
    }
    setEditMode(false);
  }

  // ── Zone handlers ──
  const handleZoneDown = useCallback((zoneId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    const pt = svgPoint(e);
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    setDrag({ kind: "zone-move", id: zoneId, offsetX: pt.x - zone.x, offsetY: pt.y - zone.y });
    setSelectedZone(zoneId);
    setSelectedTray(null);
  }, [editMode, zones]);

  const handleZoneResizeDown = useCallback((zoneId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setDrag({ kind: "zone-resize", id: zoneId });
  }, [editMode]);

  // ── Tray handlers ──
  const handleTrayDown = useCallback((trayId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    const pt = svgPoint(e);
    const tray = trays.find((t) => t.id === trayId);
    if (!tray) return;
    setDrag({ kind: "tray-move", id: trayId, offsetX: pt.x - tray.x, offsetY: pt.y - tray.y });
    setSelectedTray(trayId);
    setSelectedZone(null);
  }, [editMode, trays]);

  const handleTrayResizeDown = useCallback((trayId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setDrag({ kind: "tray-resize", id: trayId });
  }, [editMode]);

  // ── Mouse move / up ──
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editMode || !drag) return;
    const pt = svgPoint(e);

    if (drag.kind === "zone-move") {
      setZones((prev) =>
        prev.map((z) =>
          z.id === drag.id
            ? { ...z, x: Math.round(pt.x - drag.offsetX), y: Math.round(pt.y - drag.offsetY) }
            : z
        )
      );
    } else if (drag.kind === "zone-resize") {
      setZones((prev) =>
        prev.map((z) => {
          if (z.id !== drag.id) return z;
          const newW = Math.max(40, Math.round(pt.x - z.x));
          const newH = Math.max(40, Math.round(pt.y - z.y));
          return { ...z, w: newW, h: newH };
        })
      );
    } else if (drag.kind === "tray-move") {
      setTrays((prev) =>
        prev.map((t) =>
          t.id === drag.id
            ? { ...t, x: Math.round(pt.x - drag.offsetX), y: Math.round(pt.y - drag.offsetY) }
            : t
        )
      );
    } else if (drag.kind === "tray-resize") {
      setTrays((prev) =>
        prev.map((t) => {
          if (t.id !== drag.id) return t;
          const newW = Math.max(15, Math.round(pt.x - t.x));
          const newH = Math.max(12, Math.round(pt.y - t.y));
          return { ...t, w: newW, h: newH };
        })
      );
    }
  }, [editMode, drag]);

  const handleMouseUp = useCallback(() => {
    // When finishing a tray move, auto-assign zoneId based on containment
    if (drag?.kind === "tray-move") {
      setTrays((prev) =>
        prev.map((t) => {
          if (t.id !== drag.id) return t;
          const centerX = t.x + t.w / 2;
          const centerY = t.y + t.h / 2;
          const container = zones.find(
            (z) => centerX >= z.x && centerX <= z.x + z.w && centerY >= z.y && centerY <= z.y + z.h
          );
          return { ...t, zoneId: container?.id };
        })
      );
    }
    setDrag(null);
  }, [drag, zones]);

  // ── Add / delete ──
  function addZone() {
    if (!newZoneLabel.trim()) return;
    const id = `Z${Date.now().toString(36)}`;
    setZones((prev) => [
      ...prev,
      { id, label: newZoneLabel.trim(), x: 80, y: 80, w: 200, h: 160 },
    ]);
    setNewZoneLabel("");
    setAddingZone(false);
  }

  function deleteZone(zoneId: string) {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    // Unlink any trays that were tied to this zone
    setTrays((prev) => prev.map((t) => (t.zoneId === zoneId ? { ...t, zoneId: undefined } : t)));
    if (selectedZone === zoneId) setSelectedZone(null);
  }

  function addTray() {
    if (!newTrayCode.trim()) return;
    const code = newTrayCode.trim().toUpperCase().replace(/\s+/g, "");
    if (trays.find((t) => t.code === code)) return;
    const id = `T${Date.now().toString(36)}`;
    // Place inside selected zone if one is selected, else at (120,120)
    const parent = selectedZone ? zones.find((z) => z.id === selectedZone) : undefined;
    const x = parent ? parent.x + 10 : 120;
    const y = parent ? parent.y + 10 : 120;
    setTrays((prev) => [
      ...prev,
      { id, code, x, y, w: 110, h: 80, zoneId: parent?.id },
    ]);
    setNewTrayCode("");
    setAddingTray(false);
  }

  function deleteTray(trayId: string) {
    setTrays((prev) => prev.filter((t) => t.id !== trayId));
    if (selectedTray === trayId) setSelectedTray(null);
  }

  // ── Lookups for side panel ──
  function seedlingsForCode(code: string): SeedlingEntry[] {
    const c = code.toUpperCase();
    return seedlings.filter(
      (s) => (s.row_location ?? "").toUpperCase() === c
    );
  }

  function seedlingsForZone(zoneId: string): SeedlingEntry[] {
    const zoneTrays = trays.filter((t) => t.zoneId === zoneId);
    const codes = new Set(zoneTrays.map((t) => t.code.toUpperCase()));
    return seedlings.filter((s) => codes.has((s.row_location ?? "").toUpperCase()));
  }

  const selectedTrayObj = selectedTray ? trays.find((t) => t.id === selectedTray) ?? null : null;
  const selectedZoneObj = selectedZone ? zones.find((z) => z.id === selectedZone) ?? null : null;
  const selectedTraySeedlings = selectedTrayObj ? seedlingsForCode(selectedTrayObj.code) : [];
  const selectedZoneSeedlings = selectedZoneObj ? seedlingsForZone(selectedZoneObj.id) : [];

  const isBlank = zones.length === 0 && trays.length === 0;

  return (
    <div>
      {/* ── Edit toolbar (sticky so it's always reachable on tall maps) ── */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2 flex-wrap bg-white/95 px-4 py-2 shadow-sm backdrop-blur sm:-mx-6 sm:px-6">
        {editMode ? (
          <>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Layout"}
            </button>
            <button onClick={cancelEdit} className="rounded-xl bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300">
              Cancel
            </button>
            <div className="h-5 w-px bg-zinc-300" />
            {addingZone ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newZoneLabel}
                  onChange={(e) => setNewZoneLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addZone()}
                  placeholder="Zone name (e.g. Nursery)"
                  className="w-44 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
                <button onClick={addZone} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">Add</button>
                <button onClick={() => setAddingZone(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingZone(true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                + Add Seedling Zone
              </button>
            )}
            {addingTray ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTrayCode}
                  onChange={(e) => setNewTrayCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTray()}
                  placeholder="Tray code (e.g. T1)"
                  className="w-36 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
                <button onClick={addTray} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">Add</button>
                <button onClick={() => setAddingTray(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingTray(true)} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Add Tray
              </button>
            )}
          </>
        ) : (
          <button onClick={() => setEditMode(true)} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Edit Map
          </button>
        )}
      </div>

      {/* Blank prompt */}
      {isBlank && !editMode && (
        <div className="mb-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-600">No seedling map yet</p>
          <p className="mt-1 text-sm text-zinc-400">Click Edit Map to draw your seedling zones and add trays inside them.</p>
          <button
            onClick={() => setEditMode(true)}
            className="mt-4 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Start drawing
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Map */}
        <div className={`min-w-0 flex-1 overflow-auto rounded-2xl border bg-white ${editMode ? "border-blue-400 ring-2 ring-blue-100" : "border-zinc-200"}`}>
          {editMode && (
            <div className="bg-blue-50 px-3 py-1.5 text-xs text-blue-700 border-b border-blue-200">
              Drag zones &amp; trays to move them. Drag corners to resize. Drop a tray inside a zone to link it.
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox={VIEW_BOX}
            className={`w-full ${editMode ? "cursor-crosshair" : ""}`}
            style={{ minWidth: MIN_WIDTH }}
            onMouseMove={editMode ? handleMouseMove : undefined}
            onMouseUp={editMode ? handleMouseUp : undefined}
            onMouseLeave={editMode ? handleMouseUp : undefined}
          >
            {/* Background */}
            <rect width="100%" height="100%" fill="#fafaf9" />

            {/* Zones (drawn first so trays render on top) */}
            {zones.map((zone) => {
              const isSel = selectedZone === zone.id;
              return (
                <g
                  key={zone.id}
                  onMouseDown={editMode ? (e) => handleZoneDown(zone.id, e) : undefined}
                  onClick={() => {
                    if (editMode) return;
                    setSelectedZone(selectedZone === zone.id ? null : zone.id);
                    setSelectedTray(null);
                  }}
                  className={editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                >
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx="6"
                    fill="rgba(16,185,129,0.08)"
                    stroke={isSel ? "#059669" : editMode ? "#10b981" : "#6ee7b7"}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    strokeDasharray="6,4"
                  />
                  <text
                    x={zone.x + 8}
                    y={zone.y + 18}
                    className="pointer-events-none text-[12px] font-semibold uppercase tracking-wider"
                    fill="#047857"
                  >
                    {zone.label}
                  </text>
                  {editMode && (
                    <rect
                      x={zone.x + zone.w - 8}
                      y={zone.y + zone.h - 8}
                      width={10}
                      height={10}
                      rx="1"
                      fill="#059669"
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleZoneResizeDown(zone.id, e)}
                    />
                  )}
                </g>
              );
            })}

            {/* Trays */}
            {trays.map((tray) => {
              const isSel = selectedTray === tray.id;
              // Larger cells (~4× previous size) so grid lines are visible and legible
              const cols = Math.max(2, Math.round(tray.w / 28));
              const rows = Math.max(2, Math.round(tray.h / 24));
              const cellW = tray.w / cols;
              const cellH = tray.h / rows;

              // Plant name from linked seedlings (latest entry wins)
              const linked = seedlingsForCode(tray.code);
              const latest = linked[linked.length - 1];
              const plantLabel = latest
                ? `${latest.plant}${latest.variety ? ` · ${latest.variety}` : ""}`
                : "";

              // Wrap plant label to fit the tray width (~6px per char at 11px font)
              const maxChars = Math.max(4, Math.floor((tray.w - 6) / 6));
              const lines: string[] = [];
              if (plantLabel) {
                const words = plantLabel.split(/\s+/);
                let current = "";
                for (const word of words) {
                  if (!current) current = word;
                  else if ((current + " " + word).length <= maxChars) current = current + " " + word;
                  else { lines.push(current); current = word; }
                }
                if (current) lines.push(current);
              }
              const lineHeight = 13;
              const labelTotal = lines.length * lineHeight;
              const labelStartY = tray.y + tray.h / 2 - labelTotal / 2 + lineHeight * 0.75;

              return (
                <g
                  key={tray.id}
                  onMouseDown={editMode ? (e) => handleTrayDown(tray.id, e) : undefined}
                  onClick={() => {
                    if (editMode) {
                      setSelectedTray(selectedTray === tray.id ? null : tray.id);
                      setSelectedZone(null);
                      return;
                    }
                    setSelectedTray(selectedTray === tray.id ? null : tray.id);
                    setSelectedZone(null);
                  }}
                  onMouseEnter={() => setHoveredTray(tray.id)}
                  onMouseLeave={() => setHoveredTray(null)}
                  className={editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                >
                  {/* Tray outer rim (slightly raised) */}
                  <rect
                    x={tray.x}
                    y={tray.y}
                    width={tray.w}
                    height={tray.h}
                    rx="3"
                    fill="#0a0a0a"
                    stroke={editMode && isSel ? "#3b82f6" : isSel ? "#fafafa" : "#52525b"}
                    strokeWidth={isSel ? 1.8 : 1.2}
                    strokeDasharray={editMode ? "4,2" : undefined}
                  />
                  {/* Inset — inner floor of the tray */}
                  <rect
                    x={tray.x + 2}
                    y={tray.y + 2}
                    width={tray.w - 4}
                    height={tray.h - 4}
                    rx="2"
                    fill="#18181b"
                    pointerEvents="none"
                  />
                  {/* Individual cells — rounded rects laid out in a grid */}
                  {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: cols }, (_, c) => {
                      const pad = 1.5;
                      const cx = tray.x + 3 + c * ((tray.w - 6) / cols) + pad;
                      const cy = tray.y + 3 + r * ((tray.h - 6) / rows) + pad;
                      const cw = (tray.w - 6) / cols - pad * 2;
                      const ch = (tray.h - 6) / rows - pad * 2;
                      return (
                        <rect
                          key={`${r}-${c}`}
                          x={cx}
                          y={cy}
                          width={cw}
                          height={ch}
                          rx={Math.min(cw, ch) * 0.18}
                          fill="#2a2a2e"
                          stroke="#3f3f46"
                          strokeWidth={0.5}
                          pointerEvents="none"
                        />
                      );
                    })
                  )}
                  {/* Label plate — semi-transparent bar across centre so the
                      plant name + tray code are readable over the cells */}
                  {(() => {
                    const plateH = Math.min(tray.h - 10, 14 + lines.length * lineHeight);
                    const plateY = tray.y + (tray.h - plateH) / 2;
                    return (
                      <>
                        <rect
                          x={tray.x + 4}
                          y={plateY}
                          width={tray.w - 8}
                          height={plateH}
                          rx="2"
                          fill="rgba(0,0,0,0.72)"
                          pointerEvents="none"
                        />
                        <text
                          x={tray.x + 6}
                          y={plateY + 10}
                          className="pointer-events-none text-[9px] font-bold uppercase tracking-wide"
                          fill="#e4e4e7"
                        >
                          {tray.code}
                        </text>
                        {lines.length > 0 ? (
                          <text
                            textAnchor="middle"
                            className="pointer-events-none text-[11px] font-semibold"
                            fill="#ffffff"
                          >
                            {lines.map((line, li) => (
                              <tspan
                                key={li}
                                x={tray.x + tray.w / 2}
                                y={plateY + 22 + li * lineHeight}
                              >
                                {line}
                              </tspan>
                            ))}
                          </text>
                        ) : (
                          <text
                            x={tray.x + tray.w / 2}
                            y={plateY + plateH - 4}
                            textAnchor="middle"
                            className="pointer-events-none text-[9px] italic"
                            fill="#a1a1aa"
                          >
                            empty
                          </text>
                        )}
                      </>
                    );
                  })()}
                  {editMode && (
                    <rect
                      x={tray.x + tray.w - 6}
                      y={tray.y + tray.h - 6}
                      width={8}
                      height={8}
                      rx="1"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleTrayResizeDown(tray.id, e)}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div className="w-full shrink-0 space-y-3 lg:w-64">
          {/* Edit mode: selected zone controls */}
          {editMode && selectedZoneObj && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm space-y-3">
              <div className="text-lg font-semibold text-emerald-900">Zone: {selectedZoneObj.label}</div>
              <div className="space-y-1 text-xs text-emerald-800">
                <div>Position: ({selectedZoneObj.x}, {selectedZoneObj.y})</div>
                <div>Size: {selectedZoneObj.w} × {selectedZoneObj.h}</div>
                <div>Trays: {trays.filter((t) => t.zoneId === selectedZoneObj.id).length}</div>
              </div>
              <button
                onClick={() => deleteZone(selectedZoneObj.id)}
                className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Delete Zone
              </button>
            </div>
          )}

          {/* Edit mode: selected tray controls */}
          {editMode && selectedTrayObj && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-3">
              <div className="text-lg font-semibold text-blue-900">Tray: {selectedTrayObj.code}</div>
              <div className="space-y-1 text-xs text-blue-800">
                <div>Position: ({selectedTrayObj.x}, {selectedTrayObj.y})</div>
                <div>Size: {selectedTrayObj.w} × {selectedTrayObj.h}</div>
                <div>
                  Zone: {selectedTrayObj.zoneId
                    ? (zones.find((z) => z.id === selectedTrayObj.zoneId)?.label ?? "—")
                    : "Unassigned"}
                </div>
              </div>
              <button
                onClick={() => deleteTray(selectedTrayObj.id)}
                className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Delete Tray
              </button>
            </div>
          )}

          {/* View mode: selected tray details */}
          {!editMode && selectedTrayObj && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-white p-4 text-sm shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">{selectedTrayObj.code}</div>
                <button
                  onClick={() => setSelectedTray(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-700"
                >
                  Close
                </button>
              </div>
              {selectedTrayObj.zoneId && (
                <div className="mt-0.5 text-xs text-zinc-500">
                  Zone: {zones.find((z) => z.id === selectedTrayObj.zoneId)?.label ?? "—"}
                </div>
              )}
              {selectedTraySeedlings.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedTraySeedlings.map((s) => (
                    <div key={s.id} className="rounded-xl border border-zinc-100 p-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            s.germination === "green"
                              ? "bg-emerald-500"
                              : s.germination === "amber"
                              ? "bg-amber-400"
                              : s.germination === "red"
                              ? "bg-rose-500"
                              : "bg-sky-400"
                          }`}
                        />
                        <span className="font-medium">
                          {s.plant}
                          {s.variety ? ` · ${s.variety}` : ""}
                        </span>
                      </div>
                      {s.quantity && <div className="mt-0.5 text-xs text-zinc-500">Qty: {s.quantity}</div>}
                      {s.date && <div className="text-[10px] text-zinc-400">Sown: {s.date}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-zinc-400">
                  No seedlings linked. Set a seedling&apos;s &quot;Row / Location&quot; to {selectedTrayObj.code} to link it.
                </div>
              )}
            </div>
          )}

          {/* View mode: selected zone details */}
          {!editMode && selectedZoneObj && !selectedTrayObj && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              <div className="text-lg font-semibold">{selectedZoneObj.label}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {trays.filter((t) => t.zoneId === selectedZoneObj.id).length} trays
              </div>
              {selectedZoneSeedlings.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedZoneSeedlings.map((s) => (
                    <div key={s.id} className="rounded-xl border border-zinc-100 p-2.5">
                      <div className="font-medium text-xs">
                        {s.plant}{s.variety ? ` · ${s.variety}` : ""}
                      </div>
                      {s.row_location && <div className="text-[10px] text-zinc-400">Tray: {s.row_location}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-zinc-400">No seedlings in this zone yet.</div>
              )}
            </div>
          )}

          {!editMode && !selectedTrayObj && !selectedZoneObj && !isBlank && (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
              Click a zone or tray on the map to see details
            </div>
          )}

          {/* Legend */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-zinc-500">Legend</div>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-zinc-100" /> Empty tray
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-sky-100" /> Seeded
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-yellow-200" /> Partial germ.
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-green-200" /> Good germ.
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-red-200" /> Failed germ.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
