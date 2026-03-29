"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AgentLog } from "@/lib/types";

interface LogViewerProps {
  agentName: string;
}

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal" | "unknown";

type LogType = "process_message" | "before_execute_tools" | "general";

interface ParsedLog {
  level: LogLevel;
  message: string;
  raw: string;
  logType: LogType;
}

// Detect log level
function detectLogLevel(content: string): LogLevel {
  const lower = content.toLowerCase();
  
  if (/\b(fatal|critical|emergency)\b/.test(lower)) return "fatal";
  if (/\b(error|exception|traceback)\b/.test(lower)) return "error";
  if (/\b(warn|warning|caution)\b/.test(lower)) return "warn";
  if (/\b(debug|trace|verbose)\b/.test(lower)) return "debug";
  if (/\b(info|information|log)\b/.test(lower)) return "info";
  
  try {
    const json = JSON.parse(content);
    if (json.level) {
      const level = String(json.level).toLowerCase();
      if (level.includes("fatal")) return "fatal";
      if (level.includes("error")) return "error";
      if (level.includes("warn")) return "warn";
      if (level.includes("debug")) return "debug";
      if (level.includes("info")) return "info";
    }
  } catch {
    // Not JSON
  }
  
  return "unknown";
}

// Get log type - distinguish between process_message and before_execute_tools
function detectLogType(content: string): LogType {
  const lower = content.toLowerCase();
  
  // Detect before_execute_tools first (more specific)
  if (lower.includes("_before_execute_tools") || lower.includes("before_execute_tools")) {
    return "before_execute_tools";
  }
  
  // Detect _process_message
  if (lower.includes("_process_message") || lower.includes("process_message")) {
    return "process_message";
  }
  
  return "general";
}

// Get log level label color
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "fatal":
      return "text-purple-400";
    case "error":
      return "text-rose-400";
    case "warn":
      return "text-amber-400";
    case "info":
      return "text-blue-400";
    case "debug":
      return "text-zinc-500";
    default:
      return "text-zinc-400";
  }
}

// Get background color based on log type
function getLogTypeBackground(logType: LogType): string {
  switch (logType) {
    case "process_message":
      return "bg-blue-900/50 border-l-2 border-blue-400/60";
    case "before_execute_tools":
      return "bg-emerald-900/50 border-l-2 border-emerald-400/60";
    default:
      return "";
  }
}

// Get icon/text indicator for log type
function getLogTypeIndicator(logType: LogType): { label: string; bgColor: string; textColor: string } | null {
  switch (logType) {
    case "process_message":
      return { label: "MSG", bgColor: "bg-blue-900/60", textColor: "text-blue-300" };
    case "before_execute_tools":
      return { label: "TOOL", bgColor: "bg-emerald-900/60", textColor: "text-emerald-300" };
    default:
      return null;
  }
}

// Get log content color - always light gray for content
function getContentColor(level: LogLevel, stream: "stdout" | "stderr"): string {
  if (stream === "stderr") return "text-zinc-300";
  return "text-zinc-300";
}

// Parse log content
function parseLogContent(content: string): ParsedLog {
  const level = detectLogLevel(content);
  const logType = detectLogType(content);
  let message = content;
  
  try {
    const json = JSON.parse(content);
    if (json.msg || json.message) {
      message = json.msg || json.message;
    } else if (json.content) {
      message = json.content;
    }
  } catch {
    // Not JSON
  }
  
  return { level, message, raw: content, logType };
}

export function LogViewer({ agentName }: LogViewerProps) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/agents/${agentName}/logs`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const log: AgentLog = JSON.parse(event.data);
        setLogs((prev) => {
          const newLogs = [...prev, log];
          if (newLogs.length > 500) {
            return newLogs.slice(-500);
          }
          return newLogs;
        });
      } catch (e) {
        console.error("Failed to parse log:", e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [agentName]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-zinc-900">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "bg-green-400 animate-status-pulse" : "bg-red-400"
            )}
          />
          <span className="text-sm text-zinc-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="px-3 py-1.5 rounded-md glass-button text-xs text-zinc-300"
        >
          {autoScroll ? "Pause Auto-scroll" : "Resume Auto-scroll"}
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-zinc-950 p-4 font-mono text-sm"
        style={{ maxHeight: "calc(100vh - 300px)", minHeight: "400px" }}
      >
        {logs.length === 0 ? (
          <div className="text-zinc-500 text-center py-8">
            Waiting for logs...
          </div>
        ) : (
          logs.map((log, index) => {
            const parsed = parseLogContent(log.content);
            const levelLabel = parsed.level !== "unknown" ? (
              <span className={cn(
                "shrink-0 mr-2 font-medium",
                getLevelColor(parsed.level)
              )}>
                [{parsed.level.toUpperCase()}]
              </span>
            ) : null;
            
            const typeIndicator = getLogTypeIndicator(parsed.logType);
            const bgClass = getLogTypeBackground(parsed.logType);
            
            return (
              <div 
                key={index} 
                className={cn(
                  "flex gap-2 items-center hover:bg-zinc-900 rounded px-1 -mx-1 text-xs leading-normal py-0.5",
                  bgClass
                )}
              >
                <span className="text-zinc-600 select-none shrink-0">
                  {formatTime(log.timestamp)}
                </span>
                {typeIndicator && (
                  <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide", typeIndicator.bgColor, typeIndicator.textColor)}>
                    {typeIndicator.label}
                  </span>
                )}
                {levelLabel}
                <span
                  className={cn(
                    "truncate",
                    getContentColor(parsed.level, log.stream)
                  )}
                  title={parsed.raw}
                >
                  {parsed.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
