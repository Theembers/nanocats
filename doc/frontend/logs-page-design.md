# 日志页面详细设计分析报告

> 适用场景：管理后台 / 系统监控 / 开发者工具  
> 分析对象：NanoCats System Logs 页面  
> 输出日期：2026-03-15

---

## 1. 页面概述

### 1.1 页面定位

System Logs 页面是面向开发者和运维人员的系统监控页面，用于：

- 查看系统运行日志
- 追踪 LLM API 调用
- 监控 MCP 工具执行
- 排查错误和问题

### 1.2 核心功能

| 功能 | 描述 |
|-----|------|
| 日志浏览 | 分页展示系统日志 |
| 多维筛选 | 按 Category / Level 筛选 |
| 详情查看 | 展开查看 JSON 详情 |
| 数据概览 | 分类统计卡片 |
| 手动刷新 | 刷新按钮 |

---

## 2. 信息架构

### 2.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Header: 页面标题 + 描述                                     │
├─────────────────────────────────────────────────────────────┤
│  Filters: 筛选工具栏                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────┐              │
│  │ Category ▼  │ │   Level ▼  │ │ Refresh  │              │
│  └─────────────┘ └─────────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────────┤
│  Content: 日志表格 (主内容区域)                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Time │ Level │ Category │ Agent │ Message             │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ...  │ ...   │ ...      │ ...   │ ... + Details ▼    │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Stats: 统计卡片 (辅助信息)                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Model Calls│ │MCP Tools │ │ Skills  │ │  Tools   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 布局比例

| 区域 | 占比 | 说明 |
|-----|-----|------|
| Header | ~8% | 标题 + 描述 |
| Filters | ~5% | 筛选工具栏 |
| Content | ~65% | 主表格区域 |
| Stats | ~20% | 底部统计卡片 |

---

## 3. 组件设计

### 3.1 页面 Header

```tsx
<div className="mb-8">
  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
    System Logs
  </h1>
  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
    View model calls, MCP, skill, and tool usage logs
  </p>
</div>
```

**设计要点**：
- 标题使用 `text-2xl font-bold`，突出页面主题
- 描述文字使用 `text-sm`，颜色为次要文本色
- 底部留白 `mb-8`，与筛选区保持间距

---

### 3.2 筛选工具栏 (Filters)

```tsx
<div className="mb-5 flex gap-3">
  <select ... />   {/* Category */}
  <select ... />   {/* Level */}
  <button ... >Refresh</button>
</div>
```

#### 筛选下拉框

**结构规范**：

```tsx
className="px-4 py-2 rounded-xl outline-none text-sm"
style={{ 
  backgroundColor: 'var(--bg-card)', 
  border: '1.5px solid var(--border-main)', 
  color: 'var(--text-primary)' 
}}
```

| 属性 | 值 | 说明 |
|-----|---|-----|
| padding | `px-4 py-2` | 水平 16px，垂直 8px |
| border-radius | `rounded-xl` | 12px 圆角 |
| border | `1.5px solid` | 比默认边框略粗 |
| font-size | `text-sm` | 14px |
| background | `bg-card` | 卡片背景色 |

#### 刷新按钮

```tsx
<button
  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--text-inverse)' }}
>
  Refresh
</button>
```

**设计要点**：
- 主按钮使用强调色 (`--color-accent`)
- 圆角与输入框保持一致 (`rounded-xl`)
- 使用 `font-medium` 字重
- 包含过渡动画

---

### 3.3 日志表格 (Logs Table)

#### 容器样式

```tsx
<div 
  className="rounded-2xl overflow-hidden" 
  style={{ 
    backgroundColor: 'var(--bg-card)', 
    border: '1px solid var(--border-soft)' 
  }}
>
```

| 元素 | 样式 | 说明 |
|-----|------|-----|
| 容器 | `rounded-2xl` | 大圆角卡片 |
| 背景 | `bg-card` | 白色卡片 |
| 边框 | `1px solid border-soft` | 柔和边框 |
| 溢出 | `overflow-hidden` | 隐藏圆角处的溢出 |

#### 表头设计

