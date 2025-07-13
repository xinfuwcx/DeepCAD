import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestClient from '../TestClient';
import { apiClient } from '../../api/client';
import { notification } from 'antd';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn()
  }
}));

// Mock Antd notification
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    notification: {
      success: vi.fn(),
      error: vi.fn()
    }
  };
});

describe('TestClient Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with title and button', () => {
    render(<TestClient />);
    
    // Check if the title is rendered
    expect(screen.getByText('Backend API Test')).toBeInTheDocument();
    
    // Check if the button is rendered
    const button = screen.getByText('Test Backend Connection');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('handles successful API call', async () => {
    // Mock successful API response
    const mockResponse = { data: { message: 'API is healthy' } };
    (apiClient.get as any).mockResolvedValueOnce(mockResponse);
    
    render(<TestClient />);
    
    // Click the test button
    const button = screen.getByText('Test Backend Connection');
    fireEvent.click(button);
    
    // Check if button shows loading state
    expect(button).toHaveAttribute('aria-busy', 'true');
    
    // Wait for the API call to complete
    await waitFor(() => {
      // Check if notification was called with correct params
      expect(notification.success).toHaveBeenCalledWith({
        message: 'Backend Connection Successful!',
        description: 'Message from backend: "API is healthy"',
      });
      
      // Button should no longer be in loading state
      expect(button).not.toHaveAttribute('aria-busy', 'true');
    });
  });

  it('handles API error', async () => {
    // Mock API error
    const mockError = new Error('Network Error');
    (apiClient.get as any).mockRejectedValueOnce(mockError);
    
    // Spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<TestClient />);
    
    // Click the test button
    const button = screen.getByText('Test Backend Connection');
    fireEvent.click(button);
    
    // Wait for the API call to complete
    await waitFor(() => {
      // Check if console.error was called
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to connect to backend:', 
        expect.any(Error)
      );
      
      // Button should no longer be in loading state
      expect(button).not.toHaveAttribute('aria-busy', 'true');
    });
    
    consoleSpy.mockRestore();
  });
}); 