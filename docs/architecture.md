# 项目架构文档（v2 — 二次 Code Review）

## 概述

lime 是一款基于 **Plasmo 0.90.5 (MV3)** 的浏览器摘录插件。核心功能：网页内容捕获、SM-2 间隔复习、坚果云 WebDAV 同步。数据全部存储在本地 IndexedDB，无后端服务。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Plasmo 0.90.5 (MV3) |
| UI | React 18.2 + MUI 7 + Emotion |
| 存储 | IndexedDB (DB_VERSION 6) |
| 主题 | MUI createTheme / 4 色预设 |
| 构建 | Plasmo CLI / TypeScript 5.3.3 |
| 测试 | Jest 29 + ts-jest + jsdom + fake-indexeddb |
| 格式化 | Prettier 3.2 + @ianvs/prettier-plugin-sort-imports |
| 导出 | html2canvas 1.4（图片）/ JSZip 3.10（ZIP） |
| CI | GitHub Actions (test.yml + deploy-pages.yml) |

## 源码规模

| 模块 | 文件数 | 总行数（约） |
|---|---|---|
| 入口点 | 3 (options.tsx, background.ts, capture.ts) | ~1350 |
| 组件 | 17 | ~2700 |
| Hooks | 3 | ~220 |
| 数据库 | 1 (+ test) | ~300 (+ 250 test) |
| 工具 | 4 (+ test) | ~300 (+ 124 test) |
| 导出/导入 | 4 | ~230 |
| 主题/类型 | 2 | ~230 |
| **合计** | **~37 文件** | **~5600 行** |

## 模块功能描述

### 1. 内容捕获模块

**位置**: `src/contents/capture.ts` (46 行)
**注入范围**: 所有 HTTP(S) 页面，`all_frames: true`

功能：
- 监听 `"toast"` 消息 → 页面右下角显示短暂通知
- **Alt+S 快捷键** → 捕获选中文本 → `chrome.runtime.sendMessage({kind: "capture"})` → background SW 处理

### 2. 后台 Service Worker

**位置**: `src/background.ts` (249 行) + `src/background/menus.ts` (113 行)

功能：
- 右键上下文菜单管理（"lime" 根菜单 → 最近项目 / 新建项目并加入 / 已有项目）
- `contextMenus.onClicked` → 构造 Item → `addItem()` → IndexedDB
- WebDAV 代理：`"webdav"` 消息 → `fetch()` 代理（解决 CORS + Basic Auth）
- `"capture"` 消息 → 接收内容脚本捕获的 Item
- `"save-feedback"` 消息 → 转发保存通知到 tab
- `storage.onChanged` 监听 → 自动重建菜单 + 更新 Badge
- `action.onClicked` → 打开选项页

### 3. 数据层

**位置**: `src/database/index.ts` (304 行)

**对象存储**:
| Store | Key | 索引 | 说明 |
|---|---|---|---|
| `items` | id (UUID) | type, createdAt, sourceSite, projectId, hash | 收藏条目 |
| `projects` | id (UUID) | name (UNIQUE) | 项目 |

**关键设计**:
- `withStore()` 封装事务管理 + 自动重试（store 不存在时强制版本升级）
- `broadcastDbChange()` 通过 `chrome.storage.local` 广播写操作，实现跨上下文变更通知
- `isDuplicate()` 基于 hash + projectId + sourceUrl 三重去重
- `deleteProject()` 级联删除项目下所有卡片

### 4. 选项页（管理 UI）

**位置**: `src/options.tsx` (1054 行) + 17 个组件

