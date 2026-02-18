const STORE_NAME = "peaks";

export class PeakStore {
  private db: IDBDatabase | null = null;

  constructor(private dbName = "daw-peaks") {}

  async open(): Promise<void> {
    if (this.db) return;

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async putBins(audioFileId: string, bins: Uint8Array[]): Promise<void> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (let i = 0; i < bins.length; i++) {
      store.put(bins[i], `${audioFileId}:${i}`);
    }
    // Store bin count for hasBins check
    store.put(bins.length, `${audioFileId}:__count`);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBin(audioFileId: string, binIndex: number): Promise<Uint8Array | null> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${audioFileId}:${binIndex}`);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  }

  async hasBins(audioFileId: string): Promise<boolean> {
    await this.open();
    const tx = this.db!.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${audioFileId}:__count`);

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
