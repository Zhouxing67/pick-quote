import { addItem, listProjects } from "./database"
import type { Item, Project } from "./types"

function notifyTab(tabId: number | undefined, text: string) {
  // Primary: in-page toast via content script
  if (tabId) {
    chrome.tabs
      .sendMessage(tabId, { kind: "toast", text })
      .catch(() => notifySystem(text))
    return
  }
  // Fallback: system notification (e.g. no tab / content script not injected)
  notifySystem(text)
}

function notifySystem(text: string) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "拾句",
      message: text
    })
  } catch {
    // notifications API unavailable — nothing else we can do
  }
}

// Wrapper that resolves on the create callback so parent/child ordering
// is guaranteed (Chrome processes contextMenus.create asynchronously).
// Reads lastError inside the callback to swallow it (prevents the
// "Unchecked runtime.lastError" warning from surfacing to the console).
function createMenu(
  props: chrome.contextMenus.CreateProperties
): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.create(props, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
}

// Wrapper that resolves on the remove callback, swallowing lastError
// (removing a non-existent id is harmless but surfaces as lastError).
function removeMenu(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.remove(id, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
}

// Rebuild the "加入已有项目" submenu with current projects from DB.
// Safe to call repeatedly: removes the parent (and its children cascade)
// before recreating, so added/removed projects stay in sync.
async function rebuildProjectMenus() {
  // Remove existing parent (children cascade) if present
  await removeMenu("pickquote-existing")

  // Recreate the "加入已有项目" parent
  await createMenu({
    id: "pickquote-existing",
    title: "加入已有项目",
    parentId: "pickquote-root",
    contexts: ["selection", "image", "link", "page"]
  })

  // Add dynamic project submenus (parent now exists)
  const projects = await listProjects()
  for (const proj of projects) {
    await createMenu({
      id: `pickquote-proj-${proj.id}`,
      title: proj.name,
      parentId: "pickquote-existing",
      contexts: ["selection", "image", "link", "page"]
    })
  }
}

// Create full context menu structure (root + static children + dynamic projects).
// Uses an await chain so parent/child creation order is guaranteed, and a
// re-entrancy guard so onInstalled + onStartup firing together can't race.
let menusBuilding = false
async function createMenus() {
  if (menusBuilding) return
  menusBuilding = true
  try {
    await new Promise<void>((resolve) =>
      chrome.contextMenus.removeAll(() => resolve())
    )
    await createMenu({
      id: "pickquote-root",
      title: "拾句",
      contexts: ["selection", "image", "link", "page"]
    })
    await createMenu({
      id: "pickquote-new-project",
      title: "新建项目并加入",
      parentId: "pickquote-root",
      contexts: ["selection", "image", "link", "page"]
    })
    // rebuildProjectMenus creates "pickquote-existing" + project submenus
    await rebuildProjectMenus()
  } finally {
    menusBuilding = false
  }
}

chrome.runtime.onInstalled.addListener(() => {
  createMenus()
})

chrome.runtime.onStartup.addListener(() => {
  createMenus()
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const { menuItemId } = info

    const url = info.pageUrl ?? tab?.url ?? ""
    const title = tab?.title ?? ""
    const site = url ? new URL(url).hostname : undefined

    const base = {
      source: { title, url, site },
      createdAt: Date.now()
    }

  // Helper: build item with optional projectId, save, and notify
  const saveAndNotify = async (
    type: Item["type"],
    content: string,
    projectId?: string,
    message: string = "已保存到拾句"
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
    notifyTab(tab?.id, message)
  }

  // Helper: dispatch capture by context type (text / image / link / page snapshot)
  const captureAndSave = async (
    projectId?: string,
    projectName?: string
  ): Promise<void> => {
    const message = projectName ? `已加入项目：${projectName}` : "已保存到拾句"

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
    // Page context → snapshot
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
  // NOTE: prompt() is unavailable in a Service Worker. We stash the
  // captured payload in session storage and open a popup page to collect
  // the project name, then that page performs addProject + addItem.
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

  // ---- "加入已有项目" (dynamic project menu items) ----
  if (typeof menuItemId === "string" && menuItemId.startsWith("pickquote-proj-")) {
    const projectId = menuItemId.slice("pickquote-proj-".length)
    // Look up project name from DB for the notification message
    const projects = await listProjects()
    const project = projects.find((p) => p.id === projectId)
    await captureAndSave(projectId, project?.name ?? "未知项目")
    return
  }
  } catch (e) {
    console.error("contextMenus.onClicked failed:", e)
  }
})

// Messages from content scripts / pages
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Refresh the "加入已有项目" submenu after a project is added/removed
  if (msg?.kind === "rebuild-menus") {
    rebuildProjectMenus()
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
    return true // async
  }
})

// Click on top bar extension icon opens management page
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})
