import { useState, useCallback, useEffect } from 'react';
import { UnifiedTool } from '../components/layout/UnifiedToolbar';

export interface ToolbarState {
  currentTool: UnifiedTool;
  explodeFactor: number;
  collapsed: boolean;
  measurements: MeasurementResult[];
  annotations: AnnotationResult[];
}

export interface MeasurementResult {
  id: string;
  type: 'distance' | 'angle' | 'area';
  value: number;
  unit: string;
  points: number[][];
  timestamp: number;
}

export interface AnnotationResult {
  id: string;
  type: 'text' | 'dimension';
  content: string;
  position: number[];
  timestamp: number;
}

const initialState: ToolbarState = {
  currentTool: 'rotate',
  explodeFactor: 0,
  collapsed: false,
  measurements: [],
  annotations: []
};

export const useUnifiedToolbar = () => {
  const [state, setState] = useState<ToolbarState>(initialState);

  // 工具切换
  const setCurrentTool = useCallback((tool: UnifiedTool) => {
    setState(prev => ({ ...prev, currentTool: tool }));
  }, []);

  // 爆炸系数调整
  const setExplodeFactor = useCallback((factor: number) => {
    setState(prev => ({ ...prev, explodeFactor: factor }));
  }, []);

  // 工具栏折叠状态
  const setCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, collapsed }));
  }, []);

  // 添加测量结果
  const addMeasurement = useCallback((measurement: Omit<MeasurementResult, 'id' | 'timestamp'>) => {
    const newMeasurement: MeasurementResult = {
      ...measurement,
      id: `measurement_${Date.now()}`,
      timestamp: Date.now()
    };
    setState(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement]
    }));
  }, []);

  // 删除测量结果
  const removeMeasurement = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      measurements: prev.measurements.filter(m => m.id !== id)
    }));
  }, []);

  // 添加标注
  const addAnnotation = useCallback((annotation: Omit<AnnotationResult, 'id' | 'timestamp'>) => {
    const newAnnotation: AnnotationResult = {
      ...annotation,
      id: `annotation_${Date.now()}`,
      timestamp: Date.now()
    };
    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, newAnnotation]
    }));
  }, []);

  // 删除标注
  const removeAnnotation = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.filter(a => a.id !== id)
    }));
  }, []);

  // 清除所有测量和标注
  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      measurements: [],
      annotations: []
    }));
  }, []);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框中触发快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { ctrlKey, key } = e;

      // 系统快捷键
      if (ctrlKey) {
        switch (key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            // 撤销功能将在历史管理模块中实现
            console.log('撤销操作 (Ctrl+Z) - 功能开发中');
            break;
          case 'y':
            e.preventDefault();
            // 重做功能将在历史管理模块中实现
            console.log('重做操作 (Ctrl+Y) - 功能开发中');
            break;
          case 's':
            e.preventDefault();
            setCurrentTool('save');
            break;
        }
        return;
      }

      // 工具快捷键
      switch (key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          setCurrentTool('rotate');
          break;
        case 'p':
          e.preventDefault();
          setCurrentTool('pan');
          break;
        case 'z':
          e.preventDefault();
          setCurrentTool('zoom');
          break;
        case 's':
          e.preventDefault();
          setCurrentTool('select');
          break;
        case 'b':
          e.preventDefault();
          setCurrentTool('box-select');
          break;
        case 'd':
          e.preventDefault();
          setCurrentTool('distance');
          break;
        case 'a':
          e.preventDefault();
          setCurrentTool('angle');
          break;
        case 't':
          e.preventDefault();
          setCurrentTool('text');
          break;
        case 'c':
          e.preventDefault();
          setCurrentTool('section');
          break;
        case 'e':
          e.preventDefault();
          setCurrentTool('explode');
          break;
        case 'w':
          e.preventDefault();
          setCurrentTool('wireframe');
          break;
        case 'home':
          e.preventDefault();
          setCurrentTool('reset');
          break;
        case 'escape':
          e.preventDefault();
          setCurrentTool('select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTool]);

  return {
    // 状态
    currentTool: state.currentTool,
    explodeFactor: state.explodeFactor,
    collapsed: state.collapsed,
    measurements: state.measurements,
    annotations: state.annotations,
    
    // 操作方法
    setCurrentTool,
    setExplodeFactor,
    setCollapsed,
    addMeasurement,
    removeMeasurement,
    addAnnotation,
    removeAnnotation,
    clearAll
  };
};