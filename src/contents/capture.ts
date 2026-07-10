import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: true
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === "request-selection") {
    const sel = window.getSelection()?.toString().trim()
    if (!sel) {
      sendResponse({ ok: false, reason: "no-selection" })
      return true // 即使是失败，也要返回 true 并调用 sendResponse
    }
    sendResponse({
      ok: true,
      data: {
        content: sel,
        source: { title: document.title, url: location.href, site: location.hostname }
      }
    })
    return true // 必须返回 true，因为 sendResponse 可能被异步调用（虽然这里同步了，但保持好习惯）
  }

  if (msg?.kind === "toast" && msg?.text) {
    showToast(msg.text)
  }
})

function showToast(text: string) {

  const toast = document.createElement("div")
  toast.textContent = text
  Object.assign(toast.style, {
    position: "fixed", zIndex: "2147483647", bottom: "24px", right: "24px",
    background: "rgba(0,0,0,0.8)", color: "#fff", padding: "8px 12px",
    borderRadius: "8px", fontSize: "12px"
  })
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}

function deriveContext() {
  const selection = document.getSelection()
  if (!selection || selection.rangeCount === 0) return undefined
  const range = selection.getRangeAt(0)
  const paragraph = range?.commonAncestorContainer?.textContent || ""
  const text = selection.toString()
  const idx = paragraph.indexOf(text)

  if (idx === -1) {
    return { paragraph }
  }

  const beforeStart = Math.max(0, idx - 10)
  const before = paragraph.slice(beforeStart, idx)
  const afterEnd = Math.min(paragraph.length, idx + text.length + 10)
  const after = paragraph.slice(idx + text.length, afterEnd)
  return { before, after, paragraph }
}

function deriveAnchor() {
  const selection = document.getSelection()
  if (!selection || selection.rangeCount === 0) return undefined
  const node = selection.anchorNode as Element | null
  const el =
    node?.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node?.parentElement
  if (!el) return undefined
  return getCssSelector(el)
}

function getCssSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    const tag = cur.tagName.toLowerCase()
    const cls = (cur.className || "")
      .toString()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join("")
    let nth = 1
    let sib = cur
    while ((sib = sib.previousElementSibling as Element | null)) {
      if (sib.tagName === cur.tagName) nth++
    }
    parts.unshift(`${tag}${cls}:nth-of-type(${nth})`)
    cur = cur.parentElement
  }
  return parts.join(" > ")
}
