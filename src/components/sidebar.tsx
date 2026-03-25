"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white dark:bg-gray-950 flex flex-col">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🐈</span>
          <h1 className="text-xl font-bold">Nanocats</h1>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">Agent Manager</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/"
              ? "bg-gray-100 dark:bg-gray-800 text-foreground"
              : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          Dashboard
        </Link>
        <Link
          href="/agents/new"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/agents/new"
              ? "bg-gray-100 dark:bg-gray-800 text-foreground"
              : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New Agent
        </Link>
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        Nanocats Manager v0.1.0
      </div>
    </aside>
  );
}
