# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**拾句（Pick Quote）** 是一款轻量级浏览器插件，用于在浏览网页时快速收藏灵感片段。用户可以保存文本、图片、链接和页面快照，并自动保留上下文信息。所有数据仅存储在本地 IndexedDB 中，不上传服务器。

技术栈：Plasmo 框架、React、TypeScript、Material-UI、html2canvas

## 开发命令

```bash
# 安装依赖（使用 pnpm）
pnpm install

# 开发模式（支持热重载）
pnpm dev

# 生产构建
pnpm build

# 打包扩展用于分发
pnpm package

# 测试
pnpm test
```

## 目录结构

```
src/
├── assets/               # 静态资源
│   └── icon.png
├── background.ts         # 后台脚本（Service Worker）
├── components/           # React UI 组件
│   ├── AppHeader.tsx     # 顶部粘性栏（标题/调色板/导入/选择模式）
│   ├── BatchToolbar.tsx  # 批量操作栏（全选/导出/删除选中）
│   ├── ColorPalette.tsx  # 配色选择弹出面板
│   ├── FilterChips.tsx   # 激活的筛选条件标签行
│   ├── Footer.tsx        # 页脚（品牌信息/GitHub 链接）
│   ├── GroupSection.tsx  # 单个分组（标题行 + 卡片网格）
│   ├── ItemCard.tsx      # 条目卡片（类型图标/内容预览/导出/删除）
│   ├── ItemDialog.tsx    # 条目详情对话框（完整内容/段落上下文）
│   ├── ShareCard.tsx     # 图片导出的渲染模板（屏幕外隐藏）
│   └── SidebarFilters.tsx # 侧边栏筛选面板（搜索/类型/来源/重命名）
├── content-scripts/      # 内容脚本
│   └── capture.ts        # 页面内容捕获逻辑
├── database/             # 数据库层
│   └── index.ts          # IndexedDB 封装和操作
├── export/               # 导出功能模块
│   ├── index.ts          # 统一导出接口
│   ├── imageExport.ts    # 图片卡片导出（html2canvas）
│   └── zipExport.ts      # ZIP 打包导出（Markdown + JSON）
├── import/               # 导入功能模块
│   ├── index.ts          # 统一导入接口
│   └── jsonImport.ts     # JSON ZIP 导入（含格式校验）
├── theme/                # UI 主题配置
│   └── index.ts          # 亮/暗双主题 + 4 种颜色预设
├── types/                # TypeScript 类型定义
│   ├── assets.d.ts       # 资源文件类型声明
│   └── index.ts          # 核心业务类型（Item/PresetName/等）
├── utils/                # 工具函数
│   ├── index.ts          # 纯工具函数（sha256/prettyUrl/truncateText/等）
│   └── useExportImage.ts # 自定义 Hook：图片导出状态与逻辑
└── options.tsx           # 选项页面（管理界面，组合所有子组件）
```

### 目录组织原则

1. **按功能领域划分**：每个目录代表一个清晰的功能领域（数据库、导出、主题等）
2. **扁平化结构**：避免过深的嵌套，保持代码易于定位
3. **统一导出接口**：功能模块通过 `index.ts` 提供统一的对外接口
4. **类型集中管理**：所有 TypeScript 类型定义集中在 `types/` 目录
5. **命名规范**：遵循浏览器扩展最佳实践（如 `content-scripts` 而非 `contents`）

## 架构概览

### 浏览器扩展结构

这是一个基于 Plasmo 框架的浏览器扩展，包含三个主要执行上下文：

1. **后台脚本**（`src/background.ts`）：Service Worker，负责创建右键菜单和处理条目捕获
2. **内容脚本**（`src/content-scripts/capture.ts`）：注入到网页中，用于捕获选中内容的上下文，处理快捷键（Ctrl+Shift+S）
3. **选项页面**（`src/options.tsx`）：完整的 React 应用，用于管理已保存的条目（点击扩展图标或通过 options_ui 打开）

### 数据流

```
用户操作（右键菜单/快捷键）
  → 内容脚本捕获上下文
  → 后台脚本接收消息
  → 条目保存到 IndexedDB（src/database/index.ts）
  → 选项页面显示条目（筛选面板 + 分组列表）
```

右键菜单保存后后台脚本会通过 `chrome.tabs.sendMessage` 向页面发送 Toast 通知反馈保存结果。

