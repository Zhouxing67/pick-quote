import JSZip from "jszip"

import type { Item, Project } from "../types"

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, content] = dataUrl.split(",")
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/png"
  const bin = atob(content)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export async function toZip(
  items: Item[],
  projects?: Project[]
): Promise<Blob> {
  const zip = new JSZip()
  const mdLines: string[] = []
  const projectMap =
    projects &&
    Object.fromEntries(projects.map((p) => [p.id, p.name]))

  for (const it of items) {
    let assetPath = ""
    if (
      (it.type === "image" || it.type === "snapshot") &&
      typeof it.content === "string" &&
      it.content.startsWith("data:image")
    ) {
      const filename = `images/${it.hash || `${Date.now()}-${Math.random().toString(16).slice(2)}`}.png`
      const blob = dataUrlToBlob(it.content)
      zip.file(filename, blob)
      assetPath = filename
    }

    if (it.projectId && projectMap?.[it.projectId]) {
      mdLines.push(`> 项目：${projectMap[it.projectId]}`)
    }

    const content =
      (it.type === "image" || it.type === "snapshot") && assetPath
        ? `![snapshot](${assetPath})`
        : it.content.replace(/\n/g, " ")
    const source = it.source ? `(${it.source.title || it.source.url})` : ""
    mdLines.push(`- ${content} ${source}`)
  }

  zip.file("export.md", mdLines.join("\n"))
  const blob = await zip.generateAsync({ type: "blob" })
  return blob
}

export async function toJsonZip(
  items: Item[],
  projects?: Project[]
): Promise<Blob> {
  const zip = new JSZip()

  for (const it of items) {
    if (
      (it.type === "image" || it.type === "snapshot") &&
      typeof it.content === "string" &&
      it.content.startsWith("data:image")
    ) {
      const filename = `images/${it.hash || `${Date.now()}-${Math.random().toString(16).slice(2)}`}.png`
      const blob = dataUrlToBlob(it.content)
      zip.file(filename, blob)
    }
  }

  const payload: { items: Item[]; projects?: Project[] } = { items }
  if (projects && projects.length > 0) {
    payload.projects = projects.map(({ id, name, createdAt, note }) => ({
      id,
      name,
      createdAt,
      note
    }))
  }
  const json = JSON.stringify(payload, null, 2)
  zip.file("export.json", json)

  const blob = await zip.generateAsync({ type: "blob" })
  return blob
}
