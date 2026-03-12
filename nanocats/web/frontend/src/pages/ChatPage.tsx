import { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { Send, Plus, MessageSquare, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    loadConversations,
    createConversation,
    selectConversation,
    sendMessage
  } = useChat();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const content = input.trim();
    setInput('');
    await sendMessage(content);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Conversations Sidebar */}
      <div
        className="w-60 rounded-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <button
            onClick={createConversation}
            className="w-full flex items-center justify-center gap-2 font-medium py-2.5 px-4 rounded-xl transition-all text-sm"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--text-inverse)' }}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: currentConversation?.id === conv.id ? 'var(--color-accent-light)' : 'transparent',
                    color: currentConversation?.id === conv.id ? 'var(--color-accent-dark)' : 'var(--text-primary)',
                  }}
                >
                  <p className="font-medium truncate">{conv.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
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
        {currentConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Start a new conversation</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
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
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
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
          </>
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Select a conversation or start a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
