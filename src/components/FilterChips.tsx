import { Box, Chip, Stack, alpha } from "@mui/material"

interface FilterChipsProps {
  keyword: string
  headerHeight: number
  onClearKeyword: () => void
}

export default function FilterChips({
  keyword,
  headerHeight,
  onClearKeyword
}: FilterChipsProps) {
  return (
      <Box
        sx={(theme) => ({
          position: "sticky",
          top: headerHeight,
          zIndex: 1050,
          py: 1,
          px: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.03),
          borderBottom: "1px solid",
          borderColor: "divider"
        })}>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ bgcolor: "transparent" }}>
        {keyword && (
          <Chip
            label={`搜索: ${keyword}`}
            size="small"
            onDelete={onClearKeyword}
            sx={{ borderRadius: 1.5 }}
          />
        )}
      </Stack>
    </Box>
  )
}