### 选项页面组件树

`options.tsx` 是唯一的页面入口，组合所有子组件：

```
<ThemeProvider>
  <CssBaseline />
  <Box>                              # 水平 flex 容器
    <SidebarFilters />               # 左侧筛选抽屉
    <Box>                            # 主内容区
      <Container>
        <AppHeader />                # 粘性顶栏
        <FilterChips />              # 筛选条件标签
        <BatchToolbar />             # 批量操作栏（选择模式）
        <Box>                        # 分组展开/折叠/聚焦控制
        <GroupSection />             # 每个分组（重复）
        <ItemDialog />               # 条目详情弹窗
        <DeleteConfirm />            # 删除确认弹窗
        <RenameDialog />             # 分组重命名弹窗
        <ColorPalette />             # 配色选择弹出
        <Footer />                   # 页脚
      </Container>
    </Box>
  </Box>
</ThemeProvider>
```

### 核心数据模型

所有捕获的条目遵循 `src/types/index.ts` 中定义的 `Item` 接口：

- **type**：条目类型 "text" | "image" | "link" | "snapshot"
- **content**：捕获的内容（文本字符串、图片 URL 或快照的 data URL）
- **context**：可选的前后文本和段落上下文（用于文本选择）
- **source**：元数据，包括页面标题、URL、主机名、CSS 选择器和锚点
- **hash**：自动生成的内容哈希，用于去重（相同 URL 的相同内容会被拒绝）

### 数据库层

`src/database/index.ts` 中的 IndexedDB 封装：

- 数据库名：`pickquote-db`（当前版本 2）
- 主存储：`items`，包含 type、createdAt、sourceSite、categoryId、hash 索引
- 辅助存储：`categories`（分类，name 唯一索引）、`sources`（来源，预留）
- 迁移逻辑处理从 v1 版本移除已弃用的 "tags" 索引

**重要**：所有数据库操作使用 `withStore` 辅助函数，该函数正确管理事务和连接。

### 导出系统

`src/export/` 目录包含两种导出机制：

1. **ZIP 导出**（`zipExport.ts`）：支持两种格式导出
   - **Markdown 导出**（`toZip`）：将所有条目导出为 Markdown，图片提取到 `images/` 文件夹
   - **JSON 导出**（`toJsonZip`）：保留全部字段，支持重新导入

2. **图片卡片导出**（`imageExport.ts`）：使用 html2canvas 截图 `ShareCard` 组件渲染的 DOM，下载为 PNG
   - 复用 `useExportImage` hook 管理状态（`src/utils/useExportImage.ts`）

3. **统一接口**（`index.ts`）：导出模块提供统一的对外接口

### UI 主题与颜色预设

`src/theme/index.ts` 提供亮/暗双主题 + 4 种颜色预设：

| 预设名 | primary | secondary | 说明 |
|---|---|---|---|
| `classic` | `#6b7785` 蓝灰 | `#9c8b7a` 棕灰 | 经典文艺 |
| `indigo-crimson` | `#4f46e5` 靛蓝 | `#dc2626` 胭红 | 高对比 |
| `forest` | `#2d6a4f` 墨绿 | `#52b788` 翠绿 | 自然 |
| `terracotta` | `#c2410c` 陶土 | `#a16207` 琥珀 | 温暖 |

`ColorPalette` 组件通过 `palettes` 对象获取色值，不硬编码。

### 右键菜单集成

扩展在安装时注册四个右键菜单项：

- 选中文本 → "拾句 → 存入灵感库"
- 图片 → "拾句 → 保存带来源图片"
- 链接 → "拾句 → 仅存链接"
- 页面 → "拾句 → 页面截图（可视区域）"

## 组件详解

### `SidebarFilters.tsx`
- 左侧 Drawer（persistent 变体，可拖拽调整宽度 200–500px）
- 搜索关键词输入、类型下拉筛选
- 来源网站勾选列表（支持重命名，存储于 `chrome.storage.sync`）

### `AppHeader.tsx`
- 粘性顶栏：筛选切换按钮 + "拾句" 标题 + 调色板图标 + 导入 ZIP + 选择模式切换

### `FilterChips.tsx`
- 当筛选激活时显示的条件标签行（可单独清除或全部清除）

