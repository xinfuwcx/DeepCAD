/**
 * 渲染质量管理器单元测试  
 * DeepCAD Deep Excavation CAE Platform - Render Quality Manager Tests
 * 
 * 作者：2号几何专家
 * 测试覆盖：渲染质量控制、性能优化、内存管理、后处理效果
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  RenderQualityManager,
  QualityLevel,
  RenderSettings,
  PerformanceMetrics,
  type QualityConfiguration,
  type RenderTargetOptions,
  type PostProcessingOptions
} from '../renderQualityManager';

// Mock Three.js组件
vi.mock('three', () => {
  const actualThree = vi.importActual('three');
  return {
    ...actualThree,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      setRenderTarget: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      capabilities: {
        maxTextureSize: 4096,
        maxVertexTextures: 32,
        maxFragmentUniforms: 1024
      },
      getContext: vi.fn(() => ({
        getExtension: vi.fn(() => true),
        getParameter: vi.fn(() => 16)
      }))
    })),
    WebGLRenderTarget: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      dispose: vi.fn(),
      texture: {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      }
    })),
    EffectComposer: vi.fn().mockImplementation(() => ({
      addPass: vi.fn(),
      render: vi.fn(),
      setSize: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

describe('RenderQualityManager', () => {
  let qualityManager: RenderQualityManager;
  let mockRenderer: THREE.WebGLRenderer;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.style.width = '800px';
    mockContainer.style.height = '600px';
    document.body.appendChild(mockContainer);

    mockRenderer = new THREE.WebGLRenderer();
    qualityManager = new RenderQualityManager(mockRenderer, mockContainer);
  });

  afterEach(() => {
    qualityManager.dispose();
    document.body.removeChild(mockContainer);
    vi.clearAllMocks();
  });

  describe('初始化和配置', () => {
    it('should initialize with default quality settings', () => {
      expect(qualityManager.getCurrentQuality()).toBe(QualityLevel.HIGH);
      
      const settings = qualityManager.getRenderSettings();
      expect(settings.pixelRatio).toBe(window.devicePixelRatio);
      expect(settings.antialias).toBe(true);
      expect(settings.shadowMap.enabled).toBe(true);
    });

    it('should initialize with custom quality configuration', () => {
      const customConfig: QualityConfiguration = {
        [QualityLevel.LOW]: {
          pixelRatio: 0.5,
          antialias: false,
          shadowMap: { enabled: false, type: THREE.BasicShadowMap },
          postProcessing: { enabled: false },
          targetFPS: 30
        },
        [QualityLevel.MEDIUM]: {
          pixelRatio: 0.75,
          antialias: true,
          shadowMap: { enabled: true, type: THREE.PCFShadowMap },
          postProcessing: { enabled: true, bloom: false },
          targetFPS: 45
        },
        [QualityLevel.HIGH]: {
          pixelRatio: 1.0,
          antialias: true,
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
          postProcessing: { enabled: true, bloom: true, ssao: true },
          targetFPS: 60
        }
      };

      const customManager = new RenderQualityManager(mockRenderer, mockContainer);
      
      expect(customManager.getQualityConfiguration()).toEqual(customConfig);
    });
  });

  describe('质量等级管理', () => {
    it('should change quality level correctly', () => {
      qualityManager.setQuality(QualityLevel.LOW);
      
      expect(qualityManager.getCurrentQuality()).toBe(QualityLevel.LOW);
      expect(mockRenderer.setPixelRatio).toHaveBeenCalledWith(0.5);
    });

    it('should apply quality settings to renderer', () => {
      qualityManager.setQuality(QualityLevel.MEDIUM);
      
      const settings = qualityManager.getRenderSettings();
      expect(settings.pixelRatio).toBe(0.75);
      expect(settings.antialias).toBe(true);
      expect(settings.shadowMap.type).toBe(THREE.PCFShadowMap);
    });

    it('should handle invalid quality level', () => {
      expect(() => {
        qualityManager.setQuality('INVALID' as QualityLevel);
      }).toThrow('不支持的质量等级');
    });
  });

  describe('自适应质量调整', () => {
    it('should enable adaptive quality adjustment', () => {
      qualityManager.enableAdaptiveQuality(true);
      
      expect(qualityManager.isAdaptiveQualityEnabled()).toBe(true);
    });

    it('should adjust quality based on performance', () => {
      qualityManager.enableAdaptiveQuality(true);
      qualityManager.setQuality(QualityLevel.HIGH);
      
      // 模拟低性能情况（低FPS）
      for (let i = 0; i < 10; i++) {
        qualityManager.updatePerformanceMetrics({
          fps: 15,
          frameTime: 66.7,
          memoryUsage: 50,
          drawCalls: 100,
          triangles: 10000
        });
      }
      
      // 应该自动降低质量
      expect(qualityManager.getCurrentQuality()).toBe(QualityLevel.MEDIUM);
    });

    it('should increase quality when performance improves', () => {
      qualityManager.enableAdaptiveQuality(true);
      qualityManager.setQuality(QualityLevel.LOW);
      
      // 模拟高性能情况（高FPS）
      for (let i = 0; i < 10; i++) {
        qualityManager.updatePerformanceMetrics({
          fps: 75,
          frameTime: 13.3,
          memoryUsage: 30,
          drawCalls: 50,
          triangles: 5000
        });
      }
      
      // 应该自动提高质量
      expect(qualityManager.getCurrentQuality()).toBe(QualityLevel.MEDIUM);
    });

    it('should respect quality bounds in adaptive mode', () => {
      qualityManager.enableAdaptiveQuality(true, {
        minQuality: QualityLevel.MEDIUM,
        maxQuality: QualityLevel.HIGH
      });
      
      qualityManager.setQuality(QualityLevel.HIGH);
      
      // 即使性能很差，也不应该降到MEDIUM以下
      for (let i = 0; i < 20; i++) {
        qualityManager.updatePerformanceMetrics({
          fps: 10,
          frameTime: 100,
          memoryUsage: 80,
          drawCalls: 200,
          triangles: 50000
        });
      }
      
      expect(qualityManager.getCurrentQuality()).toBe(QualityLevel.MEDIUM);
    });
  });

  describe('渲染目标管理', () => {
    it('should create render target with correct settings', () => {
      const options: RenderTargetOptions = {
        width: 1024,
        height: 768,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        samples: 4
      };
      
      const renderTarget = qualityManager.createRenderTarget(options);
      
      expect(renderTarget).toBeDefined();
      expect(THREE.WebGLRenderTarget).toHaveBeenCalledWith(1024, 768, expect.any(Object));
    });

    it('should resize render targets when container changes', () => {
      const renderTarget = qualityManager.createRenderTarget({
        width: 800,
        height: 600
      });
      
      // 改变容器大小
      mockContainer.style.width = '1200px';
      mockContainer.style.height = '900px';
      
      qualityManager.handleResize();
      
      expect(renderTarget.setSize).toHaveBeenCalledWith(1200, 900);
    });

    it('should manage render target memory efficiently', () => {
      const targets = [];
      
      // 创建多个渲染目标
      for (let i = 0; i < 5; i++) {
        targets.push(qualityManager.createRenderTarget({
          width: 512,
          height: 512
        }));
      }
      
      const memoryUsage = qualityManager.getMemoryUsage();
      expect(memoryUsage.renderTargets).toBeGreaterThan(0);
      
      // 清理所有渲染目标
      qualityManager.dispose();
      
      targets.forEach(target => {
        expect(target.dispose).toHaveBeenCalled();
      });
    });
  });

  describe('后处理效果', () => {
    it('should setup post-processing pipeline', () => {
      const options: PostProcessingOptions = {
        enabled: true,
        bloom: true,
        ssao: true,
        fxaa: true,
        toneMapping: THREE.ACESFilmicToneMapping
      };
      
      qualityManager.setupPostProcessing(options);
      
      expect(qualityManager.isPostProcessingEnabled()).toBe(true);
    });

    it('should disable post-processing for low quality', () => {
      qualityManager.setupPostProcessing({ enabled: true, bloom: true });
      qualityManager.setQuality(QualityLevel.LOW);
      
      expect(qualityManager.isPostProcessingEnabled()).toBe(false);
    });

    it('should update post-processing settings dynamically', () => {
      qualityManager.setupPostProcessing({ enabled: true });
      
      qualityManager.updatePostProcessingSettings({
        bloom: true,
        bloomIntensity: 1.5,
        ssao: true,
        ssaoRadius: 0.1
      });
      
      const settings = qualityManager.getPostProcessingSettings();
      expect(settings.bloom).toBe(true);
      expect(settings.bloomIntensity).toBe(1.5);
      expect(settings.ssao).toBe(true);
    });
  });

  describe('性能监控', () => {
    it('should track performance metrics', () => {
      const metrics: PerformanceMetrics = {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 45,
        drawCalls: 80,
        triangles: 15000
      };
      
      qualityManager.updatePerformanceMetrics(metrics);
      
      const currentMetrics = qualityManager.getPerformanceMetrics();
      expect(currentMetrics.fps).toBe(60);
      expect(currentMetrics.frameTime).toBe(16.67);
    });

    it('should calculate average performance over time', () => {
      const metricsHistory = [
        { fps: 55, frameTime: 18.18, memoryUsage: 40, drawCalls: 70, triangles: 12000 },
        { fps: 60, frameTime: 16.67, memoryUsage: 45, drawCalls: 80, triangles: 15000 },
        { fps: 65, frameTime: 15.38, memoryUsage: 50, drawCalls: 90, triangles: 18000 }
      ];
      
      metricsHistory.forEach(metrics => {
        qualityManager.updatePerformanceMetrics(metrics);
      });
      
      const averageMetrics = qualityManager.getAveragePerformanceMetrics();
      expect(averageMetrics.fps).toBeCloseTo(60, 0);
      expect(averageMetrics.memoryUsage).toBeCloseTo(45, 0);
    });

    it('should detect performance bottlenecks', () => {
      // 模拟内存压力
      qualityManager.updatePerformanceMetrics({
        fps: 30,
        frameTime: 33.33,
        memoryUsage: 85,
        drawCalls: 200,
        triangles: 100000
      });
      
      const bottlenecks = qualityManager.detectBottlenecks();
      expect(bottlenecks).toContain('HIGH_MEMORY_USAGE');
      expect(bottlenecks).toContain('TOO_MANY_DRAW_CALLS');
    });
  });

  describe('阴影管理', () => {
    it('should configure shadow settings based on quality', () => {
      qualityManager.setQuality(QualityLevel.HIGH);
      
      const shadowSettings = qualityManager.getShadowSettings();
      expect(shadowSettings.enabled).toBe(true);
      expect(shadowSettings.type).toBe(THREE.PCFSoftShadowMap);
      expect(shadowSettings.mapSize).toBe(2048);
    });

    it('should disable shadows for low quality', () => {
      qualityManager.setQuality(QualityLevel.LOW);
      
      const shadowSettings = qualityManager.getShadowSettings();
      expect(shadowSettings.enabled).toBe(false);
    });

    it('should update shadow map size based on performance', () => {
      qualityManager.setQuality(QualityLevel.HIGH);
      
      // 模拟性能下降
      qualityManager.updatePerformanceMetrics({
        fps: 25,
        frameTime: 40,
        memoryUsage: 70,
        drawCalls: 150,
        triangles: 80000
      });
      
      // 等待自适应调整
      qualityManager.enableAdaptiveQuality(true);
      
      const shadowSettings = qualityManager.getShadowSettings();
      expect(shadowSettings.mapSize).toBeLessThan(2048);
    });
  });

  describe('纹理管理', () => {
    it('should optimize texture settings based on quality', () => {
      qualityManager.setQuality(QualityLevel.MEDIUM);
      
      const textureSettings = qualityManager.getTextureSettings();
      expect(textureSettings.anisotropy).toBe(4);
      expect(textureSettings.generateMipmaps).toBe(true);
    });

    it('should reduce texture quality for low settings', () => {
      qualityManager.setQuality(QualityLevel.LOW);
      
      const textureSettings = qualityManager.getTextureSettings();
      expect(textureSettings.anisotropy).toBe(1);
      expect(textureSettings.generateMipmaps).toBe(false);
    });

    it('should compress textures when memory is limited', () => {
      // 模拟内存压力
      qualityManager.updatePerformanceMetrics({
        fps: 45,
        frameTime: 22.22,
        memoryUsage: 90,
        drawCalls: 100,
        triangles: 20000
      });
      
      const textureSettings = qualityManager.getTextureSettings();
      expect(textureSettings.compression).toBe(true);
    });
  });

  describe('几何细节层次(LOD)', () => {
    it('should calculate LOD levels based on distance and quality', () => {
      const distance = 100;
      const objectSize = 10;
      
      qualityManager.setQuality(QualityLevel.HIGH);
      const lodLevel = qualityManager.calculateLODLevel(distance, objectSize);
      
      expect(lodLevel).toBeGreaterThanOrEqual(0);
      expect(lodLevel).toBeLessThanOrEqual(4);
    });

    it('should use lower LOD for distant objects', () => {
      const nearDistance = 10;
      const farDistance = 1000;
      const objectSize = 5;
      
      const nearLOD = qualityManager.calculateLODLevel(nearDistance, objectSize);
      const farLOD = qualityManager.calculateLODLevel(farDistance, objectSize);
      
      expect(farLOD).toBeGreaterThan(nearLOD);
    });

    it('should adjust LOD bias based on quality level', () => {
      const distance = 50;
      const objectSize = 8;
      
      qualityManager.setQuality(QualityLevel.HIGH);
      const highQualityLOD = qualityManager.calculateLODLevel(distance, objectSize);
      
      qualityManager.setQuality(QualityLevel.LOW);
      const lowQualityLOD = qualityManager.calculateLODLevel(distance, objectSize);
      
      expect(lowQualityLOD).toBeGreaterThan(highQualityLOD);
    });
  });

  describe('内存管理', () => {
    it('should track memory usage accurately', () => {
      // 创建一些渲染资源
      const renderTarget = qualityManager.createRenderTarget({
        width: 1024,
        height: 1024
      });
      
      const memoryUsage = qualityManager.getMemoryUsage();
      expect(memoryUsage.total).toBeGreaterThan(0);
      expect(memoryUsage.renderTargets).toBeGreaterThan(0);
    });

    it('should clean up resources when memory is low', () => {
      // 模拟内存压力
      qualityManager.updatePerformanceMetrics({
        fps: 30,
        frameTime: 33.33,
        memoryUsage: 95,
        drawCalls: 100,
        triangles: 20000
      });
      
      const cleaned = qualityManager.cleanupMemory();
      expect(cleaned).toBe(true);
    });

    it('should dispose all resources correctly', () => {
      const renderTarget = qualityManager.createRenderTarget({
        width: 512,
        height: 512
      });
      
      qualityManager.dispose();
      
      expect(renderTarget.dispose).toHaveBeenCalled();
    });
  });

  describe('动态渲染优化', () => {
    it('should enable frustum culling', () => {
      qualityManager.setFrustumCulling(true);
      expect(qualityManager.isFrustumCullingEnabled()).toBe(true);
    });

    it('should enable occlusion culling for high quality', () => {
      qualityManager.setQuality(QualityLevel.HIGH);
      
      const cullingSettings = qualityManager.getCullingSettings();
      expect(cullingSettings.frustumCulling).toBe(true);
      expect(cullingSettings.occlusionCulling).toBe(true);
    });

    it('should disable expensive culling for low quality', () => {
      qualityManager.setQuality(QualityLevel.LOW);
      
      const cullingSettings = qualityManager.getCullingSettings();
      expect(cullingSettings.occlusionCulling).toBe(false);
    });
  });

  describe('渲染统计', () => {
    it('should provide detailed render statistics', () => {
      const stats = qualityManager.getRenderStatistics();
      
      expect(stats).toHaveProperty('drawCalls');
      expect(stats).toHaveProperty('triangles');
      expect(stats).toHaveProperty('vertices');
      expect(stats).toHaveProperty('textureMemory');
      expect(stats).toHaveProperty('geometryMemory');
    });

    it('should reset statistics correctly', () => {
      qualityManager.updatePerformanceMetrics({
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 50,
        drawCalls: 100,
        triangles: 20000
      });
      
      qualityManager.resetStatistics();
      
      const stats = qualityManager.getRenderStatistics();
      expect(stats.drawCalls).toBe(0);
      expect(stats.triangles).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('should handle WebGL context loss gracefully', () => {
      const contextLossEvent = new Event('webglcontextlost');
      mockRenderer.domElement.dispatchEvent(contextLossEvent);
      
      expect(qualityManager.isContextLost()).toBe(true);
    });

    it('should restore context after context loss', () => {
      // 模拟上下文丢失
      const contextLossEvent = new Event('webglcontextlost');
      mockRenderer.domElement.dispatchEvent(contextLossEvent);
      
      // 模拟上下文恢复
      const contextRestoreEvent = new Event('webglcontextrestored');
      mockRenderer.domElement.dispatchEvent(contextRestoreEvent);
      
      expect(qualityManager.isContextLost()).toBe(false);
    });

    it('should fallback to lower quality on render errors', () => {
      qualityManager.setQuality(QualityLevel.HIGH);
      
      // 模拟渲染错误
      qualityManager.handleRenderError(new Error('WebGL render error'));
      
      expect(qualityManager.getCurrentQuality()).toBe(QualityLevel.MEDIUM);
    });
  });
});