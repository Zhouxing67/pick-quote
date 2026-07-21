# 重构待办清单

## 说明

本文档基于 Code Review 结果，将发现的问题分类为"待移除的无用代码"和"待优化的耦合/重复/文件结构"两大类别。每个条目标注影响范围、风险和优先级。

### 优先级含义

- **P0** — 阻塞性或数据安全风险
- **P1** — 重要优化，显著影响可维护性
- **P2** — 清理性质，渐进改进

---

## 一、无用代码与无用逻辑（待移除）

### 1.1 categories 对象存储及关联函数

**文件**: `src/database/index.ts`
**代码**: `categories` object store 创建（第 48-51 行），`listCategories()`、`upsertCategory()`、`deleteCategory()` 函数（第 197-229 行）
**状态**: 从未被任何业务代码 import 使用（仅在测试文件中引用）
**历史**: 早期版本按"分类"组织卡片，已被 Project 模型完全替代
**风险**: 🟢 无功能影响，但增加 DB 初始化体积和迁移复杂度
**处理**: 在下次 DB_VERSION 升级时移除 store；移除三个导出函数及其测试

---

### 1.2 sources 对象存储

**文件**: `src/database/index.ts` 第 53-55 行
**代码**: `sources` object store 创建
**状态**: 创建后没有任何 CRUD 函数或引用；完全是预留 stub
**风险**: 🟢
**处理**: 随 1.1 一并移除

---

### 1.3 `request-selection` 消息监听（内容脚本死链路）

**文件**: `src/contents/capture.ts` 第 8-22 行
**代码**: `chrome.runtime.onMessage` 中对 `"request-selection"` 种类的处理
**状态**: 监听器已实现，但代码库中**没有任何地方发送此消息**。背景脚本（background.ts）从未调用此路径
**影响**: 内容脚本只用于显示 `toast` 通知，核心捕获功能未被利用
**风险**: 🟡 维护负担——开发人员会误以为此功能可用；每次页面注入都有无用消息监听
**处理**: 移除或保留并打通快捷键链路（见第二部分 2.8）

---

### 1.4 `source.selector` 和 `source.anchor` 字段

**文件**: `src/types/index.ts` 第 7-8 行（SourceMeta 类型定义）
**代码**: `selector?: string; anchor?: string`
**状态**: 定义在类型中但**从未被赋值或读取**。右键菜单捕获（background.ts）不设置；内容脚本（capture.ts）也未使用
**风险**: 🟢 仅类型定义，无运行时开销。但仍会造成新开发者的困惑
**处理**: 如果短期不打算实现 DOM 选择器高亮，考虑移除

---

### 1.5 `Item.context.before` 和 `Item.context.after` 字段

**文件**: `src/types/index.ts` 第 24-26 行
**代码**: `context?: { before?: string; after?: string; paragraph?: string }`
**状态**: `paragraph` 在部分组件中被渲染（DialogViewMode、ReviewSession），但**所有三个字段（包括 paragraph）从未在任何捕获路径中被设置**。`context` 仅在 ZIP 导入时被保留（jsonImport.ts 第 56 行）
**风险**: 🟢 字段存在但无写入路径。如果内容脚本快捷键链路打通，可能在此设置上下文
**处理**: 决定短期路线——如果打通快捷键则保留；否则清理 `before`/`after` 两个死字段

---

### 1.6 `SearchQuery.sites` 数组过滤

**文件**: `src/types/index.ts` 第 46 行 + `src/database/index.ts` 第 147 行
**代码**: `sites?: string[]` 定义与 `searchItems` 中的过滤逻辑
**状态**: 查询逻辑完整实现，但 UI 中**从未构造 `sites` 参数**（options.tsx 的 `onSearch` 只使用 `site: string` 单站点）
**风险**: 🟢 功能完整但无入口。可以考虑移除或改为 UI 支持多站点选择
**处理**: 移除类型定义和过滤逻辑（简化），或记录为未来功能锚点

---

### 1.7 `type` 筛选状态——无 UI 设置入口

**文件**: `src/options.tsx` 第 59、270 行
**代码**: `const [type, setType] = useState<string>("")`，`FilterChips` 可展示/清除 type 过滤
**状态**: `type` 状态存在，`FilterChips` 可清除它，但 **UI 中没有设置 type 过滤的控件**（无下拉框、按钮或选择器来设置 `type` 为 `"text"` / `"image"` / `"link"`）
**风险**: 🟢 半成品功能，`setType` 仅被 `handleRemoveFilter` 调用置空
**处理**: 添加 UI 控件（类型选择器）或移除整个 type 过滤

---

### 1.8 `options.css` 孤儿文件

