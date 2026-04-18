"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getFarms,
  getZones,
  getCrops,
  getTasks,
  getMembers,
  getActivities,
  getExpenses,
  getAssets,
  getPests,
  getSales,
  getFertilisations,
  getCompost,
  getPlants,
  getHarvestEta,
  saveActiveFarmId,
  getActiveFarmId,
} from "@/lib/farm";
import type { Farm, Zone, Crop, Task, Activity, Expense, Asset, Pest, Sale, FertilisationEntry, CompostEntry, Plant, HarvestEtaEntry, FarmMember } from "@/lib/farm";
import { formatDate, formatMoney, badgeClass } from "@/app/farm/utils";
import { CropForm } from "@/app/farm/components/CropForm";
import { TaskForm } from "@/app/farm/components/TaskForm";
import { HarvestForm } from "@/app/farm/components/HarvestForm";
import { ExpenseForm } from "@/app/farm/components/ExpenseForm";
import { AssetForm } from "@/app/farm/components/AssetForm";
import { PestForm } from "@/app/farm/components/PestForm";
import { SaleForm } from "@/app/farm/components/SaleForm";
import { FarmMap } from "@/app/farm/components/FarmMap";
import { Plus, X } from "lucide-react";
import { ActivityFeed } from "@/app/farm/components/ActivityFeed";
import type { CropFormData } from "@/app/farm/components/CropForm";
import type { TaskFormData } from "@/app/farm/components/TaskForm";
import type { HarvestFormData } from "@/app/farm/components/HarvestForm";
import type { ExpenseFormData } from "@/app/farm/components/ExpenseForm";
import type { AssetFormData } from "@/app/farm/components/AssetForm";
import type { PestFormData } from "@/app/farm/components/PestForm";
import type { SaleFormData } from "@/app/farm/components/SaleForm";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function FarmPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pests, setPests] = useState<Pest[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [fertilisations, setFertilisations] = useState<FertilisationEntry[]>([]);
  const [compostEntries, setCompostEntries] = useState<CompostEntry[]>([]);
  const [harvestEtaEntries, setHarvestEtaEntries] = useState<HarvestEtaEntry[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [members, setMembers] = useState<FarmMember[]>([]);

  const [activeFarmId, setActiveFarmId] = useState<string>("");
  const hasLoadedInitialFarm = React.useRef(false);
  const [activeForm, setActiveForm] = useState<"crop" | "task" | "harvest" | "expense" | "asset" | "pest" | "sale" | null>(null);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingFarm, setEditingFarm] = useState(false);
  const [farmEditForm, setFarmEditForm] = useState({ name: "", location: "", size_acres: "" });
  const [savingFarm, setSavingFarm] = useState(false);
  const router = useRouter();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState<TaskFormData | null>(null);
  const [editingCropId, setEditingCropId] = useState<string | null>(null);
  const [editingCropForm, setEditingCropForm] = useState({
    crop_name: "", variety: "", zone_ids: [] as string[], status: "", planted_on: "",
    expected_harvest_start: "", estimated_yield_kg: "", expected_sale_price_per_kg: "",
    notes: "", medicinal_properties: "", image_file: null as File | null, image_url: "" as string,
  });
  const [cropImagePreview, setCropImagePreview] = useState("");
  const [savingCropId, setSavingCropId] = useState<string | null>(null);
  const [deletingCropId, setDeletingCropId] = useState<string | null>(null);
  const [expandedCropId, setExpandedCropId] = useState<string | null>(null);
  const [cropNoteText, setCropNoteText] = useState("");
  const [cropMedicinalText, setCropMedicinalText] = useState("");
  const [savingCropNote, setSavingCropNote] = useState(false);
  const [expandAllCrops, setExpandAllCrops] = useState(false);
  const [expandAllTasks, setExpandAllTasks] = useState(false);
  // No-farm state
  const [noFarmMode, setNoFarmMode] = useState<"idle" | "create" | "join">("idle");
  const [newFarmName, setNewFarmName] = useState("");
  const [creatingFarm, setCreatingFarm] = useState(false);
  const [joinSearch, setJoinSearch] = useState("");
  const [joinResults, setJoinResults] = useState<{ id: string; name: string }[]>([]);
  const [joinSearching, setJoinSearching] = useState(false);
  const [allFarms, setAllFarms] = useState<{ id: string; name: string }[]>([]);
  const [loadingAllFarms, setLoadingAllFarms] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string>("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseForm, setEditingExpenseForm] = useState<ExpenseFormData | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const [editingPestId, setEditingPestId] = useState<string | null>(null);
  const [deletingPestId, setDeletingPestId] = useState<string | null>(null);
  const [confirmDeletePestId, setConfirmDeletePestId] = useState<string | null>(null);
  const [selectedMapBedId, setSelectedMapBedId] = useState<string>("");
  const [selectedMapZoneId, setSelectedMapZoneId] = useState<string>("");
  const [cropSearch, setCropSearch] = useState<string>("");
  const [assigningCropId, setAssigningCropId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRoleOnFarm, setUserRoleOnFarm] = useState<string | null>(null);
  const [deleteFarmStep, setDeleteFarmStep] = useState<0 | 1 | 2>(0);
  const [deletingFarm, setDeletingFarm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const withFarmContext = (path: string) =>
    activeFarmId ? `${path}?farmId=${encodeURIComponent(activeFarmId)}` : path;
  const workerTasksHref = activeFarmId
    ? `/farm/tasks?farmId=${encodeURIComponent(activeFarmId)}`
    : "/farm/tasks";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function startEditFarm() {
    if (!activeFarm) return;
    setFarmEditForm({
      name: activeFarm.name,
      location: activeFarm.location ?? "",
      size_acres: activeFarm.size_acres?.toString() ?? "",
    });
    setEditingFarm(true);
  }

  async function handleSaveFarm() {
    if (!activeFarmId) return;
    try {
      setSavingFarm(true);
      setError("");
      const name = farmEditForm.name.trim();
      if (!name) throw new Error("Farm name is required.");

      const { error: updateError } = await supabase
        .from("farms")
        .update({
          name,
          location: farmEditForm.location.trim() || null,
          size_acres: farmEditForm.size_acres ? Number(farmEditForm.size_acres) : null,
        })
        .eq("id", activeFarmId);
      if (updateError) throw updateError;

      await loadFarms();
      setEditingFarm(false);
    } catch (err) {
      setError(errMsg(err, "Failed to save farm"));
    } finally {
      setSavingFarm(false);
    }
  }

  async function handleCreateFarm(e: React.FormEvent) {
    e.preventDefault();
    const name = newFarmName.trim();
    if (!name) return;
    setCreatingFarm(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data: farm, error: farmErr } = await supabase
        .from("farms")
        .insert({ name, slug, is_active: true, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (farmErr) throw farmErr;
      await supabase.from("farm_members").insert({ farm_id: farm.id, profile_id: user?.id, user_email: user?.email, role_on_farm: "owner" });
      setNewFarmName("");
      setNoFarmMode("idle");
      await loadFarms();
    } catch (err) {
      setError(errMsg(err, "Failed to create farm"));
    } finally {
      setCreatingFarm(false);
    }
  }

  async function loadAllFarms() {
    setLoadingAllFarms(true);
    try {
      const res = await fetch("/api/farms/list");
      const data = await res.json();
      setAllFarms(Array.isArray(data) ? data : []);
    } catch {
      setAllFarms([]);
    }
    setLoadingAllFarms(false);
  }

  async function handleRequestJoin(farmId: string) {
    setRequestingId(farmId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("join_requests").upsert({
      farm_id: farmId,
      user_id: user?.id,
      user_email: user?.email,
      status: "pending",
    }, { onConflict: "farm_id,user_id" });
    if (err) setError(errMsg(err, "Failed to send request"));
    else setRequestSent(farmId);
    setRequestingId(null);
  }

  async function loadFarms() {
    const farmRows = await getFarms();
    setFarms(farmRows);
    if (!activeFarmId && farmRows.length > 0) {
      setActiveFarmId(farmRows[0].id);
    }
  }

  async function loadFarmData(farmId: string) {
    const currentYear = new Date().getFullYear();
    console.log(`[Farm] Loading farm data for ${farmId} at ${new Date().toISOString()}`);
    // Pre-warm auth session so parallel requests don't fight over the
    // Supabase auth lock (navigator.locks with steal: true).
    await supabase.auth.getSession();
    const [zoneRows, cropRows, taskRows, activityRows, expenseRows, assetRows, pestRows, saleRows, fertilisationRows, compostRows, plantRows, harvestEtaRows, memberRows] = await Promise.all([
      getZones(farmId),
      getCrops(farmId),
      getTasks(farmId),
      getActivities(farmId),
      getExpenses(farmId),
      getAssets(farmId),
      getPests(farmId),
      getSales(farmId),
      getFertilisations(farmId),
      getCompost(farmId),
      getPlants(farmId),
      getHarvestEta(farmId, currentYear),
      getMembers(farmId),
    ]);

    console.log(`[Farm] Loaded ${cropRows.length} crops:`, cropRows.map(c => ({ id: c.id, name: c.crop_name, status: c.status, zones: c.zone_ids })));

    setZones(zoneRows);
    setCrops(cropRows);
    setTasks(taskRows);
    setActivities(activityRows);
    setExpenses(expenseRows);
    setAssets(assetRows);
    setPests(pestRows);
    setSales(saleRows);
    setFertilisations(fertilisationRows);
    setCompostEntries(compostRows);
    setPlants(plantRows);
    setHarvestEtaEntries(harvestEtaRows);
    setMembers(memberRows);

    // Fetch current user's role on this farm
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: membership } = await supabase
        .from("farm_members")
        .select("role_on_farm")
        .eq("farm_id", farmId)
        .eq("profile_id", user.id)
        .single();
      setUserRoleOnFarm(membership?.role_on_farm ?? null);
    }
    setDeleteFarmStep(0);
  }

  async function handleDeleteFarm() {
    if (!activeFarm) return;
    setDeletingFarm(true);
    try {
      // Soft-delete: mark farm as inactive
      const { error: err } = await supabase
        .from("farms")
        .update({ is_active: false })
        .eq("id", activeFarm.id);
      if (err) throw err;
      setDeleteFarmStep(0);
      setDeletingFarm(false);
      await refreshAll();
    } catch (err) {
      setError(errMsg(err, "Failed to delete farm"));
      setDeletingFarm(false);
    }
  }

  async function refreshAll() {
    try {
      setError("");
      setLoading(true);
      await loadFarms();
    } catch (err) {
      setError(errMsg(err, "Failed to load farms"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const init = async () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setUserEmail(user.email);
      });

      await refreshAll();

      // Only load the last active farm once per app session
      // Don't reload it when navigating between pages, to preserve farm selection during a session
      if (!hasLoadedInitialFarm.current) {
        hasLoadedInitialFarm.current = true;
        const lastFarmId = await getActiveFarmId();
        if (lastFarmId) {
          setActiveFarmId(lastFarmId);
        }
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!activeFarmId) return;

    const run = async () => {
      try {
        setError("");
        setLoading(true);
        await loadFarmData(activeFarmId);
      } catch (err) {
        setError(errMsg(err, "Failed to load farm data"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activeFarmId]);

  useEffect(() => {
    setSelectedMapBedId("");
    setSelectedMapZoneId("");
    setAssigningCropId(null);
  }, [activeFarmId]);

  // Refresh farm data when page comes back into focus (for mobile)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && activeFarmId) {
        try {
          await loadFarmData(activeFarmId);
        } catch (err) {
          console.error("Failed to refresh farm data:", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeFarmId]);

  // Save active farm ID to user profile for cross-device sync
  useEffect(() => {
    if (activeFarmId) {
      saveActiveFarmId(activeFarmId);
    }
  }, [activeFarmId]);

  const activeFarm = useMemo(
    () => farms.find((farm) => farm.id === activeFarmId) ?? null,
    [farms, activeFarmId]
  );

  const today = new Date().toISOString().slice(0, 10);

  const tasksToday = tasks.filter(
    (task) =>
      task.due_date === today &&
      task.status !== "done" &&
      task.status !== "cancelled"
  );

  const openTasks = tasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress"
  );

  const memberEmailMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.profile_id] = m.user_email ?? m.profile_id;
    return map;
  }, [members]);

  const groupedOpenTasks = useMemo(() => {
    const groups: { label: string; key: string; tasks: Task[]; isCurrentUser?: boolean }[] = [];
    const unassigned: Task[] = [];
    const byAssignee: Record<string, Task[]> = {};
    let myTasks: Task[] = [];
    let myTasksKey: string | null = null;

    for (const task of openTasks) {
      if (task.assigned_to) {
        if (!byAssignee[task.assigned_to]) byAssignee[task.assigned_to] = [];
        byAssignee[task.assigned_to].push(task);

        // Check if this is the current user's task
        const assigneeEmail = memberEmailMap[task.assigned_to];
        if (assigneeEmail === userEmail && !myTasksKey) {
          myTasks = byAssignee[task.assigned_to];
          myTasksKey = task.assigned_to;
        }
      } else {
        unassigned.push(task);
      }
    }

    // Add current user's tasks first if they exist
    if (myTasksKey && myTasks.length > 0) {
      groups.push({
        label: "My tasks",
        key: myTasksKey,
        tasks: myTasks,
        isCurrentUser: true
      });
    }

    // Add unassigned tasks
    if (unassigned.length > 0) {
      groups.push({ label: "General (unassigned)", key: "__unassigned__", tasks: unassigned });
    }

    // Add other people's tasks
    for (const [assignee, assigneeTasks] of Object.entries(byAssignee).sort(([a], [b]) =>
      (memberEmailMap[a] ?? a).localeCompare(memberEmailMap[b] ?? b)
    )) {
      if (assignee !== myTasksKey) {
        groups.push({ label: memberEmailMap[assignee] ?? assignee, key: assignee, tasks: assigneeTasks });
      }
    }

    return groups;
  }, [openTasks, memberEmailMap, userEmail]);

  // Calculate which tasks to display based on expand state
  const displayedTaskGroups = useMemo(() => {
    if (expandAllTasks) {
      // Show all groups with all tasks
      return groupedOpenTasks;
    } else {
      // Show only current user's tasks, limited to 3
      const myTasksGroup = groupedOpenTasks.find(g => g.isCurrentUser);
      if (!myTasksGroup) return groupedOpenTasks;
      return [{
        ...myTasksGroup,
        tasks: myTasksGroup.tasks.slice(0, 3)
      }];
    }
  }, [groupedOpenTasks, expandAllTasks]);

  const completedTasks = tasks.filter(
    (task) => task.status === "done" || task.status === "cancelled"
  );

  const readyToHarvest = crops.filter((crop) => crop.status === "harvest_ready");

  const forecastRevenue = crops.reduce((sum, crop) => {
    return sum + Number(crop.estimated_yield_kg ?? 0) * Number(crop.expected_sale_price_per_kg ?? 0);
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0);

  const defaultZoneId = zones.length === 1 ? zones[0].id : "";
  const defaultCropId = crops.length === 1 ? crops[0].id : "";
  const selectedMapZone = useMemo(
    () => zones.find((zone) => zone.id === selectedMapZoneId) ?? null,
    [zones, selectedMapZoneId]
  );
  const preferredCropZoneId = selectedMapZoneId || defaultZoneId;

  const normalizedCropSearch = cropSearch.trim().toLowerCase();
  const filteredCrops = useMemo(() => {
    if (!normalizedCropSearch) return crops;
    return crops.filter((crop) => {
      const zoneNames = crop.zone_ids?.length
        ? crop.zone_ids
            .map((zoneId) => zones.find((zone) => zone.id === zoneId)?.name ?? "")
            .filter(Boolean)
        : crop.zone_id
          ? [zones.find((zone) => zone.id === crop.zone_id)?.name ?? ""]
          : [];
      const searchable = [
        crop.crop_name,
        crop.variety ?? "",
        crop.status ?? "",
        ...zoneNames,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedCropSearch);
    });
  }, [crops, normalizedCropSearch, zones]);

  const visibleCrops = useMemo(
    () => (expandAllCrops ? filteredCrops : filteredCrops.slice(0, 3)),
    [expandAllCrops, filteredCrops]
  );

  function resolveZoneForBed(bedId: string): Zone | null {
    const id = bedId.toUpperCase().trim();
    if (!id) return null;
    return (
      zones.find((zone) => {
        const code = (zone.code ?? "").toUpperCase();
        const name = zone.name.toUpperCase();
        return (
          code === id ||
          name === id ||
          code.replace(/^ROW\s*/i, "") === id ||
          name.replace(/^ROW\s*/i, "") === id
        );
      }) ?? null
    );
  }

  function handleAddCropFromMap(bedId: string, zoneId: string | null) {
    const resolvedZoneId = zoneId ?? resolveZoneForBed(bedId)?.id ?? "";
    setSelectedMapBedId(bedId);
    setSelectedMapZoneId(resolvedZoneId);
    setActiveForm("crop");
    if (typeof window !== "undefined") {
      document.getElementById("crops")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function handleAssignCropToSelectedBed(crop: Crop): Promise<void> {
    if (!activeFarmId || !selectedMapZoneId) return;
    try {
      setAssigningCropId(crop.id);
      setError("");
      const currentZoneIds = crop.zone_ids?.length
        ? crop.zone_ids.filter(Boolean)
        : crop.zone_id
          ? [crop.zone_id]
          : [];
      const nextZoneIds = [selectedMapZoneId, ...currentZoneIds.filter((zoneId) => zoneId !== selectedMapZoneId)];
      const { error: updateError } = await supabase
        .from("crops")
        .update({
          zone_id: nextZoneIds[0] ?? null,
          extra_zone_ids: nextZoneIds.length > 1 ? JSON.stringify(nextZoneIds.slice(1)) : null,
        })
        .eq("id", crop.id);
      if (updateError) throw updateError;
      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to assign crop to the selected bed"));
    } finally {
      setAssigningCropId(null);
    }
  }

  function handleMapBedSelection(bedId: string) {
    setSelectedMapBedId(bedId);
    const resolvedZoneId = resolveZoneForBed(bedId)?.id ?? "";
    setSelectedMapZoneId(resolvedZoneId);
  }

  async function handleCreateCrop(data: CropFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const cropName = data.crop_name.trim();
      if (!cropName) throw new Error("Crop name is required.");

      const zoneIds = data.zone_ids.filter(Boolean);
      const primaryZoneId = zoneIds[0] || null;

      // Upload image if provided
      let imageUrl: string | null = null;
      if (data.image_file) {
        const ext = data.image_file.name.split(".").pop() ?? "jpg";
        const path = `${activeFarmId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("plant-images").upload(path, data.image_file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("plant-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const extraZoneIds = zoneIds.length > 1 ? JSON.stringify(zoneIds.slice(1)) : null;

      const { error: insertError } = await supabase.from("crops").insert({
        farm_id: activeFarmId,
        zone_id: primaryZoneId,
        extra_zone_ids: extraZoneIds,
        crop_name: cropName,
        variety: data.variety.trim() || null,
        status: data.status,
        planted_on: data.planted_on || null,
        expected_harvest_start: data.expected_harvest_start || null,
        estimated_yield_kg: data.estimated_yield_kg ? Number(data.estimated_yield_kg) : null,
        expected_sale_price_per_kg: data.expected_sale_price_per_kg
          ? Number(data.expected_sale_price_per_kg)
          : null,
        notes: data.notes.trim() || null,
        medicinal_properties: data.medicinal_properties.trim() || null,
        is_active: true,
      });
      if (insertError) throw insertError;

      // Sync image to plants gallery
      if (imageUrl) {
        const plantName = data.variety.trim()
          ? `${cropName} · ${data.variety.trim()}`
          : cropName;

        await supabase.from("plants").insert({
          farm_id: activeFarmId,
          name: plantName,
          image_url: imageUrl,
          notes: data.notes.trim() || null,
          zone_id: primaryZoneId,
        });
      }

      const zoneCount = zoneIds.length;
      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "crop_created",
        title: `${cropName} added`,
        meta: zoneCount > 1
          ? `Crop linked to ${zoneCount} beds`
          : zoneCount === 1
            ? "Crop linked to bed"
            : "Crop created",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to create crop"));
      return false;
    }
  }

  function startEditCrop(crop: Crop) {
    setEditingCropId(crop.id);
    const zoneIds = crop.zone_ids?.length ? crop.zone_ids : crop.zone_id ? [crop.zone_id] : [];
    setEditingCropForm({
      crop_name: crop.crop_name,
      variety: crop.variety ?? "",
      zone_ids: zoneIds,
      status: crop.status ?? "planned",
      planted_on: crop.planted_on ?? "",
      expected_harvest_start: crop.expected_harvest_start ?? "",
      estimated_yield_kg: crop.estimated_yield_kg != null ? String(crop.estimated_yield_kg) : "",
      expected_sale_price_per_kg: crop.expected_sale_price_per_kg != null ? String(crop.expected_sale_price_per_kg) : "",
      notes: crop.notes ?? "",
      medicinal_properties: crop.medicinal_properties ?? "",
      image_file: null,
      image_url: crop.image_url ?? "",
    });
    setCropImagePreview(crop.image_url ?? "");
  }

  async function handleSaveCrop(id: string) {
    try {
      setSavingCropId(id);
      setError("");

      let imageUrl = editingCropForm.image_url;

      // Upload new image if provided
      if (editingCropForm.image_file) {
        const ext = editingCropForm.image_file.name.split(".").pop() ?? "jpg";
        const path = `${activeFarmId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("plant-images")
          .upload(path, editingCropForm.image_file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("plant-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const zoneIds = editingCropForm.zone_ids.filter(Boolean);
      const primaryZoneId = zoneIds[0] || null;
      const extraZoneIds = zoneIds.length > 1 ? JSON.stringify(zoneIds.slice(1)) : null;

      const payload = {
        crop_name: editingCropForm.crop_name.trim(),
        variety: editingCropForm.variety.trim() || null,
        zone_id: primaryZoneId,
        extra_zone_ids: extraZoneIds,
        status: editingCropForm.status || null,
        planted_on: editingCropForm.planted_on || null,
        expected_harvest_start: editingCropForm.expected_harvest_start || null,
        estimated_yield_kg: editingCropForm.estimated_yield_kg ? Number(editingCropForm.estimated_yield_kg) : null,
        expected_sale_price_per_kg: editingCropForm.expected_sale_price_per_kg ? Number(editingCropForm.expected_sale_price_per_kg) : null,
        notes: editingCropForm.notes.trim() || null,
        medicinal_properties: editingCropForm.medicinal_properties.trim() || null,
        image_url: imageUrl,
      };
      console.log("Crop update payload:", JSON.stringify(payload), "id:", id);
      const res = await supabase.from("crops").update(payload).eq("id", id).select();
      console.log("Crop update response:", JSON.stringify(res));
      if (res.error) throw res.error;
      if (!res.data || res.data.length === 0) throw new Error("Update returned no rows — RLS may be blocking updates.");
      setEditingCropId(null);
      setCropImagePreview("");
      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to update crop"));
    } finally {
      setSavingCropId(null);
    }
  }

  function toggleExpandCrop(crop: Crop) {
    if (expandedCropId === crop.id) {
      setExpandedCropId(null);
      setCropNoteText("");
      setCropMedicinalText("");
    } else {
      setExpandedCropId(crop.id);
      setCropNoteText(crop.notes ?? "");
      setCropMedicinalText(crop.medicinal_properties ?? "");
    }
  }

  function handleCropImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setEditingCropForm((prev) => ({ ...prev, image_file: f }));
    if (cropImagePreview && cropImagePreview.startsWith("blob:")) URL.revokeObjectURL(cropImagePreview);
    setCropImagePreview(f ? URL.createObjectURL(f) : editingCropForm.image_url);
  }

  async function handleSaveCropNote(id: string) {
    try {
      setSavingCropNote(true);
      setError("");
      const { error: err } = await supabase.from("crops").update({
        notes: cropNoteText.trim() || null,
        medicinal_properties: cropMedicinalText.trim() || null,
      }).eq("id", id);
      if (err) throw err;
      setCrops((prev) => prev.map((c) => c.id === id ? { ...c, notes: cropNoteText.trim() || null, medicinal_properties: cropMedicinalText.trim() || null } : c));
    } catch (err) {
      setError(errMsg(err, "Failed to save note"));
    } finally {
      setSavingCropNote(false);
    }
  }

  async function handleDeleteCrop(id: string) {
    try {
      setDeletingCropId(id);
      const { error: err } = await supabase.from("crops").update({ is_active: false }).eq("id", id);
      if (err) throw err;
      setCrops((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete crop"));
    } finally {
      setDeletingCropId(null);
    }
  }

  async function handleCreateTask(data: TaskFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      const title = data.title.trim();
      if (!title) throw new Error("Task title is required.");

      const { error: insertError } = await supabase.from("tasks").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        assigned_to: data.assigned_to || null,
        title,
        description: data.description.trim() || null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || null,
        proof_required: data.proof_required,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "task_created",
        title: `${title} created`,
        meta: data.due_date ? `Due ${data.due_date}` : "Task added",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to create task"));
      return false;
    }
  }

  async function handleCompleteTask(task: Task) {
    if (!activeFarmId) return;
    try {
      setCompletingTaskId(task.id);
      setError("");

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (updateError) throw updateError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "task_completed",
        title: `${task.title} completed`,
        meta: task.crop?.[0]?.crop_name
          ? `Linked to ${task.crop[0].crop_name}`
          : "Task marked done",
      });

      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to complete task"));
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleUpdateTask(id: string, data: TaskFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setSavingTaskId(id);
      setError("");
      const title = data.title.trim();
      if (!title) throw new Error("Task title is required.");

      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          title,
          description: data.description.trim() || null,
          zone_id: data.zone_id || null,
          crop_id: data.crop_id || null,
          assigned_to: data.assigned_to || null,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date || null,
          proof_required: data.proof_required,
        })
        .eq("id", id);
      if (updateError) throw updateError;

      await loadFarmData(activeFarmId);
      setEditingTaskId(null);
      setEditingTaskForm(null);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update task"));
      return false;
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleDeleteTask(id: string) {
    if (!activeFarmId) return;
    try {
      setDeletingTaskId(id);
      setError("");
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to delete task"));
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function handleLogHarvest(data: HarvestFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.crop_id) throw new Error("Choose a crop before logging harvest.");
      if (!data.harvest_date) throw new Error("Harvest date is required.");
      if (!data.quantity_kg) throw new Error("Harvest quantity is required.");

      const selectedCrop = crops.find((crop) => crop.id === data.crop_id) ?? null;
      const harvestQty = Number(data.quantity_kg);

      const { error: harvestError } = await supabase.from("harvests").insert({
        farm_id: activeFarmId,
        crop_id: data.crop_id,
        zone_id: data.zone_id || null,
        harvest_date: data.harvest_date,
        quantity_kg: harvestQty,
        quality: data.quality,
        notes: data.notes.trim() || null,
      });
      if (harvestError) throw harvestError;

      const nextActualYield = Number(selectedCrop?.actual_yield_kg ?? 0) + harvestQty;
      const cropUpdates: Record<string, unknown> = { actual_yield_kg: nextActualYield };

      if (selectedCrop?.status !== "harvested") {
        cropUpdates.status = "harvested";
        cropUpdates.actual_harvest_date = data.harvest_date;
      }

      const { error: cropUpdateError } = await supabase
        .from("crops")
        .update(cropUpdates)
        .eq("id", data.crop_id);
      if (cropUpdateError) throw cropUpdateError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "harvest_logged",
        title: `${selectedCrop?.crop_name ?? "Harvest"} logged`,
        meta: `${harvestQty} kg · ${data.quality}`,
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log harvest"));
      return false;
    }
  }

  async function handleLogExpense(data: ExpenseFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.expense_date) throw new Error("Expense date is required.");

      const { error: insertError } = await supabase.from("expenses").insert({
        farm_id: activeFarmId,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
        category: data.category,
        amount: data.amount ? Number(data.amount) : null,
        expense_date: data.expense_date,
        notes: data.notes || null,
        vendor_name: data.vendor_name || null,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "expense_logged",
        title: `${data.category} expense logged`,
        meta: data.amount ? formatMoney(Number(data.amount)) : "amount TBC",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log expense"));
      return false;
    }
  }

  async function handleUpdateExpense(id: string, data: ExpenseFormData): Promise<boolean> {
    try {
      setError("");
      setSavingExpenseId(id);
      const { error: updateError } = await supabase.from("expenses").update({
        category: data.category,
        amount: data.amount ? Number(data.amount) : null,
        expense_date: data.expense_date,
        notes: data.notes || null,
        vendor_name: data.vendor_name || null,
        zone_id: data.zone_id || null,
        crop_id: data.crop_id || null,
      }).eq("id", id);
      if (updateError) throw updateError;
      await loadFarmData(activeFarmId);
      setEditingExpenseId(null);
      setEditingExpenseForm(null);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update expense"));
      return false;
    } finally {
      setSavingExpenseId(null);
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      setError("");
      setDeletingExpenseId(id);
      const { error: deleteError } = await supabase.from("expenses").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await loadFarmData(activeFarmId);
      setConfirmDeleteExpenseId(null);
    } catch (err) {
      setError(errMsg(err, "Failed to delete expense"));
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function handleLogAsset(data: AssetFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.name.trim()) throw new Error("Asset name is required.");

      const { error: insertError } = await supabase.from("assets").insert({
        farm_id: activeFarmId,
        name: data.name.trim(),
        category: data.category,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
        paid_by: data.paid_by.trim() || null,
        condition: data.condition,
        notes: data.notes.trim() || null,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "asset_logged",
        title: `${data.name.trim()} logged`,
        meta: [data.category, data.paid_by.trim() ? `paid by ${data.paid_by.trim()}` : null]
          .filter(Boolean)
          .join(" · "),
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log asset"));
      return false;
    }
  }

  async function uploadPestImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${activeFarmId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("plant-images").upload(path, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("plant-images").getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleLogPest(data: PestFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.pest_name.trim()) throw new Error("Pest name is required.");
      if (!data.logged_date) throw new Error("Date spotted is required.");

      let imageUrl: string | null = data.image_url || null;
      if (data.image_file) {
        imageUrl = await uploadPestImage(data.image_file);
      }

      const { error: insertError } = await supabase.from("pest_logs").insert({
        farm_id: activeFarmId,
        pest_name: data.pest_name.trim(),
        severity: data.severity,
        description: data.description.trim() || null,
        action_taken: data.action_taken.trim() || null,
        image_url: imageUrl,
        logged_date: data.logged_date,
        crop_id: data.crop_id || null,
        zone_id: data.zone_id || null,
      });
      if (insertError) throw insertError;

      // Also add the image to the plants gallery so users can see pest states
      if (imageUrl) {
        const cropName = data.crop_id
          ? crops.find((c) => c.id === data.crop_id)?.crop_name ?? null
          : null;
        const plantName = cropName
          ? `${cropName} — ${data.pest_name.trim()} (pest)`
          : `${data.pest_name.trim()} (pest photo)`;

        await supabase.from("plants").insert({
          farm_id: activeFarmId,
          name: plantName,
          image_url: imageUrl,
          notes: [data.description.trim(), data.action_taken.trim()].filter(Boolean).join(" | ") || null,
          zone_id: data.zone_id || null,
        });
      }

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "pest_logged",
        title: `${data.pest_name.trim()} spotted`,
        meta: `${data.severity} severity${data.action_taken.trim() ? ` · ${data.action_taken.trim()}` : ""}`,
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log pest issue"));
      return false;
    }
  }

  async function handleUpdatePest(pestId: string, data: PestFormData): Promise<boolean> {
    try {
      setError("");
      let imageUrl: string | null = data.image_url || null;
      if (data.image_file) {
        imageUrl = await uploadPestImage(data.image_file);
      }

      const { error: updateError } = await supabase.from("pest_logs").update({
        pest_name: data.pest_name.trim(),
        severity: data.severity,
        description: data.description.trim() || null,
        action_taken: data.action_taken.trim() || null,
        image_url: imageUrl,
        logged_date: data.logged_date,
        crop_id: data.crop_id || null,
        zone_id: data.zone_id || null,
      }).eq("id", pestId);
      if (updateError) throw updateError;

      setEditingPestId(null);
      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to update pest log"));
      return false;
    }
  }

  async function handleDeletePest(pestId: string) {
    try {
      setError("");
      setDeletingPestId(pestId);
      const { error: deleteError } = await supabase.from("pest_logs").delete().eq("id", pestId);
      if (deleteError) throw deleteError;
      await loadFarmData(activeFarmId);
    } catch (err) {
      setError(errMsg(err, "Failed to delete pest log"));
    } finally {
      setDeletingPestId(null);
      setConfirmDeletePestId(null);
    }
  }

  async function handleLogSale(data: SaleFormData): Promise<boolean> {
    if (!activeFarmId) return false;
    try {
      setError("");
      if (!data.sale_date) throw new Error("Sale date is required.");

      const { error: insertError } = await supabase.from("sales").insert({
        farm_id: activeFarmId,
        crop_id: data.crop_id || null,
        buyer_name: data.buyer_name.trim() || null,
        quantity_kg: data.quantity_kg ? Number(data.quantity_kg) : null,
        price_per_kg: data.price_per_kg ? Number(data.price_per_kg) : null,
        total_amount: data.total_amount ? Number(data.total_amount) : null,
        sale_date: data.sale_date,
        notes: data.notes.trim() || null,
      });
      if (insertError) throw insertError;

      await supabase.from("activities").insert({
        farm_id: activeFarmId,
        type: "sale_logged",
        title: `Sale logged${data.buyer_name ? ` to ${data.buyer_name.trim()}` : ""}`,
        meta: data.total_amount ? formatMoney(Number(data.total_amount)) : "amount TBC",
      });

      await loadFarmData(activeFarmId);
      return true;
    } catch (err) {
      setError(errMsg(err, "Failed to log sale"));
      return false;
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              {editingFarm ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={farmEditForm.name}
                    onChange={(e) => setFarmEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-zinc-900"
                    placeholder="Farm name"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={farmEditForm.location}
                      onChange={(e) => setFarmEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      className="flex-1 rounded-2xl border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="Location"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={farmEditForm.size_acres}
                      onChange={(e) => setFarmEditForm((prev) => ({ ...prev, size_acres: e.target.value }))}
                      className="w-32 rounded-2xl border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="Acres"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveFarm}
                      disabled={savingFarm || !farmEditForm.name.trim()}
                      className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {savingFarm ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingFarm(false)}
                      className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {activeFarm?.name ?? "Farm Manager"}
                  </h1>
                  <p className="mt-3 text-sm text-zinc-600 sm:text-base">
                    {activeFarm?.location || "No location set"}
                    {activeFarm?.size_acres ? ` · ${activeFarm.size_acres} acres` : ""}
                  </p>
                  <button
                    onClick={startEditFarm}
                    className="mt-3 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {farms.map((farm) => {
                const isActive = farm.id === activeFarmId;
                return (
                  <button
                    key={farm.id}
                    onClick={() => setActiveFarmId(farm.id)}
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {farm.name}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setNoFarmMode(noFarmMode === "join" ? "idle" : "join");
                  if (noFarmMode !== "join") loadAllFarms();
                }}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                Join a farm
              </button>
              <button
                onClick={() => setNoFarmMode(noFarmMode === "create" ? "idle" : "create")}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                Create a farm
              </button>
              <Link
                href={withFarmContext("/farm/invite")}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Invite
              </Link>
              {userEmail && userEmail === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL && (
                <Link
                  href="/admin"
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    if (activeFarmId) {
                      await loadFarmData(activeFarmId);
                    }
                  } catch (err) {
                    setError(errMsg(err, "Failed to refresh farm data"));
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              {userEmail && (
                <span className="text-sm text-zinc-500">{userEmail}</span>
              )}
              <button
                onClick={handleSignOut}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Navigation bar */}
        <nav className="mb-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            {[
              { href: withFarmContext("/farm/harvest-eta"), label: "Harvest" },
              { href: withFarmContext("/farm/harvest-logs"), label: "Harvest logs" },
              { href: "#crops", label: "Crops" },
              { href: workerTasksHref, label: "Tasks" },
              { href: "#map", label: "Map" },
              { href: withFarmContext("/farm/trees"), label: "Trees" },
              { href: withFarmContext("/farm/planting-plan"), label: "Planting plan" },
              { href: withFarmContext("/farm/seedlings"), label: "Seedlings" },
              { href: withFarmContext("/plants"), label: "Plants" },
              { href: withFarmContext("/fertiliser"), label: "Fertiliser" },
              { href: withFarmContext("/farm/compost"), label: "Compost" },
              { href: withFarmContext("/farm/soil-tests"), label: "Soil tests" },
              { href: withFarmContext("/farm/work-hours"), label: "Work hours" },
              { href: withFarmContext("/farm/systems"), label: "Systems" },
              { href: withFarmContext("/companion"), label: "Companion planting" },
              { href: withFarmContext("/income-prediction"), label: "Income prediction" },
              { href: withFarmContext("/farm/settings"), label: "Settings" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-zinc-100 px-3 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {noFarmMode === "create" && activeFarm && (
          <div className="mb-6 mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">New farm</h2>
              <button onClick={() => setNoFarmMode("idle")} className="text-sm text-zinc-400 hover:text-zinc-600">Close</button>
            </div>
            <form onSubmit={handleCreateFarm} className="mt-4 space-y-4">
              <input
                type="text"
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                placeholder="Farm name"
                required
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={creatingFarm}
                className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {creatingFarm ? "Creating…" : "Create farm"}
              </button>
            </form>
          </div>
        )}

        {noFarmMode === "join" && activeFarm && (
          <div className="mb-6 mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Request to join a farm</h2>
              <button onClick={() => setNoFarmMode("idle")} className="text-sm text-zinc-400 hover:text-zinc-600">Close</button>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Browse available farms or filter by name.</p>
            <input
              type="text"
              value={joinSearch}
              onChange={(e) => setJoinSearch(e.target.value)}
              placeholder="Filter farms…"
              className="mt-4 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
            />
            {loadingAllFarms ? (
              <p className="mt-4 text-sm text-zinc-500">Loading farms…</p>
            ) : (
              <>
                {(() => {
                  const filtered = allFarms.filter((f) =>
                    f.name.toLowerCase().includes(joinSearch.toLowerCase().trim())
                  );
                  if (filtered.length === 0) {
                    return (
                      <p className="mt-4 text-sm text-zinc-500">
                        {allFarms.length === 0
                          ? "No farms on the system yet."
                          : "No farms match your filter."}
                      </p>
                    );
                  }
                  return (
                    <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                      {filtered.map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 px-4 py-3">
                          <span className="text-sm font-medium">{f.name}</span>
                          {requestSent === f.id ? (
                            <span className="text-xs text-green-600 font-medium">Request sent</span>
                          ) : (
                            <button
                              onClick={() => handleRequestJoin(f.id)}
                              disabled={requestingId === f.id}
                              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                            >
                              {requestingId === f.id ? "Sending…" : "Request to join"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading && !activeFarm ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            Loading...
          </div>
        ) : null}

        {!loading && !activeFarm ? (
          <div className="mx-auto max-w-md space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
              <p className="text-lg font-semibold">Welcome to Shamba</p>
              <p className="mt-1 text-sm text-zinc-500">Create a new farm or request to join an existing one.</p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => setNoFarmMode(noFarmMode === "create" ? "idle" : "create")}
                  className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Create a farm
                </button>
                <button
                  onClick={() => {
                    const next = noFarmMode === "join" ? "idle" : "join";
                    setNoFarmMode(next);
                    if (next === "join") loadAllFarms();
                  }}
                  className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Request to join a farm
                </button>
              </div>
            </div>

            {noFarmMode === "create" && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold">New farm</h2>
                <form onSubmit={handleCreateFarm} className="mt-4 space-y-4">
                  <input
                    type="text"
                    value={newFarmName}
                    onChange={(e) => setNewFarmName(e.target.value)}
                    placeholder="Farm name"
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  />
                  <button
                    type="submit"
                    disabled={creatingFarm}
                    className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {creatingFarm ? "Creating…" : "Create farm"}
                  </button>
                </form>
              </div>
            )}

            {noFarmMode === "join" && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold">Request to join</h2>
                <p className="mt-1 text-sm text-zinc-500">Browse available farms or filter by name.</p>
                <input
                  type="text"
                  value={joinSearch}
                  onChange={(e) => setJoinSearch(e.target.value)}
                  placeholder="Filter farms…"
                  className="mt-4 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                />
                {loadingAllFarms ? (
                  <p className="mt-4 text-sm text-zinc-500">Loading farms…</p>
                ) : (
                  <>
                    {(() => {
                      const filtered = allFarms.filter((f) =>
                        f.name.toLowerCase().includes(joinSearch.toLowerCase().trim())
                      );
                      if (filtered.length === 0) {
                        return (
                          <p className="mt-4 text-sm text-zinc-500">
                            {allFarms.length === 0
                              ? "No farms on the system yet."
                              : "No farms match your filter."}
                          </p>
                        );
                      }
                      return (
                        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                          {filtered.map((f) => (
                            <div key={f.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 px-4 py-3">
                              <span className="text-sm font-medium">{f.name}</span>
                              {requestSent === f.id ? (
                                <span className="text-xs text-green-600 font-medium">Request sent ✓</span>
                              ) : (
                                <button
                                  onClick={() => handleRequestJoin(f.id)}
                                  disabled={requestingId === f.id}
                                  className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                                >
                                  {requestingId === f.id ? "Sending…" : "Request to join"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        ) : null}

        {activeFarm ? (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              {(
                [
                  { key: "crop", label: "+ Crop" },
                  { key: "task", label: "+ Task" },
                  { key: "harvest", label: "+ Harvest" },
                  { key: "pest", label: "+ Pest" },
                  { key: "sale", label: "+ Sale" },
                  { key: "expense", label: "+ Expense" },
                  { key: "asset", label: "+ Asset" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveForm(activeForm === key ? null : key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeForm === key
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeForm && ["crop", "task", "harvest", "expense", "asset", "pest", "sale"].includes(activeForm) ? (
              <div className="mb-6 max-w-sm">
                {activeForm === "crop" && (
                  <CropForm
                    zones={zones}
                    key={`crop-form-${preferredCropZoneId || "none"}-${selectedMapBedId || "none"}`}
                    defaultZoneId={preferredCropZoneId}
                    onSubmit={async (data) => {
                      const ok = await handleCreateCrop(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
                {activeForm === "task" && (
                  <TaskForm
                    zones={zones}
                    crops={crops}
                    members={members}
                    defaultZoneId={defaultZoneId}
                    onSubmit={async (data) => {
                      const ok = await handleCreateTask(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
                {activeForm === "harvest" && (
                  <HarvestForm
                    zones={zones}
                    crops={crops}
                    defaultCropId={defaultCropId}
                    defaultZoneId={defaultZoneId}
                    onSubmit={async (data) => {
                      const ok = await handleLogHarvest(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
                {activeForm === "expense" && (
                  <ExpenseForm
                    zones={zones}
                    crops={crops}
                    defaultZoneId={defaultZoneId}
                    onSubmit={async (data) => {
                      const ok = await handleLogExpense(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
                {activeForm === "asset" && (
                  <AssetForm
                    onSubmit={async (data) => {
                      const ok = await handleLogAsset(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
                {activeForm === "pest" && (
                  <PestForm
                    zones={zones}
                    crops={crops}
                    defaultZoneId={defaultZoneId}
                    onSubmit={async (data) => {
                      const ok = await handleLogPest(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
                {activeForm === "sale" && (
                  <SaleForm
                    crops={crops}
                    onSubmit={async (data) => {
                      const ok = await handleLogSale(data);
                      if (ok) setActiveForm(null);
                      return ok;
                    }}
                  />
                )}
              </div>
            ) : null}

            <section className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Tasks today
                </p>
                <p className="mt-3 text-3xl font-semibold">{tasksToday.length}</p>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Open tasks
                </p>
                <p className="mt-3 text-3xl font-semibold">{openTasks.length}</p>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Ready to harvest
                </p>
                <p className="mt-3 text-3xl font-semibold">{readyToHarvest.length}</p>
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Open tasks</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    All todo and in-progress tasks, due soonest first.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{openTasks.length} open</span>
                  {((groupedOpenTasks.find(g => g.isCurrentUser)?.tasks.length) ?? 0) > 3 && (
                    <button
                      onClick={() => setExpandAllTasks(!expandAllTasks)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition"
                    >
                      {expandAllTasks ? "Show less" : "Show all"}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveForm(activeForm === "task" ? null : "task")}
                    className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    {activeForm === "task" ? "Cancel" : "+ New task"}
                  </button>
                  <Link
                    href={workerTasksHref}
                    className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Worker view
                  </Link>
                </div>
              </div>

              <div className="mt-5 space-y-6">
                {openTasks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No open tasks.</p>
                ) : (
                  displayedTaskGroups.map((group) => (
                    <div key={group.key}>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                        {group.label}
                        <span className="ml-2 text-xs font-normal">({group.tasks.length}{!expandAllTasks && group.isCurrentUser && group.tasks.length < groupedOpenTasks.find(g => g.isCurrentUser)?.tasks.length! ? `/${groupedOpenTasks.find(g => g.isCurrentUser)?.tasks.length}` : ''})</span>
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.tasks.map((task) => {

                    const isCompleting = completingTaskId === task.id;
                    const isDeleting = deletingTaskId === task.id;
                    const isSaving = savingTaskId === task.id;
                    const isEditing = editingTaskId === task.id;
                    const isToday = task.due_date === today;
                    return (
                      <div key={task.id} className="rounded-2xl border border-zinc-200 p-4">
                        {isEditing && editingTaskForm ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingTaskForm.title}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, title: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="Task title"
                            />
                            <textarea
                              value={editingTaskForm.description}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="Description"
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingTaskForm.status}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, status: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="todo">todo</option>
                                <option value="in_progress">in_progress</option>
                                <option value="done">done</option>
                              </select>
                              <select
                                value={editingTaskForm.priority}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, priority: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="low">low</option>
                                <option value="medium">medium</option>
                                <option value="high">high</option>
                                <option value="urgent">urgent</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingTaskForm.zone_id}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, zone_id: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="">No bed</option>
                                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                              </select>
                              <select
                                value={editingTaskForm.crop_id}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, crop_id: e.target.value } : prev)}
                                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              >
                                <option value="">General task</option>
                                {crops.map((c) => <option key={c.id} value={c.id}>{c.crop_name}{c.variety ? ` · ${c.variety}` : ""}</option>)}
                              </select>
                            </div>
                            <select
                              value={editingTaskForm.assigned_to}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, assigned_to: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => <option key={m.profile_id} value={m.profile_id}>{m.user_email ?? m.profile_id}</option>)}
                            </select>
                            <input
                              type="date"
                              value={editingTaskForm.due_date}
                              onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, due_date: e.target.value } : prev)}
                              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingTaskForm.proof_required}
                                onChange={(e) => setEditingTaskForm((prev) => prev ? { ...prev, proof_required: e.target.checked } : prev)}
                              />
                              Photo proof required
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateTask(task.id, editingTaskForm)}
                                disabled={isSaving || !editingTaskForm.title.trim()}
                                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => { setEditingTaskId(null); setEditingTaskForm(null); }}
                                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}>
                                {task.status}
                              </span>
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                {task.priority}
                              </span>
                              {isToday ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  today
                                </span>
                              ) : null}
                              {task.proof_required ? (
                                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                  photo proof
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-3 text-base font-semibold">{task.title}</h3>

                            <div className="mt-2 text-sm text-zinc-600">
                              {task.zone?.[0]?.name ?? "No bed"}
                              <span className="mx-2">·</span>
                              {task.crop?.[0]?.crop_name ?? "General task"}
                              <span className="mx-2">·</span>
                              {formatDate(task.due_date)}
                            </div>

                            {task.assigned_to ? (
                              <p className="mt-1.5 text-xs text-indigo-600 font-medium">{memberEmailMap[task.assigned_to] ?? task.assigned_to}</p>
                            ) : null}

                            {task.description ? (
                              <p className="mt-2 text-sm text-zinc-500">{task.description}</p>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleCompleteTask(task)}
                                disabled={isCompleting || isDeleting}
                                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCompleting ? "Completing..." : "Mark done"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTaskForm({
                                    title: task.title,
                                    description: task.description ?? "",
                                    zone_id: task.zone_id ?? "",
                                    crop_id: task.crop_id ?? "",
                                    assigned_to: task.assigned_to ?? "",
                                    status: task.status ?? "todo",
                                    priority: task.priority ?? "medium",
                                    due_date: task.due_date ?? "",
                                    proof_required: task.proof_required ?? false,
                                  });
                                }}
                                disabled={isCompleting || isDeleting}
                                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={isCompleting || isDeleting}
                                className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <div>
                  <h2 className="text-xl font-semibold">Completed tasks</h2>
                  <p className="mt-1 text-sm text-zinc-500">{completedTasks.length} done or cancelled</p>
                </div>
                <span className="text-sm text-zinc-500">{showCompleted ? "Hide" : "Show"}</span>
              </button>

              {showCompleted ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedTasks.length === 0 ? (
                    <p className="text-sm text-zinc-500">No completed tasks yet.</p>
                  ) : (
                    completedTasks.map((task) => {
                      const isDeleting = deletingTaskId === task.id;
                      return (
                        <div key={task.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(task.status)}`}>
                              {task.status}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                              {task.priority}
                            </span>
                          </div>

                          <h3 className="mt-3 text-base font-medium text-zinc-600 line-through">{task.title}</h3>

                          <div className="mt-2 text-sm text-zinc-400">
                            {task.zone?.[0]?.name ?? "No bed"}
                            <span className="mx-2">·</span>
                            {task.crop?.[0]?.crop_name ?? "General task"}
                            <span className="mx-2">·</span>
                            {formatDate(task.due_date)}
                          </div>

                          {task.description ? (
                            <p className="mt-2 text-sm text-zinc-400">{task.description}</p>
                          ) : null}

                          <div className="mt-3">
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={isDeleting}
                              className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </section>

            <section id="map" className="mb-6 scroll-mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Beds map</h2>
                  <p className="mt-1 text-sm text-zinc-500">Planting areas and what is growing in each.</p>
                </div>
                <span className="text-sm text-zinc-500">{zones.length} mapped beds</span>
              </div>
              <div className="mt-5">
                <FarmMap
                  zones={zones}
                  crops={crops}
                  plants={plants}
                  fertilisations={fertilisations}
                  compostEntries={compostEntries}
                  harvestEta={harvestEtaEntries}
                  farmName={activeFarm?.name}
                  farmId={activeFarm?.id}
                  onSelectBed={handleMapBedSelection}
                  onAddCropToBed={handleAddCropFromMap}
                />
                <p className="mt-2 text-xs text-zinc-400">
                  Click a bed to see details and quickly add crops.
                </p>
              </div>
            </section>

            <div id="crops" className="scroll-mt-4 space-y-6">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">Crop tracker</h2>
                        <p className="mt-1 text-sm text-zinc-500">
                          What is planted, where it is, and how much it is really yielding.
                        </p>
                        {selectedMapBedId ? (
                          <p className="mt-2 text-xs text-emerald-700">
                            Bed {selectedMapBedId} selected{selectedMapZone ? ` · mapped bed ${selectedMapZone.name}` : " · bed not mapped yet"}.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">{filteredCrops.length} of {crops.length} crops</span>
                        {filteredCrops.length > 3 && (
                          <button
                            onClick={() => setExpandAllCrops(!expandAllCrops)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition"
                          >
                            {expandAllCrops ? "Show less" : "Show all"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={cropSearch}
                        onChange={(e) => setCropSearch(e.target.value)}
                        placeholder="Search crops, variety, status, or bed…"
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      />
                      {cropSearch ? (
                        <button
                          type="button"
                          onClick={() => setCropSearch("")}
                          className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            <th className="px-4 py-3 text-left">Crop</th>
                            <th className="px-4 py-3 text-left">Bed</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Planted</th>
                            <th className="px-4 py-3 text-left">Harvest</th>
                            <th className="px-4 py-3 text-left">Yield</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {crops.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-6 text-zinc-500">No crops yet.</td></tr>
                          ) : filteredCrops.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-6 text-zinc-500">No crops match your search.</td></tr>
                          ) : (
                            visibleCrops.map((crop) =>
                              editingCropId === crop.id ? (
                                <tr key={crop.id} className="border-b border-zinc-100 bg-amber-50/40">
                                  <td className="px-3 py-2">
                                    <input type="text" value={editingCropForm.crop_name}
                                      onChange={(e) => setEditingCropForm((p) => ({ ...p, crop_name: e.target.value }))}
                                      className="w-full min-w-[100px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                                    <input type="text" value={editingCropForm.variety} placeholder="Variety"
                                      onChange={(e) => setEditingCropForm((p) => ({ ...p, variety: e.target.value }))}
                                      className="mt-1 w-full min-w-[100px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="space-y-2">
                                      {editingCropForm.zone_ids.map((zid, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                          <select value={zid}
                                            onChange={(e) => setEditingCropForm((p) => {
                                              const next = [...p.zone_ids];
                                              next[idx] = e.target.value;
                                              return { ...p, zone_ids: next };
                                            })}
                                            className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-base sm:text-sm outline-none focus:border-zinc-900">
                                            <option value="">Select bed</option>
                                            {zones.map((z) => (
                                              <option key={z.id} value={z.id}
                                                disabled={editingCropForm.zone_ids.includes(z.id) && z.id !== zid}>
                                                {z.name}
                                              </option>
                                            ))}
                                          </select>
                                          <button type="button" onClick={() => setEditingCropForm((p) => ({ ...p, zone_ids: p.zone_ids.filter((_, i) => i !== idx) }))}
                                            className="flex-shrink-0 rounded-lg border border-zinc-200 p-2 sm:p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                                            <X size={16} className="sm:w-3.5 sm:h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                      {editingCropForm.zone_ids.length < zones.length && (
                                        <button type="button" onClick={() => setEditingCropForm((p) => ({ ...p, zone_ids: [...p.zone_ids, ""] }))}
                                          className="flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-2 py-2 sm:py-1 text-sm sm:text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700">
                                          <Plus size={16} className="sm:w-3 sm:h-3" /> {editingCropForm.zone_ids.length === 0 ? "Add bed" : "Add bed"}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select value={editingCropForm.status}
                                      onChange={(e) => setEditingCropForm((p) => ({ ...p, status: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900">
                                      <option value="planned">planned</option>
                                      <option value="planted">planted</option>
                                      <option value="germinating">germinating</option>
                                      <option value="growing">growing</option>
                                      <option value="harvest_ready">harvest_ready</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="date" value={editingCropForm.planted_on}
                                      onChange={(e) => setEditingCropForm((p) => ({ ...p, planted_on: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="date" value={editingCropForm.expected_harvest_start}
                                      onChange={(e) => setEditingCropForm((p) => ({ ...p, expected_harvest_start: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="number" step="0.01" value={editingCropForm.estimated_yield_kg} placeholder="kg"
                                      onChange={(e) => setEditingCropForm((p) => ({ ...p, estimated_yield_kg: e.target.value }))}
                                      className="w-full min-w-[70px] rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900" />
                                  </td>
                                  <td className="px-3 py-2" colSpan={2}>
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-zinc-500">Notes</label>
                                      <textarea
                                        value={editingCropForm.notes}
                                        onChange={(e) => setEditingCropForm((p) => ({ ...p, notes: e.target.value }))}
                                        className="min-h-[60px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                        placeholder="Growing conditions, observations…"
                                      />
                                      <label className="block text-xs font-medium text-zinc-500">Medicinal properties</label>
                                      <textarea
                                        value={editingCropForm.medicinal_properties}
                                        onChange={(e) => setEditingCropForm((p) => ({ ...p, medicinal_properties: e.target.value }))}
                                        className="min-h-[60px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                        placeholder="Known medicinal uses, healing properties…"
                                      />
                                      <label className="block text-xs font-medium text-zinc-500">Photo</label>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCropImageFileChange}
                                        className="w-full text-xs text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-zinc-200"
                                      />
                                      {cropImagePreview && (
                                        <img
                                          src={cropImagePreview}
                                          alt="Preview"
                                          className="mt-2 h-24 w-full rounded-lg object-cover"
                                        />
                                      )}
                                      <div className="flex gap-1">
                                        <button onClick={() => handleSaveCrop(crop.id)} disabled={savingCropId === crop.id}
                                          className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                                          {savingCropId === crop.id ? "\u2026" : "Save"}
                                        </button>
                                        <button onClick={() => setEditingCropId(null)}
                                          className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <React.Fragment key={crop.id}>
                                <tr className={`border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors cursor-pointer ${expandedCropId === crop.id ? "bg-zinc-50" : ""}`}
                                    onClick={() => toggleExpandCrop(crop)}>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <span className={`inline-block transition-transform text-zinc-400 ${expandedCropId === crop.id ? "rotate-90" : ""}`}>&#9654;</span>
                                      {crop.image_url && (
                                        <img src={crop.image_url} alt={crop.crop_name} className="h-10 w-10 rounded-lg object-cover" />
                                      )}
                                      <div>
                                        <div className="font-semibold">{crop.crop_name}</div>
                                        <div className="text-zinc-500">{crop.variety || "\u2014"}</div>
                                      </div>
                                    </div>
                                    {(crop.notes || crop.medicinal_properties) && expandedCropId !== crop.id && (
                                      <div className="mt-1 ml-5 space-y-0.5">
                                        {crop.notes && <div className="text-xs text-zinc-400 truncate max-w-[180px]">📝 Has notes</div>}
                                        {crop.medicinal_properties && <div className="text-xs text-emerald-600 truncate max-w-[180px]">🌿 {crop.medicinal_properties}</div>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">{
                                    crop.zone_ids?.length
                                      ? crop.zone_ids.map((zid) => zones.find((z) => z.id === zid)?.name).filter(Boolean).join(", ") || "Unknown bed"
                                      : crop.zone?.[0]?.name || (crop.zone_id ? zones.find((z) => z.id === crop.zone_id)?.name ?? "Unknown bed" : "No bed")
                                  }</td>
                                  <td className="px-4 py-4">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(crop.status)}`}>
                                      {crop.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">{formatDate(crop.planted_on)}</td>
                                  <td className="px-4 py-4">{formatDate(crop.expected_harvest_start)}</td>
                                  <td className="px-4 py-4">{crop.actual_yield_kg ?? 0} kg</td>
                                  <td className="px-4 py-4">
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                      {selectedMapZoneId ? (
                                        <button
                                          onClick={() => handleAssignCropToSelectedBed(crop)}
                                          disabled={assigningCropId === crop.id}
                                          className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                        >
                                          {assigningCropId === crop.id ? "Assigning…" : `Assign to ${selectedMapBedId || "bed"}`}
                                        </button>
                                      ) : null}
                                      <button onClick={() => startEditCrop(crop)}
                                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100">
                                        Edit
                                      </button>
                                      <button onClick={() => handleDeleteCrop(crop.id)} disabled={deletingCropId === crop.id}
                                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                                        {deletingCropId === crop.id ? "\u2026" : "Del"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedCropId === crop.id && (
                                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                                    <td colSpan={7} className="px-4 py-4">
                                      <div className="ml-5 space-y-3">
                                        <label className="block text-sm font-medium text-zinc-700">Notes</label>
                                        <textarea
                                          value={cropNoteText}
                                          onChange={(e) => setCropNoteText(e.target.value)}
                                          className="min-h-[100px] w-full max-w-lg rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                                          placeholder="Add notes — growing conditions, observations…"
                                        />
                                        <label className="block text-sm font-medium text-zinc-700">Medicinal properties</label>
                                        <textarea
                                          value={cropMedicinalText}
                                          onChange={(e) => setCropMedicinalText(e.target.value)}
                                          className="min-h-[80px] w-full max-w-lg rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                                          placeholder="Known medicinal uses, healing properties…"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleSaveCropNote(crop.id)}
                                            disabled={savingCropNote}
                                            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                                            {savingCropNote ? "Saving…" : "Save note"}
                                          </button>
                                          <button
                                            onClick={() => { setExpandedCropId(null); setCropNoteText(""); }}
                                            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                                            Close
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                </React.Fragment>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <button
                    onClick={() => setShowAssets((v) => !v)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <h2 className="text-xl font-semibold">Assets</h2>
                      <p className="mt-1 text-sm text-zinc-500">{assets.length} logged</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveForm(activeForm === "asset" ? null : "asset"); }}
                        className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        {activeForm === "asset" ? "Cancel" : "+ Log asset"}
                      </button>
                      <span className="text-sm text-zinc-500">{showAssets ? "Hide" : "Show"}</span>
                    </div>
                  </button>

                  {activeForm === "asset" && (
                    <div className="mt-5 max-w-sm">
                      <AssetForm
                        onSubmit={async (data) => {
                          const ok = await handleLogAsset(data);
                          if (ok) setActiveForm(null);
                          return ok;
                        }}
                      />
                    </div>
                  )}

                  {showAssets ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-5 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <div>Name</div>
                      <div>Category</div>
                      <div>Paid by</div>
                      <div>Price</div>
                      <div>Condition</div>
                    </div>

                    {assets.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No assets logged yet.</div>
                    ) : (
                      assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="grid grid-cols-5 gap-4 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            {asset.notes ? (
                              <div className="text-zinc-500">{asset.notes}</div>
                            ) : null}
                          </div>
                          <div className="capitalize">{asset.category}</div>
                          <div>{asset.paid_by ?? "—"}</div>
                          <div>{asset.purchase_price ? formatMoney(asset.purchase_price) : "—"}</div>
                          <div className="capitalize">{asset.condition ?? "—"}</div>
                        </div>
                      ))
                    )}
                  </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">New plants added</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Recently added to the plants gallery.
                      </p>
                    </div>
                    <Link href={withFarmContext("/plants")} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                      View all
                    </Link>
                  </div>

                  {plants.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500">No plants added yet.</div>
                  ) : (
                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {plants.slice(0, 8).map((plant) => (
                        <Link key={plant.id} href={withFarmContext("/plants")} className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
                          {plant.image_url ? (
                            <img src={plant.image_url} alt={plant.name ?? "Plant"} className="aspect-square w-full object-cover" />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center bg-zinc-100">
                              <span className="text-2xl text-zinc-300">🌱</span>
                            </div>
                          )}
                          <div className="p-3">
                            <div className="text-sm font-medium truncate">{plant.name ?? "Unnamed"}</div>
                            {plant.notes && <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{plant.notes}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Pest log</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Issues spotted and actions taken.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">{pests.length} logged</span>
                  </div>

                  {pests.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500">No pest issues logged yet.</div>
                  ) : (
                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {pests.map((pest) => {
                        const isEditing = editingPestId === pest.id;
                        const isDeleting = deletingPestId === pest.id;

                        if (isEditing) {
                          return (
                            <div key={pest.id} className="col-span-full rounded-2xl border border-zinc-200 p-4">
                              <PestForm
                                zones={zones}
                                crops={crops}
                                defaultZoneId=""
                                submitLabel="Save changes"
                                initialData={{
                                  pest_name: pest.pest_name,
                                  severity: pest.severity,
                                  description: pest.description ?? "",
                                  action_taken: pest.action_taken ?? "",
                                  logged_date: pest.logged_date,
                                  crop_id: pest.crop_id ?? "",
                                  zone_id: pest.zone_id ?? "",
                                  image_url: pest.image_url ?? "",
                                  image_file: null,
                                }}
                                onSubmit={(data) => handleUpdatePest(pest.id, data)}
                              />
                              <button
                                onClick={() => setEditingPestId(null)}
                                className="mt-2 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                              >
                                Cancel
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={pest.id} className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                            {/* Image / placeholder */}
                            {pest.image_url ? (
                              <img src={pest.image_url} alt={pest.pest_name} className="aspect-square w-full object-cover" />
                            ) : (
                              <div className="flex aspect-square w-full items-center justify-center bg-zinc-100">
                                <span className="text-2xl text-zinc-300">🐛</span>
                              </div>
                            )}

                            {/* Info */}
                            <div className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{pest.pest_name}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                  pest.severity === "high"
                                    ? "bg-rose-100 text-rose-700"
                                    : pest.severity === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {pest.severity}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-zinc-400">
                                {formatDate(pest.logged_date)}
                                {(pest.crop?.[0]?.crop_name || pest.zone?.[0]?.name) && " · "}
                                {pest.crop?.[0]?.crop_name ?? ""}{pest.crop?.[0]?.crop_name && pest.zone?.[0]?.name ? " · " : ""}{pest.zone?.[0]?.name ?? ""}
                              </div>
                              {pest.description && <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{pest.description}</p>}
                              {pest.action_taken && <p className="mt-1 text-xs text-zinc-400 line-clamp-2">Action: {pest.action_taken}</p>}
                              <div className="mt-2 flex gap-1">
                                <button
                                  onClick={() => setEditingPestId(pest.id)}
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
                                >
                                  Edit
                                </button>
                                {confirmDeletePestId === pest.id ? (
                                  <button
                                    onClick={() => handleDeletePest(pest.id)}
                                    disabled={isDeleting}
                                    className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                                  >
                                    {isDeleting ? "…" : "Confirm"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeletePestId(pest.id)}
                                    className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              <ActivityFeed activities={activities} />
            </div>

            <section className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Total sales
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{formatMoney(totalSales)}</p>
                  <p className="mt-1 text-xs text-zinc-400">Actual revenue from logged sales</p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Total expenses
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{formatMoney(totalExpenses)}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Net: {formatMoney(totalSales - totalExpenses)}
                  </p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Expected income
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{formatMoney(forecastRevenue)}</p>
                  <p className="mt-1 text-xs text-zinc-400">Based on estimated yield × price per kg</p>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Sales</h2>
                    <p className="mt-1 text-sm text-zinc-500">Most recent 20 sales.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-500">{sales.length} logged</span>
                    <button
                      onClick={() => setActiveForm(activeForm === "sale" ? null : "sale")}
                      className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      {activeForm === "sale" ? "Cancel" : "+ Log sale"}
                    </button>
                  </div>
                </div>

                {activeForm === "sale" && (
                  <div className="mt-5 max-w-sm">
                    <SaleForm
                      crops={crops}
                      onSubmit={async (data) => {
                        const ok = await handleLogSale(data);
                        if (ok) setActiveForm(null);
                        return ok;
                      }}
                    />
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  {sales.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500">No sales yet.</div>
                  ) : (
                    sales.map((sale) => (
                      <div key={sale.id} className="rounded-2xl border border-zinc-200 bg-white">
                        <div className="flex items-start justify-between gap-3 px-4 py-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {sale.crop?.[0]?.crop_name && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{sale.crop[0].crop_name}</span>
                              )}
                              <span className="text-xs text-zinc-400">{formatDate(sale.sale_date)}</span>
                              {sale.buyer_name && <span className="text-xs text-zinc-400">· {sale.buyer_name}</span>}
                            </div>
                            {sale.quantity_kg != null && (
                              <p className="mt-1 text-sm text-zinc-600">
                                {sale.quantity_kg} kg
                                {sale.price_per_kg != null ? ` @ ${formatMoney(sale.price_per_kg)}/kg` : ""}
                              </p>
                            )}
                            {sale.notes && <p className="mt-1 text-sm text-zinc-500">{sale.notes}</p>}
                            <p className="mt-1 text-sm font-semibold">{sale.total_amount != null ? formatMoney(sale.total_amount) : <span className="text-zinc-400 font-normal">Amount TBC</span>}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <button
                  onClick={() => setShowExpenses((v) => !v)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <div>
                    <h2 className="text-xl font-semibold">Expenses</h2>
                    <p className="mt-1 text-sm text-zinc-500">{expenses.length} logged</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveForm(activeForm === "expense" ? null : "expense"); }}
                      className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      {activeForm === "expense" ? "Cancel" : "+ Log expense"}
                    </button>
                    <span className="text-sm text-zinc-500">{showExpenses ? "Hide" : "Show"}</span>
                  </div>
                </button>

                {activeForm === "expense" && (
                  <div className="mt-5 max-w-sm">
                    <ExpenseForm
                      zones={zones}
                      crops={crops}
                      defaultZoneId={defaultZoneId}
                      onSubmit={async (data) => {
                        const ok = await handleLogExpense(data);
                        if (ok) setActiveForm(null);
                        return ok;
                      }}
                    />
                  </div>
                )}

                {showExpenses ? (
                <div className="mt-5 space-y-2">
                  {expenses.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500">No expenses yet.</div>
                  ) : (
                    expenses.map((expense) => (
                      <div key={expense.id} className="rounded-2xl border border-zinc-200 bg-white">
                        {editingExpenseId === expense.id && editingExpenseForm ? (
                          <div className="p-4">
                            <ExpenseForm
                              zones={zones}
                              crops={crops}
                              defaultZoneId={defaultZoneId}
                              initial={editingExpenseForm}
                              submitLabel="Save changes"
                              onSubmit={async (data) => handleUpdateExpense(expense.id, data)}
                            />
                            <button
                              onClick={() => { setEditingExpenseId(null); setEditingExpenseForm(null); }}
                              className="mt-2 text-sm text-zinc-500 hover:text-zinc-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3 px-4 py-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700">{expense.category}</span>
                                <span className="text-xs text-zinc-400">{formatDate(expense.expense_date)}</span>
                                {expense.vendor_name && <span className="text-xs text-zinc-400">· {expense.vendor_name}</span>}
                              </div>
                              {expense.notes && <p className="mt-1 text-sm text-zinc-700">{expense.notes}</p>}
                              <p className="mt-1 text-sm font-semibold">{expense.amount != null ? formatMoney(expense.amount) : <span className="text-zinc-400 font-normal">Amount TBC</span>}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {confirmDeleteExpenseId === expense.id ? (
                                <>
                                  <span className="text-xs text-red-600">Sure?</span>
                                  <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    disabled={deletingExpenseId === expense.id}
                                    className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {deletingExpenseId === expense.id ? "Deleting…" : "Yes, delete"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteExpenseId(null)}
                                    className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingExpenseId(expense.id);
                                      setEditingExpenseForm({
                                        category: expense.category,
                                        amount: expense.amount != null ? String(expense.amount) : "",
                                        expense_date: expense.expense_date,
                                        notes: expense.notes ?? "",
                                        vendor_name: expense.vendor_name ?? "",
                                        crop_id: expense.crop_id ?? "",
                                        zone_id: expense.zone_id ?? "",
                                      });
                                    }}
                                    className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteExpenseId(expense.id)}
                                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

      </div>
    </main>
  );
}
