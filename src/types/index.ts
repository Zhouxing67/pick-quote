export type ItemType = "text" | "image" | "link" | "snapshot"

export interface SourceMeta {
  title: string
  url: string
  site?: string
  selector?: string
  anchor?: string
}

export interface Item {
  id: string
  type: ItemType
  content: string
  context?: {
    before?: string
    after?: string
    paragraph?: string
  }
  source?: SourceMeta
  createdAt: number
  projectId?: string
  note?: string
  hash?: string
  /** Derived field for indexing */
  sourceSite?: string
  /** Manual ordering within a project (lower = earlier) */
  order?: number
}

export interface SearchQuery {
  keyword?: string
  site?: string
  sites?: string[]
  type?: ItemType
  from?: number
  to?: number
  projectId?: string
}

export interface Project {
  id: string
  name: string
  createdAt: number
  note?: string
}

export type PresetName = "classic" | "indigo-crimson" | "forest" | "terracotta"

export const PRESET_LABELS: Record<PresetName, string> = {
  classic: "经典蓝灰",
  "indigo-crimson": "靛蓝胭红",
  forest: "墨绿森林",
  terracotta: "赤陶暖调"
}
