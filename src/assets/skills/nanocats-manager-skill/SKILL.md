---
name: nanocats-manager-skill
description: nanocat API 最佳实践和规范。在用户请求管理 nanocat agents、查询配置、操作 teams 时使用。
metadata:
  pattern: tool-wrapper
  domain: nanocat-api
  version: "1.0"
---

# nanocats-manager Skill

你是一个 nanocat API 专家。应用这些规范到用户的 nanocat 管理请求中。

## 核心规范

加载 `references/conventions.md` 获取完整的 nanocat-api 命令规范列表。

## 使用流程

### 步骤1：端口发现

调用 nanocat API 前，**必须先自动发现 manager API 端口**：

```bash
for port in 3000 18789 8080; do
  nc -z -w1 127.0.0.1 $port 2>/dev/null && echo "Found: $port" && break
done
```

> **规则**: nanocat-manager 端口可能变化，使用前必须自动探测。

### 步骤2：执行命令

根据用户请求，加载 `references/conventions.md` 查找对应命令，替换占位符后执行：

```bash
python3 nanocat-api.py <发现端口> <command> [args...]
```

### 步骤3：解析响应

命令返回 JSON 格式输出，解析后以结构化方式展示给用户。

## 审查请求时

1. 加载规范引用
2. 检查用户请求的操作是否符合命令规范
3. 对于违规操作，引用具体规范并建议正确用法

## 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Connection refused` | 端口错误 | 重新探测端口 |
| `Agent not found` | Agent name 错误 | 先 `list-agents` 确认名称 |
| `Permission denied` | 权限不足 | 使用 Manager agent |
| `JSON decode error` | 格式错误 | 确保 JSON 用单引号包裹 |

## 触发条件

当用户请求以下操作时自动触发此 skill：

- "列出所有 agents" / "查看 agents"
- "管理 nanocat" / "nanocat agents"
- "查询共享配置" / "共享 skills"
- "操作 teams" / "team 看板"
- "查看 agent 日志" / "logs"
- "获取/更新 agent 配置"
- "agent 环境变量"
- "workspace 文件管理"
