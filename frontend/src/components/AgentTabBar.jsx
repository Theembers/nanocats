import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAgents } from '../api/agents';
import { Bot, Settings } from 'lucide-react';
import './AgentTabBar.css';

function AgentTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  });

  const currentAgentId = location.pathname.startsWith('/chat/') 
    ? location.pathname.split('/')[2]
    : null;

  const handleAgentClick = (agentId) => {
    navigate(`/chat/${agentId}`);
  };

  const handleConfigClick = () => {
    if (currentAgentId) {
      navigate(`/config/${currentAgentId}`);
    }
  };

  if (isLoading || !agents || agents.length === 0) {
    return null;
  }

  if (!location.pathname.startsWith('/chat')) {
    return null;
  }

  const typeOrder = { admin: 0, user: 1, specialized: 2, task: 3 };
  const sortedAgents = [...agents].sort((a, b) => {
    const orderA = typeOrder[a.type] ?? 99;
    const orderB = typeOrder[b.type] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || a.id).localeCompare(b.name || b.id);
  });

  return (
    <div className="agent-tab-bar">
      <div className="agent-tabs">
        {sortedAgents.map((agent) => (
          <button
            key={agent.id}
            className={`agent-tab ${currentAgentId === agent.id ? 'active' : ''}`}
            onClick={() => handleAgentClick(agent.id)}
          >
            <Bot size={16} />
            <span>{agent.name || agent.id}</span>
          </button>
        ))}
      </div>
      <div className="agent-tab-actions">
        {currentAgentId && (
          <button className="agent-tab-config" onClick={handleConfigClick}>
            <Settings size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default AgentTabBar;
