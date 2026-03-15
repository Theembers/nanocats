import apiClient from './client';

export async function listAgents() {
  const response = await apiClient.get('/agents');
  return response.data.agents;
}

export async function getAgent(agentId) {
  const response = await apiClient.get(`/agents/${agentId}`);
  return response.data;
}

export async function getMessages(agentId, params = {}) {
  const response = await apiClient.get(`/agents/${agentId}/messages`, {
    params,
  });
  return response.data;
}
