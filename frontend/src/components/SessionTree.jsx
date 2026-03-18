import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search, Users } from 'lucide-react';
import { getSessionTree } from '../api/agents';
import './SessionTree.css';

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

function SessionTree({ 
  agentId, 
  selectedSession, 
  selectedChannel, 
  onSessionSelect, 
  onChannelSelect,
  onChatIdSelect 
}) {
  const [expandedSessions, setExpandedSessions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['sessionTree', agentId],
    queryFn: () => getSessionTree(agentId),
    enabled: !!agentId,
  });

  const sessions = treeData?.sessions || [];

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(session => {
      const displayKey = formatSessionKey(session.key);
      if (displayKey.toLowerCase().includes(query)) return true;
      if (session.channels?.some(ch => ch.name.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [sessions, searchQuery]);

  const toggleSession = (sessionKey) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionKey]: !prev[sessionKey],
    }));
  };

  const handleSessionClick = (sessionKey) => {
    onSessionSelect(sessionKey);
    onChannelSelect(null);
    onChatIdSelect?.(null);
  };

  const handleChannelClick = (sessionKey, channel, e) => {
    e.stopPropagation();
    onSessionSelect(sessionKey);
    onChannelSelect(channel.name);
    onChatIdSelect?.(channel.chat_ids?.[0] || null);
  };

  const isSessionSelected = (sessionKey) => {
    return selectedSession === sessionKey && selectedChannel === null;
  };

  const isChannelSelected = (sessionKey, channelName) => {
    return selectedSession === sessionKey && selectedChannel === channelName;
  };

  if (isLoading) {
    return (
      <div className="session-tree">
        <div className="session-tree-header">
          <h3>Sessions</h3>
        </div>
        <div className="session-tree-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="session-tree">
      <div className="session-tree-header">
        <h3>Sessions</h3>
        <span className="session-tree-count">{sessions.length}</span>
      </div>

      <div className="session-tree-search">
        {searchExpanded ? (
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
              onBlur={() => !searchQuery && setSearchExpanded(false)}
            />
          </div>
        ) : (
          <button 
            className="search-toggle"
            onClick={() => setSearchExpanded(true)}
          >
            <Search size={16} />
          </button>
        )}
      </div>

      <div className="session-tree-list">
        {/* All Sessions Option */}
        <button
          className={`session-tree-item session-all ${!selectedSession ? 'active' : ''}`}
          onClick={() => { onSessionSelect(null); onChannelSelect(null); onChatIdSelect?.(null); }}
        >
          <span className="session-tree-icon">💬</span>
          <span className="session-tree-name">All Sessions</span>
        </button>

        {filteredSessions.length === 0 && searchQuery ? (
          <div className="session-tree-empty">No sessions found</div>
        ) : (
          filteredSessions.map((session) => {
            const isExpanded = expandedSessions[session.key];
            const displayKey = formatSessionKey(session.key);
            const hasChannels = session.channels && session.channels.length > 0;

            return (
              <div key={session.key} className="session-tree-node">
                <button
                  className={`session-tree-item ${isSessionSelected(session.key) ? 'active' : ''}`}
                  onClick={() => handleSessionClick(session.key)}
                >
                  {hasChannels ? (
                    <span 
                      className="session-tree-toggle"
                      onClick={(e) => { e.stopPropagation(); toggleSession(session.key); }}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  ) : (
                    <span className="session-tree-toggle-placeholder" />
                  )}
                  <span className="session-tree-icon">
                    <Users size={16} />
                  </span>
                  <span className="session-tree-name" title={session.key}>
                    {displayKey}
                  </span>
                  {hasChannels && (
                    <span className="session-tree-badge">{session.channels.length}</span>
                  )}
                </button>

                {isExpanded && hasChannels && (
                  <div className="session-tree-children">
                    {session.channels.map((channel) => (
                      <button
                        key={`${session.key}-${channel.name}`}
                        className={`session-tree-item session-tree-channel ${isChannelSelected(session.key, channel.name) ? 'active' : ''}`}
                        onClick={(e) => handleChannelClick(session.key, channel, e)}
                      >
                        <span className="session-tree-icon">
                          {CHANNEL_ICONS[channel.name] || CHANNEL_ICONS.default}
                        </span>
                        <span className="session-tree-name">{channel.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatSessionKey(key) {
  // Remove prefixes like "user:", "group:" etc.
  if (!key) return 'Unknown';
  const parts = key.split(':');
  if (parts.length > 1) {
    return parts.slice(1).join(':');
  }
  return key;
}

export default SessionTree;