**文件**: `src/options.css`
**代码**: 15 行 `.masonry-grid` / `.masonry-grid-column` CSS
**状态**: **未被任何文件 import**。MUI 的 CssBaseline 负责全局样式，`GroupSection.tsx` 使用内联 `<style>` 标签定义 masonry 样式（同名但不同 gutter 值）
**风险**: 🟢 死文件，两个地方的 masonry 样式不一致（`options.css` 用 `margin-left: -20px; padding-left: 20px`；`GroupSection.tsx` 内联 style 用 `margin-left: -12px; padding-left: 12px`），可能造成混淆
**处理**: 删除此文件

---

### 1.9 `GroupSection.tsx` 文件名与导出名不一致

**文件**: `src/components/GroupSection.tsx`
**代码**: 导出 `CardGrid`，但文件名 `GroupSection.tsx`
**状态**: `options.tsx` 中 `import CardGrid from "./components/GroupSection"`——导入名匹配导出名，但文件名产生误导
**风险**: 🟢 命名不一致，影响代码导航
**处理**: 重命名为 `CardGrid.tsx` 或改为 `export default function GroupSection`

---

### 1.10 `scripts/generate-icon.mjs` 未被引用

**文件**: `scripts/generate-icon.mjs`
**状态**: 一次性图标生成脚本，package.json 中无对应 script 命令
**风险**: 🟢
**处理**: 保留参考或移动到 `tools/` 目录

---

## 二、UI 组件耦合与代码重构（待优化）

### 2.1 `options.tsx` 文件过大（Composition Root 膨胀）

**文件**: `src/options.tsx` — **926 行**
**问题**: 管理约 **30 个 useState** + 大量 useCallback/useEffect，包含 3 个内联 Dialog（新建卡片、确认删除、新建项目）

```
├── state declarations (~90 行)
├── callbacks & effects (~180 行)
├── render (JSX ~450 行)
└── inline Dialogs (3 个，~200 行)
```

**影响**: 🟡 可维护性差——任何新功能都会增加此文件的复杂度；测试困难；多人协作易冲突
**建议**:
1. 抽取"新建卡片 Dialog"为独立组件（可复用于其他入口）
2. 抽取"确认删除 Dialog"为独立组件（当前已支持单条+批量两种模式，适合封装）
3. 抽取"新建项目 Dialog"为独立组件
4. 考虑使用 `useReducer` 替代分散的 useState——将状态分组为：`filterState`、`batchState`、`dialogState`、`viewState`

---

### 2.2 类型分发渲染——4 处独立实现 `Item` 类型分支

**文件及其模式**:
| 位置 | 文件 | 分支数 |
|---|---|---|
| 卡片网格 | `ItemCard.tsx` (199-257 行) | text / image / link |
| 详情查看 | `DialogViewMode.tsx` (37-71 行) | text / image / link |
| 复习卡片正面 | `ReviewSession.tsx` (230-280 行) | image / link / text |
| 复习卡片背面 | `ReviewSession.tsx` (303-390 行) | image / text |
| 分享卡片 | `ShareCard.tsx` (94-142 行) | text / image |

**问题**: `Item` 的三种类型（text / image / link）渲染逻辑在 5 个位置独立实现。如果要新增一种类型（如 `video`），需要修改 5 个组件；修复一个类型的渲染 BUG 也需要多文件修改
**影响**: 🟡 高维护成本，类型扩展困难
**建议**: 抽取统一渲染组件 `ItemContent`：

```tsx
// 新组件
<ItemContent item={item} variant="card" />     // ItemCard 风格
<ItemContent item={item} variant="dialog" />    // DialogViewMode 风格
<ItemContent item={item} variant="review" />    // ReviewSession 风格
<ItemContent item={item} variant="share" />     // ShareCard 风格
```

或在无 variant 需求时只抽取类型渲染逻辑为纯函数组件

---

### 2.3 导出图片菜单——两处重复

**文件**: `ItemCard.tsx` (184-195 行) 与 `ItemDialog.tsx` (178-188 行)
**代码**: 完全相同的 `<Menu>` + 两个 `<MenuItem>`（"深色主题" / "浅色主题"）的导出图片逻辑
**影响**: 🟢 代码重复约 15 行
**建议**: 将导出菜单抽取为独立组件 `ExportImageMenu`，或移入 `useExportImage` hook 中提供

---

### 2.4 内容截断逻辑——两套实现

**文件**:
- `src/utils/index.ts` → `truncateText(text, max)` — 正确使用 `...`
- `ItemCard.tsx` 第 224-225 行：`item.content.slice(0, 160) + "…"` — 使用 `…` (unicode)
- `options.tsx` 第 681 行：`item.content.slice(0, 200) + "…"` — 使用 `…` (unicode)

