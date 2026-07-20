import { Box, Chip, Stack } from "@mui/material"

import type { Project } from "../types"

interface FilterChipsProps {
  keyword: string
  type: string
  activeProject: Project | null
  headerHeight: number
  onClearKeyword: () => void
  onClearType: () => void
  onClearProject: () => void
  onClearAll: () => void
}

export default function FilterChips({
  keyword,
  type,
  activeProject,
  headerHeight,
  onClearKeyword,
  onClearType,
  onClearProject,
  onClearAll
}: FilterChipsProps) {
  if (!keyword && !type && !activeProject) return null

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
        {activeProject && (
          <Chip
            label={`项目: ${activeProject.name}`}
            size="small"
            color="primary"
            onDelete={onClearProject}
            sx={{ borderRadius: 1.5 }}
          />
        )}
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
