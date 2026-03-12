import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '../contexts/ChatContext';
import { Send, MessageSquare, Loader2, Search, Globe, MessageCircle, ChevronDown, ChevronRight, Wrench, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Component to display tool call results in a collapsible format
function ToolCallContent({ content, role }: { content: string; role: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if content looks like a tool result (JSON with url/status or similar)
  const isToolResult = content.includes('"url":') || 
                       content.includes('"status":') ||
                       content.includes('"result":') ||
                       (content.includes('"') && content.length > 500);
  
  // Check if it's a tool call hint
  const isToolHint = content.match(/^\w+\(/) || content.includes('tool call');
  
  if (!isToolResult && !isToolHint) {
    // Regular message, render as markdown
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }: any) => {
            return !inline ? (
              <pre className="rounded-lg p-3 my-2 overflow-x-auto" style={{ backgroundColor: role === 'user' ? 'rgba(0,0,0,0.2)' : 'var(--bg-elevated)' }}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: role === 'user' ? 'rgba(0,0,0,0.2)' : 'var(--bg-elevated)' }} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
          h2: ({ children }: any) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
          h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
          ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }: any) => <li className="mb-0.5">{children}</li>,
          a: ({ children, href }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">{children}</a>,
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-2 pl-3 my-2 italic" style={{ borderColor: role === 'user' ? 'rgba(255,255,255,0.4)' : 'var(--color-accent)' }}>
              {children}
            </blockquote>
          ),
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }: any) => <thead style={{ backgroundColor: role === 'user' ? 'rgba(0,0,0,0.1)' : 'var(--bg-elevated)' }}>{children}</thead>,
          th: ({ children }: any) => <th className="px-2 py-1 border text-left font-semibold">{children}</th>,
          td: ({ children }: any) => <td className="px-2 py-1 border">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }
  
  // Tool result - show collapsed by default
  let toolName = 'Tool Result';
  let icon = <Wrench className="w-3 h-3" />;
  
  if (isToolHint) {
    const match = content.match(/^(\w+)\(/);
    toolName = match ? match[1] : 'Tool';
  } else if (content.includes('"url":')) {
    toolName = 'Web Fetch';
    icon = <Cpu className="w-3 h-3" />;
  }
  
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: role === 'user' ? 'rgba(0,0,0,0.15)' : 'var(--bg-elevated)' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {icon}
        <span className="text-xs font-medium">{toolName}</span>
        <span className="text-xs opacity-50 ml-auto">{isExpanded ? 'Hide details' : 'Show details'}</span>
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all" style={{ color: 'var(--text-secondary)' }}>
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

const CHANNEL_ICONS: Record<string, string> = {
  web: '🌐',
  feishu: '📱',
  dingtalk: '💼',
  telegram: '✈️',
  discord: '🎮',
  slack: '💬',
  unknown: '📨'
};

const CHANNEL_NAMES: Record<string, string> = {
  web: 'Web',
  feishu: '飞书',
  dingtalk: '钉钉',
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  unknown: 'Other'
};

export default function ChatPage() {
  const {
    messages,
    channels,
    isLoading,
    hasMore,
    loadMessages,
    loadMoreMessages,
    loadChannels,
    sendMessage,
    streamingContent,
    streamingType,
    searchQuery,
    setSearchQuery,
    selectedChannel,
    setSelectedChannel
  } = useChat();
  
  const [input, setInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadChannels();
  }, [loadMessages, loadChannels]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Load more when scrolling near top
    if (container.scrollTop < 100 && hasMore && !isLoading) {
      loadMoreMessages();
    }
  }, [hasMore, isLoading, loadMoreMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const content = input.trim();
    setInput('');
    await sendMessage(content);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMessages({ search: searchQuery || undefined });
  };

  const handleChannelSelect = (channel: string | null) => {
    setSelectedChannel(channel);
    loadMessages({ channel: channel || undefined });
  };

  // Group messages by date
  // (empty messages are now filtered at the backend for all channels)
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Channels Sidebar */}
      <div
        className="w-60 rounded-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Channels</h3>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: showSearch ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-secondary)'
              }}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          
          {showSearch && (
            <form onSubmit={handleSearch} className="mt-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full px-3 py-2 pr-8 rounded-lg text-sm outline-none"
                  style={{ 
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {/* All Channels */}
          <button
            onClick={() => handleChannelSelect(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1"
            style={{
              backgroundColor: selectedChannel === null ? 'var(--bg-hover)' : 'transparent',
              color: selectedChannel === null ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1 text-left">All Channels</span>
            <span className="text-xs opacity-50">
              {channels.reduce((sum, ch) => sum + ch.message_count, 0)}
            </span>
          </button>
          
          {/* Individual Channels */}
          {channels.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-0.5 mt-2">
              {channels.map((ch) => (
                <button
                  key={ch.channel}
                  onClick={() => handleChannelSelect(ch.channel)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: selectedChannel === ch.channel ? 'var(--bg-hover)' : 'transparent',
                    color: selectedChannel === ch.channel ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span className="text-base">{CHANNEL_ICONS[ch.channel] || '📨'}</span>
                  <span className="flex-1 text-left">{CHANNEL_NAMES[ch.channel] || ch.channel}</span>
                  <span className="text-xs opacity-50">{ch.message_count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 rounded-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
      >
        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Load more indicator */}
          {hasMore && (
            <div className="text-center py-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Scroll up to load more history
              </span>
            </div>
          )}
          
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Start a conversation</p>
                <p className="text-sm mt-2 opacity-60">
                  Messages from all channels appear here
                </p>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="space-y-4">
                {/* Date separator */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-soft)' }}></div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{date}</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-soft)' }}></div>
                </div>
                
                {/* Messages for this date */}
                {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className="max-w-[70%] px-4 py-3 rounded-2xl"
                      style={
                        message.role === 'user'
                          ? { backgroundColor: 'var(--color-accent)', color: 'var(--text-inverse)' }
                          : { backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }
                      }
                    >
                      {/* Channel badge */}
                      <div className="flex items-center gap-1 mb-1 opacity-60">
                        <span className="text-xs">{CHANNEL_ICONS[message.channel] || '📨'}</span>
                        <span className="text-xs">{CHANNEL_NAMES[message.channel] || message.channel}</span>
                      </div>
                      
                      {/* Message content with tool call handling */}
                      <div className={`markdown-content text-sm ${message.role === 'user' ? 'markdown-user' : 'markdown-assistant'}`}>
                        <ToolCallContent content={message.content} role={message.role} />
                      </div>
                      <p
                        className="text-xs mt-1"
                        style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          
          {/* Loading / Streaming indicator */}
          {isLoading && streamingContent && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl max-w-[70%]"
                style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-soft)' }}
              >
                {/* Tool call indicator */}
                {streamingType === 'tool' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Tool Call</span>
                  </div>
                )}
                {/* Thinking indicator */}
                {streamingType === 'thinking' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>Thinking</span>
                  </div>
                )}
                {/* Streaming content */}
                <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {streamingContent}
                </div>
              </div>
            </div>
          )}
          
          {/* Simple loading when no streaming content */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-soft)' }}
              >
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-xl outline-none transition-all text-sm"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1.5px solid var(--border-main)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-main)')}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--text-inverse)',
                opacity: (!input.trim() || isLoading) ? 0.4 : 1,
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
