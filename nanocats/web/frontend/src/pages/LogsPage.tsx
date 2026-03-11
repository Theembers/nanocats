import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, FileText, AlertCircle, Info, AlertTriangle, Terminal } from 'lucide-react';
import type { LogEntry } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

const levelColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  WARN: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-red-100 text-red-700',
  DEBUG: 'bg-gray-100 text-gray-700',
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
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
        <p className="text-gray-600 mt-1">View model calls, MCP, skill, and tool usage logs</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Levels</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
          <option value="DEBUG">Debug</option>
        </select>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p>No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${levelColors[log.level] || 'bg-gray-100 text-gray-700'}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {categoryIcons[log.category] || <Info className="w-4 h-4" />}
                        </span>
                        <span className="text-sm text-gray-700 capitalize">{log.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.agent_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="max-w-xl">
                        <p className="truncate">{log.message}</p>
                        {log.details && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-500 cursor-pointer">Details</summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 overflow-x-auto">
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
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Model Calls</h4>
          </div>
          <p className="text-sm text-gray-500">LLM API calls and responses</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-gray-900">MCP Tools</h4>
          </div>
          <p className="text-sm text-gray-500">MCP server tool executions</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-gray-900">Skills</h4>
          </div>
          <p className="text-sm text-gray-500">Skill executions and results</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-gray-900">Tools</h4>
          </div>
          <p className="text-sm text-gray-500">Built-in tool executions</p>
        </div>
      </div>
    </div>
  );
}
