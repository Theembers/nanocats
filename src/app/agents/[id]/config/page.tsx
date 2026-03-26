"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";

export default function ConfigEditorPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [config, setConfig] = useState("");
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

        const configRes = await fetch(`/api/agents/${id}/config`);
        if (configRes.ok) {
          const configData = await configRes.json();
          const content = configData.content || "";
          try {
            const parsed = JSON.parse(content);
            setConfig(JSON.stringify(parsed, null, 2));
          } catch {
            setConfig(content);
          }
        } else {
          setError("Failed to load configuration");
        }
      } catch (err) {
        setError("Failed to load configuration");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const validateJson = (text: string): boolean => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleFormat = () => {
    setError(null);
    setFeedback(null);
    try {
      const parsed = JSON.parse(config);
      setConfig(JSON.stringify(parsed, null, 2));
      setFeedback({ type: "success", message: "JSON formatted successfully" });
    } catch {
      setError("Invalid JSON format");
    }
  };

  const handleSave = async () => {
    setError(null);
    setFeedback(null);

    if (!validateJson(config)) {
      setError("Invalid JSON format. Please fix the errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: config }),
      });

      if (res.ok) {
        setFeedback({ type: "success", message: "Configuration saved successfully" });
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to save configuration" });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to save configuration" });
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
        { label: "Config" }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Edit Configuration</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFormat}
            className="px-4 py-2 rounded-lg glass-button text-zinc-200 font-medium"
          >
            Format JSON
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg btn-primary text-white font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
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

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Editor */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white">Configuration File</CardTitle>
          <CardDescription className="text-zinc-400">
            {agent?.configPath || "Edit the JSON configuration for this agent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={config}
            onChange={(e) => {
              setConfig(e.target.value);
              setError(null);
            }}
            className="w-full min-h-[600px] p-4 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
            placeholder="Loading configuration..."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
