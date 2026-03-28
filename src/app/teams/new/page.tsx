"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";

export default function NewTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leaderName: "leader",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Team name is required");
      return;
    }

    if (!formData.leaderName.trim()) {
      setError("Leader name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || "",
          leaderName: formData.leaderName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create team");
      }

      router.push("/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Teams", href: "/teams" },
            { label: "New Team" },
          ]}
        />
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New Team</h1>
        <p className="text-zinc-400 mt-1">
          Set up a new collaborative agent team
        </p>
      </div>

      {/* Form Container */}
      <div className="glass-card rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-300"
            >
              Team Name <span className="text-orange-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="my-team"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
            <p className="text-sm text-zinc-500">
              A unique identifier for your team
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-300"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the purpose of this team..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="leaderName"
              className="block text-sm font-medium text-zinc-300"
            >
              Leader Name <span className="text-orange-400">*</span>
            </label>
            <input
              id="leaderName"
              name="leaderName"
              type="text"
              value={formData.leaderName}
              onChange={handleChange}
              placeholder="leader"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
            <p className="text-sm text-zinc-500">
              The name of the team leader agent
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 hover:border-orange-400 font-medium disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
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
      </div>
    </div>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
