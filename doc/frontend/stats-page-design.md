# 统计页面 (StatsPage) 详细设计分析报告

> 适用场景：数据分析 / 仪表盘 / 使用统计  
> 分析对象：NanoCats Token Usage Statistics 页面  
> 输出日期：2026-03-15

---

## 1. 页面概述

### 1.1 核心功能

| 功能 | 描述 |
|-----|------|
| 时间筛选 | 选择查看 7/14/30 天的数据 |
| 数据概览 | 4 个关键指标卡片 |
| 趋势图表 | 柱状图展示每日使用趋势 |
| 分布图表 | 饼图展示模型使用分布 |
| 详细表格 | 完整数据明细表格 |
| 数据聚合 | 自动计算总计数据 |

### 1.2 页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│  Header                                                          │
│  ┌─────────────────────────────────────────┐  ┌─────────────┐  │
│  │ Token Usage Statistics                  │  │ [7/14/30] ▼│  │
│  │ Monitor your agent's token consumption  │  │            │  │
│  └─────────────────────────────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Summary Cards (4 columns)                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Total     │ │Prompt    │ │Completion│ │Cache     │          │
│  │Tokens    │ │Tokens    │ │Tokens    │ │Hits      │          │
│  │  1.2M   │ │  800K   │ │  400K   │ │  150K   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Charts (2 columns)                                             │
│  ┌─────────────────────┐ ┌─────────────────────┐              │
│  │ Token Usage Over    │ │ Model Distribution  │              │
│  │ Time (Bar Chart)    │ │ (Pie Chart)         │              │
│  └─────────────────────┘ └─────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Detailed Table                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Date    │ Agent │ Model    │ Prompt │ Completion │Total│   │
│  ├─────────┼───────┼──────────┼────────┼────────────┼─────┤   │
│  │ 3/15   │ admin │ claude   │ 1,234  │  567       │1,801│   │
│  │ 3/14   │ admin │ gpt-4o   │ 2,345  │  1,234     │3,579│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 组件设计规范

### 2.1 页面 Header

```tsx
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
      Token Usage Statistics
    </h1>
    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
      Monitor your agent's token consumption and costs
    </p>
  </div>
  <select
    value={days}
    onChange={(e) => setDays(Number(e.target.value))}
    className="px-4 py-2 rounded-xl outline-none text-sm"
    style={{
      backgroundColor: 'var(--bg-card)',
      border: '1.5px solid var(--border-main)',
      color: 'var(--text-primary)',
    }}
  >
    <option value={7}>Last 7 days</option>
    <option value={14}>Last 14 days</option>
    <option value={30}>Last 30 days</option>
  </select>
</div>
```

| 元素 | 样式 |
|-----|------|
| 布局 | `flex items-center justify-between` |
| 标题 | `text-2xl font-bold` |
| 筛选器 | 下拉框，使用统一输入框样式 |

---

### 2.2 数据卡片 (Summary Cards)

#### 容器布局
```tsx
<div className="grid grid-cols-4 gap-5 mb-8">
```

#### 卡片结构
```tsx
<div className="rounded-2xl p-5" 
     style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
  <div className="flex items-center gap-3 mb-3">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" 
         style={{ backgroundColor: 'var(--color-accent-light)' }}>
      <Icon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
    </div>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Label</p>
  </div>
  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
    {value.toLocaleString()}
  </p>
</div>
```

#### 卡片配色方案

| 卡片 | 图标容器背景 | 图标颜色 | 数值颜色 |
|-----|-------------|---------|---------|
| Total Tokens | `--color-accent-light` | `--color-accent` | `--text-primary` |
| Prompt Tokens | `rgba(94,158,110,0.12)` | `--color-success` | `--text-primary` |
| Completion Tokens | `rgba(123,143,161,0.12)` | `--color-primary` | `--text-primary` |
| Cache Hits | `rgba(79,100,120,0.12)` | `--color-primary-dark` | `--text-primary` |

#### 卡片设计规范

| 属性 | 值 |
|-----|---|
| 布局 | `grid grid-cols-4` |
| 间距 | `gap-5` |
| 圆角 | `rounded-2xl` |
| 内边距 | `p-5` |
| 背景 | `bg-card` |
| 边框 | `1px solid border-soft` |

