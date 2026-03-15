import React from 'react';
import './AgentCard.css';

function AgentCard({ agent, onClick }) {
  return (
    <div className="agent-card" onClick={onClick}>
      <div className="agent-card-icon">
        {agent.name?.charAt(0).toUpperCase() || 'A'}
      </div>
      <div className="agent-card-content">
        <h3>{agent.name}</h3>
        <p className="agent-card-model">{agent.model}</p>
        <span className="agent-card-type">{agent.type}</span>
      </div>
      <div className="agent-card-channels">
        {agent.accessible_channels?.map((ch) => (
          <span key={ch} className="channel-tag">{ch}</span>
        ))}
      </div>
    </div>
  );
}

export default AgentCard;
