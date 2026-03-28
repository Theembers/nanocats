"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { TeamAgent, AgentInstance } from "@/lib/types";

export default function TeamAgentsPage() {
  const params = useParams();
  const name = params.name as string;
  
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [allAgents, setAllAgents] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Spawn New Agent Dialog
  const [spawnDialogOpen, setSpawnDialogOpen] = useState(false);
  const [spawnForm, setSpawnForm] = useState({ agentName: "", task: "" });
  const [spawnLoading, setSpawnLoading] = useState(false);
  
  // Bind Existing Agent Dialog
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [unbindTarget, setUnbindTarget] = useState<string | null>(null);
  const [unbindLoading, setUnbindLoading] = useState(false);

  const fetchTeamAgents = async () => {
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      } else {
        setFeedback({ type: "error", message: "Failed to load team agents" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to load team agents" });
    }
  };

  const fetchAllAgents = async () => {
    try {
      const res = await fetch(`/api/agents`);
      if (res.ok) {
        const data = await res.json();
        setAllAgents(data);
      }
    } catch {
      // Silently fail - allAgents is used for binding status only
    }
  };

  const fetchAllData = async () => {
    await Promise.all([fetchTeamAgents(), fetchAllAgents()]);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAllData();
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleSpawnAgent = async () => {
    if (!spawnForm.agentName.trim()) {
      setFeedback({ type: "error", message: "Agent name is required" });
      return;
    }
    
    setSpawnLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: spawnForm.agentName.trim(),
          task: spawnForm.task.trim() || undefined,
        }),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Agent spawned successfully" });
        setSpawnDialogOpen(false);
        setSpawnForm({ agentName: "", task: "" });
        await fetchAllData();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to spawn agent" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to spawn agent" });
    } finally {
      setSpawnLoading(false);
    }
  };

  const handleBindAgent = async () => {
    if (!selectedAgentId) {
      setFeedback({ type: "error", message: "Please select an agent" });
      return;
    }
    
    setBindLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/bind-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgentId }),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Agent bound successfully" });
        setBindDialogOpen(false);
        setSelectedAgentId(null);
        await fetchAllData();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to bind agent" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to bind agent" });
    } finally {
      setBindLoading(false);
    }
  };

  const handleUnbindAgent = async (agentId: string) => {
    setUnbindLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/bind-agent`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Agent unbound successfully" });
        setUnbindTarget(null);
        await fetchAllData();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to unbind agent" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to unbind agent" });
    } finally {
      setUnbindLoading(false);
    }
  };

  const handleRemoveAgent = async (agentName: string) => {
    setRemoveLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/agents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName }),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Agent removed successfully" });
        setRemoveTarget(null);
        await fetchAllData();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to remove agent" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to remove agent" });
    } finally {
      setRemoveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: "Teams", href: "/teams" },
        { label: name, href: `/teams/${encodeURIComponent(name)}` },
        { label: "Members" }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white uppercase">Members</h1>
            <p className="text-sm text-zinc-400">{agents.length} {agents.length === 1 ? "agent" : "agents"} in this team</p>
          </div>
        </div>
        
        {/* Add Agent Buttons */}
        <div className="flex items-center gap-3">
          {/* Spawn New Agent Dialog */}
          <Dialog open={spawnDialogOpen} onOpenChange={setSpawnDialogOpen}>
            <DialogTrigger
              render={
                <button className="px-4 py-2 rounded-lg btn-success font-medium">
                  SPAWN NEW AGENT
                </button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>SPAWN NEW AGENT</DialogTitle>
                <DialogDescription>
                  Create a new agent in this team via ClawTeam
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">AGENT NAME *</label>
                  <input
                    type="text"
                    value={spawnForm.agentName}
                    onChange={(e) => setSpawnForm({ ...spawnForm, agentName: e.target.value })}
                    placeholder="ENTER AGENT NAME"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">TASK (OPTIONAL)</label>
                  <input
                    type="text"
                    value={spawnForm.task}
                    onChange={(e) => setSpawnForm({ ...spawnForm, task: e.target.value })}
                    placeholder="ENTER INITIAL TASK"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose
                  render={
                    <button className="px-4 py-2 rounded-lg glass-button text-zinc-300">
                      CANCEL
                    </button>
                  }
                />
                <button
                  onClick={handleSpawnAgent}
                  disabled={spawnLoading || !spawnForm.agentName.trim()}
                  className="px-4 py-2 rounded-lg btn-success font-medium disabled:opacity-50"
                >
                  {spawnLoading ? "SPAWNING..." : "SPAWN"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bind Existing Agent Dialog */}
          <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
            <DialogTrigger
              render={
                <button className="px-4 py-2 rounded-lg btn-primary font-medium">
                  BIND EXISTING AGENT
                </button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>BIND EXISTING AGENT</DialogTitle>
                <DialogDescription>
                  Bind an existing agent from nanocats-manager to this team
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {(() => {
                  // Get agents already bound to this team (使用 name 作为主键)
                  const boundAgentNames = new Set(
                    allAgents
                      .filter(a => a.teamBindings?.some(b => b.teamName === name))
                      .map(a => a.name)
                  );
                  // Filter out already bound agents
                  const availableAgents = allAgents.filter(a => !boundAgentNames.has(a.name));
                  
                  if (availableAgents.length === 0) {
                    return (
                      <div className="text-center py-8 text-zinc-500">
                        <BotIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No available agents to bind</p>
                        <p className="text-sm mt-1">All agents are already bound to this team</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {availableAgents.map((agent) => (
                        <div
                          key={agent.name}
                          onClick={() => setSelectedAgentId(agent.name)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedAgentId === agent.name
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                                <BotIcon className="w-4 h-4 text-orange-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white uppercase">{agent.name}</p>
                                <p className="text-xs text-zinc-500">PORT: {agent.port}</p>
                              </div>
                            </div>
                            <AgentStatusBadge status={agent.status === "error" ? "stopped" : agent.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <DialogFooter>
                <DialogClose
                  render={
                    <button className="px-4 py-2 rounded-lg glass-button text-zinc-300">
                      CANCEL
                    </button>
                  }
                />
                <button
                  onClick={handleBindAgent}
                  disabled={bindLoading || !selectedAgentId}
                  className="px-4 py-2 rounded-lg btn-primary font-medium disabled:opacity-50"
                >
                  {bindLoading ? "BINDING..." : "BIND"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

      {/* Agents List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white uppercase tracking-wider text-sm">Team Agents</CardTitle>
          <CardDescription className="text-zinc-400">
            Manage agents in this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <UsersIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No agents in this team yet</p>
              <p className="text-sm mt-2">Click &quot;SPAWN NEW AGENT&quot; or &quot;BIND EXISTING AGENT&quot; to add agents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => {
                // Find matching agent in allAgents to determine binding status
                const boundAgent = allAgents.find(a => 
                  a.teamBindings?.some(b => b.teamName === name && b.memberName === agent.name)
                );
                const isBound = !!boundAgent;
                
                return (
                  <div
                    key={agent.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                        <BotIcon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-white uppercase">{agent.name}</p>
                          {isBound ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                              BOUND
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              SPAWNED
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">{agent.role}</p>
                        {isBound && boundAgent && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-zinc-400">PORT: {boundAgent.port}</span>
                            <AgentStatusBadge status={boundAgent.status === "error" ? "stopped" : boundAgent.status} />
                          </div>
                        )}
                        {agent.task && (
                          <p className="text-xs text-zinc-400 mt-1 max-w-md truncate">{agent.task}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isBound && <AgentStatusBadge status={agent.status} />}
                      
                      {/* View in Agents link for bound agents */}
                      {isBound && boundAgent && (
                        <Link
                          href={`/agents/${boundAgent.name}`}
                          className="px-3 py-1.5 rounded-md glass-button text-sm text-zinc-300 hover:text-white"
                        >
                          VIEW IN AGENTS
                        </Link>
                      )}
                      
                      {/* Unbind button for bound agents */}
                      {isBound && boundAgent && (
                        unbindTarget === agent.name ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-400">UNBIND?</span>
                            <button
                              onClick={() => handleUnbindAgent(boundAgent.name)}
                              disabled={unbindLoading}
                              className="px-3 py-1.5 rounded-md btn-destructive text-sm font-medium disabled:opacity-50"
                            >
                              {unbindLoading ? "..." : "YES"}
                            </button>
                            <button
                              onClick={() => setUnbindTarget(null)}
                              className="px-3 py-1.5 rounded-md glass-button text-sm text-zinc-300"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setUnbindTarget(agent.name)}
                            className="px-3 py-1.5 rounded-md btn-destructive text-sm font-medium"
                          >
                            UNBIND
                          </button>
                        )
                      )}
                      
                      {/* Remove button for spawned agents */}
                      {!isBound && (
                        removeTarget === agent.name ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-red-400">CONFIRM?</span>
                            <button
                              onClick={() => handleRemoveAgent(agent.name)}
                              disabled={removeLoading}
                              className="px-3 py-1.5 rounded-md btn-destructive text-sm font-medium disabled:opacity-50"
                            >
                              {removeLoading ? "..." : "YES"}
                            </button>
                            <button
                              onClick={() => setRemoveTarget(null)}
                              className="px-3 py-1.5 rounded-md glass-button text-sm text-zinc-300"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRemoveTarget(agent.name)}
                            className="px-3 py-1.5 rounded-md btn-destructive text-sm font-medium"
                          >
                            REMOVE
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
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
