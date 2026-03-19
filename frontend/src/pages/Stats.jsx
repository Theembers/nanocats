import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getTokenAnalytics } from '../api/analytics';
import LoadingSpinner from '../components/LoadingSpinner';
import { Coins, Zap, Cpu, TrendingUp } from 'lucide-react';
import './Stats.css';

const CHART_COLORS = ['#C4956A', '#7B8FA1', '#5E9E6E', '#4F6478', '#A3714A'];

function Stats() {
  const [days, setDays] = useState(7);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tokenAnalytics', days],
    queryFn: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      return getTokenAnalytics({ 
        start_date: startDate.toISOString().split('T')[0], 
        end_date: endDate.toISOString().split('T')[0] 
      });
    },
  });

  const formatChartData = () => {
    if (!data || !data.by_date) {
      return [];
    }
    return data.by_date.map((item) => ({
      date: item.date,
      prompt: item.input_tokens || 0,
      completion: item.output_tokens || 0,
      total: (item.input_tokens || 0) + (item.output_tokens || 0),
    }));
  };

  const formatModelData = () => {
    if (!data || !data.by_model) {
      return [];
    }
    return data.by_model.map((item) => ({
      name: item.model.split('/').pop() || item.model,
      value: item.total_tokens,
    }));
  };

  const totalPrompt = data?.summary?.total_input_tokens || 0;
  const totalCompletion = data?.summary?.total_output_tokens || 0;
  const total = totalPrompt + totalCompletion;
  const cacheHits = data?.summary?.total_cache_hit || 0;

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
        <div className="error-message">Failed to load stats</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="stats-header">
        <div className="stats-header-content">
          <h1>Token Usage Statistics</h1>
          <p>Monitor your agent's token consumption and costs</p>
        </div>
        <div className="stats-filter">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon accent">
              <Coins size={18} />
            </div>
            <span className="stat-card-label">Total Tokens</span>
          </div>
          <p className="stat-card-value">{total.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon success">
              <Zap size={18} />
            </div>
            <span className="stat-card-label">Prompt Tokens</span>
          </div>
          <p className="stat-card-value">{totalPrompt.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon primary">
              <Cpu size={18} />
            </div>
            <span className="stat-card-label">Completion Tokens</span>
          </div>
          <p className="stat-card-value">{totalCompletion.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon dark">
              <TrendingUp size={18} />
            </div>
            <span className="stat-card-label">Cache Hits</span>
          </div>
          <p className="stat-card-value">{cacheHits.toLocaleString()}</p>
        </div>
      </div>

      <div className="stats-charts">
        <div className="chart-card">
          <h3>Token Usage Over Time</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-main)', 
                    borderRadius: 12 
                  }} 
                />
                <Legend />
                <Bar dataKey="prompt" name="Prompt" fill="#C4956A" radius={[4,4,0,0]} />
                <Bar dataKey="completion" name="Completion" fill="#7B8FA1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Model Distribution</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={formatModelData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#C4956A"
                  dataKey="value"
                >
                  {formatModelData().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    border: '1px solid var(--border-main)', 
                    borderRadius: 12 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="stats-table-card">
        <h3>Detailed Usage</h3>
        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Prompt</th>
                <th className="text-right">Completion</th>
                <th className="text-right">Total</th>
                <th className="text-right">Cache Hits</th>
              </tr>
            </thead>
            <tbody>
              {data?.by_date?.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td className="text-right">{(row.input_tokens || 0).toLocaleString()}</td>
                  <td className="text-right">{(row.output_tokens || 0).toLocaleString()}</td>
                  <td className="text-right font-medium">{(row.total_tokens || 0).toLocaleString()}</td>
                  <td className="text-right">{(row.cache_hit || 0).toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.by_date || data.by_date.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center">No data available for the selected period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Stats;
