import { Box, Checkbox } from "@mui/material"
import Masonry from "react-masonry-css"

import type { Item } from "../types"
import ItemCard from "./ItemCard"

interface CardGridProps {
  items: Item[]
  selectMode: boolean
  selectedIds: string[]
  onSelectItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onOpenDialog: (item: Item) => void
  swapMode: boolean
  onToggleRead?: (id: string) => void
}

export default function CardGrid({
  items,
  selectMode,
  selectedIds,
  onSelectItem,
  onDeleteItem,
  onOpenDialog,
  swapMode,
  onToggleRead
}: CardGridProps) {
  return (
    <>
      <style>{`
        .masonry-grid {
          display: flex;
          margin-left: -12px;
          width: auto;
        }
        .masonry-grid-column {
          padding-left: 12px;
          background-clip: padding-box;
        }
      `}</style>
      <Masonry
        breakpointCols={{ default: 3, 900: 2, 600: 1 }}
        className="masonry-grid"
        columnClassName="masonry-grid-column">
        {items.map((it) => (
          <Box
            key={it.id}
            sx={{
              mb: 1.5,
              position: "relative",
              breakInside: "avoid"
            }}>
            {(selectMode || swapMode) && (
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 10
                }}
                onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(it.id)}
                  onChange={() => onSelectItem(it.id)}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" }
                  }}
                />
              </Box>
            )}
            <ItemCard
              item={it}
              onDelete={onDeleteItem}
              onClick={() => {
                if (selectMode || swapMode) return onSelectItem(it.id)
                onOpenDialog(it)
              }}
              onToggleRead={onToggleRead}
            />
          </Box>
        ))}
      </Masonry>
    </>
  )
}
