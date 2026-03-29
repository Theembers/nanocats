"use client";

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentInstance } from "@/lib/types";
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

// 新增：实时工具调用提示（来自 WebSocket）
interface ToolExecuting {
  id: string;
  name: string;
  hint: string; // e.g., "web_search(\"天气\")"
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
  type: string;       // MIME type
  size: number;
  preview?: string;   // data URL（用于图片预览和发送）
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
  toolExecuting?: ToolExecuting[]; // 实时工具调用列表
  isHistory?: boolean; // 标记是否为历史消息
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

  // 输入框高度 ref，避免每次 onInput 都触发布局计算
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 防抖定时器 ref
  const inputDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 固定 sessionId：每个 agent 对应一个固定的 sessionId，格式为 web_{agentName}
  const sessionIdRef = useRef<string>(`web_${id}`);

  // 滚动到底部
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
          // 标记为历史消息
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

  // 使用 ref 存储 webchatConfig 以避免依赖问题
  const webchatConfigRef = useRef<WebchatConfig | null>(null);
  useEffect(() => {
    webchatConfigRef.current = webchatConfig;
  }, [webchatConfig]);

  // 自动连接 WebSocket（如果 webchat 已启用且 agent 正在运行）
  useEffect(() => {
    // 只有当 webchat 已启用、agent 正在运行、有 webchatUrl 且未连接时才连接
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webchatConfig?.enabled, agent?.status, webchatConfig?.webchatUrl]);

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

