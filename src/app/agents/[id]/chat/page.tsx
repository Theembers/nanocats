"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance, AgentLog } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WebchatConfig {
  enabled: boolean;
  host: string;
  port: number;
  allowFrom: string[];
  streaming: boolean;
  webchatUrl: string;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface ToolExecuting {
  id: string;
  name: string;
  hint: string;
  timestamp?: string;
}

interface ToolResult {
  toolCallId: string;
  name: string;
  content: string | { type: string; text: string } | unknown;
}

interface Attachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  preview?: string;
}

interface Message {
  id: string;
  type: "user" | "bot" | "tool";
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
  thinkContent?: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
  toolExecuting?: ToolExecuting[];
  isHistory?: boolean;
  attachments?: { name: string; type: string; preview?: string }[];
}

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [webchatConfig, setWebchatConfig] = useState<WebchatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState(0);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isLogsBackground, setIsLogsBackground] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>(`web_${id}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const fetchWebchatConfig = async () => {
    try {
      const res = await fetch(`/api/agents/${id}/webchat`);
      if (res.ok) {
        const data = await res.json();
        setWebchatConfig(data);
      }
    } catch (error) {
      console.error("Failed to fetch webchat config:", error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`/api/agents/${id}/chat-history`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const historyMessages = data.messages.map((msg: Message) => ({
            ...msg,
            isHistory: true,
          }));
          setMessages(historyMessages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchAgent(), fetchWebchatConfig(), fetchChatHistory()]);
      setLoading(false);
    };
    init();
  }, [id]);

  const webchatConfigRef = useRef<WebchatConfig | null>(null);
  useEffect(() => {
    webchatConfigRef.current = webchatConfig;
  }, [webchatConfig]);

  useEffect(() => {
    if (
      webchatConfig?.enabled &&
      agent?.status === "running" &&
      webchatConfig.webchatUrl &&
      !wsRef.current &&
      !isConnecting &&
      !isConnected
    ) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [webchatConfig?.enabled, agent?.status, webchatConfig?.webchatUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        setIsLogsBackground(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const connectWebSocket = () => {
    const config = webchatConfigRef.current;
    if (!config?.webchatUrl || wsRef.current || isConnecting) return;

    setIsConnecting(true);
    const wsUrl = config.webchatUrl.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(`${wsUrl}/ws?session_id=${sessionIdRef.current}`);

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  const extractToolName = (hint: string): string => {
    const match = hint.match(/^(\w+)\(/);
    return match ? match[1] : hint;
  };

  const parseMultipleToolCalls = (content: string): string[] => {
    const tools: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === "(") {
        depth++;
        current += char;
      } else if (char === ")") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        const trimmed = current.trim();
        if (trimmed) tools.push(trimmed);
        current = "";
      } else {
        current += char;
      }
    }

    const trimmed = current.trim();
    if (trimmed) tools.push(trimmed);

    return tools;
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "typing":
        setIsAgentTyping(data.is_typing);
        break;

      case "think_content":
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              thinkContent: (lastMessage.thinkContent || "") + data.content,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "bot",
                content: "",
                thinkContent: data.content,
                isStreaming: true,
              },
            ];
          }
        });
        break;

      case "tool_call":
        const toolHints = parseMultipleToolCalls(data.content);
        const newToolExecutingList: ToolExecuting[] = toolHints.map((hint, index) => ({
          id: `tool_exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${index}`,
          name: extractToolName(hint),
          hint: hint,
          timestamp: new Date().toISOString(),
        }));
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              toolExecuting: [...(lastMessage.toolExecuting || []), ...newToolExecutingList],
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "bot",
                content: "",
                toolExecuting: newToolExecutingList,
                isStreaming: true,
              },
            ];
          }
        });
        break;

      case "delta":
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.content || lastMessage.content,
              toolExecuting: data.is_end && !lastMessage.toolExecuting?.length ? [] : lastMessage.toolExecuting,
              isStreaming: !data.is_end,
            };
            if (data.is_end) {
              setIsAgentTyping(false);
            }
            return updated;
          } else {
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "bot",
                content: data.content,
                isStreaming: !data.is_end,
              },
            ];
          }
        });
        break;

      case "message":
        setIsAgentTyping(false);
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            const toolCalls = lastMessage.toolExecuting?.map(tool => ({
              id: tool.id,
              name: tool.name,
              arguments: "{}",
            }));
            const finalContent = data.content || lastMessage.toolExecuting?.map(t => t.hint).join(", ") || "";
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: finalContent,
              thinkContent: undefined,
              toolExecuting: undefined,
              toolCalls: toolCalls?.length ? toolCalls : undefined,
              isStreaming: false,
            };
            return updated;
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "bot",
              content: data.content,
              isStreaming: false,
            },
          ];
        });
        break;
    }
  };

  const handleEnableWebchat = async () => {
    setEnabling(true);
    try {
      const res = await fetch(`/api/agents/${id}/webchat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setWebchatConfig((prev) =>
          prev
            ? { ...prev, enabled: true, port: data.port, webchatUrl: data.webchatUrl }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to enable webchat:", error);
    } finally {
      setEnabling(false);
    }
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    const hasAttachments = attachments.length > 0;
    if ((!text && !hasAttachments) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || pendingFiles > 0) {
      return;
    }

    setInputValue("");

    let messageAttachments: { name: string; type: string; preview?: string }[] | undefined;
    let wsMedia: { data: string; filename: string }[] | undefined;

    if (hasAttachments) {
      try {
        const uploadRes = await fetch(`/api/agents/${id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: attachments.map(a => ({
              data: a.preview || "",
              filename: a.name,
            })),
          }),
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          messageAttachments = attachments.map((a, i) => ({
            name: a.name,
            type: a.type,
            preview: uploadData.files?.[i]?.url || a.preview,
          }));
        } else {
          messageAttachments = attachments.map(a => ({
            name: a.name,
            type: a.type,
            preview: a.preview,
          }));
        }
      } catch {
        messageAttachments = attachments.map(a => ({
          name: a.name,
          type: a.type,
          preview: a.preview,
        }));
      }

      wsMedia = attachments.map(a => ({
        data: a.preview || "",
        filename: a.name,
      }));
    }

    const newMessage: Message = {
      id: crypto.randomUUID(),
      type: "user",
      content: text,
      timestamp: new Date().toISOString(),
      attachments: messageAttachments,
    };

    setMessages(prev => [...prev, newMessage]);

    const wsPayload: Record<string, unknown> = { text: text || "" };
    if (wsMedia) {
      wsPayload.media = wsMedia;
    }
    wsRef.current.send(JSON.stringify(wsPayload));

    setAttachments([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    const nativeEvent = e.nativeEvent as unknown as { isComposing?: boolean };
    if (e.key === "Enter" && !e.shiftKey && !nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMaxHeight = () => 160;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current);
    }
    inputDebounceRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, getMaxHeight()) + "px";
      }
    }, 16);
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const maxAttachments = 5;
    const maxFileSize = 10 * 1024 * 1024;
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx', 'zip'];

    const fileArray = Array.from(files);

    if (attachments.length + fileArray.length > maxAttachments) {
      alert(`最多只能上传 ${maxAttachments} 个附件`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of fileArray) {
      if (file.size > maxFileSize) {
        alert(`文件 "${file.name}" 超过 10MB 限制`);
        continue;
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.includes(extension)) {
        alert(`不支持的文件类型: "${file.name}"`);
        continue;
      }

      validFiles.push(file);
    }

    setPendingFiles(prev => prev + validFiles.length);

    for (const file of validFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        const newAttachment: Attachment = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          preview: dataUrl,
        };

        setAttachments(prev => [...prev, newAttachment]);
        setPendingFiles(prev => prev - 1);
      };
      reader.onerror = () => {
        setPendingFiles(prev => prev - 1);
      };
      reader.readAsDataURL(file);
    }
  }, [attachments]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

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

  if (agent.status !== "running") {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Breadcrumb items={[
          { label: "Dashboard", href: "/" },
          { label: agent.name, href: `/agents/${id}` },
          { label: "Chat" }
        ]} />

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <BotIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white uppercase">Chat</h1>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white uppercase tracking-wider text-sm">
              Agent Not Running
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-400">
              The agent is currently stopped. Start the agent to use the chat feature.
            </p>
            <button
              onClick={() => router.push(`/agents/${id}`)}
              className="px-4 py-2 rounded-lg btn-success font-medium"
            >
              Go to Agent Details
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!webchatConfig?.enabled) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Breadcrumb items={[
          { label: "Dashboard", href: "/" },
          { label: agent.name, href: `/agents/${id}` },
          { label: "Chat" }
        ]} />

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <ChatIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white uppercase">Chat</h1>
            <p className="text-zinc-400 text-sm">Webchat is not enabled for this agent</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white uppercase tracking-wider text-sm">
              Enable Webchat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-400">
              Webchat allows you to chat with this agent through a web interface.
              Enable it to start chatting.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleEnableWebchat}
                disabled={enabling}
                className="px-4 py-2 rounded-lg btn-success font-medium disabled:opacity-50"
              >
                {enabling ? "Enabling..." : "Enable Webchat"}
              </button>
              <span className="text-sm text-zinc-500">
                Port: {agent.port + 1000}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <button
        onClick={() => setIsLogsBackground(prev => !prev)}
        className="fixed z-[100] p-2 rounded-lg bg-zinc-800/90 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 transition-all duration-300 top-20 right-8"
        title="Toggle Logs/Chat layers (Ctrl/Cmd + L)"
      >
        {isLogsBackground ? (
          <LogsIcon className="w-5 h-5" />
        ) : (
          <ChatIcon className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 relative">
        <div
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out z-15",
            !isLogsBackground ? "bg-black/60 backdrop-blur-xl opacity-100" : "bg-transparent opacity-0 pointer-events-none"
          )}
        />

        <div
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            isLogsBackground ? "z-10" : "z-20"
          )}
        >
          <div className={cn(
            "absolute inset-0 transition-opacity duration-500",
            isLogsBackground ? "bg-black/95" : "bg-black/30"
          )}>
            <div className="relative h-full px-8 pb-8 pt-20">
              <div className="h-full flex flex-col">
                <CombinedLogViewer agentName={id} />
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out overflow-hidden",
            isLogsBackground ? "z-20" : "z-10"
          )}
        >
          <div className={cn(
            "absolute inset-0 transition-opacity duration-500",
            isLogsBackground ? "bg-black/20 backdrop-blur-sm" : "bg-black/40"
          )} />

          <div className="relative h-full flex flex-col p-4 pt-20 gap-4 max-w-7xl mx-auto w-full">
            <div className="shrink-0">
              <Breadcrumb items={[
                { label: "Dashboard", href: "/" },
                { label: agent.name, href: `/agents/${id}` },
                { label: "Chat" }
              ]} />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <ChatIcon className="w-5 h-5 text-orange-400" />
              </div>
              <StatusBadge status={agent.status} />
              <span
                className={cn(
                  "inline-flex items-center justify-center px-2.5 py-1 rounded border gap-1.5 text-xs font-medium",
                  isConnected
                    ? "bg-green-500/10 border-green-500/20"
                    : isConnecting
                    ? "bg-yellow-500/10 border-yellow-500/20 animate-status-pulse"
                    : "bg-red-500/10 border-red-500/20"
                )}
              >
                <WifiIcon className={cn(
                  "w-3.5 h-3.5",
                  isConnected ? "text-green-400" : isConnecting ? "text-yellow-400" : "text-red-400"
                )} />
              </span>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-zinc-900/50 border-zinc-800">
              <div className="border-b border-zinc-800 shrink-0 px-4 py-3 flex items-center justify-between">
                <div className="text-white uppercase tracking-wider text-sm flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  Conversation
                </div>
              </div>
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                      <BotIcon className="w-12 h-12 mb-4 opacity-50" />
                      <p>Start a conversation with {agent.name}</p>
                      <p className="text-sm mt-2">Type a message below to begin</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      if (msg.type === "tool" && msg.toolResult) {
                        return (
                          <div key={msg.id} className="flex justify-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                              <ToolIcon className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="flex flex-col max-w-[85%]">
                              <span className="text-xs text-zinc-500 mb-1">Tool</span>
                              <ToolResultBlock toolResult={msg.toolResult} />
                              <MessageMeta timestamp={msg.timestamp} />
                            </div>
                          </div>
                        );
                      }

                      const hasBotContent = msg.type === "bot" && (msg.content || msg.isStreaming || msg.toolCalls?.length || msg.toolExecuting?.length || msg.thinkContent || msg.attachments?.length);

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} gap-3`}
                        >
                          {msg.type === "bot" && hasBotContent && (
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                              <BotIcon className="w-4 h-4 text-orange-400" />
                            </div>
                          )}

                          <div className="flex flex-col max-w-[75%]">
                            {hasBotContent && (
                              <>
                                <span className="text-xs text-zinc-500 mb-1">Assistant</span>
                                <div className="px-4 py-3 rounded-2xl bg-zinc-800 text-zinc-200 rounded-bl-md border border-zinc-700/50 space-y-2">
                                  {msg.thinkContent && (
                                    <ThinkBlock content={msg.thinkContent} isStreaming={msg.isStreaming} />
                                  )}
                                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                                    <ToolCallBlock toolCalls={msg.toolCalls} />
                                  )}
                                  {msg.toolExecuting && msg.toolExecuting.length > 0 && (
                                    <ToolExecutingBlock tools={msg.toolExecuting} isExecuting={msg.isStreaming && !msg.content} />
                                  )}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {msg.attachments.map((att, idx) => (
                                        att.type.startsWith('image/') && att.preview ? (
                                          <img
                                            key={idx}
                                            src={att.preview}
                                            alt={att.name}
                                            className="max-w-[180px] max-h-[120px] rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setPreviewImage(att.preview ?? null)}
                                          />
                                        ) : (
                                          <div key={idx} className="flex items-center gap-1.5 bg-zinc-600/50 rounded px-2 py-1 text-xs">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                            </svg>
                                            <span>{att.name}</span>
                                          </div>
                                        )
                                      ))}
                                    </div>
                                  )}
                                  {(msg.content || msg.isStreaming) && (
                                    <div className={msg.isStreaming ? "border-l-4 border-l-orange-400 pl-3" : ""}>
                                      <MemoizedMarkdown content={msg.content} />
                                      {msg.isStreaming && (
                                        <div className="flex gap-1 mt-2">
                                          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <MessageMeta timestamp={msg.timestamp} />
                              </>
                            )}
                            {msg.type === "user" && (
                              <>
                                <span className="text-xs text-zinc-500 mb-1 text-right">You</span>
                                <div className="px-4 py-3 rounded-2xl bg-zinc-800 text-zinc-100 rounded-br-md border border-zinc-700/50">
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {msg.attachments.map((att, idx) => (
                                        att.type.startsWith('image/') && att.preview ? (
                                          <img
                                            key={idx}
                                            src={att.preview}
                                            alt={att.name}
                                            className="max-w-[180px] max-h-[120px] rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setPreviewImage(att.preview ?? null)}
                                          />
                                        ) : (
                                          <div key={idx} className="flex items-center gap-1.5 bg-zinc-600/50 rounded px-2 py-1 text-xs">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                            </svg>
                                            <span>{att.name}</span>
                                          </div>
                                        )
                                      ))}
                                    </div>
                                  )}
                                  <CollapsibleUserContent content={msg.content} isHistory={msg.isHistory} />
                                </div>
                                <MessageMeta timestamp={msg.timestamp} alignRight />
                              </>
                            )}
                          </div>

                          {msg.type === "user" && (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                              <UserIcon className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-zinc-800 p-4">
                  {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mb-3 pb-1">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="relative flex-shrink-0 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
                        >
                          {attachment.type.startsWith('image/') ? (
                            <div className="w-16 h-16">
                              <img
                                src={attachment.preview}
                                alt={attachment.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 flex flex-col items-center justify-center p-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                              </svg>
                              <span className="text-zinc-400 text-[10px] mt-1 truncate max-w-[56px]">{attachment.name}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.txt,.doc,.docx,.zip"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileSelect(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!isConnected || attachments.length >= 5}
                      className="w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-orange-400 disabled:text-zinc-600 disabled:hover:text-zinc-600 transition-colors"
                      title="Attach file"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder={isConnected ? "Type a message..." : "Connecting..."}
                      disabled={!isConnected}
                      rows={1}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 disabled:opacity-50 resize-none"
                      style={{
                        height: "auto",
                        maxHeight: getMaxHeight() + "px",
                        overflowY: "auto"
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || pendingFiles > 0) return;
                        const newMessage: Message = {
                          id: crypto.randomUUID(),
                          type: "user",
                          content: "/new",
                          timestamp: new Date().toISOString(),
                        };
                        setMessages(prev => [...prev, newMessage]);
                        wsRef.current.send(JSON.stringify({ text: "/new" }));
                      }}
                      disabled={!isConnected || pendingFiles > 0}
                      className="px-4 h-11 bg-orange-500/20 hover:bg-orange-500/30 disabled:bg-zinc-700/20 disabled:opacity-50 text-orange-400 disabled:text-zinc-500 rounded-lg font-medium transition-colors border border-orange-500/30 hover:border-orange-500/50 flex items-center justify-center"
                      title="New conversation (/new)"
                    >
                      /new
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!isConnected || (!inputValue.trim() && attachments.length === 0) || pendingFiles > 0 || isAgentTyping}
                      className={cn(
                        "px-4 min-w-[80px] h-11 rounded-lg font-medium transition-all duration-200 flex items-center justify-center",
                        isAgentTyping
                          ? "bg-green-500/20 border border-green-500/30 text-green-400 cursor-wait"
                          : "bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                      )}
                    >
                      {isAgentTyping ? (
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </span>
                      ) : (
                        <span>Send</span>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function LogsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M7 7h10"/>
      <path d="M7 12h10"/>
      <path d="M7 17h10"/>
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/>
      <rect width="16" height="12" x="4" y="8" rx="2"/>
      <path d="M2 14h2"/>
      <path d="M20 14h2"/>
      <path d="M15 13v2"/>
      <path d="M9 13v2"/>
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function ThinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  );
}

function ToolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13a10 10 0 0 1 14 0"/>
      <path d="M8.5 16.5a5 5 0 0 1 7 0"/>
      <path d="M2 8.82a15 15 0 0 1 20 0"/>
      <line x1="12" x2="12.01" y1="20" y2="20"/>
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  );
}

function ThinkBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isStreaming ?? false);

  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  return (
    <div className="mb-2 rounded-lg border border-purple-500/30 bg-purple-500/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors"
      >
        <ThinkIcon className="w-3.5 h-3.5" />
        <span>Thinking</span>
        {isStreaming && (
          <span className="flex gap-1 ml-1">
            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </span>
        )}
        <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && (
        <div className="px-3 py-1.5 border-t border-purple-500/30 text-xs text-purple-300/80 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

function ToolCallBlock({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="mb-2 space-y-1.5">
      {toolCalls.map((tc) => (
        <div key={tc.id} className="rounded-lg border border-blue-500/30 bg-blue-500/10 overflow-hidden">
          <button
            onClick={() => toggleExpand(tc.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
          >
            <ToolIcon className="w-3.5 h-3.5" />
            <span className="font-mono">{tc.name}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform ${expandedIds.has(tc.id) ? "rotate-180" : ""}`} />
          </button>
          {expandedIds.has(tc.id) && (
            <div className="px-3 py-1.5 border-t border-blue-500/30">
              <pre className="text-xs text-blue-300/80 overflow-x-auto whitespace-pre-wrap break-all">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(tc.arguments), null, 2);
                  } catch {
                    return tc.arguments;
                  }
                })()}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ToolExecutingBlock({ tools, isExecuting }: { tools: ToolExecuting[]; isExecuting?: boolean }) {
  return (
    <div className="mb-2 space-y-1.5">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="rounded-lg border border-blue-500/30 bg-blue-500/10 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 text-blue-400 text-xs font-medium">
            <div className="relative">
              <ToolIcon className="w-3.5 h-3.5" />
              {isExecuting && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
              )}
            </div>
            <span className="font-mono text-blue-300">{tool.hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const getDisplayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'text' in value) return String((value as any).text);
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

function ToolResultBlock({ toolResult }: { toolResult: ToolResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentStr = getDisplayText(toolResult.content);

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
      >
        <ToolIcon className="w-3.5 h-3.5" />
        <span className="font-mono">{toolResult.name}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && (
        <div className="px-3 py-1.5 border-t border-green-500/30">
          <pre className="text-xs text-green-300/80 whitespace-pre-wrap break-all">
            {contentStr}
          </pre>
        </div>
      )}
    </div>
  );
}

function MessageMeta({ timestamp, alignRight }: { timestamp?: string; alignRight?: boolean }) {
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-zinc-500 ${alignRight ? "justify-end" : ""}`}>
      {timestamp && (
        <span>{formatTime(timestamp)}</span>
      )}
    </div>
  );
}

function CollapsibleUserContent({ content }: { content: string; isHistory?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return null;

  const isLong = content.length > 300;
  const displayContent = isLong && !isExpanded ? content.slice(0, 300) + "..." : content;

  return (
    <div>
      <span className="whitespace-pre-wrap">{displayContent}</span>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-orange-400 hover:text-orange-300 mt-1"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function MemoizedMarkdown({ content }: { content: string }) {
  if (!content) return null;

  return (
    <div className="markdown-content text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-300">{children}</li>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-zinc-700/50 px-1.5 py-0.5 rounded text-orange-300 text-xs font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className={`${className} block bg-zinc-900 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-zinc-700/50 mb-2`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-1">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-400 mb-2">{children}</blockquote>
          ),
          hr: () => <hr className="border-zinc-700 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CombinedLogViewer({ agentName }: { agentName: string }) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [autoScroll] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/agents/${agentName}/logs`);

    eventSource.onmessage = (event) => {
      try {
        const log: AgentLog = JSON.parse(event.data);
        setLogs((prev) => {
          const newLogs = [...prev, log];
          return newLogs.length > 500 ? newLogs.slice(-500) : newLogs;
        });
      } catch (e) {
        console.error("Failed to parse log:", e);
      }
    };

    return () => eventSource.close();
  }, [agentName]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const parseLogContent = (content: string) => {
    const lower = content.toLowerCase();
    let level = "unknown";
    if (/\b(fatal|critical|emergency)\b/.test(lower)) level = "fatal";
    else if (/\b(error|exception|traceback)\b/.test(lower)) level = "error";
    else if (/\b(warn|warning|caution)\b/.test(lower)) level = "warn";
    else if (/\b(debug|trace|verbose)\b/.test(lower)) level = "debug";
    else if (/\b(info|information|log)\b/.test(lower)) level = "info";

    let message = content;
    try {
      const json = JSON.parse(content);
      if (json.msg || json.message) message = json.msg || json.message;
      else if (json.content) message = json.content;
    } catch {}

    return { level, message, raw: content };
  };

  const getLevelColor = (lvl: string) => {
    switch (lvl) {
      case "fatal": return "text-purple-400";
      case "error": return "text-rose-400";
      case "warn": return "text-amber-400";
      case "info": return "text-blue-400";
      case "debug": return "text-zinc-500";
      default: return "text-zinc-400";
    }
  };

  const getBgColor = (content: string) => {
    const lower = content.toLowerCase();
    if (lower.includes("before_execute_tools")) return "bg-emerald-900/50 border-l-2 border-emerald-400/60";
    if (lower.includes("process_message")) return "bg-blue-900/50 border-l-2 border-blue-400/60";
    return "";
  };

  const getTypeLabel = (content: string) => {
    const lower = content.toLowerCase();
    if (lower.includes("before_execute_tools")) return { label: "TOOL", bg: "bg-emerald-900/60", text: "text-emerald-300" };
    if (lower.includes("process_message")) return { label: "MSG", bg: "bg-blue-900/60", text: "text-blue-300" };
    return null;
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-auto font-mono text-sm">
      {logs.length === 0 ? (
        <div className="text-zinc-500 text-center py-8">Waiting for logs...</div>
      ) : (
        logs.map((log, index) => {
          const parsed = parseLogContent(log.content);
          const typeLabel = getTypeLabel(log.content);
          const bgClass = getBgColor(log.content);

          return (
            <div key={index} className={cn("group flex gap-2 items-center hover:bg-white/5 rounded px-2 text-xs leading-normal py-0.5", bgClass)}>
              <span className="text-zinc-600 select-none shrink-0">{formatTime(log.timestamp)}</span>
              {typeLabel && (
                <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide", typeLabel.bg, typeLabel.text)}>
                  {typeLabel.label}
                </span>
              )}
              {parsed.level !== "unknown" && (
                <span className={cn("shrink-0 mr-2 font-medium", getLevelColor(parsed.level))}>[{parsed.level.toUpperCase()}]</span>
              )}
              <span className="truncate flex-1 min-w-0 text-zinc-300" title={parsed.raw}>{parsed.message}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(parsed.raw); setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 1500); }}
                className={cn("shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-150", copiedIndex === index ? "opacity-100 text-green-400" : "text-zinc-500 hover:text-zinc-300")}
              >
                {copiedIndex === index ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
