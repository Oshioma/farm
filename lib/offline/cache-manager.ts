// Cache manager with TTL and freshness tracking

import { getCacheMetadata, saveCacheMetadata } from "./storage";

const CACHE_TTL = {
  farms: 30 * 60 * 1000, // 30 minutes
  zones: 30 * 60 * 1000,
  crops: 30 * 60 * 1000,
  tasks: 30 * 60 * 1000,
  activities: 60 * 60 * 1000, // 1 hour
  members: 60 * 60 * 1000,
  assets: 60 * 60 * 1000,
  expenses: 4 * 60 * 60 * 1000, // 4 hours
  pests: 4 * 60 * 60 * 1000,
  sales: 4 * 60 * 60 * 1000,
  fertilisations: 4 * 60 * 60 * 1000,
  compost: 4 * 60 * 60 * 1000,
  mulch: 4 * 60 * 60 * 1000,
  plants: 4 * 60 * 60 * 1000,
  harvestEta: 4 * 60 * 60 * 1000,
};

type StoreName = keyof typeof CACHE_TTL;

export function getCacheTTL(store: StoreName): number {
  return CACHE_TTL[store] || 60 * 60 * 1000; // Default 1 hour
}

export function isCacheStale(timestamp: number, store: StoreName): boolean {
  const ttl = getCacheTTL(store);
  const age = Date.now() - timestamp;
  return age > ttl;
}

export function getTimeUntilStale(timestamp: number, store: StoreName): number {
  const ttl = getCacheTTL(store);
  const age = Date.now() - timestamp;
  return Math.max(0, ttl - age);
}

export function formatCacheAge(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export async function markCacheRefreshTime(
  store: StoreName,
  timestamp: number
): Promise<void> {
  await saveCacheMetadata(`last_fetch_${store}`, timestamp);
}

export async function getCacheRefreshTime(store: StoreName): Promise<number> {
  return (await getCacheMetadata(`last_fetch_${store}`)) || 0;
}
