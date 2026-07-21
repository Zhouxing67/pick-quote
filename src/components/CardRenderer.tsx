import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded"
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded"
import ImageRoundedIcon from "@mui/icons-material/ImageRounded"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import {
  Box,
  Chip,
  Link,
  Stack,
  Typography
} from "@mui/material"

import type { Item } from "../types"
import { prettyUrl } from "../utils"

interface CardRendererProps {
  item: Item
  mode: "front" | "back" | "full"
}

const TYPE_LABEL: Record<string, string> = {
  text: "文本",
  image: "图片",
  link: "链接"
}

const typeIcon = (type: string) => {
  switch (type) {
    case "text": return <FormatQuoteRoundedIcon fontSize="small" />
    case "image": return <ImageRoundedIcon fontSize="small" />
    case "link": return <LinkRoundedIcon fontSize="small" />
    default: return <ArticleRoundedIcon fontSize="small" />
  }
}

function ContentBlock({ item }: { item: Item }) {
  if (item.type === "image") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <img
          src={item.content}
          alt={item.source?.title || ""}
          style={{ maxWidth: "100%", maxHeight: 340, borderRadius: 10, objectFit: "contain" }}
        />
      </Box>
    )
  }
  if (item.type === "link" && item.source?.url) {
    return (
      <Typography
        component="a"
        href={item.source.url}
        target="_blank"
        onClick={(e) => e.stopPropagation()}
        sx={{
          fontSize: "1.1rem", lineHeight: 1.8, wordBreak: "break-word",
          color: "primary.main", textDecoration: "none",
          "&:hover": { textDecoration: "underline" }
        }}>
        {item.source.title || prettyUrl(item.source.url)}
      </Typography>
    )
  }
  return (
    <Box sx={{ pl: 2, borderLeft: "4px solid", borderLeftColor: "primary.main" }}>
      <Typography
        sx={{
          fontSize: "1.25rem", lineHeight: 1.9, whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: '"LXGW WenKai", "Noto Serif SC", "Songti SC", serif',
          color: "text.primary", fontStyle: "italic"
        }}>
        {item.content}
      </Typography>
    </Box>
  )
}

function NoteBlock({ note }: { note?: string }) {
  return note ? (
    <Typography
      sx={{
        whiteSpace: "pre-wrap", lineHeight: 1.8, color: "text.primary",
        bgcolor: "action.hover", borderRadius: 1, px: 2, py: 1.5
      }}>
      {note}
    </Typography>
  ) : (
    <Typography sx={{ color: "text.disabled", fontStyle: "italic", bgcolor: "action.hover", borderRadius: 1, px: 2, py: 1.5 }}>
      暂无笔记
    </Typography>
  )
}

export default function CardRenderer({ item, mode }: CardRendererProps) {
  if (mode === "front") {
    return (
      <>
        <Chip
          label={TYPE_LABEL[item.type] ?? "文本"} size="small" variant="outlined"
          sx={{
            position: "absolute", top: 12, right: 12,
            height: 20, fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.04em"
          }}
        />
        <Box sx={{ flex: 1, overflow: "auto", minHeight: 0,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" }
        }}>
          <ContentBlock item={item} />
        </Box>
        {item.source?.url && (
          <>
            <Box sx={{ mx: -5, borderTop: "1px solid", borderColor: "divider", mb: 1 }} />
            <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.7rem", textAlign: "center", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
              ↗ {item.source.title || prettyUrl(item.source.url)}
            </Typography>
          </>
        )}
        <Typography variant="caption" sx={{ mt: 0.5, color: "text.disabled", textAlign: "center", fontSize: "0.7rem", letterSpacing: "0.04em", flexShrink: 0 }}>
          ⌄ 点击翻转
        </Typography>
      </>
    )
  }

  if (mode === "back") {
    return (
      <>
        <Typography variant="subtitle2" sx={{ color: "text.disabled", mb: 1.5, fontSize: "0.75rem", letterSpacing: "0.04em" }}>
          笔记
        </Typography>
        <NoteBlock note={item.note} />
        {item.tags && item.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {item.tags.map((t) => (
              <Chip key={t} label={t} size="small" variant="outlined"
                sx={{ borderRadius: 1, fontSize: "0.7rem", height: 22 }} />
            ))}
          </Stack>
        )}
        {item.source?.url && (
          <Typography
            variant="body2" component="a" href={item.source.url} target="_blank"
            onClick={(e) => e.stopPropagation()}
            sx={{
              color: "primary.main", textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
              fontSize: "0.8rem", wordBreak: "break-word",
              mt: "auto", pt: 2, borderTop: "1px solid", borderColor: "divider"
            }}>
            ↗ {item.source.title || prettyUrl(item.source.url)}
          </Typography>
        )}
      </>
    )
  }

  // mode === "full"
  return (
    <>
      {item.type === "text" && (
    <Box sx={{ pl: 2, borderLeft: "5px solid", borderLeftColor: "primary.main" }}>
          <Typography sx={{
            whiteSpace: "pre-wrap", lineHeight: 2, fontSize: "1.1rem",
            color: "text.primary",
            fontFamily: '"LXGW WenKai", "Noto Serif SC", "Songti SC", serif'
          }}>
            {item.content}
          </Typography>
        </Box>
      )}
      {item.type === "image" && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <img src={item.content} alt={item.source?.title || prettyUrl(item.source?.url || "")}
            style={{ maxWidth: "100%", borderRadius: 12 }} />
        </Box>
      )}
      {item.type === "link" && (
        <Typography variant="body1" sx={{ fontSize: "1rem" }}>
          <Link href={item.content} target="_blank" rel="noreferrer" underline="hover" sx={{ color: "primary.main" }}>
            {prettyUrl(item.content)}
          </Link>
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
          <Box sx={{ color: "text.secondary", opacity: 0.7 }}>{typeIcon(item.type)}</Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.03em" }}>
            {item.type.toUpperCase()} ·{" "}
            {new Date(item.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric", month: "long", day: "numeric"
            })}
          </Typography>
        </Box>
      </Box>
      {item.context?.paragraph && (
        <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", mb: 1.5, display: "block" }}>
            所在段落
          </Typography>
          <Box sx={{ pl: 1.5, borderLeft: "2px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9, color: "text.secondary", fontSize: "0.9rem" }}>
              {item.context.paragraph}
            </Typography>
          </Box>
        </Box>
      )}
      <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.05em", mb: 1.5, display: "block" }}>
          备注
        </Typography>
        <NoteBlock note={item.note} />
      </Box>
    </>
  )
}
