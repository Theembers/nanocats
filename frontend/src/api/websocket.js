import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

function parseJwt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (e) {
    return null;
  }
}

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.handlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.currentAgentId = null;
    this.isIntentionallyClosing = false;
  }

  connect(agentId = 'default') {
    const token = useAuthStore.getState().token;
    if (!token) {
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentAgentId === agentId) {
      return;
    }

    const wasReconnecting = this.ws !== null;
    this.disconnect(false);
    this.currentAgentId = agentId;
    this.isIntentionallyClosing = false;

    const payload = parseJwt(token);
    const userId = payload?.sub;
    if (!userId) {
      console.error('Invalid token: missing sub');
      return;
    }

    const wsUrl = `ws://${window.location.host}/ws/${agentId}?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      useChatStore.getState().setConnected(true);
      this.send({ user_id: userId });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(data));
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onclose = (event) => {
      useChatStore.getState().setConnected(false);
      if (!this.isIntentionallyClosing && this.reconnectAttempts < this.maxReconnectAttempts && this.currentAgentId) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(this.currentAgentId), 1000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      useChatStore.getState().setConnected(false);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(clearHandlers = true) {
    this.isIntentionallyClosing = !clearHandlers;
    if (clearHandlers) {
      this.handlers.clear();
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (clearHandlers) {
      this.currentAgentId = null;
    }
  }
}

export const wsClient = new WebSocketClient();
