# NanoCats 前端视觉风格分析报告

> 分析日期：2026-03-15  
> 项目：NanoCats Agent Swarm Web UI  
> 技术栈：React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts

---

## 1. 设计主题与灵感来源

### 1.1 核心主题：American Shorthair（美国短毛猫）

项目以 **American Shorthair（美国短毛猫）** 为设计灵感，巧妙地将猫咪的特征融入界面设计：

| 猫咪特征 | 界面应用 |
|---------|---------|
| 银色蓝灰色虎斑毛皮 | 主色调 `--color-primary` (蓝灰色 #7B8FA1) |
| 温暖象牙色底毛 | 页面背景 `--bg-base` (#F5F3EF) |
| 虎斑条纹（琥珀棕色） | 强调色 `--color-accent` (#C4956A) |
| 鼻皮革（深咖啡色） | 文本色 `--text-primary` (#2D2926) |

### 1.2 设计理念

- **温暖亲和**：采用暖色调背景，营造舒适的使用体验
- **专业可信**：深色侧边栏与浅色主区域的对比，传递可靠感
- **简洁现代**：大量留白、轻量级阴影、柔和圆角

---

## 2. 色彩体系

### 2.1 完整色彩变量表

```css
:root {
  /* ─── 背景色 ─── */
  --bg-base:    #F5F3EF;   /* 温暖象牙色 - 页面主背景 */
  --bg-card:    #FEFCF8;   /* 近白色 - 卡片表面 */
  --bg-sidebar: #2E3A45;   /* 深蓝灰色 - 侧边栏背景 */
  --bg-sidebar-hover: #3A4A57;
  --bg-sidebar-active: #C4956A; /* 琥珀条纹 - 激活项 */

  /* ─── 主色 (蓝灰色) ─── */
  --color-primary:       #7B8FA1;
  --color-primary-light: #EBF0F5;
  --color-primary-dark:  #4F6478;

  /* ─── 强调色 (虎斑琥珀棕) ─── */
  --color-accent:        #C4956A;
  --color-accent-light:  #F7EDE0;
  --color-accent-dark:   #A3714A;

  /* ─── 文本色 ─── */
  --text-primary:   #2D2926;   /* 深咖啡色 - 主要文本 */
  --text-secondary: #7A6F67;   /* 暖灰色 - 次要文本 */
  --text-muted:     #B0A49C;   /* 浅暖灰色 - 弱化文本 */
  --text-inverse:   #FEFCF8;   /* 白色 - 深色背景上的文本 */

  /* ─── 边框色 ─── */
  --border-soft:  #E8E2D9;   /* 柔和边框 */
  --border-main:  #D4C9BE;   /* 主要边框 */

  /* ─── 状态色 ─── */
  --color-success: #5E9E6E;   /* 绿色 - 成功 */
  --color-error:   #C0614A;   /* 红色 - 错误 */
  --color-warning: #C4956A;   /* 琥珀色 - 警告（与accent相同）*/
}
```

### 2.2 色彩应用规范

| 色彩 | 用途 | 使用场景 |
|-----|------|---------|
| `#F5F3EF` | 页面背景 | 全局 body 背景 |
| `#FEFCF8` | 卡片背景 | 所有卡片式组件 |
| `#2E3A45` | 侧边栏背景 | Layout 侧边栏 |
| `#7B8FA1` | 主色调 | 图标、次要按钮、数据展示 |
| `#C4956A` | 强调色 | 主按钮、激活状态、用户消息气泡 |
| `#2D2926` | 主文本 | 标题、正文 |
| `#7A6F67` | 次要文本 | 描述文字、表格内容 |
| `#B0A49C` | 弱化文本 | 占位符、时间戳、次要标签 |

### 2.3 状态色彩

```
成功状态:
  - 背景: rgba(94, 158, 110, 0.1)
  - 边框: rgba(94, 158, 110, 0.3)
  - 文本: #5E9E6E

错误状态:
  - 背景: rgba(192, 97, 74, 0.1)
  - 边框: rgba(192, 97, 74, 0.3)
  - 文本: #C0614A

警告状态:
  - 背景: rgba(196, 149, 106, 0.15)
  - 文本: #A3714A
```

---

## 3. 排版体系

### 3.1 字体规范

```css
/* 正文字体 - 系统无衬线字体 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* 代码字体 - 等宽字体 */
font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
```

### 3.2 字号层级

| 元素 | 字号 | 字重 | 行高 |
|-----|-----|-----|-----|
| 页面标题 (h1) | 2xl (24px) | bold | - |
| 卡片标题 (h2) | xl (20px) | bold | - |
| 区块标题 (h3) | lg (18px) | semibold | - |
| 正文 | sm (14px) | normal | 1.6 |
| 辅助文字 | xs (12px) | normal | - |
| 按钮 | sm (14px) | medium/semibold | - |

### 3.3 间距系统

基于 Tailwind 的间距规范，主要使用：

- `p-2` / `p-3` / `p-4` / `p-5` / `p-6` / `p-8`：内边距
- `m-2` / `m-3` / `m-4` / `m-5` / `m-6` / `m-8`：外边距
- `gap-2` / `gap-3` / `gap-4` / `gap-5` / `gap-6`：flex/grid 间隙
- `space-y-2` / `space-y-4` / `space-y-6`：垂直间距

---

## 4. 组件设计规范

### 4.1 圆角系统

所有组件统一使用 **圆润设计**，圆角半径如下：

| 组件 | 圆角值 | CSS 类 |
|-----|-------|-------|
| 卡片 | 16px (2xl) | `rounded-2xl` |
| 按钮 | 12px (xl) | `rounded-xl` |
| 输入框 | 12px (xl) | `rounded-xl` |
| 标签/徽章 | 8px (lg) | `rounded-lg` |
| 小元素 | 4px | `rounded` |

### 4.2 边框规范

```css
/* 柔和边框 - 用于卡片、分隔线 */
border: 1px solid var(--border-soft);  /* #E8E2D9 */

/* 主边框 - 用于输入框激活态 */
border: 1.5px solid var(--border-main); /* #D4C9BE */
```

### 4.3 阴影

**不使用阴影**，完全依赖：

- 背景色对比 (`--bg-card` vs `--bg-base`)
- 细边框 (`1px solid var(--border-soft)`)

### 4.4 按钮设计

#### 主按钮
```css
background-color: var(--color-accent);  /* #C4956A */
color: var(--text-inverse);              /* #FEFCF8 */
padding: px-4 py-3;
border-radius: rounded-xl;
transition: all;
```

#### 次要按钮
```css
background-color: var(--color-primary-light);  /* #EBF0F5 */
color: var(--color-primary-dark);              /* #4F6478 */
padding: px-3 py-2;
border-radius: rounded-lg;
```

#### 按钮状态
- **Hover**: 透明度 80% 或背景色变化
- **Disabled**: 透明度 40%
- **Loading**: 显示旋转图标 + "Loading..." 文字

### 4.5 输入框设计

```css
background-color: var(--bg-card);      /* #FEFCF8 */
border: 1.5px solid var(--border-main); /* #D4C9BE */
border-radius: rounded-xl;
padding: px-4 py-3;
transition: border-color;

/* Focus 状态 */
border-color: var(--color-accent);     /* 聚焦时变为强调色 */
```

### 4.6 卡片设计

```css
background-color: var(--bg-card);   /* #FEFCF8 */
border: 1px solid var(--border-soft); /* #E8E2D9 */
border-radius: rounded-2xl;
padding: p-5 / p-6;
```

---

## 5. 布局规范

### 5.1 整体布局

采用 **侧边栏 + 主内容区** 的经典管理后台布局：

```
┌─────────────────────────────────────────────┐
│              Sidebar (240px)                │
│  ┌─────────────────────────────────────┐   │
│  │ Logo + Brand                        │   │
│  ├─────────────────────────────────────┤   │
│  │ Navigation (Chat/Config/Stats/Logs) │   │
│  ├─────────────────────────────────────┤   │
│  │ User Info + Logout                  │   │
│  └─────────────────────────────────────┘   │
│              Main Content                   │
│  ┌─────────────────────────────────────┐   │
│  │ Page Content                        │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 5.2 侧边栏规范

```css
background-color: var(--bg-sidebar);  /* #2E3A45 */
width: 240px;                         /* w-60 */
padding: p-4;
```

- Logo 区域：带图标 (Cat icon) + 品牌名
- 导航项：图标 + 文字，高度 40px，hover 时背景变亮
- 激活状态：背景变为 `--color-accent` (#C4956A)

### 5.3 主内容区

```css
padding: p-8;  /* 32px */
max-width: 无限制，根据内容自适应
```

### 5.4 响应式断点

- **Mobile**: 侧边栏隐藏，显示移动端导航
- **Tablet** (`< 1024px`): 部分布局调整
- **Desktop** (`>= 1024px`): 完整双栏布局

---

## 6. 页面规范

### 6.1 登录页 (LoginPage)

**布局**：左右分栏（左 40% 深色装饰区 + 右 60% 登录表单）

**左面板**：
- 深色背景 (`--bg-sidebar`)
- 品牌 Logo (猫图标 + "nanocats")
- 装饰性虎斑条纹图案

**右面板**：
- 浅色背景 (`--bg-base`)
- 表单卡片：`Agent ID` + `Access Token`
- 提交按钮：强调色

### 6.2 聊天页 (ChatPage)

**布局**：左 Channels 侧边栏 + 右聊天区域

**Channels 侧边栏**：
- 宽度：240px
- 搜索功能（可展开）
- Channel 列表（带消息数量徽章）

**聊天区域**：
- 消息气泡：用户消息为强调色，助手消息为浅灰背景
- 时间戳：弱化文本色
- 日期分隔线：细边框 + 居中日期
- 加载状态：旋转图标 + "Thinking..."
- 消息最大宽度：70%

### 6.3 配置页 (ConfigPage)

**布局**：顶部 Tab 切换 + 内容区

**Tab 样式**：
```css
/* 非激活 */
color: var(--text-muted);
border-bottom: 2px solid transparent;

/* 激活 */
color: var(--color-accent-dark);
border-bottom: 2px solid var(--color-accent);
```

**内容卡片**：分块的表单区域（基本信息、模型设置、MCP & Skills）

### 6.4 统计页 (StatsPage)

**布局**：顶部筛选 + 数据卡片 + 图表 + 表格

**数据卡片**：4 列网格，每列显示一个指标（总 Tokens、Prompt、Completion、Cache Hits）

**图表**：使用 Recharts 库
- 柱状图：每日 Token 使用趋势
- 饼图：模型使用分布

**图表配色**：
```javascript
const COLORS = ['#C4956A', '#7B8FA1', '#5E9E6E', '#4F6478', '#A3714A'];
```

### 6.5 日志页 (LogsPage)

**布局**：筛选器 + 日志表格 + 统计卡片

**筛选器**：
- Category 下拉框
- Level 下拉框 (INFO/WARN/ERROR/DEBUG)
- Refresh 按钮

**日志表格**：
- 斑马纹 (可选)
- Level 标签：彩色圆角小标签
- 可展开的 Details

---

## 7. 动画与过渡

### 7.1 过渡效果

所有交互元素使用统一的过渡：

```css
transition: all;  /* 或 */
transition: all 300ms ease;
transition: border-color;
transition: opacity;
transition: background-color;
```

### 7.2 加载动画

```css
/* 旋转图标 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 7.3 滚动行为

```css
/* 消息自动滚动到底部 */
scrollIntoView({ behavior: 'smooth' });
```

---

## 8. Markdown 内容样式

聊天消息中的 Markdown 使用自定义样式：

```css
.markdown-content {
  line-height: 1.6;
}

/* 代码块 */
.markdown-content pre {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  background-color: var(--bg-elevated);
  border-radius: 0.5rem;
  padding: 0.75rem;
  overflow-x: auto;
}

/* 行内代码 */
.markdown-content code {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

/* 表格 */
.markdown-content table {
  border: 1px solid var(--border-soft);
  width: 100%;
}

/* 引用块 */
.markdown-content blockquote {
  border-left: 2px solid var(--color-accent);
  padding-left: 0.75rem;
  font-style: italic;
}

/* 链接 */
.markdown-assistant a {
  color: var(--color-accent-dark);
  text-decoration: underline;
}
```

---

## 9. 图标规范

### 9.1 图标库

使用 **Lucide React** 图标库：

```typescript
import { 
  MessageSquare, Settings, BarChart3, FileText, 
  LogOut, Cat, Send, Search, Globe, Loader2,
  ChevronDown, ChevronRight, Save, User, Bot, 
  Wrench, AlertCircle, CheckCircle2, TrendingUp,
  Coins, Zap, Terminal, Cpu, BookOpen
} from 'lucide-react';
```

### 9.2 图标尺寸

| 场景 | 尺寸 |
|-----|-----|
| 导航图标 | 16px (w-4 h-4) |
| 按钮图标 | 16px / 20px |
| 大图标 | 32px / 48px |
| Logo 图标 | 20px / 24px / 36px / 48px |

### 9.3 图标颜色

默认使用 `var(--text-secondary)` 或 `var(--text-muted)`，强调元素使用 `var(--color-accent)`。

---

## 10. 技术实现细节

### 10.1 技术栈

| 类别 | 技术 |
|-----|-----|
| 框架 | React 19 |
| 语言 | TypeScript |
| 构建工具 | Vite 7 |
| 样式 | Tailwind CSS 4 + CSS Variables |
| 路由 | React Router DOM 7 |
| 图表 | Recharts 3 |
| Markdown | react-markdown + remark-gfm |
| 图标 | Lucide React |

### 10.2 CSS 架构

- **Tailwind CSS**：基础样式工具类
- **CSS Variables**：主题色彩和设计Token
- **内联样式**：组件特定的值（如特定颜色）

---

## 11. 总结：设计原则

### 11.1 核心理念

1. **温暖专业**：以美国短毛猫为灵感，暖色调传递亲和感，深色调传递专业感
2. **简洁克制**：不使用复杂阴影和过度装饰，依赖色彩对比
3. **一致性**：所有页面遵循统一的色彩、圆角、间距规范

### 11.2 可复用设计Token

```css
/* 核心Token */
--bg-base, --bg-card, --bg-sidebar
--color-primary, --color-primary-light, --color-primary-dark
--color-accent, --color-accent-light, --color-accent-dark
--text-primary, --text-secondary, --text-muted, --text-inverse
--border-soft, --border-main

/* 状态Token */
--color-success, --color-error, --color-warning
```

### 11.3 设计检查清单

- [ ] 所有卡片使用 `--bg-card` 背景 + `--border-soft` 边框 + `rounded-2xl`
- [ ] 所有按钮使用 `rounded-xl` 圆角
- [ ] 所有输入框使用 `rounded-xl` 圆角 + `1.5px` 边框
- [ ] 激活状态使用 `--color-accent` 强调色
- [ ] 页面标题使用 `text-2xl font-bold`
- [ ] 正文使用 `text-sm`
- [ ] 加载状态使用 `animate-spin` 旋转图标

---

*本报告可作为前端开发的视觉参考标准，新功能开发时应遵循上述规范以保持设计一致性。*