```tsx
<tr style={{ backgroundColor: 'var(--bg-base)' }}>
  <th className="px-4 py-3 text-left text-xs font-medium uppercase" ...>
```

| 属性 | 值 |
|-----|---|
| padding | `px-4 py-3` |
| 对齐 | `text-left` |
| 字号 | `text-xs` (12px) |
| 字重 | `font-medium` |
| 大写 | `uppercase` |
| 颜色 | `var(--text-muted)` |

**设计要点**：
- 表头使用页面背景色 (`--bg-base`) 区分
- 列标题小写高亮，弱化视觉权重
- 使用 `uppercase` 提升专业感

#### 表格行

```tsx
<tr key={log.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
```

| 元素 | 样式 |
|-----|------|
| 行分隔 | 上边框 `1px solid border-soft` |
| 单元格 | `px-4 py-3` |

---

### 3.4 日志级别标签 (Level Badge)

```tsx
<span
  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
  style={{
    backgroundColor: levelColors[log.level].bg,
    color: levelColors[log.level].color,
  }}
>
  {log.level}
</span>
```

#### 级别颜色映射

```typescript
const levelColors: Record<string, { bg: string; color: string }> = {
  INFO:  { bg: 'rgba(123,143,161,0.12)', color: 'var(--color-primary-dark)' },
  WARN:  { bg: 'rgba(196,149,106,0.15)', color: 'var(--color-accent-dark)' },
  ERROR: { bg: 'rgba(192,97,74,0.12)',   color: 'var(--color-error)' },
  DEBUG: { bg: 'rgba(176,164,156,0.15)', color: 'var(--text-secondary)' },
};
```

**级别设计规范**：

| 级别 | 背景色 | 文字色 | 语义 |
|-----|-------|-------|-----|
| INFO | `rgba(123,143,161,0.12)` | `#4F6478` | 蓝色 - 信息 |
| WARN | `rgba(196,149,106,0.15)` | `#A3714A` | 琥珀色 - 警告 |
| ERROR | `rgba(192,97,74,0.12)` | `#C0614A` | 红色 - 错误 |
| DEBUG | `rgba(176,164,156,0.15)` | `#7A6F67` | 灰色 - 调试 |

**标签样式**：
- `rounded-full`: 完全圆角
- `px-2 py-0.5`: 紧凑内边距
- `inline-flex`: 允许图标+文字组合
- `font-medium`: 中等字重

---

### 3.5 分类图标 (Category Icons)

```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  chat:    <Terminal className="w-4 h-4" />,
  auth:    <Info className="w-4 h-4" />,
  config:  <FileText className="w-4 h-4" />,
  mcp:     <Wrench className="w-4 h-4" />,
  skill:   <BookOpen className="w-4 h-4" />,
  tool:    <Terminal className="w-4 h-4" />,
  model:   <Cpu className="w-4 h-4" />,
  error:   <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
};
```

**分类设计规范**：

| 分类 | 图标 | 说明 |
|-----|------|-----|
| chat | Terminal | 终端对话 |
| auth | Info | 认证信息 |
| config | FileText | 配置相关 |
| mcp | Wrench | MCP 工具 |
| skill | BookOpen | 技能执行 |
| tool | Terminal | 工具调用 |
| model | Cpu | 模型调用 |
| error | AlertCircle | 错误 |
| warning | AlertTriangle | 警告 |

**展示样式**：
```tsx
<div className="flex items-center gap-2">
  <span style={{ color: 'var(--text-muted)' }}>
    {categoryIcons[log.category]}
  </span>
  <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
    {log.category}
  </span>
</div>
```

---

### 3.6 日志详情 (Details)

```tsx
<details className="mt-1">
  <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
    Details
  </summary>
  <pre
    className="mt-2 p-2 rounded text-xs overflow-x-auto"
    style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)' }}
  >
    {log.details}
  </pre>
</details>
```

**设计要点**：
- 使用原生 `<details>`/`<summary>` 折叠组件
- Summary 使用弱化颜色 + 手型光标
- 详情内容使用 `<pre>` 保留格式
- 详情背景使用页面底色区分
- `overflow-x-auto` 防止长内容溢出

