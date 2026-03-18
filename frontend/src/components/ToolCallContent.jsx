import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import './ToolCallContent.css';

function ToolCallContent({ toolCalls }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = () => {
    setExpanded(prev => !prev);
  };

  const toggleItemExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const toolCount = toolCalls.length;

  return (
    <div className="tool-calls-container">
      {/* Collapsed summary header */}
      <button
        className="tool-calls-header"
        onClick={toggleExpand}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="tool-calls-emoji">🔧</span>
        <span className="tool-calls-label">Tool Calls ({toolCount})</span>
        <span className="tool-calls-toggle">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {/* Expanded tool details */}
      <div className={`tool-calls-content ${expanded ? 'expanded' : ''}`}>
        {expanded && toolCalls.map((toolCall, index) => {
          const isItemExpanded = expandedItems[index];
          const toolName = toolCall.name || toolCall.function?.name || 'Unknown Tool';
          const toolArgs = toolCall.arguments || toolCall.function?.arguments || null;

          return (
            <div key={index} className="tool-call-item">
              <button
                className="tool-call-header"
                onClick={() => toggleItemExpand(index)}
              >
                {isItemExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Wrench size={12} className="tool-call-icon" />
                <span className="tool-call-name">{toolName}</span>
              </button>
              <div className={`tool-call-content ${isItemExpanded ? 'expanded' : ''}`}>
                {isItemExpanded && (
                  <pre>{typeof toolArgs === 'string' ? toolArgs : JSON.stringify(toolArgs || toolCall, null, 2)}</pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ToolCallContent;
