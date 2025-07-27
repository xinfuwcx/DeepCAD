/**
 * API版本验证器单元测试
 * DeepCAD Deep Excavation CAE Platform - API Version Validator Tests
 * 
 * 作者：2号几何专家
 * 测试覆盖：版本验证、兼容性检查、数据迁移验证、安全性验证
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiVersionValidator,
  VersionValidationRule,
  ValidationSeverity,
  type ApiRequest,
  type ApiResponse,
  type ValidationResult,
  type VersionRange,
  type ValidationContext
} from '../apiVersionValidator';

describe('ApiVersionValidator', () => {
  let validator: ApiVersionValidator;

  beforeEach(() => {
    validator = new ApiVersionValidator();
  });

  describe('validateVersion', () => {
    it('should validate supported API version', () => {
      const result = validator.validateVersion('1.0.0');
      
      expect(result.isValid).toBe(true);
      expect(result.version).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        versionString: '1.0.0'
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported API version', () => {
      const result = validator.validateVersion('3.0.0');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('不支持的API版本: 3.0.0');
      expect(result.supportedVersions).toBeDefined();
    });

    it('should handle malformed version strings', () => {
      const result = validator.validateVersion('invalid-version');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('无效的版本格式: invalid-version');
    });

    it('should validate prerelease versions', () => {
      const result = validator.validateVersion('1.1.0-beta.1');
      
      expect(result.isValid).toBe(true);
      expect(result.version?.prerelease).toBe('beta.1');
      expect(result.warnings).toContain('使用预发布版本可能存在稳定性风险');
    });
  });

  describe('validateRequest', () => {
    it('should validate request with correct version', async () => {
      const request: ApiRequest = {
        version: '1.0.0',
        endpoint: '/api/geometry/process',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          geometryId: 'test-001',
          data: { vertices: [], faces: [] }
        },
        timestamp: Date.now()
      };

      const result = await validator.validateRequest(request);
      
      expect(result.isValid).toBe(true);
      expect(result.validatedRequest).toBeDefined();
      expect(result.validatedRequest?.version).toBe('1.0.0');
    });

    it('should reject request with unsupported version', async () => {
      const request: ApiRequest = {
        version: '2.5.0',
        endpoint: '/api/geometry/process',
        method: 'POST',
        headers: {},
        body: {},
        timestamp: Date.now()
      };

      const result = await validator.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('不支持的API版本: 2.5.0');
    });

    it('should validate deprecated version with warning', async () => {
      const request: ApiRequest = {
        version: '0.9.0',
        endpoint: '/api/geometry/process',
        method: 'POST',
        headers: {},
        body: {},
        timestamp: Date.now()
      };

      const result = await validator.validateRequest(request);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('使用已弃用的API版本: 0.9.0');
      expect(result.migrationSuggested).toBe(true);
      expect(result.recommendedVersion).toBe('1.1.0');
    });

    it('should validate endpoint compatibility', async () => {
      const request: ApiRequest = {
        version: '1.0.0',
        endpoint: '/api/v2/new-feature', // v2端点在v1.0.0中不存在
        method: 'GET',
        headers: {},
        body: {},
        timestamp: Date.now()
      };

      const result = await validator.validateRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('端点 /api/v2/new-feature 在版本 1.0.0 中不可用');
    });
  });

  describe('validateResponse', () => {
    it('should validate response format compatibility', async () => {
      const response: ApiResponse = {
        version: '1.0.0',
        status: 200,
        data: {
          geometryId: 'test-001',
          processedGeometry: {
            vertices: new Float32Array([0, 0, 0]),
            faces: new Uint32Array([0, 1, 2])
          }
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timestamp: Date.now()
      };

      const result = await validator.validateResponse(response, '1.0.0');
      
      expect(result.isValid).toBe(true);
      expect(result.compatibilityLevel).toBe('FULL_COMPATIBLE');
    });

    it('should detect response format changes', async () => {
      const response: ApiResponse = {
        version: '1.1.0',
        status: 200,
        data: {
          geometryId: 'test-001',
          processedGeometry: {
            vertices: new Float32Array([0, 0, 0]),
            faces: new Uint32Array([0, 1, 2]),
            // v1.1.0新增字段
            qualityAssessment: { score: 0.95 },
            optimizationHints: []
          }
        },
        headers: {},
        timestamp: Date.now()
      };

      const result = await validator.validateResponse(response, '1.0.0');
      
      expect(result.isValid).toBe(true);
      expect(result.compatibilityLevel).toBe('BACKWARD_COMPATIBLE');
      expect(result.warnings).toContain('响应包含新版本字段，可能被忽略');
    });

    it('should detect breaking changes', async () => {
      const response: ApiResponse = {
        version: '2.0.0',
        status: 200,
        data: {
          // v2.0.0中geometryId改名为id
          id: 'test-001',
          geometry: {
            vertexData: new Float32Array([0, 0, 0]),
            faceData: new Uint32Array([0, 1, 2])
          }
        },
        headers: {},
        timestamp: Date.now()
      };

      const result = await validator.validateResponse(response, '1.0.0');
      
      expect(result.isValid).toBe(false);
      expect(result.compatibilityLevel).toBe('INCOMPATIBLE');
      expect(result.errors).toContain('响应格式存在破坏性变更');
    });
  });

  describe('checkCompatibility', () => {
    it('should check full compatibility', () => {
      const result = validator.checkCompatibility('1.0.0', '1.0.0');
      
      expect(result.level).toBe('FULL_COMPATIBLE');
      expect(result.score).toBe(1.0);
      expect(result.migrationRequired).toBe(false);
    });

    it('should check backward compatibility', () => {
      const result = validator.checkCompatibility('1.0.0', '1.1.0');
      
      expect(result.level).toBe('BACKWARD_COMPATIBLE');
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.migrationRequired).toBe(false);
      expect(result.warnings).toContain('目标版本包含新功能，可能无法完全利用');
    });

    it('should check forward compatibility', () => {
      const result = validator.checkCompatibility('1.1.0', '1.0.0');
      
      expect(result.level).toBe('PARTIAL_COMPATIBLE');
      expect(result.score).toBeLessThan(0.9);
      expect(result.warnings).toContain('向前兼容可能丢失部分功能');
    });

    it('should detect incompatibility', () => {
      const result = validator.checkCompatibility('1.0.0', '2.0.0');
      
      expect(result.level).toBe('INCOMPATIBLE');
      expect(result.score).toBeLessThan(0.5);
      expect(result.migrationRequired).toBe(true);
      expect(result.errors).toContain('主版本号变更，存在破坏性更改');
    });
  });

  describe('validateVersionRange', () => {
    it('should validate version within range', () => {
      const range: VersionRange = {
        min: '1.0.0',
        max: '1.5.0',
        excludePrerelease: true
      };

      expect(validator.validateVersionRange('1.2.0', range)).toBe(true);
      expect(validator.validateVersionRange('1.0.0', range)).toBe(true);
      expect(validator.validateVersionRange('1.5.0', range)).toBe(true);
    });

    it('should reject version outside range', () => {
      const range: VersionRange = {
        min: '1.0.0',
        max: '1.5.0'
      };

      expect(validator.validateVersionRange('0.9.0', range)).toBe(false);
      expect(validator.validateVersionRange('1.6.0', range)).toBe(false);
      expect(validator.validateVersionRange('2.0.0', range)).toBe(false);
    });

    it('should handle prerelease exclusion', () => {
      const range: VersionRange = {
        min: '1.0.0',
        max: '1.5.0',
        excludePrerelease: true
      };

      expect(validator.validateVersionRange('1.2.0-alpha.1', range)).toBe(false);
      expect(validator.validateVersionRange('1.2.0', range)).toBe(true);
    });
  });
});

describe('VersionValidationRule', () => {
  it('should create endpoint validation rule', () => {
    const rule = new VersionValidationRule(
      'endpoint-compatibility',
      ValidationSeverity.ERROR,
      'Endpoint compatibility check',
      (context: ValidationContext) => {
        if (!context.request?.endpoint) return { valid: true };
        
        const version = context.version;
        const endpoint = context.request.endpoint;
        
        // v1.0.0不支持v2 API端点
        if (version?.major === 1 && version?.minor === 0 && endpoint.includes('/v2/')) {
          return {
            valid: false,
            message: `端点 ${endpoint} 在版本 ${version.versionString} 中不可用`
          };
        }
        
        return { valid: true };
      }
    );

    expect(rule.id).toBe('endpoint-compatibility');
    expect(rule.severity).toBe(ValidationSeverity.ERROR);
    expect(rule.description).toBe('Endpoint compatibility check');
  });

  it('should validate using custom rule', () => {
    const rule = new VersionValidationRule(
      'test-rule',
      ValidationSeverity.WARNING,
      'Test validation rule',
      (context) => {
        if (context.version?.major === 0) {
          return {
            valid: true,
            message: '使用实验性版本'
          };
        }
        return { valid: true };
      }
    );

    const context: ValidationContext = {
      version: { major: 0, minor: 9, patch: 0, versionString: '0.9.0' }
    };

    const result = rule.validate(context);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('使用实验性版本');
  });
});

describe('Version Migration Validation', () => {
  let validator: ApiVersionValidator;

  beforeEach(() => {
    validator = new ApiVersionValidator();
  });

  it('should validate migration path exists', () => {
    const result = validator.validateMigrationPath('1.0.0', '1.1.0');
    
    expect(result.pathExists).toBe(true);
    expect(result.migrationSteps).toBeDefined();
    expect(result.estimatedComplexity).toBe('simple');
  });

  it('should detect missing migration path', () => {
    const result = validator.validateMigrationPath('1.0.0', '3.0.0');
    
    expect(result.pathExists).toBe(false);
    expect(result.errors).toContain('无可用的迁移路径从 1.0.0 到 3.0.0');
    expect(result.estimatedComplexity).toBe('impossible');
  });

  it('should calculate migration complexity', () => {
    const simpleResult = validator.validateMigrationPath('1.0.0', '1.0.1');
    expect(simpleResult.estimatedComplexity).toBe('trivial');

    const moderateResult = validator.validateMigrationPath('1.0.0', '1.1.0');
    expect(moderateResult.estimatedComplexity).toBe('simple');

    const complexResult = validator.validateMigrationPath('1.0.0', '1.2.0');
    expect(complexResult.estimatedComplexity).toBe('moderate');
  });
});

describe('Security Validation', () => {
  let validator: ApiVersionValidator;

  beforeEach(() => {
    validator = new ApiVersionValidator();
  });

  it('should validate API request security', async () => {
    const secureRequest: ApiRequest = {
      version: '1.1.0',
      endpoint: '/api/geometry/process',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: {
        geometryId: 'test-001',
        data: { vertices: [], faces: [] }
      },
      timestamp: Date.now()
    };

    const result = await validator.validateSecurity(secureRequest);
    
    expect(result.isSecure).toBe(true);
    expect(result.securityLevel).toBe('HIGH');
  });

  it('should detect security vulnerabilities', async () => {
    const vulnerableRequest: ApiRequest = {
      version: '0.8.0', // 已知存在安全漏洞的版本
      endpoint: '/api/geometry/process',
      method: 'POST',
      headers: {},
      body: {
        // 潜在的脚本注入
        geometryId: '<script>alert("xss")</script>',
        data: {}
      },
      timestamp: Date.now()
    };

    const result = await validator.validateSecurity(vulnerableRequest);
    
    expect(result.isSecure).toBe(false);
    expect(result.securityLevel).toBe('LOW');
    expect(result.vulnerabilities).toContain('VERSION_VULNERABILITY');
    expect(result.vulnerabilities).toContain('XSS_RISK');
  });

  it('should validate deprecated version security', async () => {
    const deprecatedRequest: ApiRequest = {
      version: '0.9.0',
      endpoint: '/api/geometry/process',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer token'
      },
      body: {},
      timestamp: Date.now()
    };

    const result = await validator.validateSecurity(deprecatedRequest);
    
    expect(result.isSecure).toBe(true);
    expect(result.securityLevel).toBe('MEDIUM');
    expect(result.warnings).toContain('使用已弃用版本可能存在安全风险');
  });
});

describe('Performance Tests', () => {
  let validator: ApiVersionValidator;

  beforeEach(() => {
    validator = new ApiVersionValidator();
  });

  it('should validate versions efficiently', () => {
    const startTime = performance.now();
    
    // 批量验证1000个版本
    const versions = Array.from({ length: 1000 }, (_, i) => 
      `1.${Math.floor(i / 100)}.${i % 100}`
    );
    
    const results = versions.map(version => validator.validateVersion(version));
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // 应在100ms内完成
    expect(results.length).toBe(1000);
    expect(results.filter(r => r.isValid).length).toBeGreaterThan(0);
  });

  it('should handle concurrent validation requests', async () => {
    const createRequest = (id: number): ApiRequest => ({
      version: '1.0.0',
      endpoint: '/api/geometry/process',
      method: 'POST',
      headers: {},
      body: { geometryId: `test-${id}` },
      timestamp: Date.now()
    });

    const concurrentRequests = Array.from({ length: 100 }, (_, i) => 
      validator.validateRequest(createRequest(i))
    );

    const startTime = performance.now();
    const results = await Promise.all(concurrentRequests);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(500); // 应在500ms内完成
    expect(results.length).toBe(100);
    expect(results.every(r => r.isValid)).toBe(true);
  });
});

describe('Edge Cases', () => {
  let validator: ApiVersionValidator;

  beforeEach(() => {
    validator = new ApiVersionValidator();
  });

  it('should handle null and undefined inputs', () => {
    expect(validator.validateVersion(null as any).isValid).toBe(false);
    expect(validator.validateVersion(undefined as any).isValid).toBe(false);
    expect(validator.validateVersion('').isValid).toBe(false);
  });

  it('should handle malformed requests', async () => {
    const malformedRequest = {
      // 缺少必需字段
      endpoint: '/api/test'
    } as any;

    const result = await validator.validateRequest(malformedRequest);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('请求格式不正确');
  });

  it('should handle extremely long version strings', () => {
    const longVersionString = '1.0.0-' + 'a'.repeat(10000);
    const result = validator.validateVersion(longVersionString);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('版本字符串过长');
  });

  it('should handle circular dependency in validation rules', () => {
    // 测试验证规则中的循环依赖处理
    const customValidator = new ApiVersionValidator();
    
    // 添加可能导致循环的验证规则
    customValidator.addRule(new VersionValidationRule(
      'circular-test',
      ValidationSeverity.WARNING,
      'Circular dependency test',
      (context) => {
        // 这个规则引用自身进行验证（模拟循环依赖）
        return { valid: true };
      }
    ));

    const result = customValidator.validateVersion('1.0.0');
    expect(result.isValid).toBe(true); // 应该能正常处理
  });
});