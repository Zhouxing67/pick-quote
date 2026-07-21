# 项目架构文档

## 概述

lime 是一款轻巧的浏览器摘录插件，基于 **Plasmo 框架 (v0.90.5)** 构建。核心功能包括：网页内容捕获、Anki 辅助记忆（SRS 间隔复习）、坚果云 WebDAV 同步。数据全部存储在本地 IndexedDB 中，无后端服务。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Plasmo 0.90.5 (MV3) |
| UI | React 18 + MUI 7 + Emotion |
| 存储 | IndexedDB（浏览器内） |
| 主题 | MUI createTheme / 4 色预设 |
| 构建 | Plasmo CLI / TypeScript 5.3 |
| 测试 | Jest + ts-jest + jsdom + fake-indexeddb |
| 格式化 | Prettier + @ianvs/prettier-plugin-sort-imports |
| 导出 | html2canvas（图片）/ JSZip（ZIP） |

## 模块功能描述

### 1. 内容捕获模块

**位置**: `src/contents/capture.ts`
**功能**: 内容脚本，注入所有 HTTP(S) 页面（`all_frames: true`）。
- 监听 `"request-selection"` 消息 → 返回当前选中的文本和页面元信息
- 监听 `"toast"` 消息 → 在页面右下角显示短暂通知

**捕获入口（两种）**：
| 入口 | 代码路径 | 可捕获类型 | 是否有 DOM 选择器 |
|---|---|---|---|
| 右键菜单 | `background.ts` → `contextMenus.onClicked` | text/image/link/page | ❌ 无 `source.selector` |
| 内容脚本消息（当前未使用） | `contents/capture.ts` → `request-selection` | text | ✅ 可通过 Selection API 获取 |

### 2. 后台 Service Worker

**位置**: `src/background.ts` + `src/background/menus.ts`
**功能**:
- 注册并管理右键上下文菜单（"lime" 根菜单 → 最近项目 / 新建项目并加入 / 已有项目）
- 处理 `contextMenus.onClicked` 事件，构造 Item 并写入 IndexedDB
- WebDAV 代理：通过 `chrome.runtime.onMessage` 的 `"webdav"` 种类代理 fetch 请求，解决 Content Script 无法直接跨域的问题
- 通过 `"capture"` 消息接受外部传入的 Item
- 监听 `"rebuild-menus"` 消息动态重建项目菜单
- `chrome.action.onClicked` 打开选项页

### 3. 数据层

**位置**: `src/database/index.ts`
**功能**: IndexedDB 封装，提供类型安全的 CRUD 操作。

**对象存储**:
| Store | Key | 索引 | 说明 |
|---|---|---|---|
| `items` | id (UUID) | type, createdAt, sourceSite, projectId, hash | 收藏条目（文本/图片/链接） |
| `projects` | id (UUID) | name (UNIQUE) | 项目，卡片按项目组织 |
| `categories` | id | name (UNIQUE) | 预留，未使用 |
| `sources` | site | — | 预留，未使用 |

**DB 版本**: 5（迁移历史见 `CONFIG_VALUES` 记忆）

### 4. 选项页（管理 UI）

**位置**: `src/options.tsx` + `src/components/`（12 个组件）
**功能**: 项目的完整管理界面，以 `options_ui` 形式打开。
- 左侧可拖拽宽度抽屉：项目管理（CRUD）、SRS 复习入口、阅读清单
- 右侧主区域：项目内卡片瀑布流网格（响应式 1/2/3 列）+ 搜索/筛选
- 批处理模式：多选 → 导出 JSON / 批量删除 / 交换卡片顺序
- 卡片详情弹窗：查看、编辑、导出图片、复制引用
- 随机回顾卡片（项目内）
- 设置弹窗：坚果云同步、主题配色

### 5. SRS 间隔复习

**位置**: `src/hooks/useSrs.ts` + `src/components/ReviewSession.tsx`
**功能**: 基于 SM-2 算法的间隔重复系统。
- `ensureSrs` 初始化 SRS 数据
- `rateCard` 根据 1-4 评分更新 SM-2 参数
- `getDueItems` 筛选到期卡片
- ReviewSession 提供 3D 翻转卡片动画 + 键盘快捷键（1-4 评分，Enter/空格翻转）
- AppHeader 显示带 Badge 的入口，展示到期数量

### 6. 坚果云同步

**位置**: `src/utils/sync.ts`
**功能**: 通过 WebDAV 协议与坚果云同步。
- 单文件 `lime-sync.json` 存储在 `/Apps/lime/` 目录
- `ContentHash` 对比检测变更
- 仅支持全量上传（本地→云端）和全量下载（云端→本地），无双向合并
- 通过 Background SW 代理 fetch 请求处理 CORS

### 7. 导入导出

**位置**: `src/export/`, `src/import/`, `src/utils/zip.ts`
**功能**:
- **导出**: 选中卡片 → JSON + 内嵌图片 → ZIP 下载
- **导入**: ZIP → JSON 解析 → 项目 ID 重映射 → 批量写入
- **图片导出**: 使用 html2canvas 将 ShareCard 渲染为 PNG

## 功能设计思路

### 项目为中心的卡片组织

与大多数摘录工具按"来源网站"分类不同，lime 以 **Project（项目）** 为核心组织卡片。每个项目包含一组卡片，卡片可以来自不同网站。这种设计更贴近"主题式收集"的使用场景——用户围绕一个研究课题、写作项目或兴趣主题收集素材。项目名具有唯一性约束，确保组织清晰。

### 双路径捕获策略

为了同时覆盖"精确选中"和"快速捕获"场景，设计了双路径：
1. **右键菜单**：覆盖最广（选中文本、图片、链接、页面），但无法获取 DOM 精确位置
2. **内容脚本**（待完善）：可通过 Selection API 获取精确的 DOM 选择器，支持高亮回看

### SRS 辅助记忆

引入 SM-2 算法将 lime 从简单的摘录工具延伸为记忆辅助工具。用户在复习中对自己摘录的内容进行 1-4 评分，系统据此安排下一次复习时间，实现"摘录 + 主动记忆"的双重价值。

### 全量同步的权衡

坚果云同步采用"全量覆盖 + 内容哈希对比"的简单策略，是用户数据量不大（个人摘录场景）时的合理选择。避免了双向同步的冲突解决复杂度，代价是数据量大时效率较低。
