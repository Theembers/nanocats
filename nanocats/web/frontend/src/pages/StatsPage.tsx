import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, TrendingUp, Coins, Zap, BarChart3 } from 'lucide-react';
import type { TokenStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || '';

const COLORS = ['#C4956A', '#7B8FA1', '#5E9E6E', '#4F6478', '#A3714A'];

export default function StatsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<TokenStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats/tokens?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totals = stats.reduce((acc, stat) => ({
    prompt: acc.prompt + stat.prompt_tokens,
    completion: acc.completion + stat.completion_tokens,
    total: acc.total + stat.total_tokens,
    cacheHits: acc.cacheHits + stat.cache_hits,
    calls: acc.calls + stat.total_calls
  }), { prompt: 0, completion: 0, total: 0, cacheHits: 0, calls: 0 });

  // Prepare chart data
  const chartData = stats.map(stat => ({
    date: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    prompt: stat.prompt_tokens,
    completion: stat.completion_tokens,
    total: stat.total_tokens,
    cacheHits: stat.cache_hits
  }));

  // Model distribution
  const modelData = stats.reduce((acc, stat) => {
    acc[stat.model] = (acc[stat.model] || 0) + stat.total_tokens;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(modelData).map(([name, value]) => ({
    name: name.split('/').pop() || name,
    value
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Token Usage Statistics</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Monitor your agent's token consumption and costs</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 rounded-xl outline-none text-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border-main)',
            color: 'var(--text-primary)',
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-light)' }}>
              <Coins className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Tokens</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totals.total.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(94,158,110,0.12)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Prompt Tokens</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totals.prompt.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(123,143,161,0.12)' }}>
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Completion Tokens</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totals.completion.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(79,100,120,0.12)' }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--color-primary-dark)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cache Hits</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totals.cacheHits.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5">
        {/* Token Usage Over Time */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Token Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="prompt" name="Prompt" fill="#C4956A" radius={[4,4,0,0]} />
              <Bar dataKey="completion" name="Completion" fill="#7B8FA1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Distribution */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
          <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Model Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#C4956A"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-8 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Detailed Usage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-base)' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Model</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Prompt</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Completion</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Cache Hits</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No data available for the selected period
                  </td>
                </tr>
              ) : (
                stats.map((stat, index) => (
                  <tr key={index} style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(stat.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{stat.agent_id}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{stat.model}</td>
                    <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{stat.prompt_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{stat.completion_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-right" style={{ color: 'var(--color-accent-dark)' }}>{stat.total_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{stat.cache_hits}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