---

### 3.7 统计卡片 (Stats Cards)

```tsx
<div className="mt-5 grid grid-cols-4 gap-4">
  <div className="rounded-xl p-4" ...>
    {/* 卡片内容 */}
  </div>
</div>
```

#### 卡片结构

```tsx
<div className="rounded-xl p-4" style={{ 
  backgroundColor: 'var(--bg-card)', 
  border: '1px solid var(--border-soft)' 
}}>
  <div className="flex items-center justify-between mb-1.5">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
      <h4 className="text-sm font-medium" ...>Label</h4>
    </div>
    <span className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
      {count}
    </span>
  </div>
  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Description</p>
</div>
```

#### 卡片设计规范

| 属性 | 值 | 说明 |
|-----|---|-----|
| 容器圆角 | `rounded-xl` | 12px |
| 内边距 | `p-4` | 16px |
| 背景 | `bg-card` | 白色 |
| 边框 | `1px solid border-soft` | 柔和边框 |
| 布局 | `grid grid-cols-4` | 4列网格 |
| 间距 | `gap-4` | 16px |

#### 卡片内容规范

| 元素 | 样式 |
|-----|------|
| 图标 | `w-4 h-4` + 强调色 |
| 标题 | `text-sm font-medium` + 主文本色 |
| 数值 | `text-lg font-bold` + 强调色 |
| 描述 | `text-xs` + 弱化色 |

#### 卡片配色方案

| 卡片 | 图标颜色 | 数值颜色 |
|-----|---------|---------|
| Model Calls | `--color-accent` | `--color-accent` |
| MCP Tools | `--color-success` | `--color-success` |
| Skills | `--color-primary` | `--color-primary` |
| Tools | `--color-primary-dark` | `--color-primary-dark` |

---

## 4. 状态设计

### 4.1 加载状态

```tsx
{isLoading ? (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
  </div>
) : ...}
```

**设计要点**：
- 使用 `h-64` (256px) 固定高度
- 居中显示加载图标
- 使用强调色作为加载图标颜色
- `animate-spin` 旋转动画

### 4.2 空状态

```tsx
logs.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
    <FileText className="w-12 h-12 mb-4 opacity-25" />
    <p>No logs found</p>
  </div>
) : ...
```

**设计要点**：
- 大型图标 (`w-12 h-12`) + 低透明度 (`opacity-25`)
- 垂直排列 (`flex-col`)
- 居中对齐
- 使用弱化文本色

---

## 5. 交互设计

### 5.1 筛选交互

**触发时机**：
- 下拉框 `onChange` 立即触发
- 刷新按钮 `onClick` 手动触发

**状态管理**：
```tsx
const [category, setCategory] = useState('');
const [level, setLevel] = useState('');
```

### 5.2 数据加载

**加载流程**：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Initial    │────▶│  Loading    │────▶│  Success    │
│  Render     │     │  (isLoading │     │  (Display   │
│             │     │   = true)   │     │   logs)     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │                    │                    │
      ▼                    ▼                    ▼
  初始加载            显示 Loading        显示日志表格
  触发 useEffect      旋转图标            或 空状态
```

### 5.3 时间戳格式化

```tsx
const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('en-GB', {
    month: 'short',      // "Mar"
    day: 'numeric',      // "15"
    hour: '2-digit',     // "14"
    minute: '2-digit',   // "05"
    second: '2-digit',   // "30"
    hour12: false        // 24小时制
  });
};
```

**输出格式**：`Mar 15 14:05:30`

---

## 6. API 设计

### 6.1 获取日志列表

```typescript
// Request
GET /api/logs?category=chat&level=ERROR&limit=100
Headers: { Authorization: 'Bearer {token}' }

// Response
[
  {
    "id": "log_xxx",
    "timestamp": "2026-03-15T14:05:30Z",
    "level": "ERROR",
    "category": "chat",
    "agent_id": "agent_001",
    "message": "Failed to parse response",
    "details": "{\"error\": \"JSON parse error\"}"
  },
  ...
]
```

### 6.2 获取统计数据

```typescript
// Request
GET /api/logs/stats
Headers: { Authorization: 'Bearer {token}' }

