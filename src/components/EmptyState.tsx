import { Box, Typography } from "@mui/material"
import type { ReactElement } from "react"

interface EmptyStateProps {
  icon: ReactElement
  title: string
  subtitle?: string
  action?: ReactElement
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  action
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        color: "text.secondary",
        userSelect: "none"
      }}>
      {icon}
      <Typography variant="body1" sx={{ opacity: 0.7 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ opacity: 0.5, mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}
