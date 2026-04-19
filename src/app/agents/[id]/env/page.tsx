"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";
import os from "os";
import path from "path";

function getEnvFilePath(agentName: string): string {
  const homeDir = os.homedir();
  return path.join(homeDir, "nanocats-space", "agents", `.nanobot-${agentName}`, ".env");
}

export default function EnvEditorPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [envContent, setEnvContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const agentRes = await fetch(`/api/agents/${id}`);
        if (agentRes.ok) {
          const agentData = await agentRes.json();
          setAgent(agentData);
        }

        const envRes = await fetch(`/api/agents/${id}/env`);
        if (envRes.ok) {
          const envData = await envRes.json();
          setEnvContent(envData.content || "");
        }
      } catch (err) {
        setError("Failed to load environment variables");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    setError(null);
    setFeedback(null);

    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${id}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: envContent }),
      });

      if (res.ok) {
        setFeedback({ type: "success", message: "Environment variables saved successfully" });
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to save environment variables" });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to save environment variables" });
    } finally {
      setSaving(false);
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
        { label: agent?.name || "Agent", href: `/agents/${id}` },
        { label: "Environment" }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Environment Variables</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg btn-primary text-white font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
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

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Info Card */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white">About Environment Variables</CardTitle>
          <CardDescription className="text-zinc-400">
            Environment variables are loaded when the agent starts. These variables will be available to the agent process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-400 space-y-2">
            <p><span className="text-zinc-300 font-mono">File location:</span> <span className="text-zinc-500 font-mono">{getEnvFilePath(id)}</span></p>
            <p><span className="text-zinc-300">Format:</span> <code className="text-orange-400">KEY=VALUE</code> (one per line)</p>
            <p><span className="text-zinc-300">Comments:</span> Lines starting with <code className="text-orange-400">#</code> are ignored</p>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white">.env File</CardTitle>
          <CardDescription className="text-zinc-400">
            {getEnvFilePath(id)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={envContent}
            onChange={(e) => {
              setEnvContent(e.target.value);
              setError(null);
            }}
            className="w-full min-h-[400px] p-4 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
            placeholder="# Environment variables for this agent&#10;# Example:&#10;# API_KEY=your-api-key&#10;# DEBUG=true"
          />
        </CardContent>
      </Card>
    </div>
  );
}
