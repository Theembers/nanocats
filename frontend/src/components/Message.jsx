import React, { useState, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ChevronDown, ChevronRight, Paperclip, Image as ImageIcon } from 'lucide-react';
import ToolCallContent from './ToolCallContent';
import './Message.css';

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

// Avatar component
function Avatar({ name, isUser, size = 36 }) {
  const initial = (name || (isUser ? 'U' : 'A')).charAt(0).toUpperCase();
  
  const bgColor = isUser 
    ? 'var(--color-accent)' 
    : 'var(--color-secondary, #6366f1)';
  
  return (
    <div 
      className="message-avatar"
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: bgColor,
        color: '#fff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

// Thinking content collapsible
function ThinkingContent({ content }) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <div className="thinking-container">
      <button 
        className="thinking-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="thinking-emoji">💭</span>
        <span>Thinking Process</span>
        <span className="thinking-toggle">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>
      <div className={`thinking-content ${expanded ? 'expanded' : ''}`}>
        {expanded && <pre>{content}</pre>}
      </div>
    </div>
  );
}

// Attachments component
function Attachments({ attachments, onPreview }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="message-attachments">
      {attachments.map((attachment, index) => {
        const isImage = attachment.type === 'image' || 
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name || attachment.url || '');

        return (
          <div 
            key={index} 
            className={`attachment-item ${isImage ? 'attachment-image' : 'attachment-file'}`}
            onClick={() => onPreview && onPreview(attachment)}
          >
            {isImage ? (
              <>
                <img 
                  src={attachment.url || attachment.thumbnail} 
                  alt={attachment.name || 'attachment'} 
                  className="attachment-thumbnail"
                />
                <div className="attachment-overlay">
                  <ImageIcon size={16} />
                </div>
              </>
            ) : (
              <div className="attachment-file-info">
                <Paperclip size={16} />
                <span className="attachment-filename">
                  {attachment.name || 'File'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Parse thinking content from message
function parseThinkingContent(content) {
  if (!content || typeof content !== 'string') {
    return { mainContent: content || '', thinkingContent: null };
  }

  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let thinkingContent = '';
  let mainContent = content;

  const matches = content.match(thinkRegex);
  if (matches) {
    matches.forEach(match => {
      const inner = match.replace(/<\/?think>/g, '').trim();
      if (inner) {
        thinkingContent += (thinkingContent ? '\n\n' : '') + inner;
      }
    });
    mainContent = content.replace(thinkRegex, '').trim();
  }

  return { 
    mainContent, 
    thinkingContent: thinkingContent || null 
  };
}

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  return format(date, 'yyyy-MM-dd HH:mm');
}

function Message({ message, agentName, onPreview }) {
  const isUser = message.role === 'user';
  
  const displayName = useMemo(() => {
    if (isUser) {
      return message.chat_id || message.user_id || 'User';
    }
    return agentName || 'Assistant';
  }, [isUser, message.chat_id, message.user_id, agentName]);

  const { mainContent, thinkingContent } = useMemo(() => 
    parseThinkingContent(message.content),
    [message.content]
  );

  // Get attachments from message
  const attachments = message.media || message.attachments || [];

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <Avatar name={displayName} isUser={isUser} />
      
      <div className="message-body">
        <div className="message-header">
          <span className="message-name">{displayName}</span>
          {message.channel && (
            <span className="message-channel-badge">
              <span>{CHANNEL_ICONS[message.channel] || CHANNEL_ICONS.default}</span>
              <span>{message.channel}</span>
            </span>
          )}
        </div>

        <div className="message-bubble">
          {mainContent && (
            <div className="message-text">{mainContent}</div>
          )}

          {/* Thinking process for assistant */}
          {!isUser && thinkingContent && (
            <ThinkingContent content={thinkingContent} />
          )}

          {/* Tool calls for assistant */}
          {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
            <ToolCallContent toolCalls={message.tool_calls} />
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <Attachments attachments={attachments} onPreview={onPreview} />
          )}
        </div>

        <div className="message-footer">
          <span className="message-time">{formatTimestamp(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

export default Message;
