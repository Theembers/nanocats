"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileEditor } from "@/components/file-editor";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WORKSPACE_FILES = [
  {
    id: "agents",
    name: "AGENTS.md",
    path: "workspace/AGENTS.md",
    description: "Agent personality and behavior configuration",
  },
  {
    id: "soul",
    name: "SOUL.md",
    path: "workspace/SOUL.md",
    description: "Core identity and values definition",
  },
  {
    id: "user",
    name: "USER.md",
    path: "workspace/USER.md",
    description: "User preferences and context",
  },
  {
    id: "tools",
    name: "TOOLS.md",
    path: "workspace/TOOLS.md",
    description: "Available tools and capabilities",
  },
  {
    id: "heartbeat",
    name: "HEARTBEAT.md",
    path: "workspace/HEARTBEAT.md",
    description: "Health check and monitoring configuration",
  },
];

export default function WorkspacePage() {
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
        { label: "Workspace" }
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Workspace Files</h1>
        <p className="text-zinc-400">
          Manage agent configuration files
        </p>
      </div>

      {/* File Editors */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="flex-wrap h-auto bg-zinc-800 border border-white/10 p-1 rounded-lg">
          {WORKSPACE_FILES.map((file) => (
            <TabsTrigger 
              key={file.id} 
              value={file.id}
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md px-4 py-2.5 text-zinc-400 text-sm font-medium"
            >
              {file.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {WORKSPACE_FILES.map((file) => (
          <TabsContent key={file.id} value={file.id}>
            <FileEditor
              agentName={id}
              filePath={file.path}
              fileName={file.name}
              description={file.description}
              language="markdown"
            />
          </TabsContent>
        ))}
      </Tabs>
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
