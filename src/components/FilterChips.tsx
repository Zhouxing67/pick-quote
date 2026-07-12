import { Box, Chip, Stack } from "@mui/material"

interface FilterChipsProps {
  keyword: string
  type: string
  selectedSites: string[]
  headerHeight: number
  onClearKeyword: () => void
  onClearType: () => void
  onRemoveSite: (site: string) => void
  onClearAll: () => void
}

export default function FilterChips({
  keyword,
  type,
  selectedSites,
  headerHeight,
  onClearKeyword,
  onClearType,
  onRemoveSite,
  onClearAll
}: FilterChipsProps) {
  if (!keyword && !type && selectedSites.length === 0) return null

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
        {selectedSites.map((site) => (
          <Chip
            key={site}
            label={site}
            size="small"
            onDelete={() => onRemoveSite(site)}
            sx={{ borderRadius: 1.5 }}
          />
        ))}
        <Chip
          label="清除筛选"
          size="small"
          variant="outlined"
          onClick={onClearAll}
          sx={{
            borderRadius: 1.5,
            color: "text.secondary",
            borderColor: "divider",
            "&:hover": { borderColor: "error.main", color: "error.main" }
          }}
        />
      </Stack>
    </Box>
  )
}