**问题**: 工具函数 `truncateText` 存在但未被所有截断点使用。内联截断使用了 `…` 而非 `...`
**影响**: 🟢 表现不一致
**建议**: 统一重用 `truncateText`

---

### 2.5 IconButton 样式重复

**文件**: `AppHeader.tsx`、`options.tsx`（内联按钮）、`ItemCard.tsx`
**模式**: 大量重复的 `sx` 样式：

```tsx
sx={{
  color: "text.secondary",
  "&:hover": { color: "primary.main" },
  "&.Mui-focusVisible": { outline: "none" }
}}
```

**问题**: 此模式在 AppHeader 的 Settings、Import、Swap、Add、Select 按钮上重复出现
**影响**: 🟢 可读性降低，样式统一修改困难
**建议**: 全局 MUI theme 中覆盖 `MuiIconButton` 默认样式；或者抽取 `HeaderIconButton` 包装组件

---

### 2.6 回调注入链——hooks 间隐式耦合

**文件**: `src/hooks/useProjects.ts`、`src/hooks/useNewCard.ts`
**模式**:
```tsx
// useProjects 接收 onSearch, onActivate, onDeactivate
// useNewCard 接收 activeProjectId, onSearch
// options.tsx 将这些回调串联
```

**问题**: hooks 之间通过 options.tsx 桥接，形成隐式依赖图：
```
useProjects.onActivate → setActiveProjectId → onSearch(projectId)
useProjects.onDeactivate → setActiveProjectId(null) → onSearch(null)
useNewCard.onSave → addItem → onSearch(activeProjectId)
```

**影响**: 🟡 创建/删除项目 → 重建菜单 → 重新搜索 → 刷新显示，这一链路完全由 options.tsx 手动编排，容易遗漏
**建议**:
1. 考虑将所有搜索/项目状态聚合为一个 `useDataLayer` hook，内部管理搜索 + 项目 CRUD + 菜单重建的编排
2. 或使用 `useReducer` 统一管理 `allItems`、`activeProjectId`、`keyword`、`type` 等状态变迁

---

### 2.7 `CardGrid` (GroupSection) 双重职责

**文件**: `src/components/GroupSection.tsx`
**问题**: 同时处理 selectMode 和 swapMode 两种不同模式的 UI 状态：

```tsx
{(selectMode || swapMode) && (
  <Checkbox checked={selectedIds.includes(it.id)} ... />
)}
<ItemCard onClick={() => {
  if (selectMode || swapMode) return onSelectItem(it.id)
  onOpenDialog(it)
}} ... />
```

**影响**: 🟢 组件职责不单一，条件分支多
**建议**: 使用 Render Prop 或拆分为 `SelectableCardGrid` / `SwapableCardGrid` 包装

---

### 2.8 内容脚本链路未打通

**文件**: `src/contents/capture.ts`
**问题**: 内容脚本已注入所有页面（`all_frames: true`），具备获取选中的能力，但快捷键捕获链路未实现。当前用户只能通过右键菜单捕获，这意味着：
- 无法获取 `source.selector`（DOM 选择器）
- 无法为 later highlight 功能提供定位信息
- 摘录过程对用户可见（右键→选择项目），不如快捷键流畅
**影响**: 🟡 核心能力缺失
**建议**: 在 `capture.ts` 中实现 `keydown` 监听（Alt+S），捕获选中文本后通过 `chrome.runtime.sendMessage({kind: "capture"})` 发送到 background，完成端到端链路

---

## 实施建议顺序

### Phase 1 — 清理（低风险，快速见效）
- [ ] 1.8 删除 `options.css`（孤儿文件）
- [ ] 1.9 重命名 `GroupSection.tsx` → `CardGrid.tsx`
- [ ] 1.10 移动 `scripts/generate-icon.mjs` 到 `tools/`

### Phase 2 — 简化（需一定理解成本）
- [ ] 1.1 移除 `categories` store + 函数 + 测试
- [ ] 1.2 移除 `sources` store
- [ ] 1.3 清理 `request-selection` 死链路（或同时打通快捷键）
- [ ] 1.6 移除 `SearchQuery.sites`
- [ ] 1.7 移除或补齐 `type` 过滤 UI
- [ ] 2.3 抽取 `ExportImageMenu` 组件
- [ ] 2.4 统一使用 `truncateText`

### Phase 3 — 重构（核心投入）
- [ ] 2.1 抽取 options.tsx 内联 Dialog + useReducer 重构
- [ ] 2.2 抽取统一 `ItemContent` 渲染组件
- [ ] 2.5 全局统一样式主题（IconButton 等）
- [ ] 2.6 聚合 hooks 调用链为统一 data layer
- [ ] 2.7 拆分 CardGrid 职责
- [ ] 2.8 打通内容脚本快捷键链路
