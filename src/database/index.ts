import type { Item, Project, SearchQuery } from "../types"
import { computeItemHash } from "../utils"

const DB_NAME = "pickquote-db"
const DB_VERSION = 6

type TableNames = "items" | "projects"

// ---- Cross-context change notification ----
// Any successful write transaction automatically broadcasts a version stamp
// via chrome.storage.local. All extension bundles (SW, options, popups) listen
// to chrome.storage.onChanged, so every context gets notified without bridges.
async function broadcastDbChange(name: TableNames): Promise<void> {
  try {
    if (typeof chrome?.storage?.local?.set === "function") {
      await chrome.storage.local.set({ [name === "projects" ? "_dbp" : "_dbi"]: Date.now() })
    }
  } catch {}
}
// ---- End change notification ----

function openDb(version?: number): Promise<IDBDatabase> {
  const v = version ?? DB_VERSION
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, v)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("items")) {
        const store = db.createObjectStore("items", { keyPath: "id" })
        store.createIndex("type", "type", { unique: false })
        store.createIndex("createdAt", "createdAt", { unique: false })
        store.createIndex("sourceSite", "sourceSite", { unique: false })
        store.createIndex("projectId", "projectId", { unique: false })
        store.createIndex("hash", "hash", { unique: false })
      } else {
        // migrate: remove tags index if exists
        try {
          const tx = req.transaction as IDBTransaction
          const store = tx.objectStore("items")
          if (
            store.indexNames &&
            (store.indexNames as any).contains?.("tags")
          ) {
            store.deleteIndex("tags")
          }
        } catch {}
        // v3 migration: add projectId index if missing
        try {
          const tx = req.transaction as IDBTransaction
          const store = tx.objectStore("items")
          if (!(store.indexNames as any).contains?.("projectId")) {
            store.createIndex("projectId", "projectId", { unique: false })
          }
        } catch {}
      }
      if (!db.objectStoreNames.contains("projects")) {
        const ps = db.createObjectStore("projects", { keyPath: "id" })
        ps.createIndex("name", "name", { unique: true })
      }
      // v6 migration: remove deprecated stores
      if (db.objectStoreNames.contains("categories")) {
        db.deleteObjectStore("categories")
      }
      if (db.objectStoreNames.contains("sources")) {
        db.deleteObjectStore("sources")
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(
  name: TableNames,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
  _retry = true
): Promise<T> {
  let db: IDBDatabase | null = null
  try {
    db = await openDb()
    const tx = db.transaction(name, mode)
    const store = tx.objectStore(name)
    const result = await fn(store)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        if (mode === "readwrite") broadcastDbChange(name)
        resolve()
      }
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    return result
  } catch (err) {
    // If the store doesn't exist, force a version upgrade to create it
    if (
      _retry &&
      err instanceof DOMException &&
      err.name === "NotFoundError"
    ) {
      const upDb = await openDb(DB_VERSION + 1)
      upDb.close()
      return withStore(name, mode, fn, false)
    }
    throw err
  } finally {
    db?.close()
  }
}

export async function isDuplicate(
  hash: string,
  projectId?: string,
  sourceUrl?: string
): Promise<boolean> {
  return withStore("items", "readonly", async (store) => {
    const idx = store.index("hash")
    return new Promise<boolean>((resolve, reject) => {
      const req = idx.openCursor(IDBKeyRange.only(hash))
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) {
          resolve(false)
          return
        }
        const val = cursor.value as Item
        if (
          val.projectId === projectId &&
          val.source?.url === sourceUrl
        ) {
          resolve(true)
          return
        }
        cursor.continue()
      }
      req.onerror = () => reject(req.error)
    })
  })
}

export async function addItem(item: Item): Promise<boolean> {
  const normalized: Item = {
    ...item,
    sourceSite:
      item.source?.site ??
      (item.source ? new URL(item.source.url).hostname : undefined),
    hash:
      item.hash ||
      (item.source
        ? await computeItemHash(item.content, item.source.url)
        : await computeItemHash(item.content, ""))
  }
  if (await isDuplicate(normalized.hash, normalized.projectId, normalized.source?.url)) {
    return false
  }

  await withStore("items", "readwrite", (store) => {
    store.put(normalized)
  })
  return true
}

