export type ItemType = "text" | "image" | "link"

export interface SourceMeta {
  title: string
  url: string
  site?: string
}

export interface SrsData {
  dueDate: number
  interval: number
  easeFactor: number
  reviewCount: number
  lastReviewDate: number
  reviewHistory?: { date: number; rating: 1 | 2 | 3 | 4 }[]
}

export interface Item {
  id: string
  type: ItemType
  content: string
  context?: {
    paragraph?: string
  }
  source?: SourceMeta
  createdAt: number
  projectId?: string
  note?: string
  /** Mark as read/unread for link type */
  read?: boolean
  hash?: string
  /** Derived field for indexing */
  sourceSite?: string
  /** Manual ordering within a project (lower = earlier) */
  order?: number
  /** Tags for within-project organization */
  tags?: string[]
  /** Spaced repetition scheduling data */
  srs?: SrsData
  /** Last modification timestamp (for incremental sync) */
  updatedAt?: number
}

export interface SearchQuery {
  keyword?: string
  site?: string
  type?: ItemType
  tag?: string
  from?: number
  to?: number
  projectId?: string
  dueBefore?: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
  note?: string
  lastOpened?: number
}

export type PresetName = "classic" | "indigo-crimson" | "forest" | "terracotta"

export const PRESET_LABELS: Record<PresetName, string> = {
  classic: "经典蓝灰",
  "indigo-crimson": "靛蓝胭红",
  forest: "墨绿森林",
  terracotta: "赤陶暖调"
}
