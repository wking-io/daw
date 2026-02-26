import type { PeakBin } from "./bin";

const DB_VERSION = 2;
const STORE_NAME = "peaks";

type PeakMeta = {
  depth: number;
  binCounts: number[];
};

export class PeakStore {
  private db: IDBDatabase | null = null;

  constructor(private dbName = "daw-peaks") {}

  async open(): Promise<void> {
    if (this.db) return;

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        if (req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.deleteObjectStore(STORE_NAME);
        }
        req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async putPyramid(audioFileId: string, levels: PeakBin[][]): Promise<void> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const meta: PeakMeta = {
      depth: levels.length,
      binCounts: levels.map((bins) => bins.length),
    };

    store.put(meta, `${audioFileId}:__meta`);

    for (let level = 0; level < levels.length; level++) {
      const bins = levels[level]!;
      for (let i = 0; i < bins.length; i++) {
        store.put(bins[i], `${audioFileId}:L${level}:${i}`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBin(audioFileId: string, level: number, binIndex: number): Promise<PeakBin | null> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${audioFileId}:L${level}:${binIndex}`);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result instanceof Int8Array ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  }

  async getMeta(audioFileId: string): Promise<PeakMeta | null> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${audioFileId}:__meta`);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async hasBins(audioFileId: string): Promise<boolean> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${audioFileId}:__meta`);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result != null);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(): Promise<void> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
