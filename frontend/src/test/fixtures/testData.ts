/**
 * 测试数据生成器
 * 3号计算专家 - 为深基坑CAE平台提供标准化测试数据
 */

import type { 
  DeepExcavationParameters,
  PyVistaStressData,
  PyVistaSeepageData,
  SystemIntegrationConfig
} from '../../types';

/**
 * 标准深基坑工程测试用例
 */
export const STANDARD_EXCAVATION_CASES = {
  smallScale: {
    name: '小型基坑测试用例',
    parameters: {
      geometry: {
        excavationDepth: 8,
        excavationWidth: 20,
        excavationLength: 30,
        retainingWallDepth: 12,
        groundwaterLevel: -3
      },
      soilProperties: {
        layers: [
          {
            name: '填土',
            topElevation: 0,
            bottomElevation: -2,
            cohesion: 10,
            frictionAngle: 15,
            unitWeight: 18,
            elasticModulus: 8,
            poissonRatio: 0.35,
            permeability: 1e-6,
            compressionIndex: 0.3,
            swellingIndex: 0.05
          },
          {
            name: '粘土',
            topElevation: -2,
            bottomElevation: -10,
            cohesion: 25,
            frictionAngle: 18,
            unitWeight: 19.5,
            elasticModulus: 15,
            poissonRatio: 0.32,
            permeability: 5e-8,
            compressionIndex: 0.25,
            swellingIndex: 0.03
          }
        ],
        consolidationState: 'normally_consolidated' as const
      },
      retainingSystem: {
        wallType: 'diaphragm_wall' as const,
        wallThickness: 0.6,
        wallMaterial: {
          elasticModulus: 30000,
          poissonRatio: 0.2,
          density: 2500,
          tensileStrength: 3.0,
          compressiveStrength: 35.0
        },
        supportLevels: [
          {
            elevation: -1.5,
            supportType: 'steel_strut',
            spacing: 6.0,
            prestressForce: 200,
            stiffness: 50000
          }
        ]
      }
    },
    expectedResults: {
      maxDeformation: 25, // mm
      maxStress: 180, // kPa
      safetyFactor: 1.35,
      computationTime: 5000 // ms
    }
  },

  largeScale: {
    name: '大型复杂基坑测试用例',
    parameters: {
      geometry: {
        excavationDepth: 20,
        excavationWidth: 80,
        excavationLength: 120,
        retainingWallDepth: 25,
        groundwaterLevel: -4
      },
      soilProperties: {
        layers: [
          {
            name: '杂填土',
            topElevation: 0,
            bottomElevation: -3,
            cohesion: 15,
            frictionAngle: 12,
            unitWeight: 18,
            elasticModulus: 5,
            poissonRatio: 0.35,
            permeability: 1e-6,
            compressionIndex: 0.4,
            swellingIndex: 0.08
          },
          {
            name: '粉质粘土',
            topElevation: -3,
            bottomElevation: -15,
            cohesion: 30,
            frictionAngle: 20,
            unitWeight: 19.8,
            elasticModulus: 20,
            poissonRatio: 0.3,
            permeability: 2e-8,
            compressionIndex: 0.2,
            swellingIndex: 0.02
          },
          {
            name: '砂层',
            topElevation: -15,
            bottomElevation: -30,
            cohesion: 0,
            frictionAngle: 32,
            unitWeight: 20.5,
            elasticModulus: 35,
            poissonRatio: 0.25,
            permeability: 1e-4,
            compressionIndex: 0.1,
            swellingIndex: 0.01
          }
        ],
        consolidationState: 'over_consolidated' as const
      },
      retainingSystem: {
        wallType: 'diaphragm_wall' as const,
        wallThickness: 1.0,
        wallMaterial: {
          elasticModulus: 32000,
          poissonRatio: 0.18,
          density: 2600,
          tensileStrength: 3.5,
          compressiveStrength: 40.0
        },
        supportLevels: [
          {
            elevation: -2,
            supportType: 'steel_strut',
            spacing: 8.0,
            prestressForce: 500,
            stiffness: 80000
          },
          {
            elevation: -6,
            supportType: 'steel_strut',
            spacing: 8.0,
            prestressForce: 600,
            stiffness: 85000
          },
          {
            elevation: -12,
            supportType: 'steel_strut',
            spacing: 8.0,
            prestressForce: 700,
            stiffness: 90000
          }
        ]
      }
    },
    expectedResults: {
      maxDeformation: 45, // mm
      maxStress: 280, // kPa
      safetyFactor: 1.25,
      computationTime: 15000 // ms
    }
  }
};

