/**
 * 测试环境配置
 * 1号架构师 - 为团队提供统一的测试基础设施
 */

import { vi, beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 全局测试配置
beforeAll(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
  global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));

  // Mock HTMLElement.requestFullscreen
  HTMLElement.prototype.requestFullscreen = vi.fn();

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// 每个测试后清理
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

// 扩展expect匹配器
expect.extend({
  toBeValidWebSocketMessage(received) {
    try {
      const parsed = JSON.parse(received);
      const hasRequiredFields = 
        typeof parsed.type === 'string' &&
        typeof parsed.id === 'string' &&
        typeof parsed.timestamp === 'number' &&
        parsed.data !== undefined;

      if (hasRequiredFields) {
        return {
          message: () => `Expected ${received} not to be a valid WebSocket message`,
          pass: true,
        };
      } else {
        return {
          message: () => `Expected ${received} to be a valid WebSocket message with type, id, timestamp, and data fields`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () => `Expected ${received} to be valid JSON`,
        pass: false,
      };
    }
  },
});

// 声明自定义匹配器类型
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeValidWebSocketMessage(): T;
    }
  }
}

// Three.js Mock - 简化版本用于测试
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    traverse: vi.fn(),
    background: null,
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn(), copy: vi.fn() },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false, type: null },
    outputColorSpace: null,
    capabilities: { isWebGL2: true },
    info: {
      render: { calls: 0, triangles: 0 },
      memory: { geometries: 0, textures: 0 },
      programs: [],
    },
    getContext: vi.fn(() => ({
      getContextAttributes: () => ({ antialias: true }),
    })),
  })),
  Color: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshLambertMaterial: vi.fn(() => ({ clone: vi.fn() })),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    receiveShadow: false,
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    shadow: { mapSize: { setScalar: vi.fn() } },
  })),
  GridHelper: vi.fn(() => ({
    material: { transparent: false, opacity: 1 },
  })),
  AxesHelper: vi.fn(),
  SRGBColorSpace: 'srgb',
  PCFSoftShadowMap: 'pcf-soft',
}));

// OrbitControls Mock
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.1,
    screenSpacePanning: false,
    maxPolarAngle: Math.PI / 2,
    target: { set: vi.fn(), copy: vi.fn() },
    update: vi.fn(),
  })),
}));

// Ant Design Message Mock
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

console.log('🧪 测试环境配置完成 - 1号架构师为团队准备的测试基础设施');