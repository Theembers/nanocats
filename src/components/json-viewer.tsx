"use client";

import { useState, useCallback } from "react";
import JsonView from "@uiw/react-json-view";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface JsonViewerProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  collapsed?: boolean;
  fileName?: string;
  description?: string;
  onSave?: () => void;
  saving?: boolean;
}

export function JsonViewer({
  value,
  onChange,
  readOnly = false,
  collapsed = false,
  fileName,
  description,
  onSave,
  saving = false,
}: JsonViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const parsed = (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })();

  const handleFormat = useCallback(() => {
    setError(null);
    setFeedback(null);
    if (!onChange) return;
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      setFeedback({ type: "success", message: "JSON formatted successfully" });
    } catch {
      setError("Invalid JSON format");
    }
  }, [value, onChange]);

  const handleValidate = useCallback(() => {
    setError(null);
    setFeedback(null);
    try {
      JSON.parse(value);
      return true;
    } catch {
      setError("Invalid JSON format");
      return false;
    }
  }, [value]);

  const darkTheme = {
    "--w-rjv-background-color": "transparent",
    "--w-rjv-color": "#ffffff",
    "--w-rjv-key-number": "#60a5fa",
    "--w-rjv-key-string": "#4ade80",
    "--w-rjv-type-string-color": "#4ade80",
    "--w-rjv-type-int-color": "#60a5fa",
    "--w-rjv-type-float-color": "#60a5fa",
    "--w-rjv-type-bigint-color": "#60a5fa",
    "--w-rjv-type-boolean-color": "#f472b6",
    "--w-rjv-type-date-color": "#fbbf24",
    "--w-rjv-type-url-color": "#38bdf8",
    "--w-rjv-type-null-color": "#c084fc",
    "--w-rjv-type-nan-color": "#fb923c",
    "--w-rjv-type-undefined-color": "#e5e7eb",
    "--w-rjv-arrow-color": "#fb923c",
    "--w-rjv-edit-color": "#ffffff",
    "--w-rjv-info-color": "#ffffff",
    "--w-rjv-curlybraces-color": "#ffffff",
    "--w-rjv-colon-color": "#ffffff",
    "--w-rjv-brackets-color": "#ffffff",
    "--w-rjv-ellipsis-color": "#fb923c",
    "--w-rjv-quotes-color": "#4ade80",
    "--w-rjv-quotes-string-color": "#4ade80",
  };

  if (readOnly) {
    return (
      <Card className="glass-card border-0">
        {(fileName || description) && (
          <CardHeader>
            <CardTitle className="text-white">{fileName}</CardTitle>
            {description && <CardDescription className="text-zinc-400">{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}
          <div className="rounded-lg bg-zinc-900/50 p-4 overflow-auto max-h-[600px]">
            {parsed !== null ? (
              <JsonView
                value={parsed}
                collapsed={collapsed}
                style={darkTheme as React.CSSProperties}
              />
            ) : (
              <pre className="text-red-400 text-sm">{value}</pre>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            {fileName && <CardTitle className="text-white">{fileName}</CardTitle>}
            {description && <CardDescription className="text-zinc-400">{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormat}
              className="px-3 py-1.5 rounded-lg glass-button text-sm text-zinc-300"
            >
              Format JSON
            </button>
            {onSave && (
              <button
                onClick={() => {
                  if (handleValidate()) {
                    onSave();
                  }
                }}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg btn-primary text-sm text-white font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            )}
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
        <div className="rounded-lg bg-zinc-900/50 p-4 overflow-auto max-h-[700px]">
          {parsed !== null ? (
            <JsonView
              value={parsed}
              onChange={(e) => {
                if (onChange) {
                  onChange(JSON.stringify(e, null, 2));
                }
              }}
              collapsed={collapsed}
              style={darkTheme as React.CSSProperties}
            />
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                Invalid JSON - showing raw content
              </div>
              <textarea
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className="w-full min-h-[400px] p-4 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}