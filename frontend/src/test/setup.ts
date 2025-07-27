import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => {
    const mediaQueryList = {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(listener => listener(mediaQueryList)),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    
    return mediaQueryList;
  }),
});

// Mock Ant Design's responsiveObserver
vi.mock('antd/lib/_util/responsiveObserver', () => {
  return {
    default: {
      subscribe: vi.fn().mockReturnValue(123),
      unsubscribe: vi.fn(),
      register: vi.fn(),
      responsiveMap: {
        xs: '(max-width: 575px)',
        sm: '(min-width: 576px)',
        md: '(min-width: 768px)',
        lg: '(min-width: 992px)',
        xl: '(min-width: 1200px)',
        xxl: '(min-width: 1600px)',
      },
    },
  };
});

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => vi.fn(),
  };
});

// Global test setup code goes here 

// Mock WebGPU API for testing
const mockWebGPU = {
  requestAdapter: vi.fn().mockResolvedValue({
    requestDevice: vi.fn().mockResolvedValue({
      createBuffer: vi.fn().mockReturnValue({}),
      createBindGroup: vi.fn().mockReturnValue({}),
      createComputePipeline: vi.fn().mockReturnValue({}),
      createRenderPipeline: vi.fn().mockReturnValue({}),
      queue: {
        submit: vi.fn(),
        writeBuffer: vi.fn()
      }
    })
  })
};

// Mock navigator.gpu
Object.defineProperty(navigator, 'gpu', {
  writable: true,
  value: mockWebGPU
});

// Mock Three.js for testing
vi.mock('three', () => ({
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    children: []
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn()
  })),
  BufferGeometry: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    setAttribute: vi.fn()
  })),
  MeshBasicMaterial: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  })),
  Mesh: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  }))
}));

// Mock performance.now for consistent timing in tests
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
};

Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance
});

// Setup console warnings capture for tests
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  vi.clearAllMocks();
});