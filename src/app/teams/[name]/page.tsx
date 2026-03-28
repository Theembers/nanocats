"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/breadcrumb";
import { Team, TeamAgent } from "@/lib/types";

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = params.name as string;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      } else {
        setFeedback({ type: "error", message: "Failed to load team" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to load team" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    // 5 second polling
    const interval = setInterval(fetchTeam, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleDeleteClick = () => {
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = async () => {
    setActionLoading("delete");
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (res.ok) {
        setFeedback({ type: "success", message: "Team deleted successfully" });
        setTimeout(() => {
          router.push("/teams");
        }, 1000);
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to delete team" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to delete team" });
    } finally {
      setActionLoading(null);
      setConfirmingDelete(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmingDelete(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Team not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: "Teams", href: "/teams" },
        { label: team.name }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <UsersGroupIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white uppercase">{team.name}</h1>
              {team.description && (
                <p className="text-sm text-zinc-400 mt-1">{team.description}</p>
              )}
            </div>
          </div>
          <TeamStatusBadge status={team.status} />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-400 font-medium">Confirm delete?</span>
              <button
                onClick={handleConfirmDelete}
                disabled={actionLoading !== null}
                className="px-3 py-1.5 rounded-md btn-destructive text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === "delete" ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-3 py-1.5 rounded-md glass-button text-sm text-zinc-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeleteClick}
              disabled={actionLoading !== null}
              className="px-4 py-2 rounded-lg btn-destructive font-medium disabled:opacity-50"
            >
              Delete Team
            </button>
          )}
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

      {/* Info Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          icon={<CrownIcon className="w-5 h-5 text-yellow-400" />}
          label="LEADER"
          value={team.leaderName}
        />
        <InfoCard
          icon={<UsersIcon className="w-5 h-5 text-blue-400" />}
          label="MEMBERS"
          value={String(team.agents.length)}
          valueColor="text-blue-400"
        />
        <InfoCard
          icon={<ListTodoIcon className="w-5 h-5 text-purple-400" />}
          label="TASKS"
          value="—"
          valueColor="text-purple-400"
        />
        <InfoCard
          icon={<CalendarIcon className="w-5 h-5 text-zinc-500" />}
          label="CREATED"
          value={new Date(team.createdAt).toLocaleDateString()}
        />
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NavCard
          title="Members"
          description="Manage team agents"
          icon={<UsersIcon className="w-5 h-5" />}
          href={`/teams/${encodeURIComponent(name)}/agents`}
          delay={0}
        />
        <NavCard
          title="Tasks"
          description="View and manage tasks"
          icon={<ListTodoIcon className="w-5 h-5" />}
          href={`/teams/${encodeURIComponent(name)}/tasks`}
          delay={1}
        />
        <NavCard
          title="Messages"
          description="Team inbox"
          icon={<MessageSquareIcon className="w-5 h-5" />}
          href={`/teams/${encodeURIComponent(name)}/inbox`}
          delay={2}
        />
        <NavCard
          title="Board"
          description="Team dashboard"
          icon={<LayoutDashboardIcon className="w-5 h-5" />}
          href={`/teams/${encodeURIComponent(name)}/board`}
          delay={3}
        />
      </div>

      {/* Members Preview */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white uppercase tracking-wider text-sm">Team Members</CardTitle>
            <CardDescription className="text-zinc-400">
              {team.agents.length} {team.agents.length === 1 ? "agent" : "agents"} in this team
            </CardDescription>
          </div>
          {team.agents.length > 5 && (
            <Link
              href={`/teams/${encodeURIComponent(name)}/agents`}
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              View all →
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {team.agents.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No members in this team yet</p>
              <Link
                href={`/teams/${encodeURIComponent(name)}/agents`}
                className="text-sm text-orange-400 hover:text-orange-300 mt-2 inline-block"
              >
                Add an agent →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {team.agents.slice(0, 5).map((agent) => (
                <MemberRow key={agent.name} agent={agent} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Team Status Badge
function TeamStatusBadge({ status }: { status: "active" | "stopped" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${
        status === "active"
          ? "bg-green-500/10 text-green-400 border-green-500/20"
          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "bg-green-400 animate-status-pulse" : "bg-zinc-400"
        }`}
      />
      {status === "active" ? "Active" : "Stopped"}
    </span>
  );
}

// Info Card Component
function InfoCard({
  icon,
  label,
  value,
  valueColor = "text-zinc-300",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{label}</label>
      </div>
      <p className={`text-lg font-bold font-heading ${valueColor}`}>{value}</p>
    </div>
  );
}

// Nav Card Component
function NavCard({
  title,
  description,
  icon,
  href,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  delay?: number;
}) {
  return (
    <div 
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <Link href={href}>
        <Card className="glass-card cursor-pointer h-full">
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
      </Link>
    </div>
  );
}

// Member Row Component
function MemberRow({ agent }: { agent: TeamAgent }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
          <BotIcon className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white uppercase">{agent.name}</p>
          <p className="text-xs text-zinc-500">{agent.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {agent.task && (
          <span className="text-xs text-zinc-400 max-w-[200px] truncate">
            {agent.task}
          </span>
        )}
        <AgentStatusBadge status={agent.status} />
      </div>
    </div>
  );
}

// Agent Status Badge
function AgentStatusBadge({ status }: { status: "running" | "stopped" | "pending" }) {
  const config = {
    running: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", dot: "bg-green-400", label: "Running" },
    stopped: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20", dot: "bg-zinc-400", label: "Stopped" },
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", dot: "bg-yellow-400", label: "Pending" },
  };
  const c = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot} ${status === "running" ? "animate-status-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

// Icon Components
function UsersGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 21a8 8 0 0 0-16 0"/>
      <circle cx="10" cy="8" r="5"/>
      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
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

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
      <path d="M5 21h14"/>
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

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

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
