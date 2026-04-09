// Simple IndexedDB wrapper for offline data caching

const DB_NAME = "farm_offline";
const DB_VERSION = 1;

const STORES = {
  farms: "farms",
  zones: "zones",
  crops: "crops",
  tasks: "tasks",
  activities: "activities",
  members: "members",
  assets: "assets",
  expenses: "expenses",
  pests: "pests",
  sales: "sales",
  fertilisations: "fertilisations",
  compost: "compost",
  plants: "plants",
  harvestEta: "harvestEta",
  metadata: "metadata", // Store timestamps and cache info
};

type StoreName = keyof typeof STORES;

export interface CachedData<T> {
  data: T;
  timestamp: number;
  farmId?: string;
}

let db: IDBDatabase | null = null;

async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores for each data type
      Object.values(STORES).forEach((store) => {
        if (!database.objectStoreNames.contains(store)) {
          database.createObjectStore(store, { keyPath: "id" });
        }
      });
    };
  });
}

export async function saveToCache<T>(
  store: StoreName,
  key: string,
  data: T,
  farmId?: string
): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction(store, "readwrite");
    const objectStore = tx.objectStore(store);

    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      farmId,
    };

    objectStore.put({ id: key, ...cachedData });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[Cache] Failed to save to ${store}:`, err);
  }
}

export async function getFromCache<T>(
  store: StoreName,
  key: string
): Promise<CachedData<T> | null> {
  try {
    const database = await initDB();
    const tx = database.transaction(store, "readonly");
    const objectStore = tx.objectStore(store);
    const request = objectStore.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[Cache] Failed to read from ${store}:`, err);
    return null;
  }
}

export async function getAllFromCache<T>(
  store: StoreName
): Promise<CachedData<T>[]> {
  try {
    const database = await initDB();
    const tx = database.transaction(store, "readonly");
    const objectStore = tx.objectStore(store);
    const request = objectStore.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[Cache] Failed to read all from ${store}:`, err);
    return [];
  }
}

export async function clearCache(store: StoreName): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction(store, "readwrite");
    const objectStore = tx.objectStore(store);
    objectStore.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[Cache] Failed to clear ${store}:`, err);
  }
}

export async function saveCacheMetadata(
  key: string,
  value: any
): Promise<void> {
  await saveToCache("metadata", key, value);
}

export async function getCacheMetadata(key: string): Promise<any | null> {
  const result = await getFromCache("metadata", key);
  return result?.data || null;
}

export async function markCacheRefreshTime(
  store: string,
  timestamp: number
): Promise<void> {
  await saveCacheMetadata(`${store}_refreshTime`, timestamp);
}
