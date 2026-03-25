import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "running" | "stopped" | "error";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border",
        status === "running" && "bg-green-500/10 text-green-400 border-green-500/20",
        status === "stopped" && "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
        status === "error" && "bg-red-500/10 text-red-400 border-red-500/20",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "running" && "bg-green-400 animate-status-pulse",
          status === "stopped" && "bg-zinc-400",
          status === "error" && "bg-red-400",
        )}
      />
      {status === "running" ? "Running" : status === "stopped" ? "Stopped" : "Error"}
    </span>
  );
}
