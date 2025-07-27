/**
 * Three.js内存管理Hook
 * DeepCAD Deep Excavation CAE Platform - Three.js Memory Management Hook
 * 
 * 作者：2号几何专家
 * 功能：内存管理集成、自动清理、性能监控、优化建议
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { SceneMemoryManager, type MemoryStats } from '../core/memory/SceneMemoryManager';
import { MemoryOptimizationUtils, type OptimizationSuggestion, type PerformanceAnalysis } from '../utils/memoryOptimization';

// Hook配置选项
export interface UseThreeMemoryManagerOptions {
  // 自动清理配置
  autoCleanup?: {
    enabled?: boolean;
    interval?: number; // ms
    memoryThreshold?: number; // MB
  };
  
  // 监控配置
  monitoring?: {
    enabled?: boolean;
    updateInterval?: number; // ms
  };
  
  // 优化配置
  optimization?: {
    enableAutoOptimization?: boolean;
    optimizationThreshold?: number; // MB
  };
  
  // 调试配置
  debug?: {
    logMemoryStats?: boolean;
    logOptimizations?: boolean;
  };
}

// Hook返回值接口
export interface ThreeMemoryManagerHook {
  // 内存管理器实例
  memoryManager: SceneMemoryManager | null;
  optimizationUtils: MemoryOptimizationUtils | null;
  
  // 内存统计
  memoryStats: MemoryStats | null;
  memoryHistory: MemoryStats[];
  isMonitoring: boolean;
  
  // 性能分析
  performanceAnalysis: PerformanceAnalysis | null;
  optimizationSuggestions: OptimizationSuggestion[];
  
  // 控制方法
  startMonitoring: () => void;
  stopMonitoring: () => void;
  forceCleanup: () => Promise<number>;
  optimizeMemory: () => Promise<void>;
  
  // 配置方法
  updateConfig: (newConfig: Partial<UseThreeMemoryManagerOptions>) => void;
  
  // 统计方法
  getMemorySummary: () => {
    totalMemoryMB: number;
    textureMemoryMB: number;
    geometryMemoryMB: number;
    unusedResources: number;
    optimizationScore: number;
  };
}

// 默认配置
const DEFAULT_OPTIONS: UseThreeMemoryManagerOptions = {
  autoCleanup: {
    enabled: true,
    interval: 30000, // 30秒
    memoryThreshold: 256 // 256MB
  },
  monitoring: {
    enabled: true,
    updateInterval: 2000 // 2秒
  },
  optimization: {
    enableAutoOptimization: false,
    optimizationThreshold: 512 // 512MB
  },
  debug: {
    logMemoryStats: false,
    logOptimizations: true
  }
};

export const useThreeMemoryManager = (
  scene: THREE.Scene | null,
  renderer: THREE.WebGLRenderer | null,
  options: UseThreeMemoryManagerOptions = {}
): ThreeMemoryManagerHook => {
  
  // 合并配置
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // 状态管理
  const [memoryManager, setMemoryManager] = useState<SceneMemoryManager | null>(null);
  const [optimizationUtils, setOptimizationUtils] = useState<MemoryOptimizationUtils | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  
  // Refs
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();
  const optimizationIntervalRef = useRef<NodeJS.Timeout>();
  const configRef = useRef(config);
  
  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<UseThreeMemoryManagerOptions>) => {
    configRef.current = { ...configRef.current, ...newConfig };
  }, []);

  // 初始化内存管理器
  useEffect(() => {
    if (scene && renderer) {
      try {
        const manager = new SceneMemoryManager(scene, renderer, {
          autoCleanup: {
            enabled: config.autoCleanup?.enabled || false,
            interval: config.autoCleanup?.interval || 30000,
            memoryThreshold: (config.autoCleanup?.memoryThreshold || 256) * 1024 * 1024 // 转换为字节
          }
        });
        
        const utils = new MemoryOptimizationUtils(manager, scene, renderer);
        
        setMemoryManager(manager);
        setOptimizationUtils(utils);
        
        if (config.debug?.logMemoryStats) {
          console.log('🧠 Three.js内存管理器已初始化');
        }
        
        // 自动开始监控
        if (config.monitoring?.enabled) {
          setIsMonitoring(true);
        }
        
      } catch (error) {
        console.error('初始化内存管理器失败:', error);
      }
    }
    
    return () => {
      if (memoryManager) {
        memoryManager.dispose();
      }
    };
  }, [scene, renderer]);

  // 更新内存统计
  const updateMemoryStats = useCallback(() => {
    if (!memoryManager) return;
    
    try {
      const stats = memoryManager.getMemoryStats();
      setMemoryStats(stats);
      
      // 更新历史记录
      setMemoryHistory(prev => {
        const newHistory = [...prev, stats];
        // 保持最近50个记录
        return newHistory.slice(-50);
      });
      
      // 检查是否需要自动优化
      if (configRef.current.optimization?.enableAutoOptimization && optimizationUtils) {
        const totalMemoryMB = stats.total.estimated / (1024 * 1024);
        const threshold = configRef.current.optimization.optimizationThreshold || 512;
        
        if (totalMemoryMB > threshold) {
          console.log(`📊 内存使用量 ${totalMemoryMB.toFixed(1)}MB 超过阈值，触发自动优化`);
          optimizationUtils.performFullOptimization().catch(console.error);
        }
      }
      
      if (configRef.current.debug?.logMemoryStats) {
        console.log('📊 内存统计更新:', {
          总内存: `${(stats.total.estimated / (1024 * 1024)).toFixed(1)}MB`,
          纹理: `${stats.textures.count}个 (${(stats.textures.totalSize / (1024 * 1024)).toFixed(1)}MB)`,
          几何体: `${stats.geometries.count}个 (${(stats.geometries.memoryUsage / (1024 * 1024)).toFixed(1)}MB)`,
          未使用纹理: stats.textures.unusedCount
        });
      }
      
    } catch (error) {
      console.error('更新内存统计失败:', error);
    }
  }, [memoryManager, optimizationUtils]);

  // 更新性能分析
  const updatePerformanceAnalysis = useCallback(() => {
    if (!optimizationUtils) return;
    
    try {
      const analysis = optimizationUtils.analyzePerformance();
      setPerformanceAnalysis(analysis);
      setOptimizationSuggestions(analysis.suggestions);
      
      if (configRef.current.debug?.logOptimizations && analysis.suggestions.length > 0) {
        console.log('💡 发现优化建议:', analysis.suggestions.map(s => s.title));
      }
      
    } catch (error) {
      console.error('更新性能分析失败:', error);
    }
  }, [optimizationUtils]);

  // 开始监控
  const startMonitoring = useCallback(() => {
    if (isMonitoring || !memoryManager) return;
    
    setIsMonitoring(true);
    
    // 启动内存统计监控
    const interval = configRef.current.monitoring?.updateInterval || 2000;
    monitoringIntervalRef.current = setInterval(() => {
      updateMemoryStats();
      updatePerformanceAnalysis();
    }, interval);
    
    // 立即更新一次
    updateMemoryStats();
    updatePerformanceAnalysis();
    
    console.log('🔍 内存监控已启动');
  }, [isMonitoring, memoryManager, updateMemoryStats, updatePerformanceAnalysis]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = undefined;
    }
    
    console.log('⏹️ 内存监控已停止');
  }, [isMonitoring]);

  // 强制清理
  const forceCleanup = useCallback(async (): Promise<number> => {
    if (!memoryManager) return 0;
    
    try {
      const cleanedCount = memoryManager.cleanupUnusedResources();
      
      // 立即更新统计
      updateMemoryStats();
      
      if (configRef.current.debug?.logOptimizations) {
        console.log(`🧹 强制清理完成，清理了 ${cleanedCount} 个资源`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('强制清理失败:', error);
      return 0;
    }
  }, [memoryManager, updateMemoryStats]);

  // 优化内存
  const optimizeMemory = useCallback(async (): Promise<void> => {
    if (!optimizationUtils) return;
    
    try {
      await optimizationUtils.performFullOptimization();
      
      // 立即更新统计
      updateMemoryStats();
      updatePerformanceAnalysis();
      
      if (configRef.current.debug?.logOptimizations) {
        console.log('🚀 内存优化完成');
      }
      
    } catch (error) {
      console.error('内存优化失败:', error);
    }
  }, [optimizationUtils, updateMemoryStats, updatePerformanceAnalysis]);

  // 获取内存摘要
  const getMemorySummary = useCallback(() => {
    if (!memoryStats) {
      return {
        totalMemoryMB: 0,
        textureMemoryMB: 0,
        geometryMemoryMB: 0,
        unusedResources: 0,
        optimizationScore: 0
      };
    }
    
    return {
      totalMemoryMB: memoryStats.total.estimated / (1024 * 1024),
      textureMemoryMB: memoryStats.textures.totalSize / (1024 * 1024),
      geometryMemoryMB: memoryStats.geometries.memoryUsage / (1024 * 1024),
      unusedResources: memoryStats.textures.unusedCount,
      optimizationScore: performanceAnalysis?.overallScore || 0
    };
  }, [memoryStats, performanceAnalysis]);

  // 自动启动监控
  useEffect(() => {
    if (memoryManager && config.monitoring?.enabled && !isMonitoring) {
      startMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [memoryManager, startMonitoring, stopMonitoring]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      if (optimizationIntervalRef.current) {
        clearInterval(optimizationIntervalRef.current);
      }
    };
  }, []);

  return {
    memoryManager,
    optimizationUtils,
    memoryStats,
    memoryHistory,
    isMonitoring,
    performanceAnalysis,
    optimizationSuggestions,
    startMonitoring,
    stopMonitoring,
    forceCleanup,
    optimizeMemory,
    updateConfig,
    getMemorySummary
  };
};