### `BatchToolbar.tsx`
- 选择模式下显示的批量操作栏：全选 / 导出 MD / 导出 JSON / 删除选中
- 导出操作在父组件 `options.tsx` 中实现，通过回调传入

### `GroupSection.tsx`
- 按 URL 归一化分组的卡片集合
- 标题行显示网站名称、链接图标、条目数量
- 支持拖拽排序、置顶/上移/下移/聚焦/折叠，hover 显示操作按钮
- 分组顺序持久化到 `chrome.storage.sync`

### `ItemCard.tsx` / `ItemDialog.tsx`
- 卡片预览 vs 弹窗详情，两种查看模式
- 共享 `useExportImage` hook 实现图片导出功能
- ItemCard 在 `GroupSection` 中按 flex-wrap 排列（响应式 1/2/3 列）

### `ShareCard.tsx`
- 不可见渲染模板（`position: fixed; top: -10000`），仅用于 html2canvas 截图
- 800×600px 固定尺寸，深/浅双主题，装饰性引号排版

### `ColorPalette.tsx`
- 弹出面板（Popover），展示 4 种颜色预设的圆点
- 色值从 `palettes` 主题对象动态获取，无需硬编码

### `Footer.tsx`
- 页脚：品牌标识 + 版本信息 + GitHub 链接

## 工具函数与 Hook

### `src/utils/index.ts`

| 函数 | 用途 |
|---|---|
| `sha256(input)` | SHA-256 哈希 |
| `computeItemHash(content, url)` | 条目内容 + URL 哈希，用于去重 |
| `prettyUrl(url)` | URL 简化为可读形式（域名 + 短路径） |
| `truncateText(text, max)` | 文本截断（超过 max 加 "..."） |
| `normalizeUrl(url)` | URL 标准化（去 hash、去尾斜杠），用于分组归一化 |

### `src/utils/useExportImage.ts`

自定义 Hook，封装图片导出的状态与逻辑，消除 `ItemCard` 与 `ItemDialog` 之间的重复：

```ts
const {
  shareCardRef,     // 绑定到隐藏的 ShareCard
  isExporting,      // 导出中状态
  selectedTheme,    // 当前选中的主题
  menuOpen,         // 菜单是否打开
  anchorEl,         // 菜单锚点
  handleExportClick,
  handleCloseMenu,
  handleExportImage // 执行导出（深色/浅色）
} = useExportImage(item)
```

## 关键实现细节

### 上下文捕获

当文本被选中时，`src/content-scripts/capture.ts` 提取：
- 选中内容前后各 10 个字符
- 包含选中内容的完整段落
- CSS 选择器路径（最多 5 层深度，使用 nth-of-type）

### 去重策略

条目通过内容哈希 + 源 URL 去重（见 `src/database/index.ts:74-84`）。哈希在 `src/utils/index.ts` 中使用 SHA-256 算法计算。来自同一页面的相同内容会被静默拒绝。

### 分组排序

- 分组键：`normalizeUrl(item.source.url)`（去除 hash 和尾斜杠）
- 默认排序：按最新条目的 `createdAt` 倒序
- 拖拽排序后序列持久化到 `chrome.storage.sync`，500ms 防抖

### 图片导出流程

```
用户点击导出按钮
  → useExportImage.setSelectedTheme(theme)
  → 等待 100ms 让主题渲染到 ShareCard
  → html2canvas 截图 ShareCard 的 DOM 节点
  → 触发浏览器下载 PNG 文件
```

## 浏览器权限

在 `package.json` 的 manifest 部分声明：

- `contextMenus`：右键菜单集成
- `activeTab`、`tabs`：访问当前页面信息
- `scripting`：内容脚本注入
- `storage`：Chrome storage API
- `host_permissions`：所有 HTTP/HTTPS 站点

## 重要提示

- 数据仅存储在本地，没有后端服务器
- 图片以 data URL 形式存储在 IndexedDB 中（可能增加存储使用量）
- 长截图功能已移除（见代码注释）
- 分类/标签系统在数据模型中存在，但 UI 中未完全实现
- 点击扩展图标会打开选项页面（完整的标签页管理界面）
- 删除条目前会弹出确认对话框，支持批量选择删除
- 调色板 Popover 位置为右上角下拉（`anchorOrigin: bottom right` / `transformOrigin: top right`）
- 组件内不自行管理导出图片的状态，统一使用 `useExportImage` hook