export async function searchItems(q: SearchQuery): Promise<Item[]> {
  return withStore("items", "readonly", async (store) => {
    const results: Item[] = []
    return new Promise<Item[]>((resolve, reject) => {
      const source =
        q.projectId
          ? store.index("projectId")
          : store.index("createdAt")
      const range = q.projectId ? IDBKeyRange.only(q.projectId) : null
      const cursorReq = source.openCursor(range, q.projectId ? undefined : "prev")
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (!cursor) {
          resolve(results)
          return
        }
        const item = cursor.value as Item
        if (
          (!q.type || item.type === q.type) &&
          (!q.site || item.sourceSite === q.site) &&
          (!q.from || item.createdAt >= q.from) &&
          (!q.to || item.createdAt <= q.to) &&
          (!q.projectId || item.projectId === q.projectId) &&
          (!q.dueBefore || !item.srs || item.srs.dueDate <= q.dueBefore) &&
          (!q.tag || item.tags?.includes(q.tag)) &&
          (!q.keyword ||
            item.content?.toLowerCase().includes(q.keyword.toLowerCase()) ||
            item.source?.title?.toLowerCase().includes(q.keyword.toLowerCase()))
        ) {
          results.push(item)
        }
        cursor.continue()
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })
  })
}

export async function deleteItem(id: string): Promise<void> {
  await withStore("items", "readwrite", (store) => {
    store.delete(id)
  })
}

export async function deleteItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await withStore("items", "readwrite", (store) => {
    for (const id of ids) {
      store.delete(id)
    }
  })
}

export async function updateItem(item: Item): Promise<void> {
  await withStore("items", "readwrite", (store) => {
    store.put(item)
  })
}

export async function getRecent(limit = 10): Promise<Item[]> {
  return withStore("items", "readonly", async (store) => {
    const idx = store.index("createdAt")
    const items: Item[] = []
    return new Promise<Item[]>((resolve, reject) => {
      const cursorReq = idx.openCursor(null, "prev")
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor && items.length < limit) {
          items.push(cursor.value as Item)
          cursor.continue()
        } else {
          resolve(items)
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })
  })
}

export async function exportItems(): Promise<Item[]> {
  return withStore("items", "readonly", async (store) => {
    const all: Item[] = []
    return new Promise<Item[]>((resolve, reject) => {
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          all.push(cursor.value as Item)
          cursor.continue()
        } else {
          resolve(all)
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })
  })
}

// ---- Projects ----

export async function addProject(project: Project): Promise<void> {
  await withStore("projects", "readwrite", (store) => {
    store.put(project)
  })
}

export async function listProjects(): Promise<Project[]> {
  return withStore("projects", "readonly", async (store) => {
    const all: Project[] = []
    return new Promise<Project[]>((resolve, reject) => {
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          all.push(cursor.value as Project)
          cursor.continue()
        } else {
          all.sort((a, b) => b.createdAt - a.createdAt)
          resolve(all)
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })
  })
}

export async function getProjectByName(
  name: string
): Promise<Project | undefined> {
  return withStore("projects", "readonly", async (store) => {
    const idx = store.index("name")
    return new Promise<Project | undefined>((resolve, reject) => {
      const req = idx.get(name)
      req.onsuccess = () => resolve(req.result as Project | undefined)
      req.onerror = () => reject(req.error)
    })
  })
}

export async function updateProject(project: Project): Promise<void> {
  await withStore("projects", "readwrite", (store) => {
    store.put(project)
  })
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade: collect all item ids for this project, delete them, then delete the project record
  const itemIds: string[] = []
  await withStore("items", "readonly", (store) => {
    const idx = store.index("projectId")
    const range = IDBKeyRange.only(id)
    return new Promise<void>((resolve) => {
      const req = idx.openCursor(range)
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          itemIds.push(cursor.primaryKey as string)
          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  })
  if (itemIds.length > 0) await deleteItems(itemIds)
  await withStore("projects", "readwrite", (store) => {
    store.delete(id)
  })
}

export async function clearAllItems(): Promise<void> {
  await withStore("items", "readwrite", (store) => {
    store.clear()
  })
}

export async function clearAllProjects(): Promise<void> {
  await withStore("projects", "readwrite", (store) => {
    store.clear()
  })
}
