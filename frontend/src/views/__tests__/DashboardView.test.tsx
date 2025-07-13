import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DashboardView from '../DashboardView';
import { useSceneStore } from '../../stores/useSceneStore';
import { useUIStore } from '../../stores/useUIStore';

// Mock the stores
vi.mock('../../stores/useSceneStore', () => ({
  useSceneStore: vi.fn()
}));

vi.mock('../../stores/useUIStore', () => ({
  useUIStore: vi.fn()
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('DashboardView Component', () => {
  const mockScene = {
    id: 'scene-1',
    name: 'Test Scene',
    components: [
      { id: 'component-1', name: 'Wall 1', type: 'diaphragm_wall' },
      { id: 'component-2', name: 'Wall 2', type: 'diaphragm_wall' }
    ],
    materials: [
      { id: 'material-1', name: 'Concrete', type: 'concrete' }
    ],
    meshing: {
      global_size: 1.0
    },
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  };

  const mockTaskProgress = {
    id: 'task-1',
    status: 'processing',
    message: 'Processing task...',
    progress: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the scene store
    (useSceneStore as any).mockImplementation((selector) => 
      selector({
        scene: mockScene,
        isLoading: false
      })
    );
    
    // Mock the UI store
    (useUIStore as any).mockImplementation((selector) => 
      selector({
        taskProgress: mockTaskProgress
      })
    );
    
    // Mock Date
    const mockDate = new Date('2023-01-01T12:00:00Z');
    vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the dashboard header', () => {
    render(
      <BrowserRouter>
        <DashboardView />
      </BrowserRouter>
    );
    
    expect(screen.getByText('DeepCAD 工作台')).toBeInTheDocument();
    expect(screen.getByText(/欢迎使用 DeepCAD - 深基坑工程辅助设计系统/)).toBeInTheDocument();
  });

  it('displays project statistics correctly', () => {
    render(
      <BrowserRouter>
        <DashboardView />
      </BrowserRouter>
    );
    
    // Component count
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 components
    
    // Mesh status
    expect(screen.getByText('已生成')).toBeInTheDocument();
    
    // Material count
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 material
  });

  it('displays task progress correctly', () => {
    render(
      <BrowserRouter>
        <DashboardView />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Processing task...')).toBeInTheDocument();
  });

  it('navigates to new project when button is clicked', async () => {
    const navigateMock = vi.fn();
    (require('react-router-dom') as any).useNavigate.mockReturnValue(navigateMock);
    
    render(
      <BrowserRouter>
        <DashboardView />
      </BrowserRouter>
    );
    
    const newProjectButton = screen.getByText('新建项目');
    fireEvent.click(newProjectButton);
    
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/geometry');
    });
  });

  it('displays recent projects list', () => {
    render(
      <BrowserRouter>
        <DashboardView />
      </BrowserRouter>
    );
    
    expect(screen.getByText('深基坑支护工程')).toBeInTheDocument();
    expect(screen.getByText('地铁站基坑开挖')).toBeInTheDocument();
    expect(screen.getByText('商业楼基础设计')).toBeInTheDocument();
    expect(screen.getByText('桩基础设计方案')).toBeInTheDocument();
  });

  it('displays system resources', () => {
    render(
      <BrowserRouter>
        <DashboardView />
      </BrowserRouter>
    );
    
    expect(screen.getByText('CPU 使用率')).toBeInTheDocument();
    expect(screen.getByText('内存使用率')).toBeInTheDocument();
    expect(screen.getByText('磁盘使用率')).toBeInTheDocument();
    expect(screen.getByText('网络使用率')).toBeInTheDocument();
  });
}); 