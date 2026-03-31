"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface CliLogEntry {
  timestamp: string;
  agentName: string;
  command: string;
  action: "start" | "stop" | "restart";
}

interface StartupLogPanelProps {
  agentName?: string; // 可选，如果提供则只显示该 agent 的日志
}

// 休眠超时时间（毫秒）：1分钟
const SLEEP_TIMEOUT = 60 * 1000;
// 轮询间隔（毫秒）：10秒
const POLL_INTERVAL = 10000;

export function StartupLogPanel({ agentName }: StartupLogPanelProps) {
  const [logs, setLogs] = useState<CliLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 用于追踪上次最新日志的时间戳
  const lastLogTimestamp = useRef<string | null>(null);
  // 休眠计时器
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetSleepTimer = useCallback(() => {
    // 清除现有计时器
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }
    // 如果没有在轮询，恢复轮询
    if (!isPolling) {
      setIsPolling(true);
    }
    // 设置新的休眠计时器
    sleepTimerRef.current = setTimeout(() => {
      setIsPolling(false);
    }, SLEEP_TIMEOUT);
  }, [isPolling]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/cli-logs");
      if (res.ok) {
        const data: CliLogEntry[] = await res.json();
        // 如果指定了 agentName，过滤日志
        const filtered = agentName
          ? data.filter((log) => log.agentName === agentName)
          : data;

        // 检查是否有新日志
        if (filtered.length > 0) {
          const latestLog = filtered[filtered.length - 1];
          if (lastLogTimestamp.current !== latestLog.timestamp) {
            lastLogTimestamp.current = latestLog.timestamp;
            resetSleepTimer();
          }
        }

        setLogs(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch CLI logs:", error);
    }
  }, [agentName, resetSleepTimer]);

  useEffect(() => {
    // 初始获取并启动休眠计时器
    fetchLogs();
    resetSleepTimer();

    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, [fetchLogs, resetSleepTimer]);

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isPolling, fetchLogs]);

  // 展开面板时恢复轮询
  useEffect(() => {
    if (isExpanded && !isPolling) {
      resetSleepTimer();
    }
  }, [isExpanded, isPolling, resetSleepTimer]);

  // 组件挂载后使用 Portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 当没有日志时隐藏组件
  if (logs.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "start":
        return "text-green-400";
      case "stop":
        return "text-red-400";
      case "restart":
        return "text-yellow-400";
      default:
        return "text-zinc-400";
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "start":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "stop":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "restart":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  // 默认显示在背景（模糊效果）
  if (!isExpanded) {
    if (!isMounted) return null;
    return createPortal((
      <div
        className={`
          fixed bottom-4 right-4 z-[9999]
          bg-black/60 backdrop-blur-md rounded-lg border border-white/10
          shadow-xl transition-all duration-300
          ${isMinimized ? "w-12 h-12 cursor-pointer hover:bg-black/80" : "w-80 max-h-48"}
        `}
        onClick={() => {
          if (isMinimized) {
            setIsMinimized(false);
          }
        }}
      >
        {isMinimized ? (
          <div className="w-full h-full flex items-center justify-center relative">
            <TerminalIcon className={`w-5 h-5 ${isPolling ? "text-green-400" : "text-zinc-500"}`} />
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                {logs.length > 9 ? "9+" : logs.length}
              </span>
            )}
            {/* 轮询状态指示器 */}
            <span
              className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${isPolling ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`}
            />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                  CLI Logs
                </span>
                <span className="text-xs text-zinc-500">({logs.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="最小化"
                >
                  <MinimizeIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="展开到前台"
                >
                  <ExpandIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Log Content - 倒序显示，新的在前 */}
            <div className="overflow-y-auto max-h-32 p-2 space-y-1">
              {[...logs].reverse().slice(0, 5).map((log, index) => (
                <div key={index} className="text-xs font-mono">
                  <span className="text-zinc-500">[{formatTimestamp(log.timestamp)}]</span>
                  <span className={`ml-1 ${getActionColor(log.action)}`}>[{log.action.toUpperCase()}]</span>
                  <span className="ml-1 text-zinc-300">{log.agentName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ), document.body);
  }

  // 展开到前台（不模糊）
  if (!isMounted) return null;
  return createPortal((
    <div
      className="
        fixed bottom-4 right-4 z-[9999]
        w-[500px] max-h-[60vh]
        bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-white/10
        shadow-2xl transition-all duration-300
        flex flex-col
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-5 h-5 text-orange-400" />
          <span className="text-sm font-medium text-white uppercase tracking-wider">
            CLI Logs
          </span>
          <span className="text-xs text-zinc-500">({logs.length})</span>
          {/* 轮询状态指示器 */}
          <span
            className={`w-2 h-2 rounded-full ${isPolling ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`}
            title={isPolling ? "轮询中" : "已休眠"}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="收起（保留背景显示）"
          >
            <CollapseIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="最小化"
          >
            <MinimizeIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/30">
        {[...logs].reverse().map((log, index) => (
          <div
            key={index}
            className="p-2 rounded bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-zinc-500 font-mono">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getActionBadgeColor(log.action)}`}>
                {log.action.toUpperCase()}
              </span>
              <span className="text-xs text-orange-400 font-medium">
                [{log.agentName}]
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-300 bg-black/30 px-2 py-1.5 rounded break-all">
              {log.command}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/10 bg-zinc-800/50 rounded-b-lg">
        <p className="text-xs text-zinc-500">
          可以复制上面的命令自行执行进行问题排查
        </p>
      </div>
    </div>
  ), document.body);
}

// Icon Components
function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" x2="21" y1="10" y2="3" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}
