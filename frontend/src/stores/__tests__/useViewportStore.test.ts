import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useViewportStore } from '../useViewportStore';
import { RenderMode, ToolbarAction, ViewMode, ToolbarPosition, ToolbarDisplay } from '../../types/viewport';

describe('useViewportStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { result } = renderHook(() => useViewportStore());
    act(() => {
      result.current.resetToDefaults();
    });
  });

  describe('Tool operations', () => {
    it('should set active tool', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setActiveTool(ToolbarAction.SELECT);
      });
      
      expect(result.current.activeTool).toBe(ToolbarAction.SELECT);
    });
    
    it('should toggle tool', () => {
      const { result } = renderHook(() => useViewportStore());
      
      // Initial state is ORBIT
      expect(result.current.activeTool).toBe(ToolbarAction.ORBIT);
      
      // Toggle to SELECT
      act(() => {
        result.current.toggleTool(ToolbarAction.SELECT);
      });
      
      expect(result.current.activeTool).toBe(ToolbarAction.SELECT);
      
      // Toggle SELECT again should go back to ORBIT
      act(() => {
        result.current.toggleTool(ToolbarAction.SELECT);
      });
      
      expect(result.current.activeTool).toBe(ToolbarAction.ORBIT);
    });
  });
  
  describe('Viewport configuration', () => {
    it('should set render mode', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setRenderMode(RenderMode.WIREFRAME);
      });
      
      expect(result.current.viewport.renderMode).toBe(RenderMode.WIREFRAME);
    });
    
    it('should set view mode', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setViewMode(ViewMode.ORTHOGRAPHIC);
      });
      
      expect(result.current.viewport.viewMode).toBe(ViewMode.ORTHOGRAPHIC);
    });
    
    it('should update viewport config', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.updateViewportConfig({
          background: '#000000',
          fov: 60,
          near: 0.5,
          far: 2000
        });
      });
      
      expect(result.current.viewport.background).toBe('#000000');
      expect(result.current.viewport.fov).toBe(60);
      expect(result.current.viewport.near).toBe(0.5);
      expect(result.current.viewport.far).toBe(2000);
      
      // Other properties should remain unchanged
      expect(result.current.viewport.renderMode).toBe(RenderMode.SOLID);
    });
  });
  
  describe('Grid operations', () => {
    it('should toggle grid visibility', () => {
      const { result } = renderHook(() => useViewportStore());
      
      const initialVisibility = result.current.grid.visible;
      
      act(() => {
        result.current.toggleGrid();
      });
      
      expect(result.current.grid.visible).toBe(!initialVisibility);
      
      // Toggle again
      act(() => {
        result.current.toggleGrid();
      });
      
      expect(result.current.grid.visible).toBe(initialVisibility);
    });
    
    it('should update grid config', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setGridConfig({
          size: 20,
          divisions: 20,
          color: '#ff0000',
          opacity: 0.5
        });
      });
      
      expect(result.current.grid.size).toBe(20);
      expect(result.current.grid.divisions).toBe(20);
      expect(result.current.grid.color).toBe('#ff0000');
      expect(result.current.grid.opacity).toBe(0.5);
    });
  });
  
  describe('Coordinate system operations', () => {
    it('should toggle coordinate system visibility', () => {
      const { result } = renderHook(() => useViewportStore());
      
      const initialVisibility = result.current.coordinateSystem.visible;
      
      act(() => {
        result.current.toggleCoordinateSystem();
      });
      
      expect(result.current.coordinateSystem.visible).toBe(!initialVisibility);
    });
    
    it('should update coordinate system config', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setCoordinateSystemConfig({
          size: 2,
          position: 'top-left',
          labels: false
        });
      });
      
      expect(result.current.coordinateSystem.size).toBe(2);
      expect(result.current.coordinateSystem.position).toBe('top-left');
      expect(result.current.coordinateSystem.labels).toBe(false);
    });
  });
  
  describe('Toolbar operations', () => {
    it('should set toolbar position', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setToolbarPosition(ToolbarPosition.BOTTOM_RIGHT);
      });
      
      expect(result.current.toolbar.position).toBe(ToolbarPosition.BOTTOM_RIGHT);
    });
    
    it('should set toolbar display mode', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setToolbarDisplay(ToolbarDisplay.HOVER);
      });
      
      expect(result.current.toolbar.display).toBe(ToolbarDisplay.HOVER);
    });
    
    it('should update toolbar config', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.updateToolbarConfig({
          size: 'small',
          orientation: 'vertical',
          visibleTools: [ToolbarAction.SELECT, ToolbarAction.ORBIT]
        });
      });
      
      expect(result.current.toolbar.size).toBe('small');
      expect(result.current.toolbar.orientation).toBe('vertical');
      expect(result.current.toolbar.visibleTools).toEqual([ToolbarAction.SELECT, ToolbarAction.ORBIT]);
    });
  });
  
  describe('Measurement operations', () => {
    it('should add a measurement', () => {
      const { result } = renderHook(() => useViewportStore());
      
      const measurement = {
        id: 'measure-1',
        type: 'distance',
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 }
        ],
        value: 10,
        visible: true
      };
      
      act(() => {
        result.current.addMeasurement(measurement);
      });
      
      expect(result.current.measurements).toHaveLength(1);
      expect(result.current.measurements[0]).toEqual(measurement);
    });
    
    it('should remove a measurement', () => {
      const { result } = renderHook(() => useViewportStore());
      
      // Add two measurements
      act(() => {
        result.current.addMeasurement({
          id: 'measure-1',
          type: 'distance',
          points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }],
          value: 10,
          visible: true
        });
        
        result.current.addMeasurement({
          id: 'measure-2',
          type: 'angle',
          points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }],
          value: 90,
          visible: true
        });
      });
      
      expect(result.current.measurements).toHaveLength(2);
      
      // Remove one measurement
      act(() => {
        result.current.removeMeasurement('measure-1');
      });
      
      expect(result.current.measurements).toHaveLength(1);
      expect(result.current.measurements[0].id).toBe('measure-2');
    });
    
    it('should clear all measurements', () => {
      const { result } = renderHook(() => useViewportStore());
      
      // Add measurements
      act(() => {
        result.current.addMeasurement({
          id: 'measure-1',
          type: 'distance',
          points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }],
          value: 10,
          visible: true
        });
        
        result.current.addMeasurement({
          id: 'measure-2',
          type: 'angle',
          points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }],
          value: 90,
          visible: true
        });
      });
      
      expect(result.current.measurements).toHaveLength(2);
      
      // Clear all measurements
      act(() => {
        result.current.clearMeasurements();
      });
      
      expect(result.current.measurements).toHaveLength(0);
    });
  });
  
  describe('Camera operations', () => {
    it('should set camera position', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setCameraPosition({ x: 20, y: 30, z: 40 });
      });
      
      expect(result.current.camera.position).toEqual({ x: 20, y: 30, z: 40 });
    });
    
    it('should set camera target', () => {
      const { result } = renderHook(() => useViewportStore());
      
      act(() => {
        result.current.setCameraTarget({ x: 5, y: 5, z: 5 });
      });
      
      expect(result.current.camera.target).toEqual({ x: 5, y: 5, z: 5 });
    });
  });
}); 