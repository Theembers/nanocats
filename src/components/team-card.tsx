"use client";

import Link from "next/link";
import { Team } from "@/lib/types";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const isActive = team.status === "active";
  const memberCount = team.agents.length;

  const truncateText = (text: string, maxLength: number = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <Link href={`/teams/${team.name}`} className="block">
      <div className="glass-card rounded-lg overflow-hidden relative">
        {/* Status bar */}
        <div 
          className={`card-status-bar ${isActive ? 'running' : 'stopped'}`} 
        />
        
        <div className="p-5">
          {/* Header: name and status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isActive 
                  ? "bg-green-500/10 text-green-400" 
                  : "bg-zinc-500/10 text-zinc-400"
              }`}>
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white text-lg leading-tight uppercase">
                  {team.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${
                    isActive 
                      ? "bg-green-400 animate-status-pulse" 
                      : "bg-zinc-400"
                  }`} />
                  <span className={`text-xs font-medium ${
                    isActive 
                      ? "text-green-400" 
                      : "text-zinc-400"
                  }`}>
                    {isActive ? "Active" : "Stopped"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
              {truncateText(team.description)}
            </p>
          )}

          {/* Info section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <CrownIcon className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Leader</p>
                <p className="text-zinc-200">{team.leaderName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Members</p>
                <p className="text-zinc-200">{memberCount} agent{memberCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Icon components
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

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
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
