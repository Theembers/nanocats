"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Breadcrumb } from "@/components/breadcrumb";
import { TeamMessage } from "@/lib/types";

export default function TeamInboxPage() {
  const params = useParams();
  const name = params.name as string;
  
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", content: "", from: "" });
  const [sendLoading, setSendLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/inbox`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        setFeedback({ type: "error", message: "Failed to load messages" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to load messages" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!sendForm.to.trim() || !sendForm.content.trim()) {
      setFeedback({ type: "error", message: "To and Content are required" });
      return;
    }
    
    setSendLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(name)}/inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendForm.to.trim(),
          content: sendForm.content.trim(),
          from: sendForm.from.trim() || undefined,
        }),
      });
      
      if (res.ok) {
        setFeedback({ type: "success", message: "Message sent successfully" });
        setSendDialogOpen(false);
        setSendForm({ to: "", content: "", from: "" });
        await fetchMessages();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", message: data.error || "Failed to send message" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to send message" });
    } finally {
      setSendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up h-[calc(100vh-8rem)] flex flex-col">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: "Teams", href: "/teams" },
        { label: name, href: `/teams/${encodeURIComponent(name)}` },
        { label: "Messages" }
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <MessageSquareIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white uppercase">Messages</h1>
            <p className="text-sm text-zinc-400">{messages.length} {messages.length === 1 ? "message" : "messages"} in inbox</p>
          </div>
        </div>
        
        {/* Send Message Button */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogTrigger
            render={
              <button className="px-4 py-2 rounded-lg btn-success font-medium">
                Send Message
              </button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
              <DialogDescription>
                Send a message to an agent in this team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">To *</label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                  placeholder="Enter recipient agent name"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">From (optional)</label>
                <input
                  type="text"
                  value={sendForm.from}
                  onChange={(e) => setSendForm({ ...sendForm, from: e.target.value })}
                  placeholder="Enter sender name"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Content *</label>
                <textarea
                  value={sendForm.content}
                  onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                  placeholder="Enter message content"
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <button className="px-4 py-2 rounded-lg glass-button text-zinc-300">
                    Cancel
                  </button>
                }
              />
              <button
                onClick={handleSendMessage}
                disabled={sendLoading || !sendForm.to.trim() || !sendForm.content.trim()}
                className="px-4 py-2 rounded-lg btn-success font-medium disabled:opacity-50"
              >
                {sendLoading ? "Sending..." : "Send"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Messages Timeline */}
      <Card className="glass-card flex-1 flex flex-col overflow-hidden min-h-0">
        <CardHeader className="border-b border-zinc-800 shrink-0">
          <CardTitle className="text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            Message Stream
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <MessageSquareIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-2">Send a message to start the conversation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: TeamMessage }) {
  const isSystem = !message.from || message.from === "system";
  
  return (
    <div className={`flex ${isSystem ? "justify-center" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isSystem ? "w-full" : ""}`}>
        {isSystem ? (
          // System message
          <div className="text-center py-2 px-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <p className="text-sm text-zinc-400">{message.content}</p>
            <p className="text-xs text-zinc-600 mt-1">
              {new Date(message.timestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          // Agent message
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-medium text-orange-400 uppercase">{message.from}</span>
              <ArrowRightIcon className="w-3 h-3 text-zinc-600" />
              <span className="text-xs font-medium text-blue-400 uppercase">{message.to}</span>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-zinc-800/80 text-zinc-200 rounded-tl-md border border-zinc-700/50">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs text-zinc-500 mt-2 text-right">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icon Components
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  );
}
