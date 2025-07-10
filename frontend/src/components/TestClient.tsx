import React, { useState } from 'react';
import { Button, Card, notification } from 'antd';
import apiClient from '../api/client';

const TestClient: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleTestClick = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/health');
      notification.success({
        message: 'Backend Connection Successful!',
        description: `Message from backend: "${response.data.message}"`,
      });
    } catch (error) {
      // The global error handler in apiClient will show a notification.
      // We just log it to the console for debugging purposes.
      console.error("Failed to connect to backend:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Backend API Test">
      <p>Click the button to test the connection to the backend health-check endpoint.</p>
      <Button onClick={handleTestClick} loading={loading} type="primary" style={{ marginTop: '16px' }}>
        Test Backend Connection
      </Button>
    </Card>
  );
};

export default TestClient; 