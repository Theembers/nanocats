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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { getTokenAnalytics } from '../api/analytics';
import LoadingSpinner from '../components/LoadingSpinner';

function Analytics() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading, error } = useQuery({
    queryKey: ['tokenAnalytics', startDate, endDate],
    queryFn: () => getTokenAnalytics({ start_date: startDate, end_date: endDate }),
  });

  const formatChartData = () => {
    if (!data || !data.daily) {
      return [];
    }
    return data.daily.map((item) => ({
      date: item.date,
      inputTokens: item.input_tokens || 0,
      outputTokens: item.output_tokens || 0,
      totalTokens: (item.input_tokens || 0) + (item.output_tokens || 0),
    }));
  };

  const formatModelData = () => {
    if (!data || !data.by_model) {
      return [];
    }
    return Object.entries(data.by_model).map(([model, tokens]) => ({
      model,
      tokens,
    }));
  };

  const totalInput = data?.summary?.total_input_tokens || 0;
  const totalOutput = data?.summary?.total_output_tokens || 0;
  const total = totalInput + totalOutput;

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
        <div className="error-message">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Token usage and performance metrics</p>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Tokens</h3>
          <p className="stat-value">{total.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Input Tokens</h3>
          <p className="stat-value">{totalInput.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Output Tokens</h3>
          <p className="stat-value">{totalOutput.toLocaleString()}</p>
        </div>
      </div>

      <div className="chart-section">
        <h2>Token Usage Over Time</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="inputTokens" stroke="#6366f1" name="Input" />
              <Line type="monotone" dataKey="outputTokens" stroke="#22c55e" name="Output" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <h2>Token Usage by Model</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formatModelData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tokens" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
