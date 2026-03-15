import apiClient from './client';

export async function getLogs(params = {}) {
  const response = await apiClient.get('/logs', { params });
  return response.data;
}
