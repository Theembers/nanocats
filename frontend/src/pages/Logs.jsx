import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLogs } from '../api/logs';
import LogTable from '../components/LogTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { RefreshCw, Cpu, Wrench, BookOpen, Terminal } from 'lucide-react';
import './Logs.css';

const getDefaultFilters = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 3);
  return {
    category: '',
    level: '',
    start_time: start.toISOString().split('T')[0],
    end_time: end.toISOString().split('T')[0],
    keyword: '',
    limit: 50,
  };
};

function Logs() {
  const [filters, setFilters] = useState(getDefaultFilters);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['logs', filters, page],
    queryFn: () => {
      const { category, ...rest } = filters;
      return getLogs({ ...rest, type: category, limit: filters.limit, offset: (page - 1) * filters.limit });
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(getDefaultFilters());
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 0;

  const stats = {
    provider: data?.logs?.filter(l => l.type === 'provider').length || 0,
    tool: data?.logs?.filter(l => l.type === 'tool').length || 0,
    agent: data?.logs?.filter(l => l.type === 'agent').length || 0,
    system: data?.logs?.filter(l => l.type === 'system').length || 0,
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
        <p>View provider, tool, agent, and system logs</p>
      </div>

      <div className="logs-filters">
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
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="provider">Provider</option>
          <option value="tool">Tool</option>
          <option value="agent">Agent</option>
          <option value="system">System</option>
        </select>
        <input
          type="date"
          value={filters.start_time}
          onChange={(e) => handleFilterChange('start_time', e.target.value)}
          className="logs-date-input"
          placeholder="Start date"
        />
        <input
          type="date"
          value={filters.end_time}
          onChange={(e) => handleFilterChange('end_time', e.target.value)}
          className="logs-date-input"
          placeholder="End date"
        />
        <button className="logs-refresh-btn" onClick={handleReset}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="logs-stats">
        <div className="logs-stat-card">
          <div className="logs-stat-icon">
            <Cpu size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.provider}</span>
            <span className="logs-stat-label">Provider</span>
          </div>
        </div>
        <div className="logs-stat-card">
          <div className="logs-stat-icon success">
            <Wrench size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.tool}</span>
            <span className="logs-stat-label">Tool</span>
          </div>
        </div>
        <div className="logs-stat-card">
          <div className="logs-stat-icon primary">
            <BookOpen size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.agent}</span>
            <span className="logs-stat-label">Agent</span>
          </div>
        </div>
        <div className="logs-stat-card">
          <div className="logs-stat-icon dark">
            <Terminal size={18} />
          </div>
          <div className="logs-stat-content">
            <span className="logs-stat-value">{stats.system}</span>
            <span className="logs-stat-label">System</span>
          </div>
        </div>
      </div>

      <LogTable logs={data?.logs || []} />

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
