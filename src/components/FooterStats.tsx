import { Box, Chip, Stack, Typography } from "@mui/material"

export default function FooterStats({
  totalItems,
  totalProjects,
  recent7,
  topSites,
  streakDays,
  totalReviews,
  accuracyRate
}: {
  totalItems: number
  totalProjects: number
  recent7: number
  topSites: { site: string; count: number }[]
  streakDays: number
  totalReviews: number
  accuracyRate: number
}) {
  if (totalItems === 0 && totalReviews === 0) return null

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        flexShrink: 0,
        px: 3,
        py: 0.75,
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        gap: 3,
        overflow: "hidden"
      }}>
      <Stack direction="row" alignItems="center" spacing={2} divider={<Box sx={{ width: 1, height: 12, bgcolor: "divider", borderRadius: 0.5 }} />}>
        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap", fontSize: "0.7rem" }}>
          <Box component="span" sx={{ fontWeight: 600, color: "primary.main" }}>{totalItems}</Box> 卡片
          <Box component="span" sx={{ mx: 1, color: "text.disabled" }}>·</Box>
          <Box component="span" sx={{ fontWeight: 600, color: "primary.main" }}>{totalProjects}</Box> 项目
          <Box component="span" sx={{ mx: 1, color: "text.disabled" }}>·</Box>
          本周 <Box component="span" sx={{ fontWeight: 600, color: "primary.main" }}>+{recent7}</Box>
        </Typography>
      </Stack>

      {topSites.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ minWidth: 0, overflow: "hidden" }}>
          {topSites.map((s) => (
            <Chip
              key={s.site}
              label={`${s.site} ${s.count}`}
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1, height: 20, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }}
            />
          ))}
        </Stack>
      )}

      <Box sx={{ flex: 1 }} />

      {totalReviews > 0 && (
        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap", fontSize: "0.7rem" }}>
          <Box component="span" sx={{ fontWeight: 600, color: "success.main" }}>{streakDays}</Box> 天连续
          <Box component="span" sx={{ mx: 1, color: "text.disabled" }}>·</Box>
          累计 <Box component="span" sx={{ fontWeight: 600 }}>{totalReviews}</Box>
          <Box component="span" sx={{ mx: 1, color: "text.disabled" }}>·</Box>
          <Box component="span" sx={{ fontWeight: 600 }}>{Math.round(accuracyRate * 100)}%</Box> 熟悉
        </Typography>
      )}
    </Stack>
  )
}
