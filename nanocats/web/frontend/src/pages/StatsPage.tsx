import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, TrendingUp, Coins, Zap, BarChart3 } from 'lucide-react';
import type { TokenStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Usage Statistics</h1>
          <p className="text-gray-600 mt-1">Monitor your agent's token consumption and costs</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Total Tokens</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.total.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Prompt Tokens</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.prompt.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">Completion Tokens</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.completion.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-500">Cache Hits</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.cacheHits.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Token Usage Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Token Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="prompt" name="Prompt" fill="#3B82F6" />
              <Bar dataKey="completion" name="Completion" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Model Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Usage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prompt</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completion</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cache Hits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No data available for the selected period
                  </td>
                </tr>
              ) : (
                stats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(stat.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{stat.agent_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{stat.model}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{stat.prompt_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{stat.completion_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{stat.total_tokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{stat.cache_hits}</td>
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
