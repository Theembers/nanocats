import apiClient from './client';

export async function getTokenAnalytics(params = {}) {
  const response = await apiClient.get('/analytics/tokens', { params });
  return response.data;
}
