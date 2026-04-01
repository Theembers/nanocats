"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import { AgentCard } from "@/components/agent-card";
import { StartupLogPanel } from "@/components/startup-log-panel";
import { OpenSpaceDashboardCard } from "@/components/openspace-dashboard-card";
import { AgentInstance } from "@/lib/types";

// 动画延迟工具
const staggerDelay = (index: number) => ({ animationDelay: `${index * 0.1}s` });

export default function DashboardPage() {
  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [nanobotVersion, setNanobotVersion] = useState<string | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNanobotVersion = useCallback(async (forceRefresh = false) => {
    try {
      setVersionLoading(true);
      const url = forceRefresh ? "/api/nanobot/version?refresh=true" : "/api/nanobot/version";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNanobotVersion(data.version);
      }
    } catch (error) {
      console.error("Failed to fetch nanobot version:", error);
      setNanobotVersion(null);
    } finally {
      setVersionLoading(false);
    }
  }, []);

  const handleUpdateNanobot = async () => {
    try {
      setUpdating(true);
      setUpdateMessage(null);
      const res = await fetch("/api/nanobot/update", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setUpdateMessage("更新成功");
        // 更新成功后强制刷新版本（清除缓存重新查找二进制文件）
        setTimeout(() => fetchNanobotVersion(true), 500);
      } else {
        setUpdateMessage(`更新失败: ${data.error || "未知错误"}`);
      }
    } catch {
      setUpdateMessage("更新失败: 网络错误");
    } finally {
      setUpdating(false);
      // 3秒后清除消息
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchNanobotVersion();
    // Agents 轮询：10秒
    const agentsInterval = setInterval(fetchAgents, 10000);
    return () => {
      clearInterval(agentsInterval);
    };
  }, [fetchAgents, fetchNanobotVersion]);

  const runningCount = agents.filter((a) => a.status === "running").length;
  const stoppedCount = agents.filter((a) => a.status === "stopped").length;

  return (
    <div>
      {/* Hero Section */}
      <div className="mb-10 animate-fade-in-up" style={{ animationDelay: "0s" }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
              Dashboard
            </h1>
            <p className="text-zinc-400 text-lg">
              Manage and monitor your nanobot agent instances
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Nanobot Version & Update */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-white/10">
              <span className="text-zinc-300 text-sm font-mono">
                {versionLoading ? "..." : (nanobotVersion || "Unknown")}
              </span>
              <button
                onClick={handleUpdateNanobot}
                disabled={updating}
                className="ml-1 p-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-all duration-200 disabled:opacity-50"
                title="更新 Nanobot"
              >
                <UpdateIcon className={`w-3.5 h-3.5 ${updating ? "animate-spin" : ""}`} />
              </button>
            </div>
            {updateMessage && (
              <span className={`text-xs ${updateMessage.includes("成功") ? "text-green-400" : "text-red-400"}`}>
                {updateMessage}
              </span>
            )}
            <Link href="/agents/new">
              <button className="h-10 px-5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 hover:border-orange-400 font-medium flex items-center gap-2 transition-all">
                <PlusIcon className="w-4 h-4" />
                New Agent
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Overview</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {/* Agents Stats Card */}
          <div className="bg-zinc-900/90 p-6 rounded-xl min-h-[138px] flex flex-col" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-orange-500/70 text-[11px] font-semibold mb-2 uppercase tracking-widest">Agents</p>
                <p className="font-heading text-4xl font-bold text-orange-400">{agents.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
                <BoxesIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex gap-4 mt-auto pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-sm text-zinc-400">
                  <span className="text-white font-semibold">{runningCount}</span> Running
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-600" />
                <span className="text-sm text-zinc-400">
                  <span className="text-white font-semibold">{stoppedCount}</span> Stopped
                </span>
              </div>
            </div>
          </div>

          {/* OpenSpace Dashboard Card */}
          <div style={{ animationDelay: "0.3s" }}>
            <OpenSpaceDashboardCard />
          </div>
        </div>
      </div>

      {/* Agent Instances Section - glass-card 玻璃态 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Instances</span>
        </div>

        {/* Agent Grid */}
        {loading && agents.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-amber-500 rounded-full animate-spin" style={{ animationDuration: "1.5s" }} />
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="animate-fade-in-up text-center py-20" style={{ animationDelay: "0.4s" }}>
            <div className="mx-auto mb-6 opacity-80 flex items-center justify-center">
              <img
                src="/nanocats_logo.png"
                alt="Nanocats"
                className="h-16 w-auto"
              />
            </div>
            <h3 className="font-heading text-2xl font-semibold text-white mb-3">
              No agents yet
            </h3>
            <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
              Create your first nanobot agent to start automating your workflows
            </p>
            <Link href="/agents/new">
              <button className="px-6 py-2.5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 hover:border-orange-400 font-medium flex items-center gap-2 mx-auto transition-all">
                <PlusIcon className="w-4 h-4" />
                Create Agent
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent, index) => (
              <div
                key={agent.name}
                className="animate-fade-in-up"
                style={staggerDelay(index)}
              >
                <AgentCard agent={agent} onStatusChange={fetchAgents} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 启动日志面板 */}
      <StartupLogPanel />
    </div>
  );
}

// Icon components
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function BoxesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
      <path d="m7 16.5-4.74-2.85" />
      <path d="m7 16.5 5-3" />
      <path d="M7 16.5v5.17" />
      <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
      <path d="m17 16.5-5-3" />
      <path d="m17 16.5 4.74-2.85" />
      <path d="M17 16.5v5.17" />
      <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path d="M12 8 7.26 5.15" />
      <path d="m12 8 4.74-2.85" />
      <path d="M12 13.5V8" />
    </svg>
  );
}

function UpdateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}
