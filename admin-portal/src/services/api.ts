import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Pre-configured axios instance for admin API calls.
 * Automatically attaches Authorization + x-session-token headers.
 */
const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor — attach auth headers
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  const sessionToken = localStorage.getItem('sessionToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;
  }

  return config;
});

// Response interceptor — handle 401 by redirecting to login
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;
export { API_URL };
