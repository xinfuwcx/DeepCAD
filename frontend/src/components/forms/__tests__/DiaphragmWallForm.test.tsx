import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiaphragmWallForm from '../DiaphragmWallForm';
import { useSceneStore } from '../../../stores/useSceneStore';
import { DiaphragmWall } from '../../../stores/components';

// Mock the scene store
vi.mock('../../../stores/useSceneStore', () => ({
  useSceneStore: vi.fn()
}));

// Mock the form controls component
vi.mock('../FormControls', () => ({
  AnimatedButton: ({ children, ...props }) => (
    <button data-testid="animated-button" {...props}>{children}</button>
  ),
  FormItemWithTooltip: ({ children, label, ...props }) => (
    <div data-testid="form-item-tooltip">
      <label>{label}</label>
      {children}
    </div>
  )
}));

// Mock the viewport component
vi.mock('../../viewport/AdvancedViewport', () => ({
  __esModule: true,
  default: () => <div data-testid="advanced-viewport">Mock Viewport</div>
}));

describe('DiaphragmWallForm Component', () => {
  const mockComponent: DiaphragmWall = {
    id: 'wall-1',
    name: 'Test Wall',
    type: 'diaphragm_wall',
    path: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ],
    thickness: 0.8,
    depth: 20.0,
    material_id: 'material-1',
    construction_method: 'slurry_wall',
    panel_length: 6.0,
    joint_type: 'interlocking'
  };

  const mockUpdateComponent = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the mock store
    (useSceneStore as any).mockImplementation((selector) => 
      selector({
        scene: {
          materials: [
            { id: 'material-1', name: 'Concrete', type: 'concrete' },
            { id: 'material-2', name: 'Steel', type: 'steel' }
          ]
        },
        updateComponent: mockUpdateComponent
      })
    );
  });

  it('renders the form with initial values', () => {
    render(<DiaphragmWallForm component={mockComponent} />);
    
    // Check if tabs are rendered
    expect(screen.getByText(/地连墙配置/i)).toBeInTheDocument();
    
    // Check if form fields are rendered with initial values
    const thicknessInput = screen.getByLabelText(/墙体厚度/i);
    expect(thicknessInput).toHaveValue(0.8);
    
    const depthInput = screen.getByLabelText(/入土深度/i);
    expect(depthInput).toHaveValue(20.0);
  });

  it('updates component when save button is clicked', async () => {
    render(<DiaphragmWallForm component={mockComponent} />);
    
    // Change form values
    const thicknessInput = screen.getByLabelText(/墙体厚度/i);
    fireEvent.change(thicknessInput, { target: { value: 1.0 } });
    
    const depthInput = screen.getByLabelText(/入土深度/i);
    fireEvent.change(depthInput, { target: { value: 25.0 } });
    
    // Find and click the save button
    const saveButton = screen.getByText(/保存/i);
    fireEvent.click(saveButton);
    
    // Check if updateComponent was called with the correct values
    await waitFor(() => {
      expect(mockUpdateComponent).toHaveBeenCalledWith('wall-1', {
        ...mockComponent,
        thickness: 1.0,
        depth: 25.0
      });
    });
  });

  it('changes tab when tab is clicked', () => {
    render(<DiaphragmWallForm component={mockComponent} />);
    
    // Find and click on a different tab (assuming there's a "材料" tab)
    const materialsTab = screen.getByText(/材料/i);
    fireEvent.click(materialsTab);
    
    // Check if the tab content changed
    expect(screen.getByText(/材料属性/i)).toBeInTheDocument();
  });
}); 