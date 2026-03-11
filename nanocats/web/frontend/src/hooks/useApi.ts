import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:15751';

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
}

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T,>(endpoint: string, options: UseApiOptions = {}): Promise<T | null> => {
    const { method = 'GET', body, token } = options;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { request, isLoading, error };
}

export function useAgentApi(token: string | null) {
  const { request, isLoading, error } = useApi();

  const getMe = useCallback(() => {
    if (!token) return Promise.resolve(null);
    return request('/api/agent/me', { token });
  }, [request, token]);

  const getConfig = useCallback(() => {
    if (!token) return Promise.resolve(null);
    return request('/api/agent/config', { token });
  }, [request, token]);

  const updateConfig = useCallback((config: any) => {
    if (!token) return Promise.resolve(null);
    return request('/api/agent/config', { method: 'PUT', body: config, token });
  }, [request, token]);

  const getConversations = useCallback(() => {
    if (!token) return Promise.resolve(null);
    return request('/api/conversations', { token });
  }, [request, token]);

  const createConversation = useCallback(() => {
    if (!token) return Promise.resolve(null);
    return request('/api/conversations', { method: 'POST', token });
  }, [request, token]);

  const getMessages = useCallback((conversationId: string) => {
    if (!token) return Promise.resolve(null);
    return request(`/api/conversations/${conversationId}/messages`, { token });
  }, [request, token]);

  const sendMessage = useCallback((message: string, conversationId?: string) => {
    if (!token) return Promise.resolve(null);
    return request('/api/chat', { 
      method: 'POST', 
      body: { message, conversation_id: conversationId }, 
      token 
    });
  }, [request, token]);

  const getTokenStats = useCallback((days: number = 7) => {
    if (!token) return Promise.resolve(null);
    return request(`/api/stats/tokens?days=${days}`, { token });
  }, [request, token]);

  const getLogs = useCallback((params?: { category?: string; level?: string }) => {
    if (!token) return Promise.resolve(null);
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.level) queryParams.append('level', params.level);
    return request(`/api/logs?${queryParams}`, { token });
  }, [request, token]);

  return {
    getMe,
    getConfig,
    updateConfig,
    getConversations,
    createConversation,
    getMessages,
    sendMessage,
    getTokenStats,
    getLogs,
    isLoading,
    error,
  };
}
