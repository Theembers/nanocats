import { create } from 'zustand';
import { wsClient } from '../api/websocket';

let messageId = 0;
const generateId = () => ++messageId + Date.now();

export const useChatStore = create((set, get) => ({
  currentAgent: null,
  messages: [],
  isConnected: false,
  isLoading: false,
  error: null,

  setCurrentAgent: (agent) => {
    set({ currentAgent: agent, messages: [] });
  },

  setMessages: (messages) => {
    set({ messages });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  connect: (agentId) => {
    const unsubscribe = wsClient.onMessage((data) => {
      if ((data.type === 'message' || data.content || data.message) && data.type !== 'welcome') {
        get().addMessage({
          id: generateId(),
          role: 'assistant',
          content: data.content || data.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    wsClient.connect(agentId);

    return unsubscribe;
  },

  disconnect: () => {
    wsClient.disconnect();
    set({ isConnected: false });
  },

  sendMessage: (content, agentId) => {
    const message = {
      type: 'message',
      content,
      agent_id: agentId,
      channel: 'web',
      chat_id: 'web',
    };

    get().addMessage({
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    });

    wsClient.send(message);
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error, isConnected: false });
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
