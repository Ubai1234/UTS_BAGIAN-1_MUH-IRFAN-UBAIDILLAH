import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API calls untuk Auth (Registrasi & Login)
export const authApi = {
  register: (userData: { name: string; email: string; password: string }) => 
    apiClient.post('/api/users/register', userData),
  
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/api/users/login', credentials),
};

// --- MODIFIKASI DIMULAI: Menambahkan Team API ---

// API calls untuk data Users (masih bisa dipakai jika perlu)
export const userApi = {
  getUsers: () => apiClient.get('/api/users'),
  getUser: (id: string) => apiClient.get(`/api/users/${id}`),
  deleteUser: (id: string) => apiClient.delete(`/api/users/${id}`),
};

// API calls baru untuk Teams
export const teamApi = {
  getTeams: () => apiClient.get('/api/users/teams'),
  getUsersInTeam: (teamId: string) => apiClient.get(`/api/users/teams/${teamId}/users`),
};
// --- MODIFIKASI SELESAI ---