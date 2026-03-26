"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogViewer } from "@/components/log-viewer";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";

export default function LogsPage() {
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: agent?.name || "Agent", href: `/agents/${id}` },
        { label: "Logs" }
      ]} />

      {/* Header */}
      <h1 className="text-3xl font-bold text-white">
        Live Logs - {agent?.name || "Agent"}
      </h1>

      {/* Log Viewer or Not Running Message */}
      {agent?.status !== "running" ? (
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-white">Agent Not Running</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400">
              This agent is currently not running. Start the agent to view live logs.
            </p>
            <Link
              href={`/agents/${id}`}
              className="text-orange-400 hover:text-orange-300 inline-block mt-2 transition-colors"
            >
              Go to agent details to start it
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-0 overflow-hidden">
          <CardContent className="p-0">
            <LogViewer agentId={id} />
          </CardContent>
        </Card>
      )}
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
