import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgent, getMessages, listAgents } from '../api/agents';
import { useChatStore } from '../stores/chatStore';
import LoadingSpinner from '../components/LoadingSpinner';
import SessionTree from '../components/SessionTree';
import Message from '../components/Message';
import DateSeparator from '../components/DateSeparator';
import PreviewModal from '../components/PreviewModal';
import { Send, Square, Plus, MessageSquare, Clock, Loader2 } from 'lucide-react';
import './Chat.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[Chat Error]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-page-container">
          <div className="error-message">
            <h3>Error in Chat</h3>
            <pre>{this.state.error?.message}</pre>
            <pre>{this.state.error?.stack}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  return (
    <ErrorBoundary>
      <ChatInner />
    </ErrorBoundary>
  );
}

function ChatInner() {
  const { agentId } = useParams();
  const navigate = useNavigate();

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedChatKey, setSelectedChatKey] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  const {
    messages: realtimeMessages,
    messageQueue,
    isConnected,
    isAgentResponding,
    connect,
    disconnect,
    sendMessage,
    sendStopCommand,
    sendNewSessionCommand,
    clearMessages,
  } = useChatStore();

  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  });

  const effectiveAgentId = useMemo(() => {
    if (agentId) return agentId;
    if (agentsQuery.data?.length > 0) return agentsQuery.data[0].id;
    return null;
  }, [agentId, agentsQuery.data]);

  const agentQuery = useQuery({
    queryKey: ['agent', effectiveAgentId],
    queryFn: () => getAgent(effectiveAgentId),
    enabled: effectiveAgentId != null,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', effectiveAgentId, selectedChannel, selectedSession, selectedChatKey],
    queryFn: () => getMessages(effectiveAgentId, {
      channel: selectedChannel,
      chat_key: selectedChatKey,
      session_key: selectedSession,
      limit: 100,
    }),
    enabled: effectiveAgentId != null,
  });

  useEffect(() => {
    if (!agentId && effectiveAgentId) {
      navigate(`/chat/${effectiveAgentId}`, { replace: true });
    }
  }, [agentId, effectiveAgentId, navigate]);

  useEffect(() => {
    if (effectiveAgentId) {
      connect(effectiveAgentId);
      return () => {
        disconnect();
        clearMessages();
      };
    }
  }, [effectiveAgentId, connect, disconnect, clearMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.messages, realtimeMessages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !effectiveAgentId) return;
    sendMessage(inputValue, effectiveAgentId);
    setInputValue('');
  };

  const handleStopClick = () => {
    if (effectiveAgentId) sendStopCommand(effectiveAgentId);
  };

  const handleNewSession = () => setShowNewConfirm(true);

  const confirmNewSession = () => {
    if (effectiveAgentId) {
      sendNewSessionCommand(effectiveAgentId);
      setShowNewConfirm(false);
    }
  };

  const handlePreview = (item) => setPreviewItem(item);

  if (agentsQuery.isLoading) {
    return (
      <div className="chat-page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (agentsQuery.isError) {
    return (
      <div className="chat-page-container">
        <div className="error-message">Failed to load agents: {agentsQuery.error.message}</div>
      </div>
    );
  }

  if (!effectiveAgentId) {
    return (
      <div className="chat-page-container">
        <div className="chat-empty">
          <MessageSquare size={48} className="chat-empty-icon" />
          <p>No agents available</p>
        </div>
      </div>
    );
  }

  const messages = useMemo(() => {
    const historical = messagesQuery.data?.messages || [];
    const combined = [...historical, ...realtimeMessages];
    return combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messagesQuery.data?.messages, realtimeMessages]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    const filteredMessages = messages.filter(msg => msg.role !== 'tool');
    filteredMessages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msg.timestamp });
      }
      groups.push({ type: 'message', message: msg });
    });
    return groups;
  }, [messages]);

  return (
    <div className="chat-page-container">
      <SessionTree
        agentId={effectiveAgentId}
        selectedSession={selectedSession}
        selectedChannel={selectedChannel}
        selectedChatKey={selectedChatKey}
        onSessionSelect={setSelectedSession}
        onChannelSelect={setSelectedChannel}
        onChatKeySelect={setSelectedChatKey}
      />

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-agent">
            <div className="chat-header-info">
              <h2>{agentQuery.data?.name || effectiveAgentId}</h2>
              <div className="chat-header-status">
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {isAgentResponding && (
                  <span className="agent-responding-status">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Agent is responding...</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {selectedSession && (
            <div className="chat-header-filter">
              <span className="filter-badge">
                Session: {formatSessionDisplay(selectedSession)}
                {selectedChannel && ` / ${selectedChannel}`}
              </span>
            </div>
          )}
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
              return (
                <Message
                  key={msg.id || index}
                  message={msg}
                  agentName={agentQuery.data?.name}
                  onPreview={handlePreview}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {messageQueue.length > 0 && (
            <div className="message-queue-indicator">
              <Clock size={14} />
              <span>{messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued</span>
            </div>
          )}

          {showNewConfirm && (
            <div className="new-session-confirm">
              <span>Start a new session?</span>
              <button className="btn-confirm" onClick={confirmNewSession}>Yes</button>
              <button className="btn-cancel" onClick={() => setShowNewConfirm(false)}>No</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="chat-input-form">
            <button
              type="button"
              className="chat-action-btn new-session-btn"
              onClick={handleNewSession}
              title="New Session"
            >
              <Plus size={18} />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isAgentResponding ? "Agent is responding..." : "Type a message..."}
              className="chat-input"
            />

            {isAgentResponding ? (
              <button
                type="button"
                className="btn-stop chat-send-btn"
                onClick={handleStopClick}
                title="Stop"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary chat-send-btn"
                disabled={!inputValue.trim()}
              >
                <Send size={18} />
              </button>
            )}
          </form>
        </div>
      </div>

      <PreviewModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
      />
    </div>
  );
}

function formatSessionDisplay(key) {
  if (!key) return '';
  const parts = key.split('-');
  if (parts.length > 2) {
    return parts.slice(2).join('-');
  }
  return key;
}

export default Chat;
