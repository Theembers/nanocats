import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAgents } from '../api/agents';
import LoadingSpinner from '../components/LoadingSpinner';

function AgentSelectionPage() {
  const navigate = useNavigate();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  });

  useEffect(() => {
    if (agents && agents.length > 0) {
      navigate(`/config/${agents[0].id}`, { replace: true });
    }
  }, [agents, navigate]);

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-container">
      <LoadingSpinner />
    </div>
  );
}

export default AgentSelectionPage;
