/** Browser media library: media imported by the user, kept in IndexedDB so
 * it survives reloads and can be re-inserted into any deck. No account needed. */

export type MediaKind = "image" | "video" | "audio";

export type MediaLibraryItem = {
  id: string;
  name: string;
  kind: MediaKind;
  /** data URL — the same form the slide embeds */
  src: string;
  createdAt: number;
};

const DB_NAME = "diapolab-media";
const STORE = "media";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB error"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

const newId = () => crypto.randomUUID();

export async function listMedia(): Promise<MediaLibraryItem[]> {
  try {
    const all = await withStore<MediaLibraryItem[]>("readonly", (s) => s.getAll() as IDBRequest<MediaLibraryItem[]>);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    // IndexedDB blocked or unavailable: the panel just shows an empty library.
    return [];
  }
}

export async function saveMedia(item: {
  name: string;
  kind: MediaKind;
  src: string;
}): Promise<MediaLibraryItem> {
  const full: MediaLibraryItem = { id: newId(), createdAt: Date.now(), ...item };
  await withStore("readwrite", (s) => s.add(full));
  return full;
}

export async function removeMedia(id: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(id));
}
