"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLinkIcon, PlayIcon, SquareIcon, Loader2Icon, LayoutDashboardIcon } from "lucide-react";

interface DashboardStatus {
  running: boolean;
  dashboardUrl?: string;
  frontendUrl?: string;
  dashboardPid?: number;
  frontendPid?: number;
  error?: string;
  logs?: string[];
}

export function OpenSpaceDashboardCard() {
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/openspace/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch OpenSpace status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/openspace/dashboard", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("启动失败:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/openspace/dashboard", { method: "DELETE" });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error("停止失败:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = status?.running;

  // 加载中状态
  if (loading && !status) {
    return (
      <div className="bg-zinc-900/90 p-6 rounded-xl flex items-center justify-center min-h-[138px]">
        <Loader2Icon className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/90 p-6 rounded-xl min-h-[138px]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-zinc-500 text-[11px] font-semibold mb-2 uppercase tracking-widest">OpenSpace</p>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning ? "bg-green-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span className={`text-base font-semibold ${isRunning ? "text-green-400" : "text-zinc-400"}`}>
              {isRunning ? "Running" : "Stopped"}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${isRunning ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800/80 text-zinc-400"}`}>
          <LayoutDashboardIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Dashboard 链接 + Stop 按钮 */}
      {isRunning && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
          {status?.frontendUrl && (
            <a
              href={status.frontendUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>Open Dashboard</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handleStop}
            disabled={actionLoading}
            className="h-8 px-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="停止 Dashboard"
          >
            {actionLoading ? (
              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SquareIcon className="w-3.5 h-3.5" />
            )}
            <span className="text-sm">Stop</span>
          </button>
        </div>
      )}

      {/* Start 按钮 */}
      {!isRunning && (
        <div className="pt-4 border-t border-zinc-800/50">
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="w-full h-9 px-4 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            title="启动 Dashboard"
          >
            {actionLoading ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Start Dashboard</span>
          </button>
          {/* 错误信息 */}
          {status?.error && (
            <p className="text-xs text-red-400 mt-3 truncate" title={status.error}>
              {status.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
