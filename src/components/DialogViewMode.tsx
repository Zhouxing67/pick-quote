import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded"
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded"
import ImageRoundedIcon from "@mui/icons-material/ImageRounded"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import {
  Box,
  Link,
  Typography
} from "@mui/material"

import type { Item } from "../types"
import { prettyUrl } from "../utils"

export default function DialogViewMode({ item }: { item: Item }) {
  const icon =
    item.type === "text" ? (
      <FormatQuoteRoundedIcon fontSize="small" />
    ) : item.type === "image" ? (
      <ImageRoundedIcon fontSize="small" />
    ) : item.type === "link" ? (
      <LinkRoundedIcon fontSize="small" />
    ) : (
      <ArticleRoundedIcon fontSize="small" />
    )

  return (
    <Box
      sx={{
        flex: 1,
        maxWidth: "680px",
        mx: "auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }}>
      {item.type === "text" && (
        <Typography
          variant="body1"
          sx={{
            whiteSpace: "pre-wrap",
            lineHeight: 2,
            textIndent: "2em",
            fontSize: "1.05rem",
            color: "text.primary",
            textAlign: "justify",
            fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif'
          }}>
          {item.content}
        </Typography>
      )}
      {item.type === "image" && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <img
            src={item.content}
            alt={item.source?.title || prettyUrl(item.source?.url || "")}
            style={{ maxWidth: "100%", borderRadius: 12 }}
          />
        </Box>
      )}
      {item.type === "link" && (
        <Typography variant="body1" sx={{ fontSize: "1rem" }}>
          <Link
            href={item.content}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{ color: "primary.main" }}>
            {prettyUrl(item.content)}
          </Link>
        </Typography>
      )}
      {item.type === "snapshot" &&
        (typeof item.content === "string" && item.content.startsWith("data:image") ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <img
              src={item.content}
              alt={item.source?.title || prettyUrl(item.source?.url || "")}
              style={{ maxWidth: "100%", borderRadius: 12 }}
            />
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
            长截图（合成）已保存
          </Typography>
        ))}

      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
          <Box sx={{ color: "text.secondary", opacity: 0.7 }}>{icon}</Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              letterSpacing: "0.03em"
            }}>
            {item.type.toUpperCase()} ·{" "}
            {new Date(item.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </Typography>
        </Box>
      </Box>

      {item.context?.paragraph && (
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider"
          }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              mb: 1.5,
              display: "block"
            }}>
            所在段落
          </Typography>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.9,
              color: "text.secondary",
              fontSize: "0.9rem"
            }}>
            {item.context.paragraph}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
            mb: 1.5,
            display: "block"
          }}>
          备注
        </Typography>
        {item.note ? (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.9,
              color: "text.secondary",
              fontSize: "0.9rem"
            }}>
            {item.note}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.85rem" }}>
            暂无备注
          </Typography>
        )}
      </Box>
    </Box>
  )
}
