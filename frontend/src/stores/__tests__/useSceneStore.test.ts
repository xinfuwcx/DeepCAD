import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSceneStore } from '../useSceneStore';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

describe('useSceneStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Reset the store state
    const { result } = renderHook(() => useSceneStore());
    act(() => {
      // @ts-ignore - Accessing internal reset function
      result.current.setState({
        scene: null,
        layers: [
          { id: 'terrain', name: 'Terrain', visible: true, color: '#8B4513' },
          { id: 'structures', name: 'Structures', visible: true, color: '#808080' },
          { id: 'water', name: 'Water', visible: true, color: '#0000FF' },
        ],
        selectedComponentId: null,
        selectedComponentIds: [],
        isMultiSelectMode: false,
        soilDomain: null,
        meshConfig: null,
        viewSettings: {
          renderMode: 'solid',
          backgroundColor: 'dark',
          ambientIntensity: 1.0,
          shadows: true,
          antialiasing: true,
          showAxes: true,
        }
      });
    });
  });

  describe('Scene operations', () => {
    it('should load a scene', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Test Scene',
        components: [],
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z'
      };
      
      (axios.get as any).mockResolvedValueOnce({ data: mockScene });
      
      const { result } = renderHook(() => useSceneStore());
      
      await act(async () => {
        await result.current.loadScene('scene-1');
      });
      
      expect(axios.get).toHaveBeenCalledWith('/api/scenes/scene-1');
      expect(result.current.scene).toEqual(mockScene);
    });
    
    it('should handle errors when loading a scene', async () => {
      (axios.get as any).mockRejectedValueOnce(new Error('Failed to load'));
      
      const { result } = renderHook(() => useSceneStore());
      
      await act(async () => {
        await expect(result.current.loadScene('scene-1')).rejects.toThrow('Failed to load');
      });
      
      expect(axios.get).toHaveBeenCalledWith('/api/scenes/scene-1');
      expect(result.current.scene).toBeNull();
    });
    
    it('should create a new scene', async () => {
      (axios.post as any).mockResolvedValueOnce({});
      
      const { result } = renderHook(() => useSceneStore());
      
      await act(async () => {
        await result.current.createNewScene('New Scene');
      });
      
      expect(axios.post).toHaveBeenCalledWith('/api/scenes', expect.objectContaining({
        id: 'test-uuid',
        name: 'New Scene',
        components: []
      }));
      
      expect(result.current.scene).toEqual(expect.objectContaining({
        id: 'test-uuid',
        name: 'New Scene',
        components: []
      }));
    });
  });
  
  describe('Component operations', () => {
    const mockScene = {
      id: 'scene-1',
      name: 'Test Scene',
      components: [
        {
          id: 'component-1',
          name: 'Wall 1',
          type: 'diaphragm_wall',
          thickness: 0.8,
          depth: 20,
          material_id: 'material-1',
          path: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
        }
      ],
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    };
    
    it('should add a component', async () => {
      (axios.post as any).mockResolvedValueOnce({});
      
      const { result } = renderHook(() => useSceneStore());
      
      // Set up initial scene
      act(() => {
        // @ts-ignore - Accessing internal setState function
        result.current.setState({ scene: mockScene });
      });
      
      const newComponent = {
        name: 'Wall 2',
        type: 'diaphragm_wall',
        thickness: 1.0,
        depth: 25,
        material_id: 'material-2',
        path: [{ x: 10, y: 0 }, { x: 20, y: 0 }]
      };
      
      await act(async () => {
        await result.current.addComponent(newComponent as any);
      });
      
      expect(axios.post).toHaveBeenCalledWith('/api/components', expect.objectContaining({
        id: 'test-uuid',
        ...newComponent
      }));
      
      expect(result.current.scene?.components).toHaveLength(2);
      expect(result.current.scene?.components[1]).toEqual(expect.objectContaining({
        id: 'test-uuid',
        ...newComponent
      }));
    });
    
    it('should update a component', () => {
      const { result } = renderHook(() => useSceneStore());
      
      // Set up initial scene
      act(() => {
        // @ts-ignore - Accessing internal setState function
        result.current.setState({ scene: mockScene });
      });
      
      act(() => {
        result.current.updateComponent('component-1', {
          thickness: 1.2,
          depth: 30
        });
      });
      
      expect(result.current.scene?.components[0]).toEqual(expect.objectContaining({
        id: 'component-1',
        thickness: 1.2,
        depth: 30
      }));
    });
    
    it('should delete a component', async () => {
      (axios.delete as any).mockResolvedValueOnce({});
      
      const { result } = renderHook(() => useSceneStore());
      
      // Set up initial scene
      act(() => {
        // @ts-ignore - Accessing internal setState function
        result.current.setState({ scene: mockScene });
      });
      
      await act(async () => {
        await result.current.deleteComponent('component-1');
      });
      
      expect(axios.delete).toHaveBeenCalledWith('/api/components/component-1');
      expect(result.current.scene?.components).toHaveLength(0);
    });
  });
  
  describe('Selection operations', () => {
    it('should select a component', () => {
      const { result } = renderHook(() => useSceneStore());
      
      act(() => {
        result.current.setSelectedComponentId('component-1');
      });
      
      expect(result.current.selectedComponentId).toBe('component-1');
      expect(result.current.selectedComponentIds).toEqual(['component-1']);
    });
    
    it('should handle multi-select mode', () => {
      const { result } = renderHook(() => useSceneStore());
      
      // Enable multi-select mode
      act(() => {
        result.current.toggleMultiSelectMode();
      });
      
      expect(result.current.isMultiSelectMode).toBe(true);
      
      // Select multiple components
      act(() => {
        result.current.setSelectedComponentId('component-1');
      });
      
      act(() => {
        result.current.setSelectedComponentId('component-2');
      });
      
      expect(result.current.selectedComponentId).toBe('component-2');
      expect(result.current.selectedComponentIds).toEqual(['component-1', 'component-2']);
      
      // Deselect a component
      act(() => {
        result.current.setSelectedComponentId('component-1');
      });
      
      expect(result.current.selectedComponentId).toBe('component-2');
      expect(result.current.selectedComponentIds).toEqual(['component-2']);
      
      // Clear selection
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedComponentId).toBeNull();
      expect(result.current.selectedComponentIds).toEqual([]);
    });
  });
  
  describe('View settings', () => {
    it('should update view settings', () => {
      const { result } = renderHook(() => useSceneStore());
      
      act(() => {
        result.current.updateViewSettings({
          renderMode: 'wireframe',
          shadows: false
        });
      });
      
      expect(result.current.viewSettings).toEqual(expect.objectContaining({
        renderMode: 'wireframe',
        shadows: false,
        backgroundColor: 'dark', // Unchanged
        ambientIntensity: 1.0 // Unchanged
      }));
    });
    
    it('should reset view settings', () => {
      const { result } = renderHook(() => useSceneStore());
      
      // First change some settings
      act(() => {
        result.current.updateViewSettings({
          renderMode: 'wireframe',
          shadows: false
        });
      });
      
      // Then reset
      act(() => {
        result.current.resetView();
      });
      
      expect(result.current.viewSettings).toEqual({
        renderMode: 'solid',
        backgroundColor: 'dark',
        ambientIntensity: 1.0,
        shadows: true,
        antialiasing: true,
        showAxes: true,
      });
    });
  });
}); 