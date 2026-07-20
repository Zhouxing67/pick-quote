import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material"
import { useCallback, useEffect, useState } from "react"

import { rateCard } from "../hooks/useSrs"
import type { Item } from "../types"
import { prettyUrl } from "../utils"

interface ReviewSessionProps {
  items: Item[]
  onSave: (item: Item) => Promise<void>
  onExit: () => void
}

const LABELS = ["重来", "困难", "良好", "简单"]
const COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6"]
const TYPE_LABEL: Record<string, string> = {
  text: "文本",
  image: "图片",
  link: "链接",
  snapshot: "快照"
}

export default function ReviewSession({
  items,
  onSave,
  onExit
}: ReviewSessionProps) {
  const [queue] = useState<Item[]>(() => [...items])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [ratings, setRatings] = useState<number[]>([])
  const dueCount = items.length

  const current = queue[index] ?? null

  const handleFlip = useCallback(() => {
    if (!flipped && !transitioning) {
      setFlipped(true)
    }
  }, [flipped, transitioning])

  const handleRate = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (!current || transitioning) return
      setTransitioning(true)
      const updated = rateCard(current, rating)
      setRatings((prev) => [...prev, rating])

      await onSave(updated)

      if (index + 1 >= queue.length) {
        setTimeout(() => {
          setCompleted(true)
          setTransitioning(false)
        }, 300)
      } else {
        setTimeout(() => {
          setFlipped(false)
          setTransitioning(false)
          setIndex((i) => i + 1)
        }, 350)
      }
    },
    [current, transitioning, index, queue.length, onSave]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (completed) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleFlip()
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault()
        const r = Number(e.key) as 1 | 2 | 3 | 4
        if (flipped) handleRate(r)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [flipped, completed, handleFlip, handleRate])

  if (completed) {
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 0
    const goodCount = ratings.filter((r) => r >= 3).length
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 10
        }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
          复习完成！
        </Typography>
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            本次复习 {dueCount} 张卡片
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
            熟悉率 {Math.round((goodCount / dueCount) * 100)}%（{goodCount}/{dueCount}）
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
            平均评分 {avgRating.toFixed(1)}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={onExit} sx={{ borderRadius: 1 }}>
          退出复习
        </Button>
      </Box>
    )
  }

  if (!current) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 10
        }}>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 2 }}>
          没有待复习的卡片
        </Typography>
        <Button variant="outlined" onClick={onExit} sx={{ borderRadius: 1 }}>
          退出复习
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        maxWidth: 640,
        mx: "auto",
        mt: 4,
        animation: transitioning
          ? "reviewSlideOut 0.3s ease-in forwards"
          : "reviewSlideIn 0.35s ease-out"
      }}>
      <style>{`
        @keyframes reviewSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes reviewSlideOut {
          to { opacity: 0; transform: translateX(-40px); }
        }
      `}</style>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, px: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {index + 1} / {dueCount}
        </Typography>
        <IconButton size="small" onClick={onExit}>
          <CloseRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>

      <Box
        onDoubleClick={() => { /* no double click */ }}
        onClick={handleFlip}
        sx={{
          perspective: "800px",
          cursor: "pointer",
          mb: 3
        }}>
        <Box
          sx={{
            position: "relative",
            minHeight: 320,
            transformStyle: "preserve-3d",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: flipped ? "rotateX(-180deg)" : "rotateX(0deg)"
          }}>
          {/* Front */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              p: 4,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center"
            }}>
            <Chip
              label={TYPE_LABEL[current.type] ?? "文本"}
              size="small"
              variant="outlined"
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 500,
                letterSpacing: "0.04em"
              }}
            />
            <Box
              component="span"
              sx={{
                fontSize: "2rem",
                color: "text.disabled",
                opacity: 0.2,
                mb: 1,
                lineHeight: 1
              }}>
              "
            </Box>
            <Typography
              sx={{
                fontSize: "1.15rem",
                lineHeight: 1.9,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: '"Noto Serif SC", "Songti SC", serif',
                color: "text.primary",
                textIndent: "1.5em"
              }}>
              {current.content}
            </Typography>
            <Typography
              variant="caption"
              sx={{ mt: 2, color: "text.disabled", textAlign: "right" }}>
              点击查看详情
            </Typography>
          </Box>

          {/* Back */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateX(180deg)",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              p: 4,
              display: "flex",
              flexDirection: "column"
            }}>
            <Typography
              sx={{
                fontSize: "1.05rem",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: '"Noto Serif SC", "Songti SC", serif',
                color: "text.primary",
                textIndent: "1.5em",
                mb: 2
              }}>
              {current.content}
            </Typography>

            {current.source?.url && (
              <Typography
                variant="body2"
                component="a"
                href={current.source.url}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                  mb: 1,
                  fontSize: "0.8rem",
                  wordBreak: "break-word"
                }}>
                {current.source.title || prettyUrl(current.source.url)}
              </Typography>
            )}

            {current.note && (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.85rem",
                  lineHeight: 1.6,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  wordBreak: "break-word"
                }}>
                {current.note}
              </Typography>
            )}

            {current.context?.paragraph && (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.8rem",
                  lineHeight: 1.6,
                  mt: 1,
                  opacity: 0.6,
                  wordBreak: "break-word"
                }}>
                {current.context.paragraph}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Rating buttons — visible only after flip */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1.5,
          opacity: flipped ? 1 : 0,
          transform: flipped ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: flipped ? "auto" : "none"
        }}>
        {LABELS.map((label, i) => {
          const rating = (i + 1) as 1 | 2 | 3 | 4
          return (
            <Tooltip key={label} title={`快捷键 ${i + 1}`}>
              <Button
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRate(rating)
                }}
                sx={{
                  borderRadius: 2,
                  borderColor: COLORS[i],
                  color: COLORS[i],
                  fontSize: "0.9rem",
                  py: 1.5,
                  "&:hover": {
                    bgcolor: `${COLORS[i]}14`,
                    borderColor: COLORS[i]
                  }
                }}>
                <Box component="span" sx={{ mr: 1, opacity: 0.5, fontSize: "0.75rem" }}>
                  {i + 1}
                </Box>
                {label}
              </Button>
            </Tooltip>
          )
        })}
      </Box>
    </Box>
  )
}
