"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Zone, Crop, FertilisationEntry, CompostEntry, HarvestEtaEntry, MapPosition } from "@/lib/farm";
import { supabase } from "@/lib/supabase";

// A zone rendered on the map — position comes from zone.map_position or hardcoded defaults
type MapZone = {
  zoneId: string;       // zone.id from DB
  label: string;        // zone.name or code
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
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
  backgroundImage?: string;
  extraSvg?: React.ReactNode;
};

// ── Storage helpers ──
// localStorage for caching
function cacheKey(farmId: string) {
  return `farm-map-layout-cache:${farmId}`;
}

function getCachedLayout(farmId: string): { beds: BedDef[]; landmarks?: LandmarkDef[]; backgroundImage?: string } | null {
  try {
    const raw = localStorage.getItem(cacheKey(farmId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedLayout(farmId: string, beds: BedDef[], landmarks: LandmarkDef[], backgroundImage?: string) {
  try {
    localStorage.setItem(cacheKey(farmId), JSON.stringify({ beds, landmarks, backgroundImage }));
  } catch {
    // quota exceeded – ignore
  }
}

// Save to database
async function saveMapLayoutToDb(farmId: string, beds: BedDef[], landmarks: LandmarkDef[], backgroundImage?: string) {
  if (!farmId) {
    console.warn("Cannot save layout: no farmId provided");
    return false;
  }

  try {
    const response = await fetch("/api/farm-map/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farm_id: farmId,
        beds,
        landmarks,
        background_image: backgroundImage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to save layout to database:", error);
      return false;
    }

    console.log(`Saved layout for farm ${farmId} to database`);
    // Also cache locally
    setCachedLayout(farmId, beds, landmarks, backgroundImage);
    return true;
  } catch (error) {
    console.error("Error saving layout to database:", error);
    return false;
  }
}

// Load from database
async function loadMapLayoutFromDb(farmId: string): Promise<{ beds: BedDef[]; landmarks?: LandmarkDef[]; backgroundImage?: string } | null> {
  if (!farmId) {
    console.warn("Cannot load layout: no farmId provided");
    return null;
  }

  try {
    const response = await fetch(`/api/farm-map/load?farm_id=${farmId}`);

    if (!response.ok) {
      console.error("Failed to load layout from database");
      return null;
    }

    const { data } = await response.json();
    if (data) {
      console.log(`Loaded layout for farm ${farmId} from database`);
      // Cache it locally
      setCachedLayout(farmId, data.beds, data.landmarks, data.background_image);
    }
    return data;
  } catch (error) {
    console.error("Error loading layout from database:", error);
    return null;
  }
}

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
  const name = farmName?.toLowerCase() ?? "";
  const isTopLand = name.includes("top land");
  const isMountSol = name.includes("mount sol") || name.includes("solomon");

  if (isTopLand) {
    return {
      viewBox: "0 0 980 600",
      minWidth: 500,
      beds: topLandBeds,
      landmarks: topLandLandmarks,
    };
  }
  if (isMountSol) {
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
  // Unknown farm — blank canvas for custom map upload
  return {
    viewBox: "0 0 800 600",
    minWidth: 400,
    beds: [],
    landmarks: [],
  };
}

type Props = {
  zones: Zone[];
  crops: Crop[];
  fertilisations?: FertilisationEntry[];
  compostEntries?: CompostEntry[];
  harvestEta?: HarvestEtaEntry[];
  farmName?: string;
  farmId?: string;
  onSelectZone?: (zoneId: string) => void;
  onZonesChanged?: () => void;
};

export function FarmMap({ zones, crops, fertilisations = [], compostEntries = [], harvestEta = [], farmName, farmId, onSelectZone, onZonesChanged }: Props) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // ── Edit mode state ──
  const [editMode, setEditMode] = useState(false);
  const [editZones, setEditZones] = useState<MapZone[]>([]);
  const [dragZone, setDragZone] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeZone, setResizeZone] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState<string | undefined>();
  const [addingZone, setAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  // Landmark editing state
  const [editLandmarks, setEditLandmarks] = useState<LandmarkDef[]>([]);
  const [dragLandmark, setDragLandmark] = useState<number | null>(null);
  const [dragLmOffset, setDragLmOffset] = useState({ x: 0, y: 0 });
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [editingLabelText, setEditingLabelText] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState("");
  const [editingBed, setEditingBed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseLayout = getLayout(farmName);

  // Build MapZones from zones — use map_position if available, else match hardcoded defaults
  function buildMapZones(): MapZone[] {
    return zones
      .map((z) => {
        if (z.map_position) {
          return {
            zoneId: z.id,
            label: z.code || z.name,
            ...z.map_position,
          };
        }
        // Fallback: try to match to a hardcoded bed by code
        const code = (z.code ?? z.name).toUpperCase().replace(/^ROW\s*/i, "");
        const fallback = baseLayout.beds.find((b) => b.id.toUpperCase() === code);
        if (fallback) {
          return {
            zoneId: z.id,
            label: z.code || z.name,
            x: fallback.x,
            y: fallback.y,
            w: fallback.w,
            h: fallback.h,
            rotate: fallback.rotate,
          };
        }
        return null; // Zone has no map position and no matching default
      })
      .filter((mz): mz is MapZone => mz !== null);
  }

  // Load landmarks from localStorage (landmarks aren't per-zone, they're per-farm decorations)
  useEffect(() => {
    if (!farmId) return;
    const cached = getCachedLayout(farmId);
    if (cached) {
      if (cached.landmarks) setEditLandmarks(cached.landmarks);
      setCustomBg(cached.backgroundImage);
    }
    // Also try DB
    loadMapLayoutFromDb(farmId).then((data) => {
      if (data) {
        if (data.landmarks) setEditLandmarks(data.landmarks);
        setCustomBg(data.backgroundImage);
      }
    });
  }, [farmId]);

  const mapZones = buildMapZones();
  const activeZones = editMode ? editZones : mapZones;

  const layout: FarmLayout = {
    ...baseLayout,
    beds: [], // No longer used — zones render directly
    landmarks: editMode ? editLandmarks : (editLandmarks.length > 0 ? editLandmarks : baseLayout.landmarks),
    backgroundImage: customBg || baseLayout.backgroundImage,
  };

  // Enter edit mode
  function startEdit() {
    setEditZones(mapZones.map((mz) => ({ ...mz })));
    setEditLandmarks(editLandmarks.length > 0 ? [...editLandmarks] : baseLayout.landmarks.map((l) => ({ ...l })));
    setEditMode(true);
    setSelectedZoneId(null);
    setEditingLabelIdx(null);
  }

  // Save edits — write map_position to each zone in Supabase
  const [saving, setSaving] = useState(false);
  async function saveEdit() {
    setSaving(true);
    try {
      // Update each zone's map_position in DB
      for (const mz of editZones) {
        const pos: MapPosition = { x: mz.x, y: mz.y, w: mz.w, h: mz.h };
        if (mz.rotate) pos.rotate = mz.rotate;
        await supabase
          .from("zones")
          .update({ map_position: pos })
          .eq("id", mz.zoneId);
      }
      // Save landmarks/bg to the farm-map API (they're not per-zone)
      if (farmId) {
        await saveMapLayoutToDb(farmId, [], editLandmarks, customBg);
      }
      onZonesChanged?.(); // Refresh zones from parent
    } catch (err) {
      console.error("Failed to save map positions:", err);
    }
    setSaving(false);
    setEditMode(false);
    setEditingLabelIdx(null);
  }

  // Cancel edits
  function cancelEdit() {
    setEditZones([]);
    setEditLandmarks(editLandmarks.length > 0 ? [...editLandmarks] : baseLayout.landmarks.map((l) => ({ ...l })));
    setEditMode(false);
    setEditingLabelIdx(null);
  }

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

  // ── Drag handlers ──
  const handleMouseDown = useCallback((zoneId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    const pt = svgPoint(e);
    const mz = editZones.find((z) => z.zoneId === zoneId);
    if (!mz) return;
    setDragZone(zoneId);
    setDragOffset({ x: pt.x - mz.x, y: pt.y - mz.y });
  }, [editMode, editZones]);

  const handleResizeDown = useCallback((zoneId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setResizeZone(zoneId);
  }, [editMode]);

  // ── Landmark drag handler ──
  const handleLandmarkDown = useCallback((idx: number, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    const pt = svgPoint(e);
    const lm = editLandmarks[idx];
    if (!lm) return;
    setDragLandmark(idx);
    setDragLmOffset({ x: pt.x - lm.x, y: pt.y - lm.y });
  }, [editMode, editLandmarks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    const pt = svgPoint(e);

    if (dragZone) {
      setEditZones((prev) =>
        prev.map((mz) =>
          mz.zoneId === dragZone ? { ...mz, x: Math.round(pt.x - dragOffset.x), y: Math.round(pt.y - dragOffset.y) } : mz
        )
      );
    }

    if (resizeZone) {
      setEditZones((prev) =>
        prev.map((mz) => {
          if (mz.zoneId !== resizeZone) return mz;
          const newW = Math.max(20, Math.round(pt.x - mz.x));
          const newH = Math.max(15, Math.round(pt.y - mz.y));
          return { ...mz, w: newW, h: newH };
        })
      );
    }

    if (dragLandmark !== null) {
      setEditLandmarks((prev) =>
        prev.map((lm, i) =>
          i === dragLandmark ? { ...lm, x: Math.round(pt.x - dragLmOffset.x), y: Math.round(pt.y - dragLmOffset.y) } : lm
        )
      );
    }
  }, [editMode, dragZone, resizeZone, dragOffset, dragLandmark, dragLmOffset]);

  const handleMouseUp = useCallback(() => {
    setDragZone(null);
    setResizeZone(null);
    setDragLandmark(null);
  }, []);

  // ── Add new zone to map ──
  async function addZoneToMap() {
    if (!newZoneName.trim() || !farmId) return;
    const name = newZoneName.trim();
    const code = name.toUpperCase().replace(/\s+/g, "");
    const pos: MapPosition = { x: 100, y: 100, w: 80, h: 30 };
    // Create zone in Supabase
    const { data, error } = await supabase.from("zones").insert({
      farm_id: farmId,
      name,
      code,
      is_active: true,
      map_position: pos,
    }).select("id").single();
    if (error || !data) {
      console.error("Failed to create zone:", error);
      return;
    }
    setEditZones((prev) => [...prev, { zoneId: data.id, label: code, ...pos }]);
    setNewZoneName("");
    setAddingZone(false);
    onZonesChanged?.();
  }

  // ── Remove zone from map (sets map_position to null, does NOT delete zone) ──
  function removeZoneFromMap(zoneId: string) {
    setEditZones((prev) => prev.filter((mz) => mz.zoneId !== zoneId));
    if (selectedZoneId === zoneId) setSelectedZoneId(null);
  }

  // ── Add new text label ──
  function addLabel() {
    if (!newLabelText.trim()) return;
    setEditLandmarks((prev) => [...prev, { type: "label", x: 150, y: 150, label: newLabelText.trim() }]);
    setNewLabelText("");
    setAddingLabel(false);
  }

  // ── Edit label text ──
  function startEditLabel(idx: number) {
    const lm = editLandmarks[idx];
    if (!lm || lm.type !== "label") return;
    setEditingLabelIdx(idx);
    setEditingLabelText(lm.label ?? "");
  }

  function saveEditLabel() {
    if (editingLabelIdx === null) return;
    setEditLandmarks((prev) =>
      prev.map((lm, i) => i === editingLabelIdx ? { ...lm, label: editingLabelText } : lm)
    );
    setEditingLabelIdx(null);
    setEditingLabelText("");
  }

  // ── Delete landmark ──
  function deleteLandmark(idx: number) {
    setEditLandmarks((prev) => prev.filter((_, i) => i !== idx));
    if (editingLabelIdx === idx) setEditingLabelIdx(null);
  }

  // ── Map image upload ──
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomBg(dataUrl);
      // If this is a brand new farm with no zones on map, keep empty
      if (editZones.length === 0 && mapZones.length === 0) {
        setEditZones([]);
      }
    };
    reader.readAsDataURL(file);
  }

  function getZoneById(zoneId: string): Zone | undefined {
    return zones.find((z) => z.id === zoneId);
  }

  function getCropsForZone(zoneId: string): Crop[] {
    return crops.filter((c) => c.zone_ids?.includes(zoneId) || c.zone_id === zoneId);
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

  function getHarvestEtaForZone(zoneId: string): HarvestEtaEntry | undefined {
    return harvestEta.find((h) => h.zone_id === zoneId);
  }

  const MONTH_KEYS = ["mar","apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb"] as const;
  const MONTH_LABELS = ["Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb"];

  function fmtDate(d: string | null) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  function zoneColor(zoneId: string): string {
    const zoneCrops = getCropsForZone(zoneId);
    if (zoneCrops.length === 0) return "#e4e4e7"; // zinc-200 — empty
    const status = zoneCrops[0].status;
    if (status === "harvest_ready") return "#bbf7d0"; // green-200
    if (status === "growing") return "#d9f99d"; // lime-200
    if (status === "planted" || status === "germinating") return "#fef08a"; // yellow-200
    return "#e0f2fe"; // sky-100 — planned
  }

  function zoneStroke(zoneId: string): string {
    if (selectedZoneId === zoneId) return "#18181b"; // zinc-900
    if (hoveredZone === zoneId) return "#52525b"; // zinc-600
    return "#a1a1aa"; // zinc-400
  }

  // For vertical rows, render label rotated
  const isVerticalLayout = farmName?.toLowerCase().includes("top land");

  const selected = selectedZoneId ? getZoneById(selectedZoneId) : null;
  const selectedCrops = selected ? getCropsForZone(selected.id) : [];
  const selectedFertilisations = selected ? getFertilisationsForZone(selected.id) : [];
  const selectedCompost = selected ? getCompostForZone(selected.id) : [];
  const selectedHarvestEta = selectedZoneId ? getHarvestEtaForZone(selectedZoneId) : undefined;

  // Check if this is a new/unknown farm with no layout
  const isBlankFarm = mapZones.length === 0 && !customBg;

  return (
    <div className="farm-map-print-wrapper">
      {/* ── Edit toolbar ── */}
      <div className="mb-3 flex items-center gap-2 flex-wrap print:hidden">
        {editMode ? (
          <>
            <button onClick={saveEdit} disabled={saving} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
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
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addZoneToMap()}
                  placeholder="Zone name (e.g. Bed 1, Nursery)"
                  className="w-48 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
                <button onClick={addZoneToMap} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">Add</button>
                <button onClick={() => setAddingZone(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingZone(true)} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Add Zone
              </button>
            )}
            {addingLabel ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLabel()}
                  placeholder="Label text"
                  className="w-36 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
                <button onClick={addLabel} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">Add</button>
                <button onClick={() => setAddingLabel(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingLabel(true)} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
                + Add Text
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Upload Map Image
            </button>
            {customBg && (
              <button
                onClick={() => setCustomBg(undefined)}
                className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                Remove Background
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </>
        ) : (
          <>
            <button onClick={startEdit} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Edit Map
            </button>
            <button onClick={() => window.print()} className="print:hidden rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Print Map
            </button>
            {isBlankFarm && (
              <>
                <button
                  onClick={() => { startEdit(); setTimeout(() => fileInputRef.current?.click(), 100); }}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Upload Your Farm Map
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </>
            )}
          </>
        )}
      </div>

      {/* Blank farm prompt */}
      {isBlankFarm && !editMode && (
        <div className="mb-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-600">No map configured for this farm</p>
          <p className="mt-1 text-sm text-zinc-400">Upload an aerial photo or sketch of your farm, then place beds on top of it.</p>
          <button
            onClick={() => { startEdit(); setTimeout(() => fileInputRef.current?.click(), 100); }}
            className="mt-4 rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-700"
          >
            Upload Farm Map
          </button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Map */}
        <div className={`farm-map-container flex-1 overflow-auto rounded-2xl border bg-white ${editMode ? "border-blue-400 ring-2 ring-blue-100" : "border-zinc-200"}`}>
          {editMode && (
            <div className="bg-blue-50 px-3 py-1.5 text-xs text-blue-700 border-b border-blue-200">
              Drag beds &amp; labels to move them. Drag corners to resize beds. Double-click text to edit it.
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox={layout.viewBox}
            className={`w-full ${editMode ? "cursor-crosshair" : ""}`}
            style={{ minWidth: layout.minWidth }}
            onMouseMove={editMode ? handleMouseMove : undefined}
            onMouseUp={editMode ? handleMouseUp : undefined}
            onMouseLeave={editMode ? handleMouseUp : undefined}
          >
          {/* Background */}
          <rect width="100%" height="100%" fill="#fafaf9" />

          {/* Custom background image */}
          {layout.backgroundImage && (
            <image
              href={layout.backgroundImage}
              x="0"
              y="0"
              width={layout.viewBox.split(" ")[2]}
              height={layout.viewBox.split(" ")[3]}
              preserveAspectRatio="xMidYMid meet"
              opacity={editMode ? 0.6 : 0.8}
            />
          )}

          {/* Farm-specific extra SVG (e.g. driveway for Mount Sol) */}
          {layout.extraSvg}

          {/* Landmarks */}
          {layout.landmarks.map((lm, i) => {
            const isSelected = editMode && editingLabelIdx === i;
            if (lm.type === "dashed-rect") {
              return (
                <rect
                  key={i}
                  x={lm.x}
                  y={lm.y}
                  width={lm.w}
                  height={lm.h}
                  fill={editMode ? "rgba(161,161,170,0.08)" : "none"}
                  stroke={editMode ? "#3b82f6" : "#a1a1aa"}
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  rx="3"
                  className={editMode ? "cursor-grab" : undefined}
                  onMouseDown={editMode ? (e) => handleLandmarkDown(i, e) : undefined}
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
                  fill={lm.label === "tree-filled" ? "#92400e" : editMode ? "rgba(161,161,170,0.08)" : "none"}
                  stroke={editMode ? "#3b82f6" : "#a1a1aa"}
                  strokeWidth="1.2"
                  className={editMode ? "cursor-grab" : undefined}
                  onMouseDown={editMode ? (e) => handleLandmarkDown(i, e) : undefined}
                />
              );
            }
            if (lm.type === "label") {
              const lines = (lm.label ?? "").split("\n");
              return (
                <g
                  key={i}
                  className={editMode ? "cursor-grab" : undefined}
                  onMouseDown={editMode ? (e) => handleLandmarkDown(i, e) : undefined}
                  onDoubleClick={editMode ? () => startEditLabel(i) : undefined}
                >
                  {/* Hit area for easier grabbing */}
                  {editMode && (
                    <rect
                      x={lm.x - 4}
                      y={lm.y - 12}
                      width={Math.max(40, (lm.label ?? "").length * 7)}
                      height={lines.length * 14 + 8}
                      fill={isSelected ? "rgba(59,130,246,0.1)" : "rgba(161,161,170,0.08)"}
                      stroke={isSelected ? "#3b82f6" : "#d4d4d8"}
                      strokeWidth={isSelected ? 1.5 : 0.5}
                      strokeDasharray="3,2"
                      rx="2"
                    />
                  )}
                  <text
                    x={lm.x}
                    y={lm.y}
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    fill={isSelected ? "#3b82f6" : "#71717a"}
                  >
                    {lines.map((line, li) => (
                      <tspan key={li} x={lm.x} dy={li === 0 ? 0 : 14}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Brown filled tree for Top Land */}
          {isVerticalLayout && (
            <circle cx={50} cy={510} r={18} fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
          )}

          {/* Zones on map */}
          {activeZones.map((mz) => (
            <g
              key={mz.zoneId}
              transform={
                mz.rotate && !editMode
                  ? `rotate(${mz.rotate}, ${mz.x + mz.w / 2}, ${mz.y + mz.h / 2})`
                  : undefined
              }
              onMouseDown={editMode ? (e) => handleMouseDown(mz.zoneId, e) : undefined}
              onClick={() => {
                if (editMode) { setSelectedZoneId(selectedZoneId === mz.zoneId ? null : mz.zoneId); setEditingBed(false); return; }
                setSelectedZoneId(selectedZoneId === mz.zoneId ? null : mz.zoneId);
                onSelectZone?.(mz.zoneId);
              }}
              onMouseEnter={() => setHoveredZone(mz.zoneId)}
              onMouseLeave={() => setHoveredZone(null)}
              className={editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
            >
              <rect
                x={mz.x}
                y={mz.y}
                width={mz.w}
                height={mz.h}
                rx="2"
                fill={zoneColor(mz.zoneId)}
                stroke={editMode && selectedZoneId === mz.zoneId ? "#3b82f6" : zoneStroke(mz.zoneId)}
                strokeWidth={selectedZoneId === mz.zoneId ? 2 : 1.2}
                strokeDasharray={editMode ? "4,2" : undefined}
              />
              {isVerticalLayout && !editMode ? (
                <text
                  x={mz.x + mz.w / 2}
                  y={mz.y - 6}
                  textAnchor="middle"
                  className="pointer-events-none text-[9px] font-semibold"
                  fill="#52525b"
                >
                  {mz.label}
                </text>
              ) : (
                <text
                  x={mz.x + mz.w / 2}
                  y={mz.y + mz.h / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none text-[8px] font-medium"
                  fill="#52525b"
                >
                  {mz.label}
                </text>
              )}
              {/* Resize handle (bottom-right corner) */}
              {editMode && (
                <rect
                  x={mz.x + mz.w - 6}
                  y={mz.y + mz.h - 6}
                  width={8}
                  height={8}
                  rx="1"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={1}
                  className="cursor-se-resize"
                  onMouseDown={(e) => handleResizeDown(mz.zoneId, e)}
                />
              )}
            </g>
          ))}
        </svg>
        </div>

        {/* Side panel — bed info */}
        <div className="farm-map-sidebar w-56 shrink-0 space-y-3">
          {/* Edit mode: selected zone controls */}
          {editMode && selectedZoneId && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-3">
              {(() => {
                const mz = editZones.find((z) => z.zoneId === selectedZoneId);
                const zone = getZoneById(selectedZoneId);
                if (!mz) return null;
                return (
                  <>
                    <div className="text-lg font-semibold text-blue-900">{zone?.name || mz.label}</div>
                    {editingBed ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-blue-700">Display Label</label>
                          <input
                            type="text"
                            value={mz.label}
                            onChange={(e) =>
                              setEditZones((prev) =>
                                prev.map((z) => z.zoneId === selectedZoneId ? { ...z, label: e.target.value } : z)
                              )
                            }
                            className="mt-0.5 w-full rounded-lg border border-blue-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-blue-700">Width</label>
                            <input
                              type="number"
                              value={mz.w}
                              onChange={(e) =>
                                setEditZones((prev) =>
                                  prev.map((z) => z.zoneId === selectedZoneId ? { ...z, w: Math.max(10, Number(e.target.value)) } : z)
                                )
                              }
                              className="mt-0.5 w-full rounded-lg border border-blue-300 px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-blue-700">Height</label>
                            <input
                              type="number"
                              value={mz.h}
                              onChange={(e) =>
                                setEditZones((prev) =>
                                  prev.map((z) => z.zoneId === selectedZoneId ? { ...z, h: Math.max(10, Number(e.target.value)) } : z)
                                )
                              }
                              className="mt-0.5 w-full rounded-lg border border-blue-300 px-2 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-xs text-blue-600">Position: ({mz.x}, {mz.y})</div>
                        <button
                          onClick={() => setEditingBed(false)}
                          className="w-full rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {zone && <div className="text-xs text-blue-800">Zone: {zone.name}</div>}
                        {zone?.code && <div className="text-xs text-blue-800">Code: {zone.code}</div>}
                        <div className="text-xs text-blue-800">Position: ({mz.x}, {mz.y})</div>
                        <div className="text-xs text-blue-800">Size: {mz.w} x {mz.h}</div>
                        <button
                          onClick={() => setEditingBed(true)}
                          className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Edit Zone
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => removeZoneFromMap(selectedZoneId)}
                      className="w-full rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      Remove from Map
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Edit mode: label editing panel */}
          {editMode && editingLabelIdx !== null && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-3">
              <div className="text-lg font-semibold text-amber-900">Edit Text</div>
              <textarea
                value={editingLabelText}
                onChange={(e) => setEditingLabelText(e.target.value)}
                placeholder="Label text (use newlines for multi-line)"
                className="w-full rounded-lg border border-amber-300 px-2 py-1.5 text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEditLabel}
                  className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                >
                  Save Text
                </button>
                <button
                  onClick={() => setEditingLabelIdx(null)}
                  className="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={() => deleteLandmark(editingLabelIdx)}
                className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Delete Label
              </button>
            </div>
          )}

          {selectedZoneId && !editMode ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              {selected ? (
                <>
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="mt-1 text-zinc-500">
                    {selected.code ? `Code: ${selected.code}` : ""}
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
              ) : null}
              {selectedHarvestEta && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Harvest ETA</div>
                  <div className="mt-1.5 rounded-xl border border-orange-100 bg-orange-50/50 p-2.5">
                    {selectedHarvestEta.main_crop && (
                      <div className="text-xs font-medium text-orange-800">{selectedHarvestEta.main_crop}</div>
                    )}
                    {selectedHarvestEta.expected_harvest_date && (
                      <div className="mt-0.5 text-[10px] text-orange-600">Harvest: {selectedHarvestEta.expected_harvest_date}</div>
                    )}
                    {selectedHarvestEta.beneficial_companions && (
                      <div className="mt-0.5 text-[10px] text-orange-600">Companions: {selectedHarvestEta.beneficial_companions}</div>
                    )}
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      {MONTH_KEYS.map((mk, i) => {
                        const exp = (selectedHarvestEta as Record<string, unknown>)[`${mk}_expected`] as string | null;
                        const act = (selectedHarvestEta as Record<string, unknown>)[`${mk}_actual`] as string | null;
                        if (!exp && !act) return null;
                        return (
                          <div key={mk} className="rounded-lg bg-white p-1 text-center">
                            <div className="text-[9px] font-semibold text-zinc-400">{MONTH_LABELS[i]}</div>
                            {exp && <div className="text-[10px] text-emerald-600">{exp}</div>}
                            {act && <div className="text-[10px] text-blue-600">{act}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : !editMode ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
              Click a zone on the map to see details
            </div>
          ) : null}

          {/* Legend */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-zinc-500">Legend</div>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded border border-zinc-300 bg-zinc-200" /> Empty
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