**组件架构**:
```
options.tsx (Composition Root — 状态管理 + 编排)
├── SidebarFilters (605 行 — 侧边栏：项目管理/复习/备份三标签)
│   └── ProjectRow (内嵌组件 — 项目行：查看/编辑/删除)
├── AppHeader (79 行 — 顶部栏)
├── FilterChips (41 行 — 搜索条件标签)
├── BatchToolbar (103 行 — 批处理工具栏)
├── CardGrid (102 行 — Masonry 瀑布流网格)
│   └── ItemCard (323 行 — 单张卡片)
│       ├── ExportImageMenu (22 行 — 导出图片菜单)
│       └── ShareCard (210 行 — 分享卡片渲染)
├── ItemDialog (302 行 — 卡片详情弹窗)
│   ├── DialogViewMode (157 行 — 查看模式)
│   ├── DialogEditMode (110 行 — 编辑模式)
│   ├── ExportImageMenu
│   └── ShareCard
├── ReviewSession (457 行 — SRS 复习界面)
├── SettingsDialog (337 行 — 设置：同步 + 主题)
├── NewCardDialog (63 行 — 新建卡片)
├── NewProjectDialog (71 行 — 新建项目)
├── DeleteConfirmDialog (54 行 — 删除确认)
└── MoveCopyCards (56 行 — 移动/复制卡片)
```

### 5. SRS 间隔复习

**位置**: `src/hooks/useSrs.ts` (54 行) + `src/components/ReviewSession.tsx` (457 行)

- SM-2 算法：`ensureSrs()` 初始化 → `rateCard(item, 1-4)` 更新参数
- `getDueItems()` 筛选到期卡片（无 srs 数据的视为到期）
- ReviewSession：3D 翻转动画 + 键盘快捷键 (1-4 评分, Enter/Space 翻转)
- 跨项目复习（不受项目隔离约束）

### 6. 坚果云同步

**位置**: `src/utils/sync.ts` (166 行)

- 单文件 `lime-sync.json` 存储在 `/Apps/lime/`
- `contentHash` (SHA-256) 对比检测变更
- 上传：本地全量覆盖云端
- 下载：云端全量覆盖本地（非原子操作）
- 通过 Background SW 代理 fetch（避免 CORS + Basic Auth 弹窗）

### 7. 导入导出

**位置**: `src/export/` (45 行), `src/import/` (180 行), `src/utils/zip.ts` (46 行)

- **导出**: 选中卡片 → JSON + 内嵌图片 → ZIP 下载
- **导入**: ZIP → JSON 解析 → 项目 ID 重映射 → 批量写入（含验证）
- **图片导出**: html2canvas → ShareCard 渲染为 PNG

## 功能设计思路

### 项目为中心的卡片组织
与按"来源网站"分类不同，lime 以 Project 为核心。项目名唯一性约束确保组织清晰。卡片可跨项目移动/复制，但标签等项目内元数据不跨项目共享。

### 双路径捕获
1. **右键菜单**：覆盖最广（选中文本、图片、链接、页面），但无法获取 DOM 精确位置
2. **Alt+S 快捷键**：通过内容脚本捕获，可获取页面元信息，但仍缺少 DOM 选择器

### SRS 辅助记忆
SM-2 算法将摘录工具延伸为记忆辅助。零门槛设计：无 srs 数据的卡片自动视为到期。

### 全量同步的权衡
坚果云同步采用"全量覆盖 + 内容哈希对比"，是数据量不大时的合理选择。代价是无双向合并、非原子写入。

## 与上次 Review 对比：已修复项

| 上次问题 | 状态 | 说明 |
|---|---|---|
| GroupSection.tsx 命名不一致 | ✅ 已修复 | 重命名为 CardGrid.tsx |
| categories/sources 废弃 store | ✅ 已修复 | DB_VERSION 6 迁移中删除 |
| 内联 Dialog 未抽取 | ✅ 已修复 | 5 个新组件：DeleteConfirmDialog, NewCardDialog, NewProjectDialog, MoveCopyCards, ExportImageMenu |
| 导出图片菜单重复 | ✅ 已修复 | 抽取为 ExportImageMenu 组件 |
| 内容脚本快捷键未实现 | ✅ 已修复 | Alt+S 快捷键已实现 |
| request-selection 死链路 | ✅ 已修复 | 已从 capture.ts 移除 |
| source.selector/anchor 死字段 | ✅ 已修复 | 已从 SourceMeta 类型移除 |
| context.before/after 死字段 | ✅ 已修复 | 仅保留 paragraph |
| SearchQuery.sites 未使用 | ✅ 已修复 | 已从类型和搜索逻辑中移除 |
| type 筛选无 UI 入口 | ✅ 已修复 | 已从 options.tsx 移除 |
| options.css 孤儿文件 | ✅ 已修复 | 已删除 |
