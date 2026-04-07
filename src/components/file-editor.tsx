"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FileEditorProps {
  agentName: string;
  filePath: string;
  fileName: string;
  description?: string;
  language?: "markdown" | "json" | "text";
  onSave?: () => void;
}

export function FileEditor({
  agentName,
  filePath,
  fileName,
  description,
  language = "text",
  onSave,
}: FileEditorProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchContent();
  }, [agentName, filePath]);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentName}/workspace?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || "");
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(errorData.error || `Failed to load file: ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const validateContent = (): boolean => {
    if (language === "json") {
      try {
        JSON.parse(content);
        return true;
      } catch {
        setError("Invalid JSON format");
        return false;
      }
    }
    return true;
  };

  const handleFormat = () => {
    setError(null);
    if (language === "json") {
      try {
        const parsed = JSON.parse(content);
        setContent(JSON.stringify(parsed, null, 2));
        setFeedback({ type: "success", message: "JSON formatted successfully" });
      } catch {
        setError("Invalid JSON format");
      }
    }
  };

  const handleSave = async () => {
    setError(null);
    setFeedback(null);

    if (!validateContent()) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentName}/workspace?path=${encodeURIComponent(filePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setFeedback({ type: "success", message: "File saved successfully" });
        onSave?.();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to save file" });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to save file" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="text-zinc-400 p-6 glass-card rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{fileName}</CardTitle>
            {description && (
              <CardDescription className="text-zinc-400">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {language === "json" && (
              <button
                onClick={handleFormat}
                className="px-3 py-1.5 rounded-lg glass-button text-sm text-zinc-300"
              >
                Format JSON
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg btn-primary text-sm text-white font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              feedback.type === "success"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {feedback.message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20">
            {error}
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          className="w-full min-h-[800px] p-4 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
          placeholder={`Edit ${fileName}...`}
        />
      </CardContent>
    </Card>
  );
}
