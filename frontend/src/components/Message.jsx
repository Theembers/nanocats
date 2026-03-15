import React from 'react';
import { format } from 'date-fns';
import Avatar from './Avatar';

function Message({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      {!isUser && <Avatar name="Assistant" size="small" />}
      <div className="message-content">
        <div className="message-bubble">
          {message.content}
        </div>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="tool-calls">
            {message.tool_calls.map((toolCall, index) => (
              <div key={index} className="tool-call">
                <span className="tool-name">{toolCall.name}</span>
                <pre className="tool-args">{JSON.stringify(toolCall.arguments, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
        <div className="message-timestamp">
          {message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : ''}
        </div>
      </div>
      {isUser && <Avatar name="User" size="small" />}
    </div>
  );
}

export default Message;
