import type {
  Contribution,
  ContributionOutboxRecord,
  ContributionSyncOperation,
  ContributionSyncStatus,
} from "../types";

const DB_NAME = "river-go-offline";
const DB_VERSION = 1;
const STORE_NAME = "contribution-outbox";
const FALLBACK_STORAGE_KEY = "river-go-contribution-outbox-v1";
const DEVICE_ID_STORAGE_KEY = "river-go-device-id";
const APP_VERSION = "0.1.0";

export interface ContributionOutboxStore {
  list(): Promise<ContributionOutboxRecord[]>;
  save(record: ContributionOutboxRecord): Promise<void>;
  remove(id: string): Promise<void>;
  updateStatus(
    id: string,
    syncStatus: ContributionSyncStatus,
    options?: { lastSyncError?: string; serverRevision?: number },
  ): Promise<void>;
}

export function createContributionOutboxRecord(
  contribution: Contribution,
): ContributionOutboxRecord {
  const now = new Date().toISOString();
  const operation = createContributionOperation(contribution, now);

  return {
    id: contribution.id,
    contribution,
    operation,
    syncStatus: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

export function createContributionOutboxStore(): ContributionOutboxStore {
  if (typeof indexedDB === "undefined") {
    return createLocalStorageOutboxStore();
  }

  return createIndexedDbOutboxStore();
}

function createContributionOperation(
  contribution: Contribution,
  createdAt: string,
): ContributionSyncOperation {
  const operationId = crypto.randomUUID();

  return {
    operationId,
    operationType: "contribution.create",
    entityType: "contribution",
    entityId: contribution.id,
    createdAt,
    baseRevision: null,
    payload: {
      id: contribution.id,
      type: contribution.type,
      sectionId: contribution.sectionId,
      geometry: contribution.location
        ? {
            type: "Point",
            coordinates: [contribution.location[1], contribution.location[0]],
          }
        : undefined,
      observedAt: contribution.dateObserved,
      payload: {
        title: contribution.title,
        detail: contribution.detail,
        category: contribution.category,
        severity: contribution.severity,
        craftType: contribution.craftType,
        status: contribution.status,
        confirmations: contribution.confirmations,
      },
      client: {
        deviceId: getOrCreateDeviceId(),
        createdOffline: !navigator.onLine,
        appVersion: APP_VERSION,
      },
    },
  };
}

function createIndexedDbOutboxStore(): ContributionOutboxStore {
  return {
    async list() {
      const db = await openDatabase();
      return runTransaction<ContributionOutboxRecord[]>(
        db,
        "readonly",
        (store, resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () =>
            resolve(sortRecords(request.result as ContributionOutboxRecord[]));
          request.onerror = () => reject(request.error);
        },
      );
    },

    async save(record) {
      const db = await openDatabase();
      await runTransaction<void>(db, "readwrite", (store, resolve, reject) => {
        const request = store.put({ ...record, updatedAt: new Date().toISOString() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    async remove(id) {
      const db = await openDatabase();
      await runTransaction<void>(db, "readwrite", (store, resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    async updateStatus(id, syncStatus, options) {
      const db = await openDatabase();
      await runTransaction<void>(db, "readwrite", (store, resolve, reject) => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result as ContributionOutboxRecord | undefined;

          if (!existing) {
            resolve();
            return;
          }

          const nextRecord: ContributionOutboxRecord = {
            ...existing,
            syncStatus,
            updatedAt: new Date().toISOString(),
            lastSyncError: options?.lastSyncError,
            serverRevision: options?.serverRevision ?? existing.serverRevision,
          };
          const putRequest = store.put(nextRecord);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    },
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("operationId", "operation.operationId", {
          unique: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  callback: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
  ) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    callback(store, resolve, reject);
  });
}

function createLocalStorageOutboxStore(): ContributionOutboxStore {
  return {
    async list() {
      return readFallbackRecords();
    },

    async save(record) {
      const records = readFallbackRecords();
      const nextRecords = [
        { ...record, updatedAt: new Date().toISOString() },
        ...records.filter((existing) => existing.id !== record.id),
      ];
      writeFallbackRecords(nextRecords);
    },

    async remove(id) {
      writeFallbackRecords(
        readFallbackRecords().filter((record) => record.id !== id),
      );
    },

    async updateStatus(id, syncStatus, options) {
      writeFallbackRecords(
        readFallbackRecords().map((record) =>
          record.id === id
            ? {
                ...record,
                syncStatus,
                updatedAt: new Date().toISOString(),
                lastSyncError: options?.lastSyncError,
                serverRevision: options?.serverRevision ?? record.serverRevision,
              }
            : record,
        ),
      );
    },
  };
}

function readFallbackRecords(): ContributionOutboxRecord[] {
  try {
    const rawRecords = localStorage.getItem(FALLBACK_STORAGE_KEY);
    return rawRecords ? sortRecords(JSON.parse(rawRecords)) : [];
  } catch {
    return [];
  }
}

function writeFallbackRecords(records: ContributionOutboxRecord[]) {
  localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(sortRecords(records)));
}

function sortRecords(records: ContributionOutboxRecord[]) {
  return [...records].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function getOrCreateDeviceId() {
  const existingId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
  return nextId;
}
