import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAgent, getMessages } from '../api/agents';
import { useChatStore } from '../stores/chatStore';
import Message from '../components/Message';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';

function Chat() {
  const { agentId } = useParams();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['messages', agentId],
    queryFn: () => getMessages(agentId, { limit: 50 }),
  });

  const {
    messages,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    setMessages,
    clearMessages,
  } = useChatStore();

  useEffect(() => {
    if (history && history.length > 0) {
      setMessages(history.reverse());
    }
  }, [history, setMessages]);

  useEffect(() => {
    connect(agentId);
    return () => {
      disconnect();
      clearMessages();
    };
  }, [agentId, connect, disconnect, clearMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      return;
    }
    sendMessage(inputValue, agentId);
    setInputValue('');
  };

  if (agentLoading || historyLoading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <Avatar name={agent?.name || agent?.id} size="medium" />
        <div className="chat-header-info">
          <h2>{agent?.name || agent?.id}</h2>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
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
        <button type="submit" className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;
