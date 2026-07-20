import { listProjects } from "../database"

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

function removeMenu(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.remove(id, () => {
      void chrome.runtime.lastError
      resolve()
    })
  })
}

async function rebuildProjectMenus() {
  await removeMenu("pickquote-existing")
  await createMenu({
    id: "pickquote-existing",
    title: "加入已有项目",
    parentId: "pickquote-root",
    contexts: ["selection", "image", "link", "page"]
  })
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

async function rebuildRecentMenus() {
  // Remove old recent items (up to 3)
  for (let i = 0; i < 3; i++) {
    await removeMenu(`pickquote-recent-${i}`)
  }
  // Read recent project IDs from storage
  const result = await chrome.storage.local.get("recentProjectIds")
  const recentIds: string[] = (result as any).recentProjectIds ?? []
  if (recentIds.length === 0) return
  const projects = await listProjects()
  const recentProjects = recentIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean) as typeof projects

  // Insert after root, before "新建项目并加入"
  for (let i = 0; i < recentProjects.length; i++) {
    await createMenu({
      id: `pickquote-recent-${i}`,
      title: `[最近] ${recentProjects[i].name}`,
      parentId: "pickquote-root",
      contexts: ["selection", "image", "link", "page"]
    })
  }
}

export async function updateRecentProjects(projectId: string) {
  const result = await chrome.storage.local.get("recentProjectIds")
  const recentIds: string[] = (result as any).recentProjectIds ?? []
  const updated = [projectId, ...recentIds.filter((id) => id !== projectId)].slice(0, 3)
  await chrome.storage.local.set({ recentProjectIds: updated })
  await rebuildRecentMenus()
}

let menusBuilding = false
let menusReady = false

export async function ensureMenusReady() {
  if (!menusReady) {
    await createMenus()
  }
}

export async function createMenus() {
  if (menusBuilding) return
  menusBuilding = true
  try {
    await new Promise<void>((resolve) =>
      chrome.contextMenus.removeAll(() => resolve())
    )
    await createMenu({
      id: "pickquote-root",
      title: "lime",
      contexts: ["selection", "image", "link", "page"]
    })
    await rebuildRecentMenus()
    await createMenu({
      id: "pickquote-new-project",
      title: "新建项目并加入",
      parentId: "pickquote-root",
      contexts: ["selection", "image", "link", "page"]
    })
    await rebuildProjectMenus()
    menusReady = true
  } catch (e) {
    menusReady = false
    throw e
  } finally {
    menusBuilding = false
  }
}

export { rebuildProjectMenus, rebuildRecentMenus }
