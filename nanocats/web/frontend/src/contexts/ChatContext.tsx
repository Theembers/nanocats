import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Message, Channel } from '../types';
import { useAuth } from './AuthContext';

interface ChatContextType {
  messages: Message[];
  channels: Channel[];
  isLoading: boolean;
  hasMore: boolean;
  loadMessages: (params?: { channel?: string; search?: string; offset?: number }) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  loadChannels: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  // For streaming
  streamingContent: string;
  streamingType: 'thinking' | 'tool' | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedChannel: string | null;
  setSelectedChannel: (channel: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:15751';

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingType, setStreamingType] = useState<'thinking' | 'tool' | null>(null);
  const LIMIT = 50;

  const loadMessages = useCallback(async (params?: { channel?: string; search?: string; offset?: number }) => {
    if (!token) return;
    
    setIsLoading(true);
    const currentOffset = params?.offset ?? 0;
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(LIMIT));
      queryParams.append('offset', String(currentOffset));
      
      if (params?.channel) {
        queryParams.append('channel', params.channel);
      }
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      
      const response = await fetch(`${API_URL}/api/messages?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (currentOffset === 0) {
          // Initial load - reverse to show oldest first
          setMessages(data.messages.reverse());
        } else {
          // Load more - prepend older messages
          setMessages(prev => [...data.messages.reverse(), ...prev]);
        }
        
        setHasMore(data.messages.length === LIMIT);
        setOffset(currentOffset + data.messages.length);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await loadMessages({ 
      channel: selectedChannel || undefined, 
      search: searchQuery || undefined, 
      offset 
    });
  }, [loadMessages, offset, isLoading, hasMore, selectedChannel, searchQuery]);

  const loadChannels = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/messages/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChannels(data);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  }, [token]);

  const sendMessage = useCallback(async (content: string) => {
    if (!token) return;
    
    setIsLoading(true);
    setStreamingContent('');
    setStreamingType(null);
    
    // Optimistically add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      channel: 'web',
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Create a placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      channel: 'web',
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantMessage]);
    
    try {
      // Use SSE streaming endpoint
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: content })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            
            // Find the data line
            const dataLineIndex = lines.findIndex(l => l.startsWith('data: '));
            if (dataLineIndex !== -1) {
              const dataLine = lines[dataLineIndex];
              const jsonStr = dataLine.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                
                if (eventType === 'thinking' || eventType === 'tool') {
                  // Show progress update
                  setStreamingType(eventType);
                  setStreamingContent(data.content);
                } else if (eventType === 'done') {
                  // Final response - update message
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: data.content }
                      : msg
                  ));
                  setStreamingContent('');
                  setStreamingType(null);
                } else if (eventType === 'error') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: `Error: ${data.content}` }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: `Error: ${error}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  return (
    <ChatContext.Provider value={{
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
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
