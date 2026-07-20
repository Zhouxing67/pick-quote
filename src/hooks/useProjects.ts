import { useCallback, useEffect, useState } from "react"

import {
  addProject,
  deleteProject,
  getProjectByName,
  listProjects,
  updateProject
} from "../database"
import type { Project } from "../types"

interface UseProjectsArgs {
  onSearch: (projectId?: string | null) => void
  onActivate: (id: string) => void
  onDeactivate: () => void
}

interface UseProjectsResult {
  projects: Project[]
  newProjectName: string
  projectError: string | null
  loadProjects: () => Promise<Project[]>
  setNewProjectName: (v: string) => void
  setProjectError: (v: string | null) => void
  handleCreateProject: () => Promise<void>
  handleRenameProject: (id: string, name: string) => Promise<void>
  handleUpdateNote: (id: string, note: string) => Promise<void>
  handleDeleteProject: (id: string) => Promise<void>
}

/**
 * Encapsulates project CRUD + list state. `onSearch` / `onActivate` /
 * `onDeactivate` are injected so the hook stays decoupled from the
 * item-loading and active-project state in the page.
 */
export function useProjects({
  onSearch,
  onActivate,
  onDeactivate
}: UseProjectsArgs): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState("")
  const [projectError, setProjectError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    const list = await listProjects()
    setProjects(list)
    return list
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = useCallback(async () => {
    const name = newProjectName.trim()
    if (!name) {
      setProjectError("项目名不能为空")
      return
    }
    const existing = await getProjectByName(name)
    if (existing) {
      setProjectError("项目名已存在，请换一个")
      return
    }
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    }
    await addProject(project)
    await loadProjects()
    setNewProjectName("")
    setProjectError(null)
    onActivate(project.id)
    chrome.runtime.sendMessage({ kind: "rebuild-menus" })
  }, [newProjectName, loadProjects, onActivate])

  const handleRenameProject = useCallback(
    async (id: string, name: string) => {
      const proj = projects.find((p) => p.id === id)
      if (!proj) return
      if (projects.some((p) => p.id !== id && p.name === name)) {
        setProjectError("项目名已存在，请换一个")
        return
      }
      await updateProject({ ...proj, name })
      await loadProjects()
      chrome.runtime.sendMessage({ kind: "rebuild-menus" })
    },
    [projects, loadProjects]
  )

  const handleUpdateNote = useCallback(
    async (id: string, note: string) => {
      const proj = projects.find((p) => p.id === id)
      if (!proj) return
      await updateProject({ ...proj, note: note || undefined })
      await loadProjects()
    },
    [projects, loadProjects]
  )

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await deleteProject(id)
      await loadProjects()
      onDeactivate()
      chrome.runtime.sendMessage({ kind: "rebuild-menus" })
    },
    [loadProjects, onDeactivate]
  )

  return {
    projects,
    newProjectName,
    projectError,
    loadProjects,
    setNewProjectName,
    setProjectError,
    handleCreateProject,
    handleRenameProject,
    handleUpdateNote,
    handleDeleteProject
  }
}
