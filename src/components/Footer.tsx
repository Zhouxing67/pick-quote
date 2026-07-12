import GitHubIcon from "@mui/icons-material/GitHub"
import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material"

import iconPng from "../assets/icon.png"

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        py: 3,
        color: "text.secondary",
        borderTop: "1px solid",
        borderColor: "divider"
      }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 1 }}>
        <Avatar
          src={iconPng}
          alt="拾句"
          sx={{
            width: 28,
            height: 28,
            boxShadow: 1,
            opacity: 0.9
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontStyle: "italic",
            fontSize: "0.8rem",
            letterSpacing: "0.03em"
          }}>
          拾句 · 灵感库 — 数据仅存本地 IndexedDB · v0.1
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
          开源地址：
        </Typography>
        <Tooltip title="GitHub: minorcell/pick-quote">
          <IconButton
            size="small"
            component="a"
            href="https://github.com/minorcell/pick-quote"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            sx={{ ml: 0.5 }}>
            <GitHubIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}