/**
 * 生成模拟应力数据
 */
export function generateMockStressData(nodeCount: number = 1000): PyVistaStressData {
  const vertices = new Float32Array(nodeCount * 3);
  const faces = new Uint32Array((nodeCount - 2) * 3);
  const normals = new Float32Array(nodeCount * 3);
  const vonMises = new Float32Array(nodeCount);
  
  // 生成网格顶点
  for (let i = 0; i < nodeCount; i++) {
    vertices[i * 3] = (Math.random() - 0.5) * 100; // x
    vertices[i * 3 + 1] = (Math.random() - 0.5) * 100; // y  
    vertices[i * 3 + 2] = Math.random() * -20; // z (地下)
    
    // 生成法向量
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 0;
    normals[i * 3 + 2] = 1;
    
    // 生成von Mises应力 (0-300 kPa)
    vonMises[i] = Math.random() * 300;
  }
  
  // 生成三角形面
  for (let i = 0; i < faces.length / 3; i++) {
    faces[i * 3] = i;
    faces[i * 3 + 1] = (i + 1) % nodeCount;
    faces[i * 3 + 2] = (i + 2) % nodeCount;
  }

  return {
    meshData: {
      vertices,
      faces,
      normals,
      areas: new Float32Array(faces.length / 3).fill(1.0)
    },
    stressFields: {
      principalStress: {
        sigma1: vonMises.map(v => v * 1.2),
        sigma2: vonMises.map(v => v * 0.8),
        sigma3: vonMises.map(v => v * 0.3),
        directions: new Float32Array(nodeCount * 9).fill(0)
      },
      stressComponents: {
        sigmaX: vonMises.map(v => v * 0.7),
        sigmaY: vonMises.map(v => v * 0.6),
        sigmaZ: vonMises.map(v => v * 0.5),
        tauXY: vonMises.map(v => v * 0.2),
        tauYZ: vonMises.map(v => v * 0.1),
        tauZX: vonMises.map(v => v * 0.15)
      },
      equivalentStress: {
        vonMises,
        tresca: vonMises.map(v => v * 0.9),
        maximumShear: vonMises.map(v => v * 0.5)
      },
      statistics: {
        min: Math.min(...vonMises),
        max: Math.max(...vonMises),
        mean: vonMises.reduce((a, b) => a + b) / vonMises.length,
        std: 50
      }
    },
    boundaryConditions: {
      displacement: [],
      force: [],
      pressure: []
    },
    timeStepData: [],
    metadata: {
      analysisType: 'static' as const,
      units: {
        stress: 'Pa',
        displacement: 'm',
        force: 'N'
      },
      coordinate_system: 'cartesian',
      software_version: 'DeepCAD-Test-v1.0'
    }
  };
}

/**
 * 生成模拟渗流数据
 */
export function generateMockSeepageData(nodeCount: number = 1000): PyVistaSeepageData {
  const vertices = new Float32Array(nodeCount * 3);
  const cells = new Uint32Array((nodeCount - 2) * 3);
  const velocityMagnitude = new Float32Array(nodeCount);
  const poreWaterPressure = new Float32Array(nodeCount);
  
  for (let i = 0; i < nodeCount; i++) {
    vertices[i * 3] = (Math.random() - 0.5) * 100;
    vertices[i * 3 + 1] = (Math.random() - 0.5) * 100;
    vertices[i * 3 + 2] = Math.random() * -20;
    
    velocityMagnitude[i] = Math.random() * 1e-5; // m/s
    poreWaterPressure[i] = Math.random() * 200; // kPa
  }

  return {
    meshData: {
      vertices,
      cells,
      cellTypes: new Uint8Array(cells.length / 3).fill(5), // VTK_TRIANGLE
      normals: new Float32Array(nodeCount * 3).fill(0)
    },
    seepageFields: {
      velocity: {
        vectors: new Float32Array(nodeCount * 3),
        magnitude: velocityMagnitude,
        direction: new Float32Array(nodeCount),
        range: [Math.min(...velocityMagnitude), Math.max(...velocityMagnitude)]
      },
      pressure: {
        values: poreWaterPressure,
        hydraulicHead: new Float32Array(nodeCount),
        pressureGradient: new Float32Array(nodeCount),
        range: [Math.min(...poreWaterPressure), Math.max(...poreWaterPressure)]
      },
      permeability: {
        horizontal: new Float32Array(nodeCount).fill(1e-6),
        vertical: new Float32Array(nodeCount).fill(5e-7),
        anisotropyRatio: new Float32Array(nodeCount).fill(0.5),
        conductivity: new Float32Array(nodeCount).fill(1e-6)
      },
      hydraulicGradient: {
        values: new Float32Array(nodeCount),
        directions: new Float32Array(nodeCount * 3),
        criticalZones: new Float32Array(nodeCount),
        pipingRisk: new Float32Array(nodeCount)
      }
    },
    boundaryConditions: {
      constantHead: [],
      constantFlow: [],
      impermeable: [],
      seepageFace: []
    },
    wellData: [],
    statistics: {
      flow: {
        maxVelocity: Math.max(...velocityMagnitude),
        avgVelocity: velocityMagnitude.reduce((a, b) => a + b) / velocityMagnitude.length,
        totalInflow: 100,
        totalOutflow: 95
      },
      pressure: {
        maxPressure: Math.max(...poreWaterPressure),
        minPressure: Math.min(...poreWaterPressure),
        avgGradient: 0.5
      },
      risk: {
        pipingRiskNodes: 0,
        highGradientCells: 0,
        criticalZoneArea: 0
      }
    }
  };
}