---

### 2.3 图表区域

#### 容器布局
```tsx
<div className="grid grid-cols-2 gap-5">
```

#### 图表卡片
```tsx
<div className="rounded-2xl p-6" 
     style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
  <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
    Chart Title
  </h3>
  <ResponsiveContainer width="100%" height={280}>
    {/* Chart Component */}
  </ResponsiveContainer>
</div>
```

#### 柱状图配置

```tsx
<BarChart data={chartData}>
  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
  <Tooltip contentStyle={{ 
    backgroundColor: 'var(--bg-card)', 
    border: '1px solid var(--border-main)', 
    borderRadius: 12 
  }} />
  <Legend />
  <Bar dataKey="prompt" name="Prompt" fill="#C4956A" radius={[4,4,0,0]} />
  <Bar dataKey="completion" name="Completion" fill="#7B8FA1" radius={[4,4,0,0]} />
</BarChart>
```

#### 饼图配置

```tsx
<PieChart>
  <Pie
    data={pieData}
    cx="50%"
    cy="50%"
    labelLine={false}
    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
    outerRadius={100}
    fill="#C4956A"
    dataKey="value"
  >
    {pieData.map((_, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip contentStyle={{ 
    backgroundColor: 'var(--bg-card)', 
    border: '1px solid var(--border-main)', 
    borderRadius: 12 
  }} />
</PieChart>
```

#### 图表配色

```typescript
const COLORS = ['#C4956A', '#7B8FA1', '#5E9E6E', '#4F6478', '#A3714A'];
```

| 颜色索引 | 用途 |
|---------|------|
| #C4956A | 主强调色 (Prompt/第一个饼块) |
| #7B8FA1 | 主色 (Completion/第二个饼块) |
| #5E9E6E | 成功色 (第三个饼块) |
| #4F6478 | 深主色 (第四个饼块) |
| #A3714A | 深强调色 (第五个饼块) |

#### 图表设计要点

- 高度统一：`height={280}`
- 标题与图表间距：`mb-5`
- 柱状图顶部圆角：`radius={[4,4,0,0]}`
- Tooltip 圆角：12px

---

### 2.4 详细表格

#### 表格容器

```tsx
<div className="mt-8 rounded-2xl overflow-hidden" 
     style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
      Detailed Usage
    </h3>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full">
      {/* Table content */}
    </table>
  </div>
</div>
```

#### 表头

```tsx
<tr style={{ backgroundColor: 'var(--bg-base)' }}>
  <th className="px-6 py-3 text-left text-xs font-medium uppercase" 
      style={{ color: 'var(--text-muted)' }}>
    Column Header
  </th>
</tr>
```

#### 表格行

```tsx
<tr key={index} style={{ borderTop: '1px solid var(--border-soft)' }}>
  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>...</td>
  <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--text-primary)' }}>...</td>
</tr>
```

#### 特殊单元格样式

```tsx
// 总计列高亮
<td className="px-6 py-4 text-sm font-medium text-right" 
    style={{ color: 'var(--color-accent-dark)' }}>
  {total.toLocaleString()}
</td>
```

#### 表格列对齐

| 列类型 | 对齐方式 |
|-------|---------|
| Date | `text-left` |
| Agent | `text-left` |
| Model | `text-left` |
| Prompt Tokens | `text-right` |
| Completion Tokens | `text-right` |
| Total Tokens | `text-right` + `font-medium` + 强调色 |
| Cache Hits | `text-right` |

---

### 2.5 加载状态

```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  );
}
```

---

### 2.6 空状态

```tsx
{stats.length === 0 && (
  <tr>
    <td colSpan={7} className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
      No data available for the selected period
    </td>
  </tr>
)}
```

---

## 3. 数据处理

### 3.1 数据聚合

```typescript
const totals = stats.reduce((acc, stat) => ({
  prompt: acc.prompt + stat.prompt_tokens,
  completion: acc.completion + stat.completion_tokens,
  total: acc.total + stat.total_tokens,
  cacheHits: acc.cacheHits + stat.cache_hits,
  calls: acc.calls + stat.total_calls
}), { prompt: 0, completion: 0, total: 0, cacheHits: 0, calls: 0 });
```

