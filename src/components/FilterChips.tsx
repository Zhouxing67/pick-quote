import { Box, Chip, Stack } from "@mui/material"

interface FilterChipsProps {
  keyword: string
  type: string
  headerHeight: number
  onClearKeyword: () => void
  onClearType: () => void
}

export default function FilterChips({
  keyword,
  type,
  headerHeight,
  onClearKeyword,
  onClearType
}: FilterChipsProps) {
  if (!keyword && !type) return null

  return (
    <Box
      sx={{
        position: "sticky",
        top: headerHeight,
        zIndex: 1050,
        py: 1.5
      }}>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ bgcolor: "background.default" }}>
        {keyword && (
          <Chip
            label={`搜索: ${keyword}`}
            size="small"
            onDelete={onClearKeyword}
            sx={{ borderRadius: 1.5 }}
          />
        )}
        {type && (
          <Chip
            label={`类型: ${type}`}
            size="small"
            onDelete={onClearType}
            sx={{ borderRadius: 1.5 }}
          />
        )}
      </Stack>
    </Box>
  )
}