// Response
{
  "model": 156,
  "tool": 89,
  "mcp": 42,
  "skill": 23,
  "chat": 312,
  "config": 15
}
```

---

## 7. 类型定义

```typescript
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  category: string;
  agent_id?: string;
  message: string;
  details?: string;
}

interface LogStats {
  model: number;
  tool: number;
  mcp: number;
  skill: number;
  chat: number;
  config: number;
}
```

---

## 8. 响应式设计

### 8.1 桌面端 (≥1024px)

- 筛选区：横向排列
- 表格：完整 5 列
- 统计卡片：4 列网格

### 8.2 平板端 (768px - 1023px)

- 筛选区：可能换行
- 表格：水平滚动
- 统计卡片：2 列网格

### 8.3 移动端 (<768px)

- 筛选区：垂直排列
- 表格：水平滚动 + 简化列
- 统计卡片：1 列或 2 列

---

## 9. 可访问性 (A11y)

### 9.1 语义化标签

- `<h1>`: 页面标题
- `<table>`: 日志表格
- `<thead>`/`<tbody>`: 表头/表体
- `<details>`/`<summary>`: 折叠详情
- `<select>`: 筛选下拉框

### 9.2 颜色对比

- 文本色与背景色符合 WCAG AA 标准
- 状态标签使用颜色 + 文字双重标识

---

## 10. 性能考量

### 10.1 数据量控制

```typescript
params.append('limit', '100');  // 限制单次加载数量
```

### 10.2 按需加载

- 详情内容使用 `<details>` 折叠，不占用初始渲染资源

### 10.3 虚拟滚动 (可选扩展)

若日志量级达到数千条，建议：
- 使用 `react-virtual` 实现虚拟滚动
- 只渲染可视区域内的行

---

## 11. 设计模式总结

### 11.1 核心模式

| 模式 | 应用 |
|-----|------|
| 筛选-表格联动 | 下拉框 → 重新请求数据 |
| 主从布局 | 筛选 + 表格 + 统计卡片 |
| 状态分层 | 加载态 / 数据态 / 空态 |
| 信息分层 | 主表格 + 辅助统计 |

### 11.2 设计要点检查清单

- [ ] 页面标题 + 描述的组合
- [ ] 筛选工具栏使用 `flex gap-3` 水平排列
- [ ] 下拉框与按钮圆角一致 (`rounded-xl`)
- [ ] 表格容器使用 `rounded-2xl` + `overflow-hidden`
- [ ] 表头使用底色区分
- [ ] 日志级别使用彩色圆角标签
- [ ] 分类使用图标 + 文字组合
- [ ] 详情使用 `<details>` 折叠
- [ ] 统计卡片使用网格布局
- [ ] 加载状态使用旋转图标
- [ ] 空状态使用大型图标 + 提示文字
- [ ] 使用统一的色彩变量

---

## 12. 代码复用建议

### 12.1 可抽取组件

```tsx
// LevelBadge - 日志级别标签
function LevelBadge({ level }: { level: string }) { ... }

// CategoryIcon - 分类图标
function CategoryIcon({ category }: { category: string }) { ... }

// LogTable - 日志表格
function LogTable({ logs }: { logs: LogEntry[] }) { ... }

// StatsCard - 统计卡片
function StatsCard({ icon, label, value, color }: StatsCardProps) { ... }

// FilterBar - 筛选工具栏
function FilterBar({ filters, onChange }: FilterBarProps) { ... }

// LoadingState / EmptyState - 状态组件
```

### 12.2 样式常量抽取

```typescript
// colors.ts
export const LEVEL_COLORS = { ... };
export const CATEGORY_ICONS = { ... };

// styles.ts
export const SELECT_STYLE = { ... };
export const TABLE_CELL_STYLE = { ... };
```

---

*本报告可作为日志/监控类页面设计的参考模板，适用于企业后台、开发者工具、系统管理等场景。*