### 3.2 图表数据转换

```typescript
// 柱状图数据
const chartData = stats.map(stat => ({
  date: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  prompt: stat.prompt_tokens,
  completion: stat.completion_tokens,
  total: stat.total_tokens,
  cacheHits: stat.cache_hits
}));

// 饼图数据
const modelData = stats.reduce((acc, stat) => {
  acc[stat.model] = (acc[stat.model] || 0) + stat.total_tokens;
  return acc;
}, {} as Record<string, number>);

const pieData = Object.entries(modelData).map(([name, value]) => ({
  name: name.split('/').pop() || name,  // 取模型简称
  value
}));
```

---

## 4. API 设计

### 4.1 获取统计数据

```typescript
// GET /api/stats/tokens?days=7
// Headers: { Authorization: 'Bearer {token}' }

// Response
[
  {
    "date": "2026-03-15",
    "agent_id": "admin",
    "model": "anthropic/claude-sonnet-4",
    "prompt_tokens": 1234,
    "completion_tokens": 567,
    "total_tokens": 1801,
    "cache_hits": 89,
    "total_calls": 12
  },
  ...
]
```

---

## 5. 类型定义

### 5.1 TokenStats

```typescript
interface TokenStats {
  date: string;
  agent_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cache_hits: number;
  total_calls: number;
}
```

---

## 6. 第三方库

### 6.1 Recharts

本项目使用 [Recharts](https://recharts.org/) 进行数据可视化：

| 组件 | 用途 |
|-----|------|
| `BarChart` | 柱状图 |
| `Bar` | 柱形 |
| `XAxis` | X轴 |
| `YAxis` | Y轴 |
| `CartesianGrid` | 网格线 |
| `Tooltip` | 提示框 |
| `Legend` | 图例 |
| `ResponsiveContainer` | 响应式容器 |
| `PieChart` | 饼图 |
| `Pie` | 饼块 |
| `Cell` | 饼块颜色 |

---

## 7. 迁移重要点

### 7.1 关键技术决策

| 决策点 | 实现 | 理由 |
|-------|------|------|
| 图表库 | Recharts | React 原生支持，TypeScript 友好 |
| 数据转换 | 前端聚合 | 简化后端逻辑 |
| 数字格式化 | `toLocaleString()` | 千位分隔符 |
| 饼图标签 | 百分比 | 直观展示占比 |
| 响应式 | ResponsiveContainer | 自动适配容器宽度 |

### 7.2 常见问题规避

1. **空数据**：使用空状态提示用户
2. **长数字**：使用 `toLocaleString()` 格式化
3. **图表溢出**：使用 `ResponsiveContainer` 包裹
4. **颜色冲突**：预设颜色数组循环使用

### 7.3 性能优化

- 数据量限制 (7/14/30 天)
- 前端聚合减少请求
- 使用 `React.memo` 缓存图表组件

---

## 8. 设计检查清单

- [ ] Header 使用 `flex justify-between` 布局
- [ ] 筛选下拉框使用统一样式
- [ ] 数据卡片使用 4 列网格
- [ ] 卡片使用 `rounded-2xl`
- [ ] 图表区域使用 2 列网格
- [ ] 图表高度统一 (280px)
- [ ] 柱状图顶部圆角
- [ ] 表格表头使用底色区分
- [ ] 数字列右对齐
- [ ] Total 列使用强调色
- [ ] 空数据有友好提示
- [ ] 加载状态显示旋转图标

---

## 9. 扩展建议

### 9.1 可添加功能

- 时间范围自定义选择器
- 导出 CSV/PDF 功能
- 多 Agent 对比视图
- 成本计算 (根据模型定价)
- 同比/环比数据

### 9.2 可添加图表

- 折线图 (趋势线)
- 堆叠柱状图
- 热力图 (使用时段)
- 漏斗图 (转化率)

---

*本报告可作为数据统计/仪表盘类页面设计的参考模板，适用于使用统计、流量分析、费用报表等场景。*
