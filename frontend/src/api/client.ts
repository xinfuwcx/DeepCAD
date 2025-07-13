import axios from 'axios';

const API_BASE_URL = 'http://localhost:8083/api'; // The backend API URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}); 