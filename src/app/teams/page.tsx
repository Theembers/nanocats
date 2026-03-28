"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import { TeamCard } from "@/components/team-card";
import { Team } from "@/lib/types";

// Animation delay utility
const staggerDelay = (index: number) => ({ animationDelay: `${index * 0.1}s` });

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    const interval = setInterval(fetchTeams, 5000);
    return () => clearInterval(interval);
  }, [fetchTeams]);

  const activeCount = teams.filter((t) => t.status === "active").length;
  const totalMembers = teams.reduce((sum, t) => sum + t.agents.length, 0);

  return (
    <div>
      {/* Hero Section */}
      <div className="mb-10 animate-fade-in-up" style={{ animationDelay: "0s" }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
              Agent Teams
            </h1>
            <p className="text-zinc-400 text-lg">
              Create and manage collaborative agent teams
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/teams/launch">
              <button className="h-10 px-5 rounded-lg glass-button text-zinc-300 font-medium flex items-center gap-2">
                <RocketIcon className="w-4 h-4" />
                Launch Template
              </button>
            </Link>
            <Link href="/teams/new">
              <button className="h-10 px-5 rounded-lg btn-primary text-white font-medium flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                New Team
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          title="TOTAL TEAMS"
          value={teams.length}
          icon={<UsersIcon className="w-5 h-5" />}
          delay={1}
        />
        <StatCard
          title="ACTIVE"
          value={activeCount}
          icon={<PlayIcon className="w-5 h-5" />}
          delay={2}
        />
        <StatCard
          title="TOTAL MEMBERS"
          value={totalMembers}
          icon={<UserIcon className="w-5 h-5" />}
          delay={3}
        />
      </div>

      {/* Team Grid */}
      {loading && teams.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-amber-500 rounded-full animate-spin" style={{ animationDuration: "1.5s" }} />
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="animate-fade-in-up text-center py-20" style={{ animationDelay: "0.4s" }}>
          <div className="mx-auto mb-6 opacity-80 flex items-center justify-center">
            <img
              src="/nanocats_logo.png"
              alt="Nanocats"
              className="h-16 w-auto"
            />
          </div>
          <h3 className="font-heading text-2xl font-semibold text-white mb-3">
            No teams yet
          </h3>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            Create your first team to start collaborative agent workflows
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/teams/launch">
              <button className="px-6 py-2.5 rounded-lg glass-button text-zinc-300 font-medium flex items-center gap-2">
                <RocketIcon className="w-4 h-4" />
                Launch Template
              </button>
            </Link>
            <Link href="/teams/new">
              <button className="px-6 py-2.5 rounded-lg btn-primary text-white font-medium flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Create Team
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teams.map((team, index) => (
            <div
              key={team.name}
              className="animate-fade-in-up"
              style={staggerDelay(index + 4)}
            >
              <TeamCard team={team} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  icon,
  delay,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <div className="glass-card p-6 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-500 text-xs font-medium mb-1 uppercase tracking-wider">{title}</p>
            <p className="font-heading text-3xl font-bold text-white">{value}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800 text-zinc-400">
            {icon}
          </div>
        </div>
      </div>
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
