"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { AgentInstance } from "@/lib/types";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmingStop, setConfirmingStop] = useState(false);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      } else {
        setFeedback({ type: "error", message: "Failed to load agent" });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Failed to load agent" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgent();
  }, [id]);

  const handleStart = async () => {
    setActionLoading("start");
    setFeedback(null);
    try {
      const res = await fetch(`/api/agents/${id}/start`, { method: "POST" });
      if (res.ok) {
        setFeedback({ type: "success", message: "Agent started successfully" });
        await fetchAgent();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to start agent" });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Failed to start agent" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopClick = () => {
    setConfirmingStop(true);
  };

  const handleConfirmStop = async () => {
    setActionLoading("stop");
    setFeedback(null);
    try {
      const res = await fetch(`/api/agents/${id}/stop`, { method: "POST" });
      if (res.ok) {
        setFeedback({ type: "success", message: "Agent stopped successfully" });
        await fetchAgent();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to stop agent" });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Failed to stop agent" });
    } finally {
      setActionLoading(null);
      setConfirmingStop(false);
    }
  };

  const handleCancelStop = () => {
    setConfirmingStop(false);
  };

  const handleRestart = async () => {
    setActionLoading("restart");
    setFeedback(null);
    try {
      const stopRes = await fetch(`/api/agents/${id}/stop`, { method: "POST" });
      if (!stopRes.ok) {
        const data = await stopRes.json();
        setFeedback({ type: "error", message: data.error || "Failed to stop agent" });
        return;
      }
      const startRes = await fetch(`/api/agents/${id}/start`, { method: "POST" });
      if (startRes.ok) {
        setFeedback({ type: "success", message: "Agent restarted successfully" });
        await fetchAgent();
      } else {
        const data = await startRes.json();
        setFeedback({ type: "error", message: data.error || "Failed to start agent" });
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Failed to restart agent" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Agent not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-white">{agent.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <BotIcon className="w-5 h-5 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white uppercase">{agent.name}</h1>
          </div>
          <StatusBadge status={agent.status} />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {agent.status === "stopped" || agent.status === "error" ? (
            <button
              onClick={handleStart}
              disabled={actionLoading !== null}
              className="px-4 py-2 rounded-lg btn-success font-medium disabled:opacity-50"
            >
              {actionLoading === "start" ? "Starting..." : "Start"}
            </button>
          ) : confirmingStop ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Confirm stop?</span>
              <button
                onClick={handleConfirmStop}
                disabled={actionLoading !== null}
                className="px-3 py-1.5 rounded-md btn-destructive text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === "stop" ? "Stopping..." : "Confirm"}
              </button>
              <button
                onClick={handleCancelStop}
                className="px-3 py-1.5 rounded-md glass-button text-sm text-zinc-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleStopClick}
              className="px-4 py-2 rounded-lg btn-destructive font-medium"
            >
              Stop
            </button>
          )}
          <button
            onClick={handleRestart}
            disabled={actionLoading !== null || agent.status === "stopped"}
            className="px-4 py-2 rounded-lg glass-button text-zinc-200 font-medium disabled:opacity-50"
          >
            {actionLoading === "restart" ? "Restarting..." : "Restart"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Details Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white uppercase tracking-wider text-sm">Details</CardTitle>
          <CardDescription className="text-zinc-400">
            Configuration and runtime information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <GlobeIcon className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Port</label>
              </div>
              <p className="text-zinc-200 font-mono">{agent.port}</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <HashIcon className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">PID</label>
              </div>
              <p className="text-zinc-200 font-mono">{agent.pid || "N/A"}</p>
            </div>
            <div className="col-span-2 p-4 rounded-lg bg-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <FolderIcon className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Workspace Path</label>
              </div>
              <p className="text-sm font-mono text-zinc-300 bg-black/50 px-3 py-2 rounded-md">
                {agent.workspacePath}
              </p>
            </div>
            <div className="col-span-2 p-4 rounded-lg bg-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <FileIcon className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Config Path</label>
              </div>
              <p className="text-sm font-mono text-zinc-300 bg-black/50 px-3 py-2 rounded-md">
                {agent.configPath}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Created At</label>
              </div>
              <p className="text-zinc-200">{new Date(agent.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <ActionCard
          title="Edit Config"
          description="View and edit the agent configuration file"
          icon={<SettingsIcon className="w-5 h-5" />}
          onClick={() => router.push(`/agents/${id}/config`)}
          delay={0}
        />
        <ActionCard
          title="View Logs"
          description="Stream real-time logs from the agent"
          icon={<FileTextIcon className="w-5 h-5" />}
          onClick={() => router.push(`/agents/${id}/logs`)}
          delay={1}
        />
        <ActionCard
          title="Workspace"
          description="Edit AGENTS, SOUL, USER, TOOLS, HEARTBEAT files"
          icon={<FolderIcon className="w-5 h-5" />}
          onClick={() => router.push(`/agents/${id}/workspace`)}
          delay={2}
        />
        <ActionCard
          title="Cron Jobs"
          description="Manage scheduled tasks and cron configurations"
          icon={<ClockIcon className="w-5 h-5" />}
          onClick={() => router.push(`/agents/${id}/cron`)}
          delay={3}
        />
        <ActionCard
          title="Memory"
          description="Manage MEMORY and HISTORY files"
          icon={<BrainIcon className="w-5 h-5" />}
          onClick={() => router.push(`/agents/${id}/memory`)}
          delay={4}
        />
        <ActionCard
          title="Skills"
          description="Enable/disable and edit agent skills"
          icon={<ZapIcon className="w-5 h-5" />}
          onClick={() => router.push(`/agents/${id}/skills`)}
          delay={5}
        />
      </div>
    </div>
  );
}

// Action Card Component
function ActionCard({
  title,
  description,
  icon,
  onClick,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <div 
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <Card 
        className="glass-card cursor-pointer" 
        onClick={onClick}
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <span className="p-2 rounded-lg bg-zinc-800">
              {icon}
            </span>
            {title}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Icon Components
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
      <line x1="12" x2="12" y1="11" y2="17"/>
      <line x1="9" x2="15" y1="14" y2="14"/>
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
      <path d="M8.5 8.5v.01"/>
      <path d="M16 15.5v.01"/>
      <path d="M12 12v.01"/>
      <path d="M11 17v.01"/>
      <path d="M7 14v.01"/>
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="9" y2="9"/>
      <line x1="4" x2="20" y1="15" y2="15"/>
      <line x1="10" x2="8" y1="3" y2="21"/>
      <line x1="16" x2="14" y1="3" y2="21"/>
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
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
