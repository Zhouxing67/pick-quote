import { Box, Chip, Stack } from "@mui/material"

import type { Project } from "../types"

interface FilterChipsProps {
  keyword: string
  type: string
  headerHeight: number
  activeProject: Project | null
  onClearProject: () => void
  onClearKeyword: () => void
  onClearType: () => void
}

export default function FilterChips({
  keyword,
  type,
  headerHeight,
  activeProject,
  onClearProject,
  onClearKeyword,
  onClearType
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
            label={activeProject.name}
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
      </Stack>
    </Box>
  )
}
