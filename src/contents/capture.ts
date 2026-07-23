import type { PlasmoCSConfig } from "plasmo"

import { sendMessage } from "../types/messages"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: false
}

chrome.runtime.onMessage.addListener((msg) => {
  console.debug("[lime:capture] toast:", msg?.text)
  if (msg?.kind === "toast" && msg?.text) {
    showToast(msg.text)
  }
})

function showToast(text: string) {
  const toast = document.createElement("div")
  toast.textContent = text
  Object.assign(toast.style, {
    position: "fixed",
    zIndex: "2147483647",
    top: "52px",
    right: "24px",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px"
  })
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}

// --- Floating save toolbar ---

let toolbar: HTMLDivElement | null = null
let showTimer: ReturnType<typeof setTimeout> | null = null

function createToolbar(): HTMLDivElement {
  const el = document.createElement("div")
  Object.assign(el.style, {
    position: "fixed",
    zIndex: "2147483647",
    display: "none",
    background: "#22c55e",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    userSelect: "none",
    whiteSpace: "nowrap",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    transition: "opacity 0.15s"
  })
  el.textContent = "📝 保存到 lime"
  el.addEventListener("mouseenter", () => {
    el.style.opacity = "0.85"
  })
  el.addEventListener("mouseleave", () => {
    el.style.opacity = "1"
  })
  el.addEventListener("click", () => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (text) {
      const payload = {
        type: "text" as const,
        content: text,
        source: {
          title: document.title,
          url: window.location.href,
          site: window.location.hostname
        }
      }
      sendMessage({ kind: "capture", payload }).catch(() => {})
    }
    sel?.removeAllRanges()
    hideToolbar()
  })
  document.body.appendChild(el)
  return el
}

function showToolbar(rect: DOMRect) {
  if (!toolbar) toolbar = createToolbar()
  const left = Math.min(rect.left, window.innerWidth - 160)
  toolbar.style.left = `${Math.max(4, left)}px`
  toolbar.style.top = `${rect.bottom + 4}px`
  toolbar.style.display = "block"
}

function hideToolbar() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (toolbar) toolbar.style.display = "none"
}

document.addEventListener("mouseup", (e) => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

  if (showTimer) clearTimeout(showTimer)
  showTimer = setTimeout(() => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 5 || text.length > 500) {
      hideToolbar()
      return
    }
    const range = sel!.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      hideToolbar()
      return
    }
    showToolbar(rect)
  }, 300)
})

document.addEventListener("scroll", hideToolbar, { passive: true })

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key === "s") {
    e.preventDefault()
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text) return
    console.debug("[lime:capture] Alt+S:", text.slice(0, 60))

    const payload = {
      type: "text" as const,
      content: text,
      source: {
        title: document.title,
        url: window.location.href,
        site: window.location.hostname
      }
    }
    sendMessage({ kind: "capture", payload }).catch(() => {})
  }
})
