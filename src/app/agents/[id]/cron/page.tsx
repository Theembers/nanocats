"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { FileEditor } from "@/components/file-editor";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SessionRecord {
  role?: string;
  content?: string;
  timestamp?: string;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

interface SessionFile {
  filename: string;
  createdAt: string;
  records: SessionRecord[];
}

// Icons
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/>
      <rect width="16" height="12" x="4" y="8" rx="2"/>
      <path d="M2 14h2"/>
      <path d="M20 14h2"/>
      <path d="M15 13v2"/>
      <path d="M9 13v2"/>
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function ToolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    </svg>
  );
}

// Format timestamp
function formatTime(timestamp?: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return date.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Parse think content
function parseThinkContent(content: string): { think: string | null; rest: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    return { think: thinkMatch[1].trim(), rest: content.replace(/<think>[\s\S]*?<\/think>/, "").trim() };
  }
  return { think: null, rest: content };
}

// Tool Call Block
function ToolCallBlock({ toolCalls }: { toolCalls: { id: string; function: { name: string; arguments: string } }[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };
  return (
    <div className="mb-3 space-y-2">
      {toolCalls.map((tc) => (
        <div key={tc.id} className="rounded-lg border border-blue-500/30 bg-blue-500/10 overflow-hidden">
          <button onClick={() => toggle(tc.id)} className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors">
            <ToolIcon className="w-4 h-4" />
            <span className="font-mono">{tc.function.name}</span>
            <ChevronDownIcon className={cn("w-4 h-4 ml-auto transition-transform", expandedIds.has(tc.id) && "rotate-180")} />
          </button>
          {expandedIds.has(tc.id) && (
            <div className="px-3 py-2 border-t border-blue-500/30">
              <pre className="text-xs text-blue-300/80 overflow-x-auto whitespace-pre-wrap break-all">
                {(() => { try { return JSON.stringify(JSON.parse(tc.function.arguments), null, 2); } catch { return tc.function.arguments; } })()}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Tool Result Block
function ToolResultBlock({ name, content }: { name: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.length > 100 ? content.slice(0, 100) + "..." : content;
  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/10 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-3 py-2 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors">
        <ToolIcon className="w-4 h-4" />
        <span className="font-mono">{name}</span>
        <span className="text-xs text-green-400/60">result</span>
        <ChevronDownIcon className={cn("w-4 h-4 ml-auto transition-transform", expanded && "rotate-180")} />
      </button>
      <div className="px-3 py-2 border-t border-green-500/30">
        {expanded ? (
          <pre className="text-xs text-green-300/80 overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">{content}</pre>
        ) : (
          <div className="text-xs text-green-300/60 truncate">{preview}</div>
        )}
      </div>
    </div>
  );
}

// Message Item - 与 Chat 页面风格一致
function MessageItem({ record }: { record: SessionRecord }) {
  const [copied, setCopied] = useState(false);
  const role = record.role || "unknown";
  const content = record.content || "";
  const timestamp = record.timestamp || "";

  // 提取纯对话内容（去掉 think 部分）
  const { rest } = parseThinkContent(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "tool") {
    return (
      <div className="flex justify-start gap-3">
        {/* 工具头像 */}
        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
          <ToolIcon className="w-4 h-4 text-green-400" />
        </div>
        <div className="max-w-[85%] space-y-1">
          {/* Role label */}
          <div className="text-xs text-zinc-500">Tool</div>
          <ToolResultBlock name={record.name || "unknown"} content={content} />
          <div className="text-xs text-zinc-500">{formatTime(timestamp)}</div>
        </div>
      </div>
    );
  }

  const isUser = role === "user";
  const { think } = parseThinkContent(content);

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Agent/Bot 头像 - 左侧 */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
          <BotIcon className="w-4 h-4 text-orange-400" />
        </div>
      )}
      
      {/* Content */}
      <div className={cn("max-w-[75%] space-y-1", isUser && "items-end")}>
        {/* Role label */}
        <div className={cn("text-xs text-zinc-500", isUser && "text-right")}>
          {isUser ? "Scheduled Task" : "Assistant"}
        </div>
        
        {/* Message bubble */}
        <div className={cn(
          "px-4 py-3 rounded-2xl border",
          isUser 
            ? "bg-zinc-800 text-zinc-100 rounded-br-md border-zinc-700/50" 
            : "bg-zinc-800/50 text-zinc-200 rounded-bl-md border-zinc-700/50"
        )}>
          {!isUser && think && (
            <div className="mb-3 rounded-lg border border-purple-500/30 bg-purple-500/10 overflow-hidden">
              <div className="px-3 py-2 text-purple-400 text-sm font-medium">Thinking</div>
              <div className="px-3 py-2 border-t border-purple-500/30 text-sm text-purple-300/80 whitespace-pre-wrap">{think}</div>
            </div>
          )}
          {!isUser && record.tool_calls && record.tool_calls.length > 0 && <ToolCallBlock toolCalls={record.tool_calls} />}
          <div className="whitespace-pre-wrap">{rest}</div>
        </div>
        
        {/* Timestamp + Copy button */}
        <div className={cn("flex items-center gap-2 text-xs text-zinc-500", isUser && "flex-row-reverse")}>
          <span>{formatTime(timestamp)}</span>
          {rest && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-zinc-700/50 transition-colors"
              title="复制对话内容"
            >
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-200" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* 用户头像 - 右侧 */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-4 h-4 text-blue-400" />
        </div>
      )}
    </div>
  );
}

// Format date for file creation time
function formatFileTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Session File Card
function SessionFileCard({ file }: { file: SessionFile }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30">
      <button 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors rounded-lg",
          expanded && "sticky top-0 z-10 bg-zinc-800/95 backdrop-blur-sm border-b border-zinc-700/50 rounded-b-none"
        )}
        style={{ position: expanded ? "sticky" : "static" }}
      >
        <FileIcon className="w-5 h-5 text-orange-400" />
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="font-mono text-sm text-zinc-300 truncate">{file.filename}</span>
          <span className="text-xs text-zinc-500 flex-shrink-0">({file.records.length} records)</span>
        </div>
        <span className="text-xs text-zinc-600 flex-shrink-0">{formatFileTime(file.createdAt)}</span>
        <ChevronDownIcon className={cn("w-4 h-4 text-zinc-400 transition-transform flex-shrink-0", expanded && "rotate-180")} />
      </button>
      
      {expanded && (
        <div className="px-4 pb-4">
          <div className="pt-4 space-y-6">
            {file.records.map((record, idx) => (
              <MessageItem key={idx} record={record} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CronPage() {
  const params = useParams();
  const id = params.id as string;
  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "records">("config");

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setAgent)
      .finally(() => setLoading(false));
  }, [id]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}/cron/core-logs`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "records" && files.length === 0) {
      fetchLogs();
    }
  }, [activeTab]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-zinc-400">Loading...</div></div>;
  }

  if (!agent) {
    return <div className="flex items-center justify-center h-64"><div className="text-zinc-400">Agent not found</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: agent.name, href: `/agents/${id}` }, { label: "Cron Jobs" }]} />

      <div>
        <h1 className="text-3xl font-bold text-white">Cron Jobs</h1>
        <p className="text-zinc-400">Manage scheduled tasks and cron job configurations</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("config")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2", activeTab === "config" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50")}
        >
          <SettingsIcon className="w-4 h-4" />
          Configuration
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2", activeTab === "records" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50")}
        >
          <ClockIcon className="w-4 h-4" />
          Execution Records
        </button>
      </div>

      {activeTab === "config" ? (
        <div className="space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white">About Cron Jobs</CardTitle>
              <CardDescription className="text-zinc-400">Define scheduled tasks using cron expressions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-400">
              <p>Example cron format:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">*/5 * * * *</code> - Every 5 minutes</li>
                <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">0 * * * *</code> - Every hour</li>
                <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">0 0 * * *</code> - Every day at midnight</li>
                <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">0 9 * * 1</code> - Every Monday at 9 AM</li>
              </ul>
            </CardContent>
          </Card>

          <FileEditor agentName={id} filePath="cron/jobs.json" fileName="jobs.json" description="Cron job definitions in JSON format" language="json" />
        </div>
      ) : (
        <Card className="glass-card border-0 overflow-hidden">
          <CardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-orange-400" />
                  Execution Records
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-1">Latest 10 cron session files from workspace/sessions/</CardDescription>
              </div>
              <button onClick={fetchLogs} disabled={logsLoading} className="p-2 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-zinc-800/50 transition-colors disabled:opacity-50" title="Refresh">
                <RefreshIcon className={cn("w-5 h-5", logsLoading && "animate-spin")} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            <div className="h-[700px] overflow-y-auto relative">
              <div className="p-4 space-y-4">
                {files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <BotIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p>No execution records found</p>
                    <p className="text-sm mt-2">Cron job executions will appear here</p>
                  </div>
                ) : (
                  files.map((file) => <SessionFileCard key={file.filename} file={file} />)
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
