import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Search, ChevronDown, ChevronRight } from 'lucide-react';
import apiClient from '../api/client';
import './ChannelsSidebar.css';

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

function ChannelsSidebar({ agentId, selectedChannel, onChannelSelect }) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: channelsData } = useQuery({
    queryKey: ['channels', agentId],
    queryFn: async () => {
      if (!agentId) return { channels: [] };
      const response = await apiClient.get(`/agents/${agentId}/channels`);
      return response.data;
    },
    enabled: !!agentId,
  });

  const channels = channelsData?.channels || [];
  const enabledChannels = channels.filter(ch => ch.enabled);

  const filteredChannels = searchQuery
    ? enabledChannels.filter(ch => 
        (ch.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ch.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : enabledChannels;

  const totalCount = channels.reduce((sum, ch) => sum + (ch.message_count || 0), 0);

  return (
    <div className="channels-sidebar">
      <div className="channels-search">
        {searchExpanded ? (
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
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

      <div className="channels-list">
        <button
          className={`channel-item ${selectedChannel === null ? 'active' : ''}`}
          onClick={() => onChannelSelect(null)}
        >
          <span className="channel-icon">🌐</span>
          <span className="channel-name">All Channels</span>
          <span className="channel-count">-</span>
        </button>

        {filteredChannels.map((channel) => (
          <button
            key={channel.name}
            className={`channel-item ${selectedChannel === channel.name ? 'active' : ''}`}
            onClick={() => onChannelSelect(channel.name)}
          >
            <span className="channel-icon">
              {CHANNEL_ICONS[channel.name] || CHANNEL_ICONS.default}
            </span>
            <span className="channel-name">{channel.display_name || channel.name}</span>
            <span className="channel-count">-</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChannelsSidebar;
