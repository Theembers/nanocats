import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Agent } from '../types';

interface AuthContextType {
  agent: Agent | null;
  token: string | null;
  login: (agentId: string, token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchAgentInfo();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchAgentInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/agent/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgent(data);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch agent info:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (agentId: string, agentToken: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ agent_id: agentId, token: agentToken })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setAgent({
      id: data.agent_id,
      name: data.agent_id,
      type: data.agent_type
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAgent(null);
  };

  return (
    <AuthContext.Provider value={{ agent, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
