"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AgentForm } from "@/components/agent-form";

export default function NewAgentPage() {
  return (
    <div className="animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-white">New Agent</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New Agent</h1>
        <p className="text-zinc-400 mt-1">
          Configure and launch a new nanobot agent instance
        </p>
      </div>

      {/* Form Container */}
      <div className="glass-card rounded-lg p-6">
        <AgentForm />
      </div>
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
