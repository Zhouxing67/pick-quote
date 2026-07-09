import JSZip from "jszip"

import { addItem } from "../database"
import type { Item, ItemType } from "../types"

export interface ImportResult {
  imported: number
  skipped: number
  errors: { index: number; reason: string }[]
}

const VALID_TYPES: ItemType[] = ["text", "image", "link", "snapshot"]

function validateItem(raw: unknown, index: number): { item: Item } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "条目不是有效对象" }
  }

  const obj = raw as Record<string, unknown>

  if (!VALID_TYPES.includes(obj.type as ItemType)) {
    return { error: `无效的 type: "${obj.type}"` }
  }

  if (typeof obj.content !== "string" || obj.content.length === 0) {
    return { error: "content 缺失或为空" }
  }

  if (!obj.source || typeof obj.source !== "object") {
    return { error: "source 缺失或不是对象" }
  }

  const source = obj.source as Record<string, unknown>
  if (typeof source.url !== "string" || source.url.length === 0) {
    return { error: "source.url 缺失或为空" }
  }

  const id = typeof obj.id === "string" && obj.id.length > 0 ? obj.id : crypto.randomUUID()

  const createdAt =
    typeof obj.createdAt === "number" && obj.createdAt > 0
      ? obj.createdAt
      : Date.now()

  const item: Item = {
    id,
    type: obj.type as ItemType,
    content: obj.content,
    source: {
      title: typeof source.title === "string" ? source.title : "",
      url: source.url,
      site: typeof source.site === "string" ? source.site : undefined
    },
    createdAt,
    context:
      obj.context && typeof obj.context === "object"
        ? (obj.context as Item["context"])
        : undefined,
    categoryId:
      typeof obj.categoryId === "string" ? obj.categoryId : undefined,
    note: typeof obj.note === "string" ? obj.note : undefined
  }

  if (typeof obj.hash === "string" && obj.hash.length === 64) {
    item.hash = obj.hash
  }

  return { item }
}

export async function importFromZip(file: File): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    return { ...result, errors: [{ index: -1, reason: "无法解压 ZIP 文件，文件可能已损坏" }] }
  }

  const jsonFile = zip.file("export.json")
  if (!jsonFile) {
    return { ...result, errors: [{ index: -1, reason: "ZIP 中未找到 export.json" }] }
  }

  let rawJson: string
  try {
    rawJson = await jsonFile.async("string")
  } catch {
    return { ...result, errors: [{ index: -1, reason: "读取 export.json 失败" }] }
  }

  let rawArray: unknown[]
  try {
    const parsed = JSON.parse(rawJson)
    if (!Array.isArray(parsed)) {
      return { ...result, errors: [{ index: -1, reason: "export.json 应为数组格式" }] }
    }
    rawArray = parsed
  } catch {
    return { ...result, errors: [{ index: -1, reason: "export.json JSON 解析失败" }] }
  }

  const validItems: Item[] = []

  for (let i = 0; i < rawArray.length; i++) {
    const r = validateItem(rawArray[i], i)
    if ("error" in r) {
      result.errors.push({ index: i, reason: r.error })
      result.skipped++
    } else {
      validItems.push(r.item)
    }
  }

  for (const item of validItems) {
    try {
      await addItem(item)
      result.imported++
    } catch {
      result.skipped++
    }
  }

  return result
}
