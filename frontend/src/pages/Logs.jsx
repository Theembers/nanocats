import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLogs } from '../api/logs';
import LogTable from '../components/LogTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { RefreshCw, Cpu, Wrench, BookOpen, Terminal } from 'lucide-react';

function Logs() {
  const [filters, setFilters] = useState({
    type: '',
    agent_id: '',
    channel: '',
    level: '',
    keyword: '',
    limit: 50,
  });
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['logs', filters, page],
    queryFn: () => getLogs({ ...filters, limit: filters.limit, offset: (page - 1) * filters.limit }),
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 0;

  const stats = {
    model: data?.logs?.filter(l => l.category === 'model').length || 0,
    tool: data?.logs?.filter(l => l.category === 'tool').length || 0,
    mcp: data?.logs?.filter(l => l.category === 'mcp').length || 0,
    skill: data?.logs?.filter(l => l.category === 'skill').length || 0,
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">Failed to load logs</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="logs-header">
        <h1>System Logs</h1>
        <p>View model calls, MCP, skill, and tool usage logs</p>
      </div>

      <div className="logs-filters">
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="chat">Chat</option>
          <option value="model">Model</option>
          <option value="tool">Tool</option>
          <option value="mcp">MCP</option>
          <option value="skill">Skill</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => handleFilterChange('level', e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="DEBUG">Debug</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
        </select>
        <button className="logs-refresh-btn" onClick={() => refetch()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <LogTable logs={data?.logs || []} />

      <div className="logs-stats">
        <div className="logs-stat-card">
          <div className="logs-stat-icon">
            <Cpu size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.model}</span>
            <span className="logs-stat-label">Model Calls</span>
          </div>
        </div>
        <div className="logs-stat-card">
          <div className="logs-stat-icon success">
            <Wrench size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.mcp}</span>
            <span className="logs-stat-label">MCP Tools</span>
          </div>
        </div>
        <div className="logs-stat-card">
          <div className="logs-stat-icon primary">
            <BookOpen size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.skill}</span>
            <span className="logs-stat-label">Skills</span>
          </div>
        </div>
        <div className="logs-stat-card">
          <div className="logs-stat-icon dark">
            <Terminal size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.tool}</span>
            <span className="logs-stat-label">Tools</span>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Logs;
