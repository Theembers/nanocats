import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/store";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface Skill {
  name: string;
  path: string;
  description?: string;
  enabled: boolean;
}

const SKILLS_CONFIG_FILE = "skills.json";

/**
 * GET /api/agents/[id]/skills - 获取所有 skills
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const skillsDir = path.join(agent.workspacePath, "workspace", "skills");
    
    if (!fs.existsSync(skillsDir)) {
      return NextResponse.json({ skills: [] });
    }

    // 读取 skills 配置（哪些 skill 被启用）
    const configPath = path.join(agent.workspacePath, "workspace", SKILLS_CONFIG_FILE);
    let enabledSkills: string[] = [];
    
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        enabledSkills = config.enabled || [];
      } catch {
        // 配置文件解析失败，使用空数组
      }
    }

    // 扫描 skills 目录
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = entry.name;
      const skillFullPath = path.join(skillsDir, skillPath);
      const skillMdPath = path.join(skillFullPath, "SKILL.md");

      // 检查是否有 SKILL.md
      if (!fs.existsSync(skillMdPath)) continue;

      // 读取 SKILL.md 获取描述
      let description = "";
      let displayName = skillPath;
      try {
        const content = fs.readFileSync(skillMdPath, "utf-8");
        
        // 尝试解析 YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          
          // 提取 name
          const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
          if (nameMatch) {
            displayName = nameMatch[1].trim();
          }
          
          // 提取 description (支持多行以 > 开头的格式)
          const descMatch = frontmatter.match(/^description:\s*>?\s*\n?([\s\S]*?)(?=^\w+:|\n---|$)/m);
          if (descMatch) {
            description = descMatch[1]
              .split('\n')
              .map(line => line.trim().replace(/^\s+/, ''))
              .join(' ')
              .trim()
              .slice(0, 200);
          }
        }
        
        // 如果没有从 frontmatter 获取到描述，尝试提取第一行标题
        if (!description) {
          const firstLine = content.split("\n")[0];
          if (firstLine && firstLine.startsWith("#")) {
            description = firstLine.replace(/^#+\s*/, "").trim();
          }
        }
      } catch {
        // 读取失败，使用默认值
      }

      skills.push({
        name: displayName,
        path: skillPath,
        description,
        enabled: enabledSkills.includes(skillPath),
      });
    }

    return NextResponse.json({ skills });
  } catch (error) {
    console.error("GET /api/agents/[id]/skills error:", error);
    return NextResponse.json(
      { error: "Failed to get skills" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id]/skills - 启用/禁用 skill
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const { path: skillPath, enabled } = body;

    if (!skillPath) {
      return NextResponse.json(
        { error: "path is required" },
        { status: 400 }
      );
    }

    // 读取当前配置
    const configPath = path.join(agent.workspacePath, "workspace", SKILLS_CONFIG_FILE);
    let config: { enabled: string[] } = { enabled: [] };
    
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (!Array.isArray(config.enabled)) {
          config.enabled = [];
        }
      } catch {
        // 配置文件解析失败，使用默认配置
      }
    }

    // 更新配置
    if (enabled) {
      if (!config.enabled.includes(skillPath)) {
        config.enabled.push(skillPath);
      }
    } else {
      config.enabled = config.enabled.filter((s) => s !== skillPath);
    }

    // 保存配置
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/agents/[id]/skills error:", error);
    return NextResponse.json(
      { error: "Failed to update skill" },
      { status: 500 }
    );
  }
}
