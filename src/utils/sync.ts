import { computeItemHash, sha256 } from "./index"
import type { Item, Project } from "../types"

const SYNC_PATH = "/Apps/lime/lime-sync.json"
const BASE_URL = "https://dav.jianguoyun.com/dav"
const TIMEOUT = 15000

export interface SyncCredentials {
  username: string
  appPassword: string
}

interface SyncPayload {
  version: number
  syncedAt: number
  contentHash: string
  deviceInfo: { version: string }
  projects: Project[]
  items: Item[]
}

export interface SyncResult {
  success: boolean
  direction: "upload" | "download" | "noop" | "error"
  message: string
  payload?: SyncPayload
}

function basicAuth(cred: SyncCredentials): string {
  return "Basic " + btoa(`${cred.username}:${cred.appPassword}`)
}

async function webdavFetch(
  cred: SyncCredentials,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: basicAuth(cred),
        ...(options.headers as Record<string, string>)
      }
    })
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function testConnection(
  cred: SyncCredentials
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await webdavFetch(cred, "/Apps/lime/", { method: "PROPFIND" })
    if (res.status === 401 || res.status === 403)
      return { ok: false, message: "认证失败，请检查用户名和 App 密码" }
    if (res.status === 404) return { ok: true, message: "目录不存在，将在同步时自动创建" }
    if (res.ok) return { ok: true, message: "连接成功" }
    return { ok: false, message: `服务器返回 ${res.status}` }
  } catch (err: any) {
    if (err.name === "AbortError") return { ok: false, message: "连接超时" }
    return { ok: false, message: `连接失败：${err.message ?? err}` }
  }
}

async function downloadSyncFile(
  cred: SyncCredentials
): Promise<SyncPayload | null> {
  const res = await webdavFetch(cred, SYNC_PATH)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}`)
  const text = await res.text()
  try {
    const payload = JSON.parse(text) as SyncPayload
    if (!payload.version || !Array.isArray(payload.items))
      throw new Error("数据格式异常：缺少 items 字段")
    return payload
  } catch (e: any) {
    throw new Error(`解析云端数据失败：${e.message ?? e}`)
  }
}

async function uploadSyncFile(
  cred: SyncCredentials,
  payload: SyncPayload
): Promise<void> {
  // Ensure /Apps/lime/ directory exists
  await webdavFetch(cred, "/Apps/lime/", { method: "MKCOL" }).catch(() => {})
  const json = JSON.stringify(payload)
  const res = await webdavFetch(cred, SYNC_PATH, {
    method: "PUT",
    body: json,
    headers: { "Content-Type": "application/json" }
  })
  if (!res.ok) throw new Error(`上传失败：HTTP ${res.status}`)
}

async function buildPayload(
  items: Item[],
  projects: Project[]
): Promise<SyncPayload> {
  const raw = JSON.stringify({ items, projects })
  const contentHash = await computeItemHash(raw, "")
  return {
    version: 2,
    syncedAt: Date.now(),
    contentHash,
    deviceInfo: { version: "0.3.0" },
    projects,
    items
  }
}

export async function runSync(
  cred: SyncCredentials,
  items: Item[],
  projects: Project[]
): Promise<SyncResult> {
  try {
    const localPayload = await buildPayload(items, projects)
    const remote = await downloadSyncFile(cred)

    if (!remote) {
      await uploadSyncFile(cred, localPayload)
      return { success: true, direction: "upload", message: "首次同步完成" }
    }

    if (localPayload.contentHash === remote.contentHash) {
      return { success: true, direction: "noop", message: "数据已一致，无需同步" }
    }

    // Data differs — upload local (last-write-wins)
    await uploadSyncFile(cred, localPayload)
    return {
      success: true,
      direction: "upload",
      message: `已上传覆盖云端版本（云端 ${new Date(remote.syncedAt).toLocaleString("zh-CN")}）`
    }
  } catch (e: any) {
    return {
      success: false,
      direction: "error",
      message: e.message ?? String(e)
    }
  }
}

export async function downloadRemote(
  cred: SyncCredentials,
  items: Item[],
  projects: Project[]
): Promise<SyncResult> {
  try {
    const remote = await downloadSyncFile(cred)
    if (!remote) {
      return { success: false, direction: "error", message: "云端暂无数据" }
    }

    const localPayload = await buildPayload(items, projects)
    if (localPayload.contentHash === remote.contentHash) {
      return { success: true, direction: "noop", message: "数据已一致" }
    }

    return {
      success: true,
      direction: "download",
      message: "",
      payload: remote
    }
  } catch (e: any) {
    return {
      success: false,
      direction: "error",
      message: e.message ?? String(e)
    }
  }
}
