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
      title: "拾句",
      contexts: ["selection", "image", "link", "page"]
    })
    await createMenu({
      id: "pickquote-new-project",
      title: "新建项目并加入",
      parentId: "pickquote-root",
      contexts: ["selection", "image", "link", "page"]
    })
    await createMenu({
      id: "pickquote-last-project",
      title: "加入上次项目",
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

export { rebuildProjectMenus }
