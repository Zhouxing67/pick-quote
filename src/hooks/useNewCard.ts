import { useCallback, useState } from "react"

import { addItem } from "../database"
import type { Item } from "../types"

export function useNewCard({
  activeProjectId,
  onSearch
}: {
  activeProjectId: string | null
  onSearch: (projectId?: string | null) => void
}) {
  const [newCardOpen, setNewCardOpen] = useState(false)
  const [newCardContent, setNewCardContent] = useState("")

  const handleNewCard = useCallback(() => {
    if (!activeProjectId) return
    setNewCardContent("")
    setNewCardOpen(true)
  }, [activeProjectId])

  const handleSaveNewCard = useCallback(async () => {
    const content = newCardContent.trim()
    if (!content || !activeProjectId) return
    const item: Item = {
      id: crypto.randomUUID(),
      type: "text",
      content,
      createdAt: Date.now(),
      projectId: activeProjectId
    }
    await addItem(item)
    setNewCardOpen(false)
    setNewCardContent("")
    onSearch(activeProjectId)
  }, [newCardContent, activeProjectId, onSearch])

  return {
    newCardOpen,
    newCardContent,
    setNewCardContent,
    setNewCardOpen,
    handleNewCard,
    handleSaveNewCard
  }
}
