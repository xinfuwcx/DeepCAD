import { defineConfig, devices } from '@playwright/test';

/**
 * E2E测试配置
 * 3号计算专家 - DeepCAD深基坑CAE平台端到端测试配置
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* 并行执行测试 */
  fullyParallel: true,
  
  /* 在CI环境中禁止test.only */
  forbidOnly: !!process.env.CI,
  
  /* 在CI环境中失败时重试，本地开发时不重试 */
  retries: process.env.CI ? 2 : 0,
  
  /* 选择性并行执行 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 报告器配置 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  /* 全局测试配置 */
  use: {
    /* 基础URL - 更新为Vite开发服务器端口 */
    baseURL: 'http://localhost:5173',
    
    /* 收集失败时的trace */
    trace: 'on-first-retry',
    
    /* 截图配置 */
    screenshot: 'only-on-failure',
    
    /* 视频录制 */
    video: 'retain-on-failure',
    
    /* 操作超时 */
    actionTimeout: 15000,
    
    /* 导航超时 */
    navigationTimeout: 30000,
    
    /* 忽略HTTPS错误 */
    ignoreHTTPSErrors: true,
  },

  /* 配置多种浏览器环境 */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 为WebGPU测试启用实验性功能
        launchOptions: {
          args: [
            '--enable-unsafe-webgpu',
            '--enable-features=Vulkan',
            '--use-vulkan=native',
            '--enable-zero-copy'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* 大屏幕测试 */
    {
      name: 'Desktop Large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    /* 低性能设备模拟 */
    {
      name: 'Low Performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--memory-pressure-off',
            '--max_old_space_size=512',
            '--cpu-prof'
          ]
        }
      },
    },

    /* 视觉回归测试专用配置 */
    {
      name: 'visual-regression',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-backgrounding-occluded-windows'
          ]
        }
      },
    },

    /* 负载测试专用配置 */
    {
      name: 'load-testing',
      testDir: './tests/load',
      timeout: 300000, // 5分钟超时
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--max_old_space_size=4096'
          ]
        }
      },
    },
  ],

  /* 开发服务器配置 - 更新为Vite */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* 全局setup和teardown */
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  /* 测试超时配置 - 深基坑计算需要更长时间 */
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  /* 输出目录 */
  outputDir: 'test-results/',
  
  /* 测试匹配模式 */
  testMatch: '**/*.spec.ts',
  
  /* 忽略的文件 */
  testIgnore: '**/node_modules/**',
});