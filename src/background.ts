import { addItem, listProjects, searchItems } from "./database"
import {
  createMenus,
  ensureMenusReady,
  rebuildProjectMenus,
  rebuildRecentMenus,
  updateRecentProjects
} from "./background/menus"
import type { Item } from "./types"
import { getDueItems } from "./hooks/useSrs"

function notifyTab(
  tabId: number | undefined,
  saved: boolean,
  type?: string,
  projectName?: string
) {
  const typeLabel = type === "text" ? "文本" : type === "image" ? "图片" : "链接"
  const toastText = saved
    ? projectName
      ? `已保存${typeLabel}到 ${projectName}`
      : `已保存${typeLabel}`
    : "内容重复，已跳过"

  if (tabId) {
    chrome.tabs
      .sendMessage(tabId, { kind: "toast", text: toastText })
      .catch(() => notifySystem(toastText))
    return
  }
  notifySystem(toastText)
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

// Listen for database changes broadcast via storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes._dbp) {
    rebuildProjectMenus().catch(() => {})
    rebuildRecentMenus().catch(() => {})
  }
  if (changes._dbi) {
    searchItems({})
      .then((all) => {
        const due = getDueItems(all)
        chrome.action.setBadgeText({ text: due.length > 0 ? String(due.length) : "" })
        chrome.action.setBadgeBackgroundColor({ color: "#dc2626" })
      })
      .catch(() => {})
  }
})

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
    projectName?: string
  ) => {
    console.debug("[lime:save]", { type, content: content.slice(0, 60), projectId, projectName })
    const item: Item = {
      id: crypto.randomUUID(),
      type,
      content,
      source: base.source,
      createdAt: base.createdAt
    }
    if (projectId) item.projectId = projectId
    const saved = await addItem(item)
    if (saved && projectId) {
      updateRecentProjects(projectId).catch(() => {})
    }
    notifyTab(tab?.id, saved, type, projectName)
  }

  const captureAndSave = async (
    projectId?: string,
    projectName?: string
  ): Promise<void> => {
    if (info.selectionText) {
      await saveAndNotify("text", info.selectionText, projectId, projectName)
      return
    }
    if (info.srcUrl) {
      await saveAndNotify("image", info.srcUrl, projectId, projectName)
      return
    }
    if (info.linkUrl) {
      await saveAndNotify("link", info.linkUrl, projectId, projectName)
      return
    }
    if (tab?.url) {
      await saveAndNotify("link", tab.url, projectId, projectName)
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
    } else if (tab?.url) {
      captureType = "link"
      captureContent = tab.url
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
          },
          pendingTabId: tab?.id
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
  if (msg?.kind === "webdav") {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    const headers: Record<string, string> = {
      Authorization: `Basic ${msg.authBase64}`
    }
    if (msg.contentType) headers["Content-Type"] = msg.contentType
    fetch(msg.url, {
      method: msg.method ?? "GET",
      headers,
      body: msg.body ?? null,
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timer)
        const body = await res.text()
        sendResponse({ ok: res.ok, status: res.status, body })
      })
      .catch((e) => {
        clearTimeout(timer)
        sendResponse({ ok: false, status: 0, body: e.message })
      })
    return true
  }
  if (msg?.kind === "save-feedback") {
    notifyTab(msg.tabId, msg.saved, msg.type, msg.projectName)
    return
  }
  if (msg?.kind === "capture" && msg?.payload) {
    const senderTab = _sender?.tab
    const item: Item = {
      id: crypto.randomUUID(),
      ...msg.payload,
      createdAt: Date.now()
    }
    addItem(item)
      .then((saved) => {
        notifyTab(senderTab?.id, saved, item.type)
        sendResponse({ ok: true })
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }))
    return true
  }
})

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})
