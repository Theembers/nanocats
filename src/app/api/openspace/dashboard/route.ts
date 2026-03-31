import { NextRequest, NextResponse } from "next/server";
import { openSpaceManager, DashboardStatus } from "@/lib/openspace-manager";

// GET /api/openspace/dashboard - 获取 Dashboard 状态
export async function GET() {
  try {
    const status: DashboardStatus = openSpaceManager.getStatus();
    const logs = openSpaceManager.getLogs();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        logs: logs.slice(-50), // 返回最近 50 条日志
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// POST /api/openspace/dashboard - 启动 Dashboard
export async function POST() {
  try {
    // 如果已经在运行，直接返回状态
    const currentStatus = openSpaceManager.getStatus();
    if (currentStatus.running) {
      return NextResponse.json({
        success: true,
        data: currentStatus,
        message: "Dashboard 已经在运行",
      });
    }

    const status = await openSpaceManager.startDashboard();
    
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// DELETE /api/openspace/dashboard - 停止 Dashboard
export async function DELETE() {
  try {
    await openSpaceManager.stopDashboard();
    
    return NextResponse.json({
      success: true,
      message: "Dashboard 已停止",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
