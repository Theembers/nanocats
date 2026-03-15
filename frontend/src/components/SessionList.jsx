import React from 'react';
import { ChevronRight } from 'lucide-react';
import './SessionList.css';

const CHANNEL_ICONS = {
  web: '🌐',
  telegram: '✈️',
  discord: '🎮',
  slack: '💬',
  feishu: '📱',
  dingtalk: '💼',
  whatsapp: '📱',
  qq: '🐧',
  email: '📧',
  default: '📨',
};

function SessionList({ sessions, selectedSession, onSessionSelect, loading }) {
  if (loading) {
    return (
      <div className="session-list">
        <div className="session-list-header">
          <h3>Sessions</h3>
        </div>
        <div className="session-list-loading">
          Loading...
        </div>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="session-list">
        <div className="session-list-header">
          <h3>Sessions</h3>
        </div>
        <div className="session-list-empty">
          No sessions yet
        </div>
      </div>
    );
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h3>Sessions</h3>
        <span className="session-count">{sessions.length}</span>
      </div>
      <div className="session-items">
        <button
          className={`session-item ${selectedSession === null ? 'active' : ''}`}
          onClick={() => onSessionSelect(null)}
        >
          <span className="session-icon">💬</span>
          <div className="session-info">
            <span className="session-name">All Sessions</span>
            <span className="session-preview">View all messages</span>
          </div>
          <ChevronRight size={16} className="session-arrow" />
        </button>

        {sessions.map((session) => {
          const sessionName = session.key.split(':')[1] || session.key;
          const isDynamic = session.type === 'dynamic';
          const timeStr = isDynamic && session.updated_at 
            ? new Date(session.updated_at).toLocaleDateString() 
            : '';
          return (
            <button
              key={session.key}
              className={`session-item ${selectedSession === session.key ? 'active' : ''}`}
              onClick={() => onSessionSelect(session.key)}
            >
              <span className="session-icon">
                {isDynamic ? '💬' : '📋'}
              </span>
              <div className="session-info">
                <span className="session-name">
                  {sessionName}
                </span>
                <span className="session-preview">
                  {isDynamic ? (timeStr || 'Has messages') : 'No messages yet'}
                </span>
              </div>
              <ChevronRight size={16} className="session-arrow" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SessionList;
