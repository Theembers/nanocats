"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AgentInstance } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileEditor } from "@/components/file-editor";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Skill {
  name: string;
  path: string;
  description?: string;
}

export default function SkillsPage() {
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  useEffect(() => {
    fetchAgent();
    fetchSkills();
  }, [id]);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error);
    }
  };

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}/skills`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setLoading(false);
    }
  };


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
        { label: "Skills" }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Skills Management</h1>
          <p className="text-zinc-400">
            Manage agent skills and capabilities
          </p>
        </div>
      </div>

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="text-zinc-400 text-center">
              No skills found in workspace/skills directory
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {skills.map((skill) => (
            <Card key={skill.path} className="glass-card border-0 relative">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base truncate text-white">{skill.name}</CardTitle>
                    </div>
                    {skill.description && (
                      <CardDescription className="text-sm line-clamp-1 text-zinc-400">
                        {skill.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Dialog>
                      <DialogTrigger
                        render={
                          <button
                            onClick={() => setSelectedSkill(skill)}
                            className="h-8 px-3 rounded-md glass-button text-zinc-300 text-sm font-medium"
                          >
                            Edit
                          </button>
                        }
                      />
                      <DialogContent className="max-w-6xl w-[95vw] h-[95vh] max-h-[95vh] p-0 bg-[#0a0a0b] border border-white/10">
                        <DialogHeader className="px-6 py-4 border-b border-white/10">
                          <DialogTitle className="flex items-center gap-2 text-white">
                            <span>Edit</span>
                            <span className="text-zinc-400 font-normal">{skill.name}</span>
                          </DialogTitle>
                        </DialogHeader>
                        {selectedSkill && (
                          <div className="flex-1 overflow-hidden p-6">
                            <FileEditor
                              agentName={id}
                              filePath={`skills/${skill.path}/SKILL.md`}
                              fileName="SKILL.md"
                              description={`Editing skill: ${skill.name}`}
                              language="markdown"
                            />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
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
