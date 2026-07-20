import { Box, Checkbox } from "@mui/material"

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
            borderRadius: 2
          }}>
          {(selectMode || swapMode) && (
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
            onClick={() => {
              if (selectMode || swapMode) return onSelectItem(it.id)
              onOpenDialog(it)
            }}
            onToggleRead={onToggleRead}
          />
        </Box>
      ))}
    </Box>
  )
}
