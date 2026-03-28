"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { Breadcrumb } from "@/components/breadcrumb";
import { TeamTask } from "@/lib/types";

export default function TeamTasksPage() {
  const params = useParams();
  const name = params.name as string;
  
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: "", description: "", owner: "", blockedBy: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        setFeedback({ type: "error", message: "Failed to load tasks" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to load tasks" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleCreateTask = async () => {
    if (!createForm.subject.trim()) {
      setFeedback({ type: "error", message: "Subject is required" });
      return;
    }
    
    setCreateLoading(true);
    setFeedback(null);
    try {
      const blockedByArray = createForm.blockedBy
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: createForm.subject.trim(),
          owner: createForm.owner.trim() || undefined,
          blockedBy: blockedByArray.length > 0 ? blockedByArray : undefined,
        }),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Task created successfully" });
        setCreateDialogOpen(false);
        setCreateForm({ subject: "", description: "", owner: "", blockedBy: "" });
        await fetchTasks();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to create task" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to create task" });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: { status?: string; owner?: string }) => {
    setUpdateLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/tasks/${encodeURIComponent(taskId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Task updated successfully" });
        setDetailDialogOpen(false);
        setSelectedTask(null);
        await fetchTasks();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to update task" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to update task" });
    } finally {
      setUpdateLoading(false);
    }
  };

  const openTaskDetail = (task: TeamTask) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "completed");

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
        { label: "Tasks" }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <ListTodoIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white uppercase">Tasks</h1>
            <p className="text-sm text-zinc-400">{tasks.length} {tasks.length === 1 ? "task" : "tasks"} in this team</p>
          </div>
        </div>
        
        {/* Create Task Button */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger
            render={
              <button className="px-4 py-2 rounded-lg btn-success font-medium">
                Create Task
              </button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>
                Add a new task to this team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Subject *</label>
                <input
                  type="text"
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  placeholder="Enter task subject"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Owner (optional)</label>
                <input
                  type="text"
                  value={createForm.owner}
                  onChange={(e) => setCreateForm({ ...createForm, owner: e.target.value })}
                  placeholder="Enter owner agent name"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Blocked By (optional)</label>
                <input
                  type="text"
                  value={createForm.blockedBy}
                  onChange={(e) => setCreateForm({ ...createForm, blockedBy: e.target.value })}
                  placeholder="Task IDs, comma separated"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-zinc-500">Enter task IDs that must complete before this task</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <button className="px-4 py-2 rounded-lg glass-button text-zinc-300">
                    Cancel
                  </button>
                }
              />
              <button
                onClick={handleCreateTask}
                disabled={createLoading || !createForm.subject.trim()}
                className="px-4 py-2 rounded-lg btn-success font-medium disabled:opacity-50"
              >
                {createLoading ? "Creating..." : "Create Task"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <span className="w-3 h-3 rounded-full bg-zinc-400"></span>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Pending</h3>
            <span className="text-xs text-zinc-500">({pendingTasks.length})</span>
          </div>
          <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">No pending tasks</div>
            ) : (
              pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => openTaskDetail(task)} />
              ))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <span className="w-3 h-3 rounded-full bg-blue-400"></span>
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">In Progress</h3>
            <span className="text-xs text-zinc-500">({inProgressTasks.length})</span>
          </div>
          <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            {inProgressTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">No tasks in progress</div>
            ) : (
              inProgressTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => openTaskDetail(task)} />
              ))
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider">Completed</h3>
            <span className="text-xs text-zinc-500">({completedTasks.length})</span>
          </div>
          <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-green-500/5 border border-green-500/20">
            {completedTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">No completed tasks</div>
            ) : (
              completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => openTaskDetail(task)} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View and update task information
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <TaskDetailForm
              task={selectedTask}
              onUpdate={handleUpdateTask}
              loading={updateLoading}
              onClose={() => setDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onClick }: { task: TeamTask; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-700/50 hover:border-zinc-600"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white line-clamp-2">{task.description}</p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono truncate max-w-[100px]" title={task.id}>
          #{task.id.slice(0, 8)}
        </span>
        {task.owner && (
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
            {task.owner}
          </span>
        )}
      </div>
      {task.blockedBy && task.blockedBy.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <BlockIcon className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            Blocked by {task.blockedBy.length} {task.blockedBy.length === 1 ? "task" : "tasks"}
          </span>
        </div>
      )}
    </div>
  );
}

// Task Detail Form Component
function TaskDetailForm({
  task,
  onUpdate,
  loading,
  onClose,
}: {
  task: TeamTask;
  onUpdate: (taskId: string, updates: { status?: string; owner?: string }) => Promise<void>;
  loading: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(task.status);
  const [owner, setOwner] = useState(task.owner || "");

  const handleSubmit = async () => {
    const updates: { status?: string; owner?: string } = {};
    if (status !== task.status) updates.status = status;
    if (owner !== (task.owner || "")) updates.owner = owner || undefined;
    
    if (Object.keys(updates).length > 0) {
      await onUpdate(task.id, updates);
    } else {
      onClose();
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">ID</label>
        <p className="text-sm text-zinc-400 font-mono bg-zinc-800 px-3 py-2 rounded-lg">{task.id}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Subject</label>
        <p className="text-sm text-white bg-zinc-800 px-3 py-2 rounded-lg">{task.description}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TeamTask["status"])}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Owner</label>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Enter owner agent name"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
        />
      </div>
      {task.blockedBy && task.blockedBy.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Blocked By</label>
          <div className="flex flex-wrap gap-2">
            {task.blockedBy.map((id) => (
              <span key={id} className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 font-mono">
                #{id.slice(0, 8)}
              </span>
            ))}
          </div>
        </div>
      )}
      <DialogFooter>
        <DialogClose
          render={
            <button className="px-4 py-2 rounded-lg glass-button text-zinc-300">
              Cancel
            </button>
          }
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 rounded-lg btn-primary text-white font-medium disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update Task"}
        </button>
      </DialogFooter>
    </div>
  );
}

// Icon Components
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

function BlockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m4.9 4.9 14.2 14.2"/>
    </svg>
  );
}
