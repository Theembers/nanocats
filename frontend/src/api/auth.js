import apiClient from './client';

export async function login(userId, password) {
  const response = await apiClient.post('/auth/login', {
    user_id: userId,
    password,
  });
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}
