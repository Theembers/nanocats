import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgent, getMessages, listAgents } from '../api/agents';
import { useChatStore } from '../stores/chatStore';
import LoadingSpinner from '../components/LoadingSpinner';
import ChannelsSidebar from '../components/ChannelsSidebar';
import SessionList from '../components/SessionList';
import DateSeparator from '../components/DateSeparator';
import ToolCallContent from '../components/ToolCallContent';
import { Send, MessageSquare } from 'lucide-react';
import './Chat.css';

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

function Chat() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const { data: agents, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  });

  const currentAgentId = agentId || (agents && agents.length > 0 ? agents[0].id : null);

  const { data: agent, isLoading: agentLoading, error: agentError } = useQuery({
    queryKey: ['agent', currentAgentId],
    queryFn: () => getAgent(currentAgentId),
    enabled: !!currentAgentId,
  });

  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = useQuery({
    queryKey: ['messages', currentAgentId, selectedChannel, selectedSession],
    queryFn: () => getMessages(currentAgentId, {
      channel: selectedChannel,
      session_key: selectedSession,
      limit: 100,
    }),
    enabled: !!currentAgentId,
  });

  useEffect(() => {
    if (!agentId && currentAgentId) {
      navigate(`/chat/${currentAgentId}`, { replace: true });
    }
  }, [agentId, currentAgentId, navigate]);

  if (agentsLoading) {
    return (
      <div className="chat-page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (agentsError) {
    return (
      <div className="chat-page-container">
        <div className="error-message">Failed to load agents: {agentsError.message}</div>
      </div>
    );
  }

  if (!currentAgentId) {
    return (
      <div className="chat-page-container">
        <div className="chat-empty">
          <MessageSquare size={48} className="chat-empty-icon" />
          <p>No agents available</p>
        </div>
      </div>
    );
  }

  const {
    messages: realtimeMessages,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    addMessage,
    clearMessages,
  } = useChatStore();

  useEffect(() => {
    if (currentAgentId) {
      connect(currentAgentId);
      return () => {
        disconnect();
        clearMessages();
      };
    }
  }, [currentAgentId, connect, disconnect, clearMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages, realtimeMessages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentAgentId) {
      return;
    }
    sendMessage(inputValue, currentAgentId);
    setInputValue('');
  };

  const messages = useMemo(() => {
    const historical = messagesData?.messages || [];
    const combined = [...historical, ...realtimeMessages];
    return combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messagesData?.messages, realtimeMessages]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msg.timestamp });
      }
      groups.push({ type: 'message', message: msg });
    });

    return groups;
  }, [messages]);

  const sessions = useMemo(() => {
    if (agent?.sessions && agent.sessions.length > 0) {
      return agent.sessions.map(s => ({
        key: s.key,
        type: s.type,
        created_at: s.created_at,
        updated_at: s.updated_at,
        group_id: s.group_id,
      }));
    }
    return [];
  }, [agent?.sessions]);

  if (agentLoading) {
    return (
      <div className="chat-page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (agentError) {
    return (
      <div className="chat-page-container">
        <div className="error-message">Failed to load agent: {agentError.message}</div>
      </div>
    );
  }

  return (
    <div className="chat-page-container">
      <ChannelsSidebar
        agentId={currentAgentId}
        selectedChannel={selectedChannel}
        onChannelSelect={setSelectedChannel}
      />

      <SessionList
        sessions={sessions}
        selectedSession={selectedSession}
        onSessionSelect={setSelectedSession}
        loading={messagesLoading}
      />

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-agent">
            <span className="chat-header-icon">
              {CHANNEL_ICONS[selectedChannel] || '💬'}
            </span>
            <div className="chat-header-info">
              <h2>{agent?.name || currentAgentId}</h2>
              <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {groupedMessages.length === 0 ? (
            <div className="chat-empty-messages">
              <MessageSquare size={32} className="chat-empty-icon" />
              <p>Start a conversation</p>
              <p className="chat-empty-hint">Messages from all channels appear here</p>
            </div>
          ) : (
            groupedMessages.map((item, index) => {
              if (item.type === 'date') {
                return <DateSeparator key={`date-${item.date}`} date={item.date} />;
              }
              const msg = item.message;
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`message ${isUser ? 'message-user' : 'message-assistant'}`}
                >
                  <div className="message-bubble">
                    {msg.channel && (
                      <div className="message-channel">
                        <span>{CHANNEL_ICONS[msg.channel] || '📨'}</span>
                        <span>{msg.channel}</span>
                      </div>
                    )}
                    <div className="message-content">{msg.content}</div>
                    {msg.tool_calls && (
                      <ToolCallContent toolCalls={msg.tool_calls} />
                    )}
                    <div className="message-timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button type="submit" className="btn-primary chat-send-btn">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
