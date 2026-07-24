import {
  Box,
  Divider,
  Link,
  Typography
} from "@mui/material"
import type { ReactNode } from "react"

interface MarkdownRendererProps {
  content: string
  maxLines?: number
}

// ---- Inline parsing ----

type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "italic"; children: InlineToken[] }
  | { type: "inlineCode"; text: string }
  | { type: "link"; text: string; url: string }
  | { type: "strikethrough"; children: InlineToken[] }

const INLINE_RE =
  /(\*\*\*([\s\S]+?)\*\*\*)|(\*\*([\s\S]+?)\*\*)|(\*([\s\S]+?)\*)|(`([^`]+?)`)|(\[([^[\]]+?)\]\(([^)]+?)\))|(~~([\s\S]+?)~~)/g

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  INLINE_RE.lastIndex = 0
  while ((match = INLINE_RE.exec(text)) !== null) {
    // plain text before this match
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) })
    }

    if (match[1] !== undefined) {
      // ***bold+italic***
      tokens.push({
        type: "bold",
        children: [{ type: "italic", children: tokenizeInline(match[2]) }]
      })
    } else if (match[3] !== undefined) {
      // **bold**
      tokens.push({ type: "bold", children: tokenizeInline(match[4]) })
    } else if (match[5] !== undefined) {
      // *italic*
      tokens.push({ type: "italic", children: tokenizeInline(match[6]) })
    } else if (match[7] !== undefined) {
      // `code`
      tokens.push({ type: "inlineCode", text: match[8] })
    } else if (match[9] !== undefined) {
      // [text](url)
      tokens.push({ type: "link", text: match[10], url: match[11] })
    } else if (match[12] !== undefined) {
      // ~~strikethrough~~ (only handles the simple case)
      tokens.push({ type: "strikethrough", children: tokenizeInline(match[13]) })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIndex) })
  }

  return tokens
}

function renderInline(tokens: InlineToken[]): ReactNode {
  return tokens.map((token, i) => {
    switch (token.type) {
      case "text":
        return token.text
      case "bold":
        return (
          <Box component="strong" sx={{ fontWeight: 700 }} key={i}>
            {renderInline(token.children)}
          </Box>
        )
      case "italic":
        return (
          <Box component="em" sx={{ fontStyle: "italic" }} key={i}>
            {renderInline(token.children)}
          </Box>
        )
      case "inlineCode":
        return (
          <Box
            component="code"
            key={i}
            sx={{
              bgcolor: "action.hover",
              px: 0.8,
              py: 0.2,
              borderRadius: 0.5,
              fontSize: "0.875em",
              fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace'
            }}>
            {token.text}
          </Box>
        )
      case "link":
        return (
          <Link
            href={token.url}
            key={i}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            underline="hover"
            sx={{ color: "primary.main" }}>
            {token.text}
          </Link>
        )
      case "strikethrough":
        return (
          <Box component="del" key={i} sx={{ color: "text.disabled" }}>
            {renderInline(token.children)}
          </Box>
        )
    }
  })
}

// ---- Block parsing ----

type BlockToken =
  | { type: "paragraph"; children: InlineToken[] }
  | { type: "heading"; level: 1 | 2 | 3; children: InlineToken[] }
  | { type: "blockquote"; children: BlockToken[] }
  | { type: "ul"; items: InlineToken[][] }
  | { type: "ol"; items: InlineToken[][] }
  | { type: "codeBlock"; text: string }
  | { type: "hr" }
  | { type: "empty" }

function tokenizeBlocks(text: string): BlockToken[] {
  const lines = text.split("\n")
  const blocks: BlockToken[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Code block (``` or ~~~)
    if (/^```/.test(line) || /^~~~/.test(line)) {
      const fence = line.match(/^(```|~~~)/)![1]
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push({ type: "codeBlock", text: codeLines.join("\n") })
      continue
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: "hr" })
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        children: tokenizeInline(headingMatch[2].trim())
      })
      i++
      continue
    }

    // Blockquote (simple: a line starting with >)
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""))
        i++
      }
      blocks.push({
        type: "blockquote",
        children: tokenizeBlocks(quoteLines.join("\n"))
      })
      continue
    }

    // Unordered list
    if (/^(\s*)[-*+]\s/.test(line)) {
      const items: InlineToken[][] = []
      while (i < lines.length && /^(\s*)[-*+]\s/.test(lines[i])) {
        items.push(tokenizeInline(lines[i].replace(/^(\s*)[-*+]\s+/, "")))
        i++
      }
      blocks.push({ type: "ul", items })
      continue
    }

    // Ordered list
    if (/^(\s*)\d+\.\s/.test(line)) {
      const items: InlineToken[][] = []
      while (i < lines.length && /^(\s*)\d+\.\s/.test(lines[i])) {
        items.push(tokenizeInline(lines[i].replace(/^\s*\d+\.\s+/, "")))
        i++
      }
      blocks.push({ type: "ol", items })
      continue
    }

    // Empty line
    if (/^\s*$/.test(line)) {
      i++
      continue
    }

    // Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#/.test(lines[i]) &&
      !/^>/.test(lines[i]) &&
      !/^(\s*)[-*+]\s/.test(lines[i]) &&
      !/^(\s*)\d+\.\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^~~~/.test(lines[i]) &&
      !/^(---|\*\*\*|___)\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        children: tokenizeInline(paraLines.join("\n"))
      })
    }
  }

  return blocks
}

