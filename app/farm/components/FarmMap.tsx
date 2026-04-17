"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Zone, Crop, FertilisationEntry, CompostEntry, HarvestEtaEntry, Plant, SeedlingEntry } from "@/lib/farm";

type SeedlingTray = { id?: string; code: string; zoneId?: string };
type SeedlingZoneDef = { id: string; label: string };

type BedDef = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  zone?: string;
};

type LandmarkDef = {
  type: "circle" | "dashed-rect" | "label" | "path" | "seedling-zone";
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

// ── localStorage helpers ──
function storageKey(farmName: string) {
  return `farm-map-layout:${farmName}`;
}

function saveCustomLayout(farmName: string, beds: BedDef[], landmarks: LandmarkDef[], backgroundImage?: string) {
  try {
    localStorage.setItem(storageKey(farmName), JSON.stringify({ beds, landmarks, backgroundImage }));
  } catch { /* quota exceeded – ignore */ }
}

function loadCustomLayout(farmName: string): { beds: BedDef[]; landmarks?: LandmarkDef[]; backgroundImage?: string } | null {
  try {
    const raw = localStorage.getItem(storageKey(farmName));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
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
  const isMountSol = name.includes("mount") && (name.includes("sol") || name.includes("solomun"));

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
  plants?: Plant[];
  fertilisations?: FertilisationEntry[];
  compostEntries?: CompostEntry[];
  harvestEta?: HarvestEtaEntry[];
  farmName?: string;
  farmId?: string;
  onSelectBed?: (bedId: string, zoneId: string | null) => void;
  onAddCropToBed?: (bedId: string, zoneId: string | null) => void;
};

export function FarmMap({ zones, crops, plants = [], fertilisations = [], compostEntries = [], harvestEta = [], farmName, farmId, onSelectBed, onAddCropToBed }: Props) {
  const [hoveredBed, setHoveredBed] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);

  // ── Edit mode state ──
  const [editMode, setEditMode] = useState(false);
  const [editBeds, setEditBeds] = useState<BedDef[]>([]);
  const [dragBed, setDragBed] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeBed, setResizeBed] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState<string | undefined>();
  const [addingBed, setAddingBed] = useState(false);
  const [newBedLabel, setNewBedLabel] = useState("");
  // Landmark editing state
  const [editLandmarks, setEditLandmarks] = useState<LandmarkDef[]>([]);
  const [dragLandmark, setDragLandmark] = useState<number | null>(null);
  const [dragLmOffset, setDragLmOffset] = useState({ x: 0, y: 0 });
  const [resizeLandmark, setResizeLandmark] = useState<number | null>(null);
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [editingLabelText, setEditingLabelText] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState("");
  const [saving, setSaving] = useState(false);
  // Seedling map data — loaded lazily for the seedling-zone side panel
  const [seedlingTrays, setSeedlingTrays] = useState<SeedlingTray[]>([]);
  const [seedlingMapZones, setSeedlingMapZones] = useState<SeedlingZoneDef[]>([]);
  const [seedlings, setSeedlings] = useState<SeedlingEntry[]>([]);
  const [selectedSeedlingZoneIdx, setSelectedSeedlingZoneIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseLayout = getLayout(farmName);

  // Load custom layout from database or localStorage on mount / farm change
  useEffect(() => {
    if (!farmName) return;

    const loadLayout = async () => {
      // Only try database if we have a valid farmId
      if (farmId && farmId !== "undefined") {
        try {
          const response = await fetch(`/api/farm-map/load?farm_id=${farmId}`);
          const result = await response.json();

          // Only use database data if it has actual beds (don't overwrite with empty arrays)
          if (response.ok && result.data && result.data.beds && result.data.beds.length > 0) {
            console.log("[FarmMap] Loaded layout from database for farm:", farmId, "with", result.data.beds.length, "beds");
            setEditBeds(result.data.beds);
            if (result.data.landmarks) setEditLandmarks(result.data.landmarks);
            setCustomBg(result.data.background_image);
            return;
          }
        } catch (err) {
          console.error("[FarmMap] Failed to load from database:", err);
        }
      }

      // Fall back to localStorage
      const saved = loadCustomLayout(farmName);
      if (saved) {
        console.log("[FarmMap] Loaded layout from localStorage for farm:", farmName);
        setEditBeds(saved.beds);
        if (saved.landmarks) setEditLandmarks(saved.landmarks);
        setCustomBg(saved.backgroundImage);
      } else {
        // Reset state when no layout found - will use baseLayout.beds as fallback
        console.log("[FarmMap] No custom layout found, using base layout");
        setEditBeds([]);
        setEditLandmarks([]);
        setCustomBg(undefined);
      }
    };

    setEditMode(false);
    setSelectedBed(null);

    loadLayout();
  }, [farmName, farmId]);

  // Load seedling map trays + seedlings so the seedling-zone side panel can
  // show contents when the user clicks a zone on the farm map.
  useEffect(() => {
    if (!farmId || farmId === "undefined") {
      setSeedlingTrays([]);
      setSeedlingMapZones([]);
      setSeedlings([]);
      return;
    }
    let cancelled = false;

    const loadLocalTraysZones = (): { trays: SeedlingTray[]; zones: SeedlingZoneDef[] } => {
      if (!farmName) return { trays: [], zones: [] };
      try {
        const raw = localStorage.getItem(`seedling-map-layout:${farmName}`);
        if (!raw) return { trays: [], zones: [] };
        const parsed = JSON.parse(raw);
        return {
          trays: Array.isArray(parsed?.trays) ? parsed.trays : [],
          zones: Array.isArray(parsed?.zones) ? parsed.zones : [],
        };
      } catch { return { trays: [], zones: [] }; }
    };

    fetch(`/api/seedling-map/load?farm_id=${farmId}`)
      .then((r) => r.json())
      .then((result) => {
        if (cancelled) return;
        const t = Array.isArray(result?.data?.trays) ? result.data.trays : [];
        const z = Array.isArray(result?.data?.zones) ? result.data.zones : [];
        if (t.length > 0 || z.length > 0) {
          setSeedlingTrays(t);
          setSeedlingMapZones(z);
        } else {
          const local = loadLocalTraysZones();
          setSeedlingTrays(local.trays);
          setSeedlingMapZones(local.zones);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const local = loadLocalTraysZones();
        setSeedlingTrays(local.trays);
        setSeedlingMapZones(local.zones);
      });

    supabase
      .from("seedlings")
      .select("id, farm_id, type, date, plant, variety, quantity, germination, germination_date, healthy_seedlings, successional_sowing, yields, row_location, notes, created_at")
      .eq("farm_id", farmId)
      .then(({ data }) => {
        if (cancelled) return;
        setSeedlings((data ?? []) as SeedlingEntry[]);
      });

    return () => { cancelled = true; };
  }, [farmId, farmName]);

  // The active layout merges saved customisations
  const hasCustom = editBeds.length > 0 || editLandmarks.length > 0;
  const layout: FarmLayout = {
    ...baseLayout,
    beds: editMode ? editBeds : (hasCustom ? editBeds : baseLayout.beds),
    landmarks: editMode ? editLandmarks : (editLandmarks.length > 0 ? editLandmarks : baseLayout.landmarks),
    backgroundImage: customBg || baseLayout.backgroundImage,
  };

  // Enter edit mode
  function startEdit() {
    setEditBeds(editBeds.length > 0 ? [...editBeds] : baseLayout.beds.map((b) => ({ ...b })));
    setEditLandmarks(editLandmarks.length > 0 ? [...editLandmarks] : baseLayout.landmarks.map((l) => ({ ...l })));
    setEditMode(true);
    setSelectedBed(null);
    setEditingLabelIdx(null);
  }

  // Save edits
  async function saveEdit() {
    if (saving) return;
    setSaving(true);

    // Exit edit mode immediately so the button feels responsive; local state
    // is the source of truth and the DB write continues in the background.
    if (farmName) {
      saveCustomLayout(farmName, editBeds, editLandmarks, customBg);
    }
    setEditMode(false);
    setEditingLabelIdx(null);

    // Also save to database so it syncs across devices
    if (farmId && farmId !== "undefined") {
      try {
        const response = await fetch(`/api/farm-map/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farm_id: farmId,
            beds: editBeds,
            landmarks: editLandmarks,
            background_image: customBg,
          }),
        });
        if (!response.ok) {
          console.error("[FarmMap] Failed to save to database:", await response.text());
        } else {
          console.log("[FarmMap] Saved layout to database");
        }
      } catch (err) {
        console.error("[FarmMap] Error saving to database:", err);
      }
    }

    setSaving(false);
  }

  // Cancel edits
  function cancelEdit() {
    if (farmName) {
      const saved = loadCustomLayout(farmName);
      if (saved) {
        setEditBeds(saved.beds);
        setEditLandmarks(saved.landmarks ?? []);
        setCustomBg(saved.backgroundImage);
      } else {
        setEditBeds([]);
        setEditLandmarks([]);
        setCustomBg(undefined);
      }
    }
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
  const handleMouseDown = useCallback((bedId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    const pt = svgPoint(e);
    const bed = editBeds.find((b) => b.id === bedId);
    if (!bed) return;
    setDragBed(bedId);
    setDragOffset({ x: pt.x - bed.x, y: pt.y - bed.y });
  }, [editMode, editBeds]);

  const handleResizeDown = useCallback((bedId: string, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setResizeBed(bedId);
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

  const handleLandmarkResizeDown = useCallback((idx: number, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setResizeLandmark(idx);
  }, [editMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    const pt = svgPoint(e);

    if (dragBed) {
      setEditBeds((prev) =>
        prev.map((b) =>
          b.id === dragBed ? { ...b, x: Math.round(pt.x - dragOffset.x), y: Math.round(pt.y - dragOffset.y) } : b
        )
      );
    }

    if (resizeBed) {
      setEditBeds((prev) =>
        prev.map((b) => {
          if (b.id !== resizeBed) return b;
          const newW = Math.max(20, Math.round(pt.x - b.x));
          const newH = Math.max(15, Math.round(pt.y - b.y));
          return { ...b, w: newW, h: newH };
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

    if (resizeLandmark !== null) {
      setEditLandmarks((prev) =>
        prev.map((lm, i) => {
          if (i !== resizeLandmark) return lm;
          const newW = Math.max(30, Math.round(pt.x - lm.x));
          const newH = Math.max(30, Math.round(pt.y - lm.y));
          return { ...lm, w: newW, h: newH };
        })
      );
    }
  }, [editMode, dragBed, resizeBed, dragOffset, dragLandmark, dragLmOffset, resizeLandmark]);

  const handleMouseUp = useCallback(() => {
    setDragBed(null);
    setResizeBed(null);
    setDragLandmark(null);
    setResizeLandmark(null);
  }, []);

  // ── Add new bed ──
  function addBed() {
    if (!newBedLabel.trim()) return;
    const id = newBedLabel.trim().toUpperCase().replace(/\s+/g, "");
    if (editBeds.find((b) => b.id === id)) return;
    setEditBeds((prev) => [...prev, { id, label: newBedLabel.trim(), x: 100, y: 100, w: 80, h: 30 }]);
    setNewBedLabel("");
    setAddingBed(false);
  }

  // ── Delete bed ──
  function deleteBed(bedId: string) {
    setEditBeds((prev) => prev.filter((b) => b.id !== bedId));
    if (selectedBed === bedId) setSelectedBed(null);
  }

  // ── Add new text label ──
  function addLabel() {
    if (!newLabelText.trim()) return;
    setEditLandmarks((prev) => [...prev, { type: "label", x: 150, y: 150, label: newLabelText.trim() }]);
    setNewLabelText("");
    setAddingLabel(false);
  }

  // ── Add a seedling-zone block (draggable + resizable) ──
  function addSeedlingZone() {
    setEditLandmarks((prev) => [
      ...prev,
      { type: "seedling-zone", x: 120, y: 120, w: 160, h: 120, label: "Seedling Zone" },
    ]);
  }

  // ── Edit label / seedling-zone text ──
  function startEditLabel(idx: number) {
    const lm = editLandmarks[idx];
    if (!lm || (lm.type !== "label" && lm.type !== "seedling-zone")) return;
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
      // If this is a brand new farm with no beds, start with empty bed list in edit mode
      if (editBeds.length === 0 && baseLayout.beds.length === 0) {
        setEditBeds([]);
      }
    };
    reader.readAsDataURL(file);
  }

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

  function getPlantsForZone(zoneId: string): Plant[] {
    return plants.filter((p) => p.zone_ids?.includes(zoneId) || p.zone_id === zoneId);
  }

  function getHarvestEtaForBed(bedId: string): HarvestEtaEntry | undefined {
    const id = bedId.toUpperCase();
    // Match by zone_id if zone exists, or by bed_name
    const zone = getZoneForBed(bedId);
    if (zone) {
      const byZone = harvestEta.find((h) => h.zone_id === zone.id);
      if (byZone) return byZone;
    }
    return harvestEta.find((h) => h.bed_name?.toUpperCase() === id);
  }

  const MONTH_KEYS = ["mar","apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb"] as const;
  const MONTH_LABELS = ["Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb"];

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
  const selectedPlants = selected ? getPlantsForZone(selected.id) : [];
  const selectedFertilisations = selected ? getFertilisationsForZone(selected.id) : [];
  const selectedCompost = selected ? getCompostForZone(selected.id) : [];
  const selectedHarvestEta = selectedBed ? getHarvestEtaForBed(selectedBed) : undefined;

  // Check if this is a new/unknown farm with no layout
  const isBlankFarm = baseLayout.beds.length === 0 && editBeds.length === 0 && !customBg;

  return (
    <div>
      {/* ── Edit toolbar (sticky so it stays reachable on tall maps) ── */}
      <div className="sticky top-0 z-20 mb-3 flex items-center gap-2 flex-wrap bg-white/95 py-2 shadow-sm backdrop-blur">
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
            {addingBed ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newBedLabel}
                  onChange={(e) => setNewBedLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBed()}
                  placeholder="Bed name (e.g. R1)"
                  className="w-36 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  autoFocus
                />
                <button onClick={addBed} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">Add</button>
                <button onClick={() => setAddingBed(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingBed(true)} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Add Bed
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
              onClick={addSeedlingZone}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Add Seedling Zone
            </button>
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
        <div className={`flex-1 overflow-auto rounded-2xl border bg-white ${editMode ? "border-blue-400 ring-2 ring-blue-100" : "border-zinc-200"}`}>
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
            if (lm.type === "seedling-zone") {
              const w = lm.w ?? 160;
              const h = lm.h ?? 120;
              const isSZSelected = !editMode && selectedSeedlingZoneIdx === i;
              return (
                <g
                  key={i}
                  className={editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
                  onMouseDown={editMode ? (e) => handleLandmarkDown(i, e) : undefined}
                  onDoubleClick={editMode ? () => startEditLabel(i) : undefined}
                  onClick={editMode ? undefined : () => {
                    setSelectedSeedlingZoneIdx(selectedSeedlingZoneIdx === i ? null : i);
                    setSelectedBed(null);
                  }}
                >
                  <rect
                    x={lm.x}
                    y={lm.y}
                    width={w}
                    height={h}
                    rx="6"
                    fill="rgba(16,185,129,0.12)"
                    stroke={isSZSelected ? "#047857" : editMode ? "#059669" : "#10b981"}
                    strokeWidth={isSZSelected ? 2.5 : 1.8}
                    strokeDasharray="6,4"
                  />
                  {(() => {
                    // Wrap the label into lines that fit the box width. SVG <text>
                    // doesn't auto-wrap, so split on spaces and greedy-pack words
                    // assuming roughly ~5.5px per character at 9px font.
                    const raw = (lm.label ?? "Seedling Zone").trim();
                    const maxChars = Math.max(4, Math.floor((w - 8) / 5.5));
                    const words = raw.split(/\s+/);
                    const lines: string[] = [];
                    let current = "";
                    for (const word of words) {
                      if (!current) {
                        current = word;
                      } else if ((current + " " + word).length <= maxChars) {
                        current = current + " " + word;
                      } else {
                        lines.push(current);
                        current = word;
                      }
                    }
                    if (current) lines.push(current);
                    const lineHeight = 11;
                    const totalHeight = lines.length * lineHeight;
                    const startY = lm.y + h / 2 - totalHeight / 2 + lineHeight * 0.75;
                    return (
                      <text
                        x={lm.x + w / 2}
                        textAnchor="middle"
                        className="pointer-events-none text-[9px] font-semibold uppercase tracking-wider"
                        fill="#047857"
                      >
                        {lines.map((line, li) => (
                          <tspan key={li} x={lm.x + w / 2} y={startY + li * lineHeight}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    );
                  })()}
                  {editMode && (
                    <rect
                      x={lm.x + w - 8}
                      y={lm.y + h - 8}
                      width={10}
                      height={10}
                      rx="1"
                      fill="#059669"
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleLandmarkResizeDown(i, e)}
                    />
                  )}
                </g>
              );
            }
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

          {/* Beds */}
          {layout.beds.map((bed) => (
            <g
              key={bed.id}
              transform={
                bed.rotate && !editMode
                  ? `rotate(${bed.rotate}, ${bed.x + bed.w / 2}, ${bed.y + bed.h / 2})`
                  : undefined
              }
              onMouseDown={editMode ? (e) => handleMouseDown(bed.id, e) : undefined}
              onClick={() => {
                if (editMode) { setSelectedBed(selectedBed === bed.id ? null : bed.id); return; }
                setSelectedBed(selectedBed === bed.id ? null : bed.id);
                setSelectedSeedlingZoneIdx(null);
                onSelectBed?.(bed.id, getZoneForBed(bed.id)?.id ?? null);
              }}
              onMouseEnter={() => setHoveredBed(bed.id)}
              onMouseLeave={() => setHoveredBed(null)}
              className={editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
            >
              <rect
                x={bed.x}
                y={bed.y}
                width={bed.w}
                height={bed.h}
                rx="2"
                fill={bedColor(bed.id)}
                stroke={editMode && selectedBed === bed.id ? "#3b82f6" : bedStroke(bed.id)}
                strokeWidth={selectedBed === bed.id ? 2 : 1.2}
                strokeDasharray={editMode ? "4,2" : undefined}
              />
              {isVerticalLayout && !editMode ? (
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
              {/* Resize handle (bottom-right corner) */}
              {editMode && (
                <rect
                  x={bed.x + bed.w - 6}
                  y={bed.y + bed.h - 6}
                  width={8}
                  height={8}
                  rx="1"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={1}
                  className="cursor-se-resize"
                  onMouseDown={(e) => handleResizeDown(bed.id, e)}
                />
              )}
            </g>
          ))}
        </svg>
        </div>

        {/* Side panel — bed info */}
        <div className="w-56 shrink-0 space-y-3">
          {/* Edit mode: selected bed controls */}
          {editMode && selectedBed && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-3">
              <div className="text-lg font-semibold text-blue-900">Editing: {selectedBed}</div>
              {(() => {
                const bed = editBeds.find((b) => b.id === selectedBed);
                if (!bed) return null;
                return (
                  <div className="space-y-2 text-xs text-blue-800">
                    <div>Position: ({bed.x}, {bed.y})</div>
                    <div>Size: {bed.w} x {bed.h}</div>
                  </div>
                );
              })()}
              <button
                onClick={() => deleteBed(selectedBed)}
                className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Delete Bed
              </button>
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

          {/* Seedling-zone details (clicked in view mode) */}
          {!editMode && selectedSeedlingZoneIdx !== null && (() => {
            const lm = layout.landmarks[selectedSeedlingZoneIdx];
            if (!lm || lm.type !== "seedling-zone") return null;
            const label = (lm.label ?? "Seedling Zone").trim();

            // Try to match the farm-map block's label to a saved seedling-map zone (by label)
            const matchedZone = seedlingMapZones.find(
              (z) => z.label.trim().toLowerCase() === label.toLowerCase()
            );
            // If matched, show only that zone's trays; otherwise show all trays
            const traysToShow: SeedlingTray[] = matchedZone
              ? seedlingTrays.filter((t) => t.zoneId === matchedZone.id)
              : seedlingTrays;

            const codesSet = new Set(traysToShow.map((t) => t.code.toUpperCase()));
            const matchedSeedlings = seedlings.filter(
              (s) => s.row_location && codesSet.has(s.row_location.toUpperCase())
            );
            // Group seedlings by tray code
            const byTray = new Map<string, SeedlingEntry[]>();
            matchedSeedlings.forEach((s) => {
              const c = (s.row_location ?? "").toUpperCase();
              if (!byTray.has(c)) byTray.set(c, []);
              byTray.get(c)!.push(s);
            });

            return (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold text-emerald-900">{label}</div>
                  <button
                    onClick={() => setSelectedSeedlingZoneIdx(null)}
                    className="text-xs text-emerald-700 hover:text-emerald-900"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-1 text-xs text-emerald-700/80">
                  {traysToShow.length} tray{traysToShow.length === 1 ? "" : "s"}
                  {matchedZone ? ` · linked to "${matchedZone.label}"` : " · all trays"}
                </div>
                {traysToShow.length === 0 ? (
                  <div className="mt-3 text-xs text-emerald-700/70">
                    No trays on the seedling map yet. Add some on the Seedlings page.
                  </div>
                ) : (
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {traysToShow.map((tray) => {
                      const rows = byTray.get(tray.code.toUpperCase()) ?? [];
                      // Most-recent sown date across seedlings in this tray
                      const latestDate = rows
                        .map((r) => r.date)
                        .filter((d): d is string => !!d)
                        .sort()
                        .pop();
                      return (
                        <div key={tray.code} className="rounded-xl border border-emerald-100 bg-white p-2.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-xs font-semibold text-emerald-900">{tray.code}</div>
                            {latestDate && (
                              <div className="text-[10px] text-zinc-400">{fmtDate(latestDate)}</div>
                            )}
                          </div>
                          {rows.length === 0 ? (
                            <div className="mt-1 text-[10px] text-zinc-400">Empty</div>
                          ) : (
                            <div className="mt-1.5 space-y-1">
                              {rows.map((s) => (
                                <div key={s.id} className="flex items-center gap-1.5 text-[11px]">
                                  <span
                                    className={`inline-block h-2 w-2 rounded-full ${
                                      s.germination === "green"
                                        ? "bg-emerald-500"
                                        : s.germination === "amber"
                                        ? "bg-amber-400"
                                        : s.germination === "red"
                                        ? "bg-rose-500"
                                        : "bg-sky-400"
                                    }`}
                                  />
                                  <span className="font-medium text-zinc-700">
                                    {s.plant}
                                    {s.variety ? ` · ${s.variety}` : ""}
                                  </span>
                                  {s.quantity && <span className="text-zinc-400">· {s.quantity}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link
                  href="/farm/seedlings"
                  className="mt-3 block rounded-xl border border-emerald-300 bg-white px-3 py-2 text-center text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Open seedling map →
                </Link>
              </div>
            );
          })()}

          {selectedBed && !editMode ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
              <div className="text-lg font-semibold">{isVerticalLayout ? "Row" : "Bed"} {selectedBed}</div>
              <button
                type="button"
                onClick={() => onAddCropToBed?.(selectedBed, selected?.id ?? null)}
                disabled={!onAddCropToBed}
                className="mt-3 w-full rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                + Add crop to {selectedBed}
              </button>
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
                  {selectedPlants.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Plants</div>
                      <div className="mt-1.5 space-y-1.5">
                        {selectedPlants.map((p) => (
                          <div key={p.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-2">
                            <div className="flex items-center gap-2">
                              {p.image_url && (
                                <img src={p.image_url} alt="" className="h-6 w-6 rounded object-cover" />
                              )}
                              <span className="text-xs font-medium text-violet-800">{p.name || "Unnamed"}</span>
                            </div>
                            {p.notes && <div className="mt-0.5 text-[10px] text-violet-600/70">{p.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
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
              <button
                type="button"
                onClick={() => onAddCropToBed?.(selectedBed, selected?.id ?? null)}
                disabled={!onAddCropToBed}
                className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                + Add crop to {selectedBed}
              </button>
            </div>
          ) : !editMode ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
              Click a {isVerticalLayout ? "row" : "bed"} on the map to see details
            </div>
          ) : null}

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
