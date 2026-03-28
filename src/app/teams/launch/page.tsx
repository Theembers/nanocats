"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { TeamTemplate } from "@/lib/types";

export default function LaunchTemplatePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TeamTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TeamTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    teamName: "",
    goal: "",
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/teams/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleTemplateSelect = (template: TeamTemplate) => {
    setSelectedTemplate(template);
    setFormData((prev) => ({
      ...prev,
      teamName: template.name.toLowerCase().replace(/\s+/g, "-"),
    }));
    setError(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTemplate) {
      setError("Please select a template");
      return;
    }

    if (!formData.teamName.trim()) {
      setError("Team name is required");
      return;
    }

    setLaunching(true);
    try {
      const res = await fetch("/api/teams/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: selectedTemplate.name,
          teamName: formData.teamName.trim(),
          goal: formData.goal.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to launch template");
      }

      router.push(`/teams/${formData.teamName.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Teams", href: "/teams" },
            { label: "Launch from Template" },
          ]}
        />
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Launch from Template</h1>
        <p className="text-zinc-400 mt-1">
          Start a new team using a pre-configured template
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            <div
              className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-amber-500 rounded-full animate-spin"
              style={{ animationDuration: "1.5s" }}
            />
          </div>
        </div>
      ) : templates.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <div className="mx-auto mb-6 opacity-80 flex items-center justify-center">
            <img
              src="/nanocats_logo.png"
              alt="Nanocats"
              className="h-16 w-auto"
            />
          </div>
          <h3 className="font-heading text-2xl font-semibold text-white mb-3">
            No templates available
          </h3>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            There are no team templates configured yet. Create a team manually instead.
          </p>
          <button
            onClick={() => router.push("/teams/new")}
            className="px-6 py-2.5 rounded-lg btn-primary text-white font-medium flex items-center gap-2 mx-auto"
          >
            <PlusIcon className="w-4 h-4" />
            Create Team Manually
          </button>
        </div>
      ) : (
        /* Main Content: Two Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Template List */}
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TemplateIcon className="w-5 h-5 text-orange-400" />
              Available Templates
            </h2>
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.name}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate?.name === template.name
                      ? "bg-orange-500/10 border-2 border-orange-500/50"
                      : "bg-zinc-800/50 border-2 border-transparent hover:bg-zinc-800 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                        {template.agents.length > 0 && (
                          <span className="flex items-center gap-1">
                            <UsersIcon className="w-3.5 h-3.5" />
                            {template.agents.length} agent
                            {template.agents.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {template.tasks.length > 0 && (
                          <span className="flex items-center gap-1">
                            <TaskIcon className="w-3.5 h-3.5" />
                            {template.tasks.length} task
                            {template.tasks.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {template.version && (
                          <span className="flex items-center gap-1">
                            <TagIcon className="w-3.5 h-3.5" />
                            v{template.version}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedTemplate?.name === template.name && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 ml-3">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Configuration Form */}
          <div className="glass-card rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-orange-400" />
              Configuration
            </h2>

            {selectedTemplate ? (
              <form onSubmit={handleLaunch} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Selected Template Info */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Selected Template
                  </p>
                  <p className="text-white font-medium">{selectedTemplate.name}</p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Team Name <span className="text-orange-400">*</span>
                  </label>
                  <input
                    id="teamName"
                    name="teamName"
                    type="text"
                    value={formData.teamName}
                    onChange={handleChange}
                    placeholder="my-team"
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                  <p className="text-sm text-zinc-500">
                    A unique name for this team instance
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="goal"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Goal
                  </label>
                  <textarea
                    id="goal"
                    name="goal"
                    value={formData.goal}
                    onChange={handleChange}
                    placeholder="Describe the objective for this team..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none"
                  />
                  <p className="text-sm text-zinc-500">
                    Optional: Define the goal or task for this team
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={launching}
                    className="px-6 py-2.5 rounded-lg btn-primary text-white font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {launching ? (
                      <>
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <RocketIcon className="w-4 h-4" />
                        Launch Team
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 rounded-lg glass-button text-zinc-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <ArrowLeftIcon className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-zinc-400">
                  Select a template from the list to configure
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Icon components
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="7" x="3" y="3" rx="1" />
      <rect width="9" height="7" x="3" y="14" rx="1" />
      <rect width="5" height="7" x="16" y="14" rx="1" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
