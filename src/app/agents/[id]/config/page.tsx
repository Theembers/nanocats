"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonViewer } from "@/components/json-viewer";
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
      } catch {
        setError("Failed to load configuration");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    setError(null);
    setFeedback(null);

    try {
      JSON.parse(config);
    } catch {
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
    } catch {
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
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: agent?.name || "Agent", href: `/agents/${id}` },
        { label: "Config" }
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Edit Configuration</h1>
      </div>

      {error && (
        <div className="p-4 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

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

      <JsonViewer
        value={config}
        onChange={(val) => {
          setConfig(val);
          setError(null);
        }}
        fileName={agent?.configPath || "config.json"}
        description="Edit the JSON configuration for this agent"
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
