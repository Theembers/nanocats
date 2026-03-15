import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import './ToolCallContent.css';

function ToolCallContent({ toolCalls }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (index) => {
    setExpanded(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="tool-calls-container">
      {toolCalls.map((toolCall, index) => {
        const isExpanded = expanded[index];
        const toolName = toolCall.name || 'Unknown Tool';

        return (
          <div key={index} className="tool-call-item">
            <button
              className="tool-call-header"
              onClick={() => toggleExpand(index)}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Wrench size={14} className="tool-call-icon" />
              <span className="tool-call-name">{toolName}</span>
              <span className="tool-call-toggle">
                {isExpanded ? 'Hide' : 'Show'}
              </span>
            </button>
            {isExpanded && (
              <div className="tool-call-content">
                <pre>{JSON.stringify(toolCall, null, 2)}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ToolCallContent;