/**
 * 生成系统集成测试配置
 */
export function generateTestSystemConfig(): SystemIntegrationConfig {
  return {
    computation: {
      maxConcurrentTasks: 2,
      memoryLimit: 1024, // 1GB for testing
      timeoutDuration: 30, // 30s for testing
      enableProgressTracking: true,
      enableResultCaching: false // 禁用缓存以确保测试一致性
    },
    gpu: {
      enableWebGPU: false, // 测试环境使用mock
      fallbackToWebGL: true,
      maxBufferSize: 256, // 256MB for testing
      enableGPUProfiling: false
    },
    visualization: {
      renderQuality: 'low' as const, // 测试使用低质量
      enableRealTimeUpdate: false,
      maxFrameRate: 30,
      adaptiveQuality: false
    },
    analysis: {
      enableAutoPostprocessing: true,
      defaultAnalysisTasks: ['stress_analysis'],
      safetyStandards: {
        deformation: {
          maxWallDeflection: 30.0,
          maxGroundSettlement: 20.0,
          maxDifferentialSettlement: 10.0,
          maxFoundationHeave: 15.0,
          deformationRate: 2.0
        },
        stress: {
          maxWallStress: 25.0,
          maxSoilStress: 300.0,
          maxSupportForce: 1000.0,
          stressConcentrationFactor: 2.0
        },
        stability: {
          overallStabilityFactor: 1.25,
          localStabilityFactor: 1.15,
          upliftStabilityFactor: 1.1,
          pipingStabilityFactor: 1.5,
          slopStabilityFactor: 1.3
        },
        seepage: {
          maxInflowRate: 100.0,
          maxHydraulicGradient: 0.8,
          maxSeepageVelocity: 1e-5,
          maxPoreWaterPressure: 200.0
        },
        construction: {
          maxExcavationRate: 2.0,
          minSupportInterval: 1.0,
          maxUnsupportedHeight: 3.0,
          weatherRestrictions: ['heavy_rain']
        }
      }
    },
    integration: {
      enableHotReload: false,
      enableDebugMode: true, // 测试启用调试
      logLevel: 'debug' as const,
      enablePerformanceMonitoring: true
    }
  };
}

/**
 * 测试用的Three.js场景Mock
 */
export function createMockThreeScene() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    children: [],
    userData: {},
    dispose: vi.fn()
  };
}

/**
 * 性能基准测试数据
 */
export const PERFORMANCE_BENCHMARKS = {
  computation: {
    smallExcavation: {
      maxTime: 5000, // 5秒
      maxMemory: 512 // 512MB
    },
    largeExcavation: {
      maxTime: 15000, // 15秒
      maxMemory: 2048 // 2GB
    }
  },
  rendering: {
    stressCloud: {
      maxFrameTime: 33, // 30fps
      maxInitTime: 2000 // 2秒初始化
    },
    deformationAnimation: {
      maxFrameTime: 16, // 60fps
      maxSetupTime: 3000 // 3秒设置
    }
  },
  integration: {
    systemInitialization: {
      maxTime: 10000, // 10秒
      successRate: 0.95 // 95%成功率
    }
  }
};