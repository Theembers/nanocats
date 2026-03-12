import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, FileText, AlertCircle, Info, AlertTriangle, Terminal } from 'lucide-react';
import type { LogEntry } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:15751';

const categoryIcons: Record<string, React.ReactNode> = {
  chat: <Terminal className="w-4 h-4" />,
  auth: <Info className="w-4 h-4" />,
  config: <FileText className="w-4 h-4" />,
  mcp: <Terminal className="w-4 h-4" />,
  skill: <FileText className="w-4 h-4" />,
  tool: <Terminal className="w-4 h-4" />,
  model: <Terminal className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
};

const levelColors: Record<string, { bg: string; color: string }> = {
  INFO:  { bg: 'rgba(123,143,161,0.12)', color: 'var(--color-primary-dark)' },
  WARN:  { bg: 'rgba(196,149,106,0.15)', color: 'var(--color-accent-dark)' },
  ERROR: { bg: 'rgba(192,97,74,0.12)',   color: 'var(--color-error)' },
  DEBUG: { bg: 'rgba(176,164,156,0.15)', color: 'var(--text-secondary)' },
};

export default function LogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');

  useEffect(() => {
    loadLogs();
  }, [category, level]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (level) params.append('level', level);
      params.append('limit', '100');
      
      const response = await fetch(`${API_URL}/api/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>System Logs</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>View model calls, MCP, skill, and tool usage logs</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 rounded-xl outline-none text-sm"
          style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-main)', color: 'var(--text-primary)' }}
        >
          <option value="">All Categories</option>
          <option value="chat">Chat</option>
          <option value="auth">Auth</option>
          <option value="config">Config</option>
          <option value="mcp">MCP</option>
          <option value="skill">Skill</option>
          <option value="tool">Tool</option>
          <option value="model">Model</option>
        </select>

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="px-4 py-2 rounded-xl outline-none text-sm"
          style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-main)', color: 'var(--text-primary)' }}
        >
          <option value="">All Levels</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
          <option value="DEBUG">Debug</option>
        </select>

        <button
          onClick={loadLogs}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--text-inverse)' }}
        >
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
            <FileText className="w-12 h-12 mb-4 opacity-25" />
            <p>No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-base)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: (levelColors[log.level] || levelColors.DEBUG).bg,
                          color: (levelColors[log.level] || levelColors.DEBUG).color,
                        }}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--text-muted)' }}>
                          {categoryIcons[log.category] || <Info className="w-4 h-4" />}
                        </span>
                        <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{log.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {log.agent_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="max-w-xl">
                        <p className="truncate">{log.message}</p>
                        {log.details && (
                          <details className="mt-1">
                            <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>Details</summary>
                            <pre
                              className="mt-2 p-2 rounded text-xs overflow-x-auto"
                              style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)' }}
                            >
                              {log.details}
                            </pre>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Categories Legend */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Model Calls</h4>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>LLM API calls and responses</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>MCP Tools</h4>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>MCP server tool executions</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Skills</h4>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Skill executions and results</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tools</h4>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Built-in tool executions</p>
        </div>
      </div>
    </div>
  );
}
