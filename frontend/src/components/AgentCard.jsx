import React from 'react';
import './AgentCard.css';

function AgentCard({ agent, onClick }) {
  return (
    <div className="agent-card" onClick={onClick}>
      <div className="agent-card-header">
        <div className="agent-card-icon">
          {agent.name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="agent-card-info">
          <h3>{agent.name}</h3>
          <p>{agent.model}</p>
        </div>
      </div>
      <div className="agent-card-meta">
        <span className="agent-card-type">{agent.type}</span>
        {agent.accessible_channels?.slice(0, 3).map((ch) => (
          <span key={ch} className="channel-tag">{ch}</span>
        ))}
      </div>
    </div>
  );
}

export default AgentCard;
