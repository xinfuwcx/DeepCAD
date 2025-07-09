import axios from 'axios';
import { notification } from 'antd';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// You can also add interceptors for requests or responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    console.error('API Error:', error);
    
    const message = error.response?.data?.message || error.message || 'An unknown error occurred';

    notification.error({
      message: 'API Request Failed',
      description: message,
    });

    return Promise.reject(error);
  }
);

export default apiClient; 