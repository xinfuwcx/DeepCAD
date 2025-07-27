/**
 * Vitest配置 - DeepCAD深基坑CAE平台
 * 3号计算专家 - 单元测试和集成测试配置（优化版）
 */

import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'], // 更新为正确路径
      
      // 测试覆盖率配置 - 企业级质量标准
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
        reportsDirectory: './coverage',
        
        // 提高覆盖率阈值以确保高质量
        thresholds: {
          global: {
            branches: 85, // 提高至85%
            functions: 90, // 提高至90% 
            lines: 88,     // 提高至88%
            statements: 88 // 提高至88%
          }
        },
        
        // 包含的文件
        include: [
          'src/**/*.{ts,tsx}',
          '!src/**/*.d.ts',
          '!src/**/*.stories.{ts,tsx}',
          '!src/test/**',
          '!src/**/__tests__/**'
        ],
        
        // 排除的文件
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/types.ts',
          'src/stories/**',
          'dist/',
          'coverage/',
          'src/main.tsx',
          'src/vite-env.d.ts'
        ]
      },
      
      // 测试执行配置 - 针对计算密集型测试优化
      testTimeout: 20000,  // 深基坑计算需要更长时间
      hookTimeout: 15000,
      teardownTimeout: 8000,
      
      // 并行测试配置
      threads: true,
      maxThreads: 4,
      minThreads: 1,
      
      // 重试配置
      retry: process.env.CI ? 3 : 1, // CI环境多重试
      
      // 测试文件匹配
      include: [
        'src/**/__tests__/**/*.{test,spec}.{js,ts,tsx}',
        'src/**/*.{test,spec}.{js,ts,tsx}'
      ],
      
      exclude: [
        'node_modules',
        'dist',
        '.idea', 
        '.git',
        '.cache',
        'tests/e2e/**', // 排除E2E测试
        'coverage/**'
      ],
      
      // 输出配置
      outputFile: {
        json: './test-results/unit-test-results.json',
        junit: './test-reports/junit.xml'
      },
      
      // 报告器配置
      reporter: process.env.CI 
        ? ['basic', 'json'] 
        : ['verbose', 'json'],
      
      // 环境变量
      env: {
        NODE_ENV: 'test',
        VITEST: 'true',
        DEEPCAD_TEST_MODE: 'unit'
      },
      
      // 监听模式配置
      watch: !process.env.CI,
      
      // 静默模式
      silent: process.env.CI ? true : false,
      
      // 包含源代码测试
      includeSource: ['src/**/*.{js,ts,tsx}']
    }
  })
); 