  // 从工具提示中提取工具名称 e.g. "web_search(\"天气\")" -> "web_search"
  const extractToolName = (hint: string): string => {
    const match = hint.match(/^(\w+)\(/);
    return match ? match[1] : hint;
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "typing":
        // 设置 Agent 正在输入状态
        setIsAgentTyping(data.is_typing);
        break;

      case "think_content":
        // 思考内容片段，累积到当前消息
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            // 更新正在流式传输的消息的思考内容
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              thinkContent: (lastMessage.thinkContent || "") + data.content,
            };
            return updated;
          } else {
            // 创建新的流式消息（思考中）
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
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
        // 工具调用提示
        const toolName = extractToolName(data.content);
        const newToolExecuting: ToolExecuting = {
          id: `tool_exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: toolName,
          hint: data.content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            // 添加到当前消息的工具执行列表
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              toolExecuting: [...(lastMessage.toolExecuting || []), newToolExecuting],
            };
            return updated;
          } else {
            // 创建新的流式消息（工具执行中）
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                type: "bot",
                content: "",
                toolExecuting: [newToolExecuting],
                isStreaming: true,
              },
            ];
          }
        });
        break;

      case "delta":
        // 流式内容增量
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            // 更新正在流式传输的消息
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.content,
              // 工具调用结束后清空 toolExecuting
              toolExecuting: data.is_resuming ? lastMessage.toolExecuting : [],
              isStreaming: !data.is_end,
            };
            // 流结束时清除 typing 状态
            if (data.is_end) {
              setIsAgentTyping(false);
            }
            return updated;
          } else {
            // 创建新的流式消息
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                type: "bot",
                content: data.content,
                isStreaming: !data.is_end,
              },
            ];
          }
        });
        break;

      case "message":
        // 最终消息，清空中间状态后添加
        setIsAgentTyping(false);
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          // 如果最后一条是正在流式的 bot 消息，用最终内容替换
          if (lastMessage && lastMessage.type === "bot" && lastMessage.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.content,
              thinkContent: undefined,
              toolExecuting: undefined,
              isStreaming: false,
            };
            return updated;
          }
          // 否则添加新消息
          return [
            ...prev,
            {
              id: `msg_${Date.now()}`,
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

    // 先清空输入，给用户即时反馈
    setInputValue("");

    let messageAttachments: { name: string; type: string; preview?: string }[] | undefined;
    let wsMedia: { data: string; filename: string }[] | undefined;

    if (hasAttachments) {
      // 1. 上传文件到服务端获取持久化 URL
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
          // 用服务端 URL 替代 base64 data URL 作为预览
          messageAttachments = attachments.map((a, i) => ({
            name: a.name,
            type: a.type,
            preview: uploadData.files?.[i]?.url || a.preview,
          }));
        } else {
          // 上传失败，fallback 使用 base64
          messageAttachments = attachments.map(a => ({
            name: a.name,
            type: a.type,
            preview: a.preview,
          }));
        }
      } catch {
        // 上传失败，fallback
        messageAttachments = attachments.map(a => ({
          name: a.name,
          type: a.type,
          preview: a.preview,
        }));
      }

      // 2. 构造 WebSocket media payload（仍用 base64 发给 nanobot）
      wsMedia = attachments.map(a => ({
        data: a.preview || "",
        filename: a.name,
      }));
    }

    // 构造本地消息（用服务端 URL）
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      type: "user",
      content: text,
      timestamp: new Date().toISOString(),
      attachments: messageAttachments,
    };

    setMessages(prev => [...prev, newMessage]);

    // 发送 WebSocket 消息（用 base64 给 nanobot）
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

  // 处理输入框内容变化（带防抖优化高度调整）
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // 防抖调整高度，避免频繁触发 layout thrashing
    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current);
    }
    inputDebounceRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
      }
    }, 16); // ~1 frame
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const maxAttachments = 5;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx', 'zip'];

    const fileArray = Array.from(files);

    // 检查附件数量限制
    if (attachments.length + fileArray.length > maxAttachments) {
      alert(`最多只能上传 ${maxAttachments} 个附件`);
      return;
    }

    // 先过滤出有效文件
    const validFiles: File[] = [];
    for (const file of fileArray) {
      // 检查文件大小
      if (file.size > maxFileSize) {
        alert(`文件 "${file.name}" 超过 10MB 限制`);
        continue;
      }

      // 检查文件扩展名
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.includes(extension)) {
        alert(`不支持的文件类型: "${file.name}"`);
        continue;
      }

      validFiles.push(file);
    }

    // 增加待处理文件计数
    setPendingFiles(prev => prev + validFiles.length);

    for (const file of validFiles) {
      // 读取文件为 data URL（所有文件都需要 data URL 用于发送）
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
    // 纯文本粘贴保持原有行为
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

  // Webchat 未启用
  if (!webchatConfig?.enabled) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: "Dashboard", href: "/" },
          { label: agent.name, href: `/agents/${id}` },
          { label: "Chat" }
        ]} />

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <ChatIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white uppercase">Chat</h1>
            <p className="text-zinc-400 text-sm">Webchat is not enabled for this agent</p>
          </div>
        </div>

        {/* Enable Webchat Card */}
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
            <p className="text-xs text-zinc-500">
              Note: You need to restart the agent after enabling webchat for changes to take effect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Agent 未运行
  if (agent.status !== "running") {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: "Dashboard", href: "/" },
          { label: agent.name, href: `/agents/${id}` },
          { label: "Chat" }
        ]} />

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <ChatIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white uppercase">Chat</h1>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        {/* Agent Stopped Card */}
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

  // 正常聊天界面
  return (
    <div className="space-y-6 animate-fade-in-up h-[calc(100vh-8rem)] flex flex-col">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Dashboard", href: "/" },
        { label: agent.name, href: `/agents/${id}` },
        { label: "Chat" }
      ]} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
          <ChatIcon className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white uppercase">Chat</h1>
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
              "w-4 h-4",
              isConnected ? "text-green-400" : isConnecting ? "text-yellow-400" : "text-red-400"
            )} />
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="glass-card flex-1 flex flex-col overflow-hidden min-h-0">
        <CardHeader className="border-b border-zinc-800 shrink-0">
          <CardTitle className="text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <BotIcon className="w-12 h-12 mb-4 opacity-50" />
                <p>Start a conversation with {agent.name}</p>
                <p className="text-sm mt-2">Type a message below to begin</p>
              </div>
            ) : (
              messages.map((msg) => {
                // Tool result 消息单独渲染
                if (msg.type === "tool" && msg.toolResult) {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[90%]">
                        <ToolResultBlock toolResult={msg.toolResult} timestamp={msg.timestamp} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        msg.type === "user"
                          ? "px-4 py-3 rounded-2xl bg-zinc-800 text-zinc-100 rounded-br-md border border-zinc-700/50"
                          : "" // bot 消息的样式在内部处理
                      }`}
                    >
                      {msg.type === "bot" && (
                        <>
                          {/* Think Block (实时思考过程) */}
                          {msg.thinkContent && (
                            <ThinkBlock content={msg.thinkContent} isStreaming={msg.isStreaming} />
                          )}
                          {/* Tool Calls Block (历史消息中的工具调用) */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <ToolCallBlock toolCalls={msg.toolCalls} timestamp={msg.timestamp} />
                          )}
                          {/* Tool Executing Block (实时工具执行) */}
                          {msg.toolExecuting && msg.toolExecuting.length > 0 && (
                            <ToolExecutingBlock tools={msg.toolExecuting} />
                          )}
                          {/* Bot 消息内容 */}
                          {(msg.content || msg.isStreaming) && (
                            <CollapsibleContent
                              content={msg.content}
                              isHistory={msg.isHistory}
                              isStreaming={msg.isStreaming}
                              timestamp={msg.timestamp}
                            />
                          )}
                        </>
                      )}
                      {msg.type === "user" && (
                        <>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {msg.attachments.map((att, idx) => (
                                att.type.startsWith('image/') && att.preview ? (
                                  <img
                                    key={idx}
                                    src={att.preview}
                                    alt={att.name}
                                    className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer"
                                    onClick={() => window.open(att.preview, '_blank')}
                                  />
                                ) : (
                                  <div key={idx} className="flex items-center gap-1.5 bg-zinc-600/50 rounded px-2 py-1 text-xs">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                    </svg>
                                    <span>{att.name}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                          <CollapsibleUserContent
                            content={msg.content}
                            isHistory={msg.isHistory}
                            timestamp={msg.timestamp}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-zinc-800 p-4">
            {/* Attachments Preview */}
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
                        <span className="text-zinc-400 text-[10px] mt-1 truncate max-w-[56px]">
                          {attachment.name}
                        </span>
                        <span className="text-zinc-500 text-[8px]">
                          {formatFileSize(attachment.size)}
                        </span>
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
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,.pdf,.txt,.doc,.docx,.zip"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileSelect(e.target.files);
                    e.target.value = ''; // 允许重复选择同一文件
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
                style={{ height: "auto", overflow: "hidden" }}
              />
              <button
                onClick={() => {
                  if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || pendingFiles > 0) return;
                  const newMessage: Message = {
                    id: `msg_${Date.now()}`,
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
                className={`px-4 min-w-[80px] h-11 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                  isAgentTyping
                    ? "bg-green-500/20 border border-green-500/30 text-green-400 cursor-wait"
                    : "bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                }`}
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
  );
}

// Icon Components
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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

// Think Block 组件
function ThinkBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isStreaming ?? false);

  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [isStreaming]);

  return (
    <div className="mb-3 rounded-lg border border-purple-500/30 bg-purple-500/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-purple-400 text-sm font-medium hover:bg-purple-500/20 transition-colors"
      >
        <ThinkIcon className="w-4 h-4" />
        <span>Thinking</span>
        {isStreaming && (
          <span className="flex gap-1 ml-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </span>
        )}
        <ChevronDownIcon className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && (
        <div className="px-3 py-2 border-t border-purple-500/30 text-sm text-purple-300/80 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

// Tool Call Block 组件
function ToolCallBlock({ toolCalls, timestamp }: { toolCalls: ToolCall[]; timestamp?: string }) {
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
    <div className="mb-3 space-y-2">
      {toolCalls.map((tc) => (
        <div key={tc.id} className="rounded-lg border border-blue-500/30 bg-blue-500/10 overflow-hidden">
          <button
            onClick={() => toggleExpand(tc.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
          >
            <ToolIcon className="w-4 h-4" />
            <span className="font-mono">{tc.name}</span>
            {timestamp && (
              <span className="text-xs text-blue-400/60 ml-auto mr-2">
                {new Date(timestamp).toLocaleTimeString()}
              </span>
            )}
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedIds.has(tc.id) ? "rotate-180" : ""}`} />
          </button>
          {expandedIds.has(tc.id) && (
            <div className="px-3 py-2 border-t border-blue-500/30">
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

// Tool Executing Block 组件（实时工具执行指示器）
function ToolExecutingBlock({ tools }: { tools: ToolExecuting[] }) {
  return (
    <div className="mb-3 space-y-2">
      {tools.map((tool) => (
        <div 
          key={tool.id} 
          className="rounded-lg border border-blue-500/30 bg-blue-500/10 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 text-blue-400 text-sm font-medium">
            <div className="relative">
              <ToolIcon className="w-4 h-4" />
              {/* 执行中指示器 */}
              <span className="absolute -top-1 -right-1 w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>
            <span className="font-mono text-blue-300">{tool.hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 辅助函数：将可能的复杂类型转换为可显示的字符串
const getDisplayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'text' in value) return String((value as any).text);
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

// Tool Result Block 组件
function ToolResultBlock({ toolResult, timestamp }: { toolResult: ToolResult; timestamp?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 将 content 转换为字符串
  const contentStr = getDisplayText(toolResult.content);

  // 截取内容预览
  const preview = contentStr.length > 100
    ? contentStr.slice(0, 100) + "..."
    : contentStr;

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
      >
        <ToolIcon className="w-4 h-4" />
        <span className="font-mono">{toolResult.name}</span>
        <span className="text-xs text-green-400/60">result</span>
        {timestamp && (
          <span className="text-xs text-green-400/60 ml-auto mr-2">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      <div className="px-3 py-2 border-t border-green-500/30">
        {isExpanded ? (
          <pre className="text-xs text-green-300/80 overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
            {contentStr}
          </pre>
        ) : (
          <div className="text-xs text-green-300/60 truncate">
            {preview}
          </div>
        )}
      </div>
    </div>
  );
}

// 可折叠的 Bot 消息内容组件
const MAX_LINES = 20;

// 格式化消息时间：当天只显示时间，超过一天显示日期+时间
function formatMessageTime(timestamp?: string): string {
  if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const date = new Date(timestamp);
  const now = new Date();
  
  // 判断是否是今天
  const isToday = date.getDate() === now.getDate() && 
                  date.getMonth() === now.getMonth() && 
                  date.getFullYear() === now.getFullYear();
  
  if (isToday) {
    // 当天只显示时间
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // 超过一天显示日期+时间
    return date.toLocaleString([], { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

// 代码块组件（带复制按钮）
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const handleCopy = useCallback(async () => {
    if (codeRef.current) {
      const text = codeRef.current.textContent || "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // 从 className 中提取语言名称
  const language = className?.replace(/language-/, "") || "code";

  return (
    <span className="group relative block">
      <span className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {language && (
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800/50">
            {language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </span>
      <code ref={codeRef} className={className}>
        {children}
      </code>
    </span>
  );
}

// Markdown 渲染组件配置
const markdownComponents: Components = {
  // 代码块
  code({ node, inline, className, children, ...props }: any) {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-400 text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <CodeBlock className={className}>
        {children}
      </CodeBlock>
    );
  },
  // pre 标签
  pre({ children, ...props }: any) {
    return (
      <pre className="relative overflow-x-auto rounded-lg bg-[#0d1117] p-4 text-sm border border-zinc-800" {...props}>
        {children}
      </pre>
    );
  },
  // 链接
  a({ children, href, ...props }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-400 hover:text-orange-300 underline underline-offset-2 decoration-orange-400/50 transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },
  // 标题
  h1({ children, ...props }: any) {
    return <h1 className="text-xl font-bold text-white mt-6 mb-3 first:mt-0" {...props}>{children}</h1>;
  },
  h2({ children, ...props }: any) {
    return <h2 className="text-lg font-bold text-white mt-5 mb-2 first:mt-0" {...props}>{children}</h2>;
  },
  h3({ children, ...props }: any) {
    return <h3 className="text-base font-semibold text-white mt-4 mb-2 first:mt-0" {...props}>{children}</h3>;
  },
  // 段落
  p({ children, ...props }: any) {
    return <p className="text-zinc-200 leading-relaxed mb-3 last:mb-0" {...props}>{children}</p>;
  },
  // 列表
  ul({ children, ...props }: any) {
    return <ul className="list-disc list-inside space-y-1 mb-3 text-zinc-200 pl-2" {...props}>{children}</ul>;
  },
  ol({ children, ...props }: any) {
    return <ol className="list-decimal list-inside space-y-1 mb-3 text-zinc-200 pl-2" {...props}>{children}</ol>;
  },
  li({ children, ...props }: any) {
    return <li className="text-zinc-200" {...props}>{children}</li>;
  },
  // 引用块
  blockquote({ children, ...props }: any) {
    return (
      <blockquote
        className="border-l-4 border-orange-500/50 pl-4 py-1 my-3 text-zinc-400 italic bg-zinc-800/30 rounded-r"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  // 表格
  table({ children, ...props }: any) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead({ children, ...props }: any) {
    return <thead className="bg-zinc-800/50" {...props}>{children}</thead>;
  },
  th({ children, ...props }: any) {
    return (
      <th className="px-3 py-2 text-left text-zinc-300 font-semibold border border-zinc-700" {...props}>
        {children}
      </th>
    );
  },
  td({ children, ...props }: any) {
    return (
      <td className="px-3 py-2 text-zinc-300 border border-zinc-700" {...props}>
        {children}
      </td>
    );
  },
  // 水平分割线
  hr({ ...props }: any) {
    return <hr className="border-zinc-700 my-4" {...props} />;
  },
  // 粗体
  strong({ children, ...props }: any) {
    return <strong className="font-semibold text-white" {...props}>{children}</strong>;
  },
  // 斜体
  em({ children, ...props }: any) {
    return <em className="italic text-zinc-300" {...props}>{children}</em>;
  },
};

// 优化的 Markdown 内容组件（带 memo）
const MemoizedMarkdown = memo(({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
});
MemoizedMarkdown.displayName = "MemoizedMarkdown";

function CollapsibleContent({
  content,
  isHistory,
  isStreaming,
  timestamp,
}: {
  content: string;
  isHistory?: boolean;
  isStreaming?: boolean;
  timestamp?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(!isHistory); // 新消息默认展开，历史消息根据行数决定
  const lines = content.split("\n");
  const shouldCollapse = isHistory && lines.length > MAX_LINES;
  const displayContent = shouldCollapse && !isExpanded
    ? lines.slice(0, MAX_LINES).join("\n")
    : content;

  return (
    <div className={`px-4 py-3 rounded-2xl bg-zinc-800/50 text-zinc-200 rounded-bl-md border border-zinc-700/50 ${isStreaming ? "border-l-4 border-l-orange-400" : ""}`}>
      <div className="markdown-content">
        <MemoizedMarkdown content={displayContent} />
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
        >
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          <span>{isExpanded ? "收起" : `展开全部 (${lines.length} 行)`}</span>
        </button>
      )}
      <div className="text-xs mt-2 text-zinc-500">
        {formatMessageTime(timestamp)}
      </div>
      {isStreaming && (
        <div className="flex gap-1 mt-2">
          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
        </div>
      )}
    </div>
  );
}

// 可折叠的 User 消息内容组件
function CollapsibleUserContent({
  content,
  isHistory,
  timestamp,
}: {
  content: string;
  isHistory?: boolean;
  timestamp?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(!isHistory);
  const safeContent = typeof content === 'string' ? content : String(content || '');
  const lines = safeContent.split("\n");
  const shouldCollapse = isHistory && lines.length > MAX_LINES;
  const displayContent = shouldCollapse && !isExpanded
    ? lines.slice(0, MAX_LINES).join("\n")
    : safeContent;

  return (
    <>
      <div className="whitespace-pre-wrap">{displayContent}</div>
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-xs text-zinc-300 hover:text-white transition-colors"
        >
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          <span>{isExpanded ? "收起" : `展开全部 (${lines.length} 行)`}</span>
        </button>
      )}
      <div className="text-xs mt-2 text-zinc-400 text-right">
        {formatMessageTime(timestamp)}
      </div>
    </>
  );
}
