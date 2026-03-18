import { create } from 'zustand';
import { wsClient } from '../api/websocket';

let messageId = 0;
const generateId = () => ++messageId + Date.now();

export const useChatStore = create((set, get) => ({
  currentAgent: null,
  messages: [],
  messageQueue: [],
  isConnected: false,
  isLoading: false,
  isAgentResponding: false,
  error: null,

  setCurrentAgent: (agent) => {
    set({ currentAgent: agent, messages: [], messageQueue: [] });
  },

  setMessages: (messages) => {
    set({ messages });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  // Message queue operations
  addToQueue: (content, agentId) => {
    const queueItem = {
      id: generateId(),
      content,
      agentId,
      status: 'pending',
    };
    set((state) => ({
      messageQueue: [...state.messageQueue, queueItem],
    }));
    get().processQueue();
  },

  processQueue: () => {
    const state = get();
    if (state.isAgentResponding || state.messageQueue.length === 0) {
      return;
    }

    const pending = state.messageQueue.find(m => m.status === 'pending');
    if (!pending) return;

    // Mark as sending
    set((state) => ({
      messageQueue: state.messageQueue.map(m => 
        m.id === pending.id ? { ...m, status: 'sending' } : m
      ),
    }));

    // Send the message
    get().sendMessageDirect(pending.content, pending.agentId);

    // Remove from queue after sending
    set((state) => ({
      messageQueue: state.messageQueue.filter(m => m.id !== pending.id),
    }));
  },

  clearQueue: () => {
    set({ messageQueue: [] });
  },

  setAgentResponding: (responding) => {
    set({ isAgentResponding: responding });
    if (!responding) {
      // Process next message in queue when agent stops responding
      setTimeout(() => get().processQueue(), 100);
    }
  },

  connect: (agentId) => {
    const unsubscribe = wsClient.onMessage((data) => {
      // Handle start/end of agent response
      if (data.type === 'response_start') {
        get().setAgentResponding(true);
        return;
      }
      if (data.type === 'response_end' || data.type === 'response_complete') {
        get().setAgentResponding(false);
        return;
      }

      if ((data.type === 'message' || data.content || data.message) && data.type !== 'welcome') {
        get().addMessage({
          id: generateId(),
          role: 'assistant',
          content: data.content || data.message,
          timestamp: new Date().toISOString(),
          tool_calls: data.tool_calls,
          media: data.media,
          attachments: data.attachments,
        });
        // Mark as not responding when we get a complete message
        if (!data.streaming) {
          get().setAgentResponding(false);
        }
      }
    });

    wsClient.connect(agentId);

    return unsubscribe;
  },

  disconnect: () => {
    wsClient.disconnect();
    set({ isConnected: false, isAgentResponding: false });
  },

  // Direct send without queue
  sendMessageDirect: (content, agentId) => {
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
      channel: 'web',
    });

    wsClient.send(message);
  },

  // Public send method that uses queue
  sendMessage: (content, agentId) => {
    // If agent is responding, add to queue
    if (get().isAgentResponding) {
      get().addToQueue(content, agentId);
    } else {
      // Otherwise send directly
      get().sendMessageDirect(content, agentId);
    }
  },

  // Send stop command
  sendStopCommand: (agentId) => {
    wsClient.send({
      type: 'command',
      command: '/stop',
      agent_id: agentId,
    });
    get().setAgentResponding(false);
  },

  // Send new session command
  sendNewSessionCommand: (agentId) => {
    wsClient.send({
      type: 'command',
      command: '/new',
      agent_id: agentId,
    });
    set({ messages: [] });
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
    set({ messages: [], messageQueue: [] });
  },
}));
