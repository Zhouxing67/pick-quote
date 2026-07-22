import { useRef } from "react"

import { addItem, addProject, clearAllItems, clearAllProjects } from "../database"
import { downloadRemote, runSync, type SyncCredentials } from "../utils/sync"
import { toJsonZip } from "../utils/zip"
import type { Item, Project } from "../types"

export function useBackupSync(options: {
  projects: Project[]
  allItemsUnfiltered: Item[]
  backupSelectedIds: string[]
  setBackupSelectedIds: (ids: string[]) => void
  syncStatus: string
  setSyncStatus: (status: string) => void
  refreshAllData: () => Promise<void>
  setSnackbarMsg: (msg: string) => void
}) {
  const {
    projects,
    allItemsUnfiltered,
    backupSelectedIds,
    setBackupSelectedIds,
    setSyncStatus,
    refreshAllData,
    setSnackbarMsg
  } = options

  const backupFileInputRef = useRef<HTMLInputElement>(null)

  const getSyncCredentials = async (): Promise<SyncCredentials | null> => {
    const data = await chrome.storage.sync.get(["syncUsername", "syncPassword"])
    const u = data.syncUsername as string | undefined
    const p = data.syncPassword as string | undefined
    return u && p ? { username: u, appPassword: p } : null
  }

  const handleExportBackup = async () => {
    const items = allItemsUnfiltered.filter(
      (i) => i.projectId && backupSelectedIds.includes(i.projectId)
    )
    const selectedProjects = projects.filter((p) => backupSelectedIds.includes(p.id))
    const blob = await toJsonZip(items, selectedProjects)
    const url = URL.createObjectURL(blob)
    await chrome.downloads.download({ url, filename: "lime-backup.zip" })
    URL.revokeObjectURL(url)
  }

  const handleUploadSync = async () => {
    setSyncStatus("正在上传…")
    try {
      const cred = await getSyncCredentials()
      if (!cred) { setSyncStatus("请先在设置中配置坚果云"); return }
      const result = await runSync(cred, allItemsUnfiltered, projects)
      if (result.success) chrome.storage.local.set({ lastSyncTime: Date.now() })
      setSyncStatus(result.message)
    } catch (e) {
      setSnackbarMsg(`同步失败：${e}`)
      setSyncStatus("同步失败")
    }
  }

  const handleDownloadSync = async () => {
    setSyncStatus("正在下载…")
    try {
      const cred = await getSyncCredentials()
      if (!cred) { setSyncStatus("请先在设置中配置坚果云"); return }
      const remote = await downloadRemote(cred, allItemsUnfiltered, projects)
      if (!remote.success) {
        setSyncStatus(remote.message || "下载失败")
        return
      }
      if (remote.direction === "noop") {
        setSyncStatus("云端无变化")
        return
      }
      if (remote.payload) {
        await clearAllItems()
        await clearAllProjects()
        for (const p of remote.payload.projects) {
          await addProject(p)
        }
        for (const item of remote.payload.items) {
          await addItem(item)
        }
        chrome.storage.local.set({ lastSyncTime: Date.now() })
        setSyncStatus("下载完成")
        await refreshAllData()
      }
    } catch (e) {
      setSnackbarMsg(`下载失败：${e}`)
      setSyncStatus("下载失败")
    }
  }

  return {
    backupFileInputRef,
    handleExportBackup,
    handleUploadSync,
    handleDownloadSync
  }
}
