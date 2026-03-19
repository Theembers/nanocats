import React, { useState, useMemo, useEffect } from 'react';
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

function getChannelFromChatKey(chatKey) {
  if (!chatKey) return 'default';
  const parts = chatKey.split(':');
  return parts[0] || 'default';
}

function getChatKeyDisplayName(chatKey) {
  if (!chatKey) return '';
  const parts = chatKey.split(':');
  if (parts.length > 1) {
    return parts.slice(1).join(':');
  }
  return chatKey;
}

function SessionTree({
  agentId,
  selectedSession,
  selectedChannel,
  selectedChatKey,
  onSessionSelect,
  onChannelSelect,
  onChatKeySelect
}) {
  const [expandedSessions, setExpandedSessions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['sessionTree', agentId],
    queryFn: () => getSessionTree(agentId),
    enabled: !!agentId,
  });

  const sessions = treeData?.sessions || [];

  // Default: expand all sessions that have chat_keys
  useEffect(() => {
    if (!initialized && sessions.length > 0) {
      const initialExpanded = {};
      for (const session of sessions) {
        if (session.chat_keys?.length > 0) {
          initialExpanded[session.key] = true;
        }
      }
      setExpandedSessions(initialExpanded);
      setInitialized(true);
    }
  }, [sessions, initialized]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(session => {
      const displayKey = formatSessionKey(session.key);
      if (displayKey.toLowerCase().includes(query)) return true;
      if (session.chat_keys?.some(ck => ck.toLowerCase().includes(query))) return true;
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
    onChatKeySelect?.(null);
  };

  const handleChatKeyClick = (sessionKey, chatKey, e) => {
    e.stopPropagation();
    onSessionSelect(sessionKey);
    const channel = getChannelFromChatKey(chatKey);
    onChannelSelect(channel);
    onChatKeySelect?.(chatKey);
  };

  const isSessionSelected = (sessionKey) => {
    return selectedSession === sessionKey && selectedChannel === null;
  };

  const isChatKeySelected = (sessionKey, chatKey) => {
    return selectedSession === sessionKey && selectedChatKey === chatKey;
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
        <button
          className={`session-tree-item session-all ${!selectedSession ? 'active' : ''}`}
          onClick={() => { onSessionSelect(null); onChannelSelect(null); onChatKeySelect?.(null); }}
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
            const chatKeys = session.chat_keys || [];
            const hasChatKeys = chatKeys.length > 0;

            return (
              <div key={session.key} className="session-tree-node">
                <button
                  className={`session-tree-item ${isSessionSelected(session.key) ? 'active' : ''}`}
                  onClick={() => handleSessionClick(session.key)}
                >
                  {hasChatKeys ? (
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
                  {hasChatKeys && (
                    <span className="session-tree-badge">{chatKeys.length}</span>
                  )}
                </button>

                {isExpanded && hasChatKeys && (
                  <div className="session-tree-children">
                    {chatKeys.map((chatKey) => {
                      const channel = getChannelFromChatKey(chatKey);
                      const displayName = getChatKeyDisplayName(chatKey);
                      return (
                        <button
                          key={`${session.key}-${chatKey}`}
                          className={`session-tree-item session-tree-channel ${isChatKeySelected(session.key, chatKey) ? 'active' : ''}`}
                          onClick={(e) => handleChatKeyClick(session.key, chatKey, e)}
                        >
                          <span className="session-tree-icon">
                            {CHANNEL_ICONS[channel] || CHANNEL_ICONS.default}
                          </span>
                          <span className="session-tree-name">{chatKey}</span>
                        </button>
                      );
                    })}
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
  if (!key) return 'Unknown';
  const parts = key.split('-');
  if (parts.length > 2) {
    return parts.slice(2).join('-');
  }
  return key;
}

export default SessionTree;
