import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getLogs } from '../api/logs';
import LogTable from '../components/LogTable';
import LoadingSpinner from '../components/LoadingSpinner';

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', filters, page],
    queryFn: () => getLogs({ ...filters, limit: filters.limit, offset: (page - 1) * filters.limit }),
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 0;

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
      <div className="page-header">
        <h1>Logs</h1>
        <p>System and agent logs</p>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">All</option>
            <option value="chat">Chat</option>
            <option value="agent">Agent</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Level</label>
          <select
            value={filters.level}
            onChange={(e) => handleFilterChange('level', e.target.value)}
          >
            <option value="">All</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Agent ID</label>
          <input
            type="text"
            value={filters.agent_id}
            onChange={(e) => handleFilterChange('agent_id', e.target.value)}
            placeholder="Filter by agent"
          />
        </div>
        <div className="filter-group">
          <label>Keyword</label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            placeholder="Search..."
          />
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
