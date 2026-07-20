import { addItem, listProjects } from "./database"
import {
  createMenus,
  ensureMenusReady,
  rebuildProjectMenus,
  updateRecentProjects
} from "./background/menus"
import type { Item } from "./types"

function notifyTab(tabId: number | undefined, text: string) {
  if (tabId) {
    chrome.tabs
      .sendMessage(tabId, { kind: "toast", text })
      .catch(() => notifySystem(text))
    return
  }
  notifySystem(text)
}

function notifySystem(text: string) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "lime",
      message: text
    })
  } catch {
    // notifications API unavailable
  }
}

chrome.runtime.onInstalled.addListener(() => {
  createMenus().catch((e) => console.warn("onInstalled createMenus failed:", e))
})

chrome.runtime.onStartup.addListener(() => {
  createMenus().catch((e) => console.warn("onStartup createMenus failed:", e))
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    console.debug("contextMenus.onClicked:", info.menuItemId)
    await ensureMenusReady()
    const { menuItemId } = info

    const url = info.pageUrl ?? tab?.url ?? ""
    const title = tab?.title ?? ""
    const site = url ? new URL(url).hostname : undefined

    const base = {
      source: { title, url, site },
      createdAt: Date.now()
    }

  const saveAndNotify = async (
    type: Item["type"],
    content: string,
    projectId?: string,
    message: string = "已保存到 lime"
  ) => {
    const item: Item = {
      id: crypto.randomUUID(),
      type,
      content,
      source: base.source,
      createdAt: base.createdAt
    }
    if (projectId) item.projectId = projectId
    await addItem(item)
    if (projectId) {
      updateRecentProjects(projectId).catch(() => {})
    }
    notifyTab(tab?.id, message)
  }

  const captureAndSave = async (
    projectId?: string,
    projectName?: string
  ): Promise<void> => {
    const message = projectName ? `已加入项目：${projectName}` : "已保存到 lime"

    if (info.selectionText) {
      await saveAndNotify("text", info.selectionText, projectId, message)
      return
    }
    if (info.srcUrl) {
      await saveAndNotify("image", info.srcUrl, projectId, message)
      return
    }
    if (info.linkUrl) {
      await saveAndNotify("link", info.linkUrl, projectId, message)
      return
    }
    const windowId = tab?.windowId
    if (windowId) {
      chrome.tabs.captureVisibleTab(windowId, { format: "png" }, async (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.warn("captureVisibleTab failed:", chrome.runtime.lastError.message)
          return
        }
        if (dataUrl) {
          await saveAndNotify("snapshot", dataUrl, projectId, message)
        }
      })
    }
  }

  // ---- "新建项目并加入" ----
  if (menuItemId === "pickquote-new-project") {
    let captureType: Item["type"] = "text"
    let captureContent = ""
    if (info.selectionText) {
      captureType = "text"
      captureContent = info.selectionText
    } else if (info.srcUrl) {
      captureType = "image"
      captureContent = info.srcUrl
    } else if (info.linkUrl) {
      captureType = "link"
      captureContent = info.linkUrl
    } else if (tab?.windowId) {
      captureType = "snapshot"
      const dataUrl = await new Promise<string | null>((resolve) => {
        chrome.tabs.captureVisibleTab(
          tab.windowId,
          { format: "png" },
          (d) => resolve(chrome.runtime.lastError ? null : d ?? null)
        )
      })
      if (!dataUrl) return
      captureContent = dataUrl
    } else {
      return
    }

    await new Promise<void>((resolve) =>
      chrome.storage.session.set(
        {
          pendingCapture: {
            type: captureType,
            content: captureContent,
            source: base.source
          }
        },
        () => resolve()
      )
    )
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/new-project.html"),
      type: "popup",
      width: 480,
      height: 460
    })
    return
  }

  // ---- "最近项目" ----
  if (
    typeof menuItemId === "string" &&
    menuItemId.startsWith("pickquote-recent-")
  ) {
    const idx = parseInt(menuItemId.slice("pickquote-recent-".length), 10)
    const result = await chrome.storage.local.get("recentProjectIds")
    const recentIds: string[] = (result as any).recentProjectIds ?? []
    const projectId = recentIds[idx]
    if (!projectId) return
    const projects = await listProjects()
    const project = projects.find((p) => p.id === projectId)
    await captureAndSave(projectId, project?.name ?? "未知项目")
    return
  }

  // ---- "加入已有项目" ----
  if (typeof menuItemId === "string" && menuItemId.startsWith("pickquote-proj-")) {
    const projectId = menuItemId.slice("pickquote-proj-".length)
    const projects = await listProjects()
    const project = projects.find((p) => p.id === projectId)
    await captureAndSave(projectId, project?.name ?? "未知项目")
    return
  }
  } catch (e) {
    console.error("contextMenus.onClicked failed:", e)
  }
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === "rebuild-menus") {
    rebuildProjectMenus().catch((e) =>
      console.warn("rebuild-menus failed:", e)
    )
    return
  }
  if (msg?.kind === "capture" && msg?.payload) {
    const item: Item = {
      id: crypto.randomUUID(),
      ...msg.payload,
      createdAt: Date.now()
    }
    addItem(item)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }
})

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})
