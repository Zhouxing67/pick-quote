import {
  Box,
  Checkbox
} from "@mui/material"

import type { Item } from "../types"
import ItemCard from "./ItemCard"

interface CardGridProps {
  items: Item[]
  selectMode: boolean
  selectedIds: string[]
  onSelectItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onOpenDialog: (item: Item) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  dragId: string | null
  overId: string | null
}

export default function CardGrid({
  items,
  selectMode,
  selectedIds,
  onSelectItem,
  onDeleteItem,
  onOpenDialog,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragId,
  overId
}: CardGridProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        ml: -1.5
      }}>
      {items.map((it) => (
        <Box
          key={it.id}
          sx={{
            width: {
              xs: "100%",
              sm: "50%",
              md: "33.333%"
            },
            pl: 1.5,
            mb: 1.5,
            position: "relative",
            opacity: dragId === it.id ? 0.4 : 1,
            transform: dragId === it.id ? "scale(0.97)" : "none",
            transition: "opacity 0.2s, transform 0.2s, box-shadow 0.15s",
            ...(overId === it.id && dragId !== it.id
              ? {
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: 2,
                    border: "2px dashed",
                    borderColor: "primary.main",
                    pointerEvents: "none",
                    zIndex: 5
                  }
                }
              : {})
          }}>
          {selectMode && (
            <Box
              sx={{
                position: "absolute",
                top: 8,
                left: `calc(1.5 * 8px + 1.5)`,
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
            onClick={() =>
              selectMode ? onSelectItem(it.id) : onOpenDialog(it)
            }
            draggable
            onDragStart={(e) => onDragStart(e, it.id)}
            onDragOver={(e) => onDragOver(e, it.id)}
            onDrop={(e) => onDrop(e, it.id)}
            onDragEnd={onDragEnd}
          />
        </Box>
      ))}
    </Box>
  )
}
