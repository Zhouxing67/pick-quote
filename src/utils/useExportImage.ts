import { useCallback, useRef, useState } from "react"

import { exportToImage } from "../export"
import type { Item } from "../types"

export function useExportImage(item: Item) {
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light">("dark")
  const [isExporting, setIsExporting] = useState(false)

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleExportImage = useCallback(async (theme: typeof selectedTheme) => {
    setSelectedTheme(theme)
    setAnchorEl(null)
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (shareCardRef.current) {
      setIsExporting(true)
      try {
        const filename = `pickquote-${item.id.slice(0, 8)}-${Date.now()}`
        await exportToImage(shareCardRef.current, filename)
      } catch (error) {
        console.error("导出图片失败:", error)
        alert("导出图片失败，请重试")
      } finally {
        setIsExporting(false)
      }
    }
  }, [item.id])

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  return {
    shareCardRef,
    isExporting,
    selectedTheme,
    anchorEl,
    menuOpen: Boolean(anchorEl),
    handleExportClick,
    handleCloseMenu,
    handleExportImage
  }
}
