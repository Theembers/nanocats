import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '../contexts/ChatContext';
import { Send, MessageSquare, Loader2, Search, Globe, MessageCircle } from 'lucide-react';

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
                      
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          
          {isLoading && (
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
