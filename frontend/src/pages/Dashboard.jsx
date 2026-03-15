import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAgents } from '../api/agents';
import AgentCard from '../components/AgentCard';
import LoadingSpinner from '../components/LoadingSpinner';

function Dashboard() {
  const navigate = useNavigate();
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">Failed to load agents</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Manage your AI agents</p>
      </div>
      <div className="agent-grid">
        {agents?.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => navigate(`/chat/${agent.id}`)}
          />
        ))}
      </div>
      {agents?.length === 0 && (
        <div className="empty-state">
          <p>No agents available</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
