"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/breadcrumb";
import { TeamBoardSnapshot, TeamAgent, TeamMessage } from "@/lib/types";

export default function TeamBoardPage() {
  const params = useParams();
  const name = params.name as string;
  
  const [board, setBoard] = useState<TeamBoardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/board`);
      if (res.ok) {
        const data = await res.json();
        setBoard(data);
      } else {
        setFeedback({ type: "error", message: "Failed to load board" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to load board" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Board not available</div>
      </div>
    );
  }

  // Task statistics
  const pendingTasks = board.tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = board.tasks.filter((t) => t.status === "in_progress").length;
  const completedTasks = board.tasks.filter((t) => t.status === "completed").length;
  const totalTasks = board.tasks.length;

  // Recent messages (last 10)
  const recentMessages = board.messages.slice(-10).reverse();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: "Teams", href: "/teams" },
        { label: name, href: `/teams/${encodeURIComponent(name)}` },
        { label: "Board" }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <LayoutDashboardIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white uppercase">Board</h1>
            <p className="text-sm text-zinc-400">Team overview and monitoring</p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          Last updated: {new Date(board.timestamp).toLocaleTimeString()}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Info Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-orange-400" />
              Team Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Team Name</p>
                <p className="text-lg font-bold text-white uppercase mt-1">{board.teamName}</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Members</p>
                <p className="text-lg font-bold text-blue-400 mt-1">{board.agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Summary Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <ListTodoIcon className="w-4 h-4 text-purple-400" />
              Tasks Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Progress</span>
                  <span>{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                  <p className="text-2xl font-bold text-zinc-400">{pendingTasks}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Pending</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-2xl font-bold text-blue-400">{inProgressTasks}</p>
                  <p className="text-xs text-blue-400/70 uppercase tracking-wider mt-1">In Progress</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-2xl font-bold text-green-400">{completedTasks}</p>
                  <p className="text-xs text-green-400/70 uppercase tracking-wider mt-1">Completed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-blue-400" />
              Members
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Agent status overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {board.agents.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No members in this team</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {board.agents.map((agent) => (
                  <MemberCard key={agent.name} agent={agent} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <MessageSquareIcon className="w-4 h-4 text-green-400" />
              Recent Messages
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Last {recentMessages.length} messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <MessageSquareIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentMessages.map((msg) => (
                  <MessageRow key={msg.id} message={msg} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open WebUI Button */}
      <Card className="glass-card">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-white">ClawTeam WebUI</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Open the native ClawTeam board serve interface for advanced monitoring
              </p>
            </div>
            <button
              onClick={() => window.open("http://127.0.0.1:8080", "_blank")}
              className="px-6 py-3 rounded-lg btn-primary text-white font-medium flex items-center gap-2"
            >
              <ExternalLinkIcon className="w-4 h-4" />
              Open ClawTeam WebUI
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Member Card Component
function MemberCard({ agent }: { agent: TeamAgent }) {
  const statusConfig = {
    running: { bg: "bg-green-500/10", border: "border-green-500/20", dot: "bg-green-400", text: "text-green-400" },
    stopped: { bg: "bg-zinc-500/10", border: "border-zinc-500/20", dot: "bg-zinc-400", text: "text-zinc-400" },
    pending: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", dot: "bg-yellow-400", text: "text-yellow-400" },
  };
  const config = statusConfig[agent.status];

  return (
    <div className={`p-3 rounded-lg ${config.bg} border ${config.border}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${config.dot} ${agent.status === "running" ? "animate-status-pulse" : ""}`} />
        <span className="text-sm font-medium text-white uppercase truncate">{agent.name}</span>
      </div>
      <p className="text-xs text-zinc-500 mt-1 truncate">{agent.role}</p>
    </div>
  );
}

// Message Row Component
function MessageRow({ message }: { message: TeamMessage }) {
  return (
    <div className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-orange-400 uppercase">{message.from || "system"}</span>
        <ArrowRightIcon className="w-3 h-3 text-zinc-600" />
        <span className="font-medium text-blue-400 uppercase">{message.to}</span>
        <span className="ml-auto text-zinc-600">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-sm text-zinc-300 mt-1 truncate">{message.content}</p>
    </div>
  );
}

// Icon Components
function LayoutDashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1"/>
      <rect width="7" height="5" x="14" y="3" rx="1"/>
      <rect width="7" height="9" x="14" y="12" rx="1"/>
      <rect width="7" height="5" x="3" y="16" rx="1"/>
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  );
}

function ListTodoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="6" height="6" rx="1"/>
      <path d="m3 17 2 2 4-4"/>
      <path d="M13 6h8"/>
      <path d="M13 12h8"/>
      <path d="M13 18h8"/>
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6"/>
      <path d="M10 14 21 3"/>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  );
}
