"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileEditor } from "@/components/file-editor";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CronPage() {
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${id}`);
        if (res.ok) {
          const data = await res.json();
          setAgent(data);
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id]);

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
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: agent.name, href: `/agents/${id}` },
        { label: "Cron Jobs" }
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Cron Jobs</h1>
        <p className="text-zinc-400">
          Manage scheduled tasks and cron job configurations
        </p>
      </div>

      {/* Info Card */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white">About Cron Jobs</CardTitle>
          <CardDescription className="text-zinc-400">
            Define scheduled tasks using cron expressions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-400">
          <p>Example cron format:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">*/5 * * * *</code> - Every 5 minutes</li>
            <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">0 * * * *</code> - Every hour</li>
            <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">0 0 * * *</code> - Every day at midnight</li>
            <li><code className="bg-zinc-900 px-2 py-0.5 rounded text-orange-400">0 9 * * 1</code> - Every Monday at 9 AM</li>
          </ul>
        </CardContent>
      </Card>

      {/* Cron Jobs Editor */}
      <FileEditor
        agentName={id}
        filePath="workspace/cron/jobs.json"
        fileName="jobs.json"
        description="Cron job definitions in JSON format"
        language="json"
      />
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
