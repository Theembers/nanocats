import { NextRequest, NextResponse } from "next/server";
import {
  getAgent,
  setupMemberSymlinks,
  applySharedConfigToAgent,
  ensureSharedConfig,
} from "@/lib/store";

/**
 * POST /api/shared-config/apply - 应用共享配置到指定成员 agent（manager 或 member）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentNames, managerName } = body;

    if (!agentNames || !Array.isArray(agentNames)) {
      return NextResponse.json(
        { error: "agentNames is required and must be an array" },
        { status: 400 }
      );
    }

    // 验证权限：只有 manager 可以应用配置
    if (managerName) {
      const manager = getAgent(managerName);
      if (!manager || manager.role !== "manager") {
        return NextResponse.json(
          { error: "Only manager agents can apply shared config" },
          { status: 403 }
        );
      }
    }

    // 确保共享配置目录存在
    ensureSharedConfig();

    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const agentName of agentNames) {
      try {
        const agent = getAgent(agentName);

        if (!agent) {
          results.push({ name: agentName, success: false, error: "Agent not found" });
          continue;
        }

        if (agent.role !== "manager" && agent.role !== "member") {
          results.push({
            name: agentName,
            success: false,
            error: "Agent does not have shared config role",
          });
          continue;
        }

        // 使用新的函数来应用共享配置（支持 manager 和 member）
        applySharedConfigToAgent(agent);
        results.push({ name: agentName, success: true });
      } catch (error) {
        results.push({
          name: agentName,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
    });
  } catch (error) {
    console.error("POST /api/shared-config/apply error:", error);
    return NextResponse.json(
      { error: "Failed to apply shared config" },
      { status: 500 }
    );
  }
}