function renderBlocks(blocks: BlockToken[]): ReactNode[] {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "paragraph":
        return (
          <Typography
            component="p"
            key={i}
            sx={{
              mb: 1,
              lineHeight: 1.9,
              "&:last-child": { mb: 0 }
            }}>
            {renderInline(block.children)}
          </Typography>
        )
      case "heading":
        const headingVariant =
          block.level === 1 ? "h5" : block.level === 2 ? "h6" : "subtitle1"
        return (
          <Typography
            variant={headingVariant}
            key={i}
            sx={{ my: 1.5, fontWeight: 600 }}>
            {renderInline(block.children)}
          </Typography>
        )
      case "blockquote":
        return (
          <Box
            key={i}
            sx={{
              pl: 2,
              borderLeft: "3px solid",
              borderColor: "primary.main",
              my: 1,
              color: "text.secondary",
              fontStyle: "italic"
            }}>
            {renderBlocks(block.children)}
          </Box>
        )
      case "ul":
        return (
          <Box component="ul" key={i} sx={{ pl: 2.5, my: 1 }}>
            {block.items.map((item, j) => (
              <Typography
                component="li"
                key={j}
                sx={{
                  lineHeight: 1.9,
                  "&::marker": { color: "text.secondary" }
                }}>
                {renderInline(item)}
              </Typography>
            ))}
          </Box>
        )
      case "ol":
        return (
          <Box component="ol" key={i} sx={{ pl: 2.5, my: 1 }}>
            {block.items.map((item, j) => (
              <Typography
                component="li"
                key={j}
                sx={{
                  lineHeight: 1.9,
                  "&::marker": { color: "text.secondary" }
                }}>
                {renderInline(item)}
              </Typography>
            ))}
          </Box>
        )
      case "codeBlock":
        return (
          <Box
            component="pre"
            key={i}
            sx={{
              bgcolor: "action.hover",
              px: 2,
              py: 1.5,
              borderRadius: 1,
              fontSize: "0.875em",
              fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
              overflowX: "auto",
              my: 1,
              lineHeight: 1.6
            }}>
            <code>{block.text}</code>
          </Box>
        )
      case "hr":
        return <Divider key={i} sx={{ my: 2 }} />
      case "empty":
        return null
    }
  })
}

// ---- Component ----

export default function MarkdownRenderer({ content, maxLines }: MarkdownRendererProps) {
  const blocks = tokenizeBlocks(content)

  return (
    <Box
      sx={
        maxLines
          ? {
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: "vertical"
            }
          : undefined
      }>
      {renderBlocks(blocks)}
    </Box>
  )
}
