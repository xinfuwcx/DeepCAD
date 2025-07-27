/**
 * Mapbox + Three.js 集成测试
 * 2号几何专家 - 依赖检查和数据流测试
 */

// 测试依赖导入
export const testDependencies = () => {
  const results = {
    threeJS: false,
    mapboxGL: false,
    geographicalService: false,
    components: false,
    errors: [] as string[]
  };

  try {
    // 测试 Three.js
    const THREE = require('three');
    if (THREE && THREE.Scene && THREE.WebGLRenderer && THREE.PerspectiveCamera) {
      results.threeJS = true;
      console.log('✅ Three.js 依赖正常');
    } else {
      results.errors.push('Three.js 核心组件缺失');
    }
  } catch (error) {
    results.errors.push(`Three.js 导入失败: ${error.message}`);
  }

  try {
    // 测试 Mapbox GL
    const mapboxgl = require('mapbox-gl');
    if (mapboxgl && mapboxgl.Map && mapboxgl.MercatorCoordinate) {
      results.mapboxGL = true;
      console.log('✅ Mapbox GL 依赖正常');
    } else {
      results.errors.push('Mapbox GL 核心组件缺失');
    }
  } catch (error) {
    results.errors.push(`Mapbox GL 导入失败: ${error.message}`);
    console.log('⚠️ Mapbox GL 依赖缺失，需要安装');
  }

  return results;
};

// 测试地理服务数据流
export const testGeographicalService = () => {
  const results = {
    serviceInit: false,
    projectAdd: false,
    dataSync: false,
    errors: [] as string[]
  };

  try {
    // 导入地理服务
    import('../services/geographicalVisualizationService').then((module) => {
      const service = module.geographicalVisualizationService;
      
      if (service && typeof service.addProject === 'function') {
        results.serviceInit = true;
        console.log('✅ 地理可视化服务初始化正常');

        // 测试添加项目
        const testProject = {
          id: 'test-project-001',
          name: '测试深基坑项目',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
            elevation: 50
          },
          status: 'active' as const,
          depth: 15,
          boundaries: [],
          excavationDepth: 15,
          supportStructures: [],
          geologicalLayers: [],
          materials: []
        };

        try {
          const projectId = service.addProject(testProject);
          if (projectId) {
            results.projectAdd = true;
            console.log('✅ 项目添加功能正常');

            // 测试数据同步
            const projects = service.getProjects();
            if (projects.length > 0) {
              results.dataSync = true;
              console.log('✅ 数据同步功能正常');
            } else {
              results.errors.push('数据同步失败 - 项目列表为空');
            }
          } else {
            results.errors.push('项目添加失败 - 未返回项目ID');
          }
        } catch (error) {
          results.errors.push(`项目操作失败: ${error.message}`);
        }
      } else {
        results.errors.push('地理服务接口不完整');
      }
    }).catch((error) => {
      results.errors.push(`地理服务导入失败: ${error.message}`);
    });
  } catch (error) {
    results.errors.push(`地理服务测试失败: ${error.message}`);
  }

  return results;
};

// 测试组件导入
export const testComponentImports = () => {
  const results = {
    mapboxFusion: false,
    epicControl: false,
    errors: [] as string[]
  };

  try {
    // 测试 MapboxThreeJSFusion 组件
    import('../components/geographical/MapboxThreeJSFusion').then((module) => {
      if (module.default || module.MapboxThreeJSFusion) {
        results.mapboxFusion = true;
        console.log('✅ MapboxThreeJSFusion 组件导入正常');
      } else {
        results.errors.push('MapboxThreeJSFusion 组件导入失败');
      }
    }).catch((error) => {
      results.errors.push(`MapboxThreeJSFusion 组件导入错误: ${error.message}`);
    });

    // 测试 EpicControlCenter 组件
    import('../views/EpicControlCenter').then((module) => {
      if (module.default) {
        results.epicControl = true;
        console.log('✅ EpicControlCenter 组件导入正常');
      } else {
        results.errors.push('EpicControlCenter 组件导入失败');
      }
    }).catch((error) => {
      results.errors.push(`EpicControlCenter 组件导入错误: ${error.message}`);
    });
  } catch (error) {
    results.errors.push(`组件测试失败: ${error.message}`);
  }

  return results;
};

// 综合测试函数
export const runFullIntegrationTest = async () => {
  console.log('🚀 开始Mapbox + Three.js集成测试...\n');

  const dependencyResults = testDependencies();
  const serviceResults = testGeographicalService();
  const componentResults = testComponentImports();

  // 等待异步测试完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  const summary = {
    dependencies: dependencyResults,
    service: serviceResults,
    components: componentResults,
    overall: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // 统计结果
  const allResults = [dependencyResults, serviceResults, componentResults];
  allResults.forEach(result => {
    Object.keys(result).forEach(key => {
      if (key !== 'errors' && typeof result[key] === 'boolean') {
        if (result[key]) {
          summary.overall.passed++;
        } else {
          summary.overall.failed++;
        }
      }
    });
  });

  // 统计警告
  allResults.forEach(result => {
    summary.overall.warnings += result.errors?.length || 0;
  });

  console.log('\n📊 测试结果汇总:');
  console.log(`✅ 通过: ${summary.overall.passed}`);
  console.log(`❌ 失败: ${summary.overall.failed}`);
  console.log(`⚠️ 警告: ${summary.overall.warnings}`);

  // 输出详细错误
  if (summary.overall.warnings > 0) {
    console.log('\n⚠️ 详细警告信息:');
    allResults.forEach((result, index) => {
      if (result.errors && result.errors.length > 0) {
        const testNames = ['依赖测试', '服务测试', '组件测试'];
        console.log(`\n${testNames[index]}:`);
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    });
  }

  return summary;
};

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  // 将测试函数挂载到全局对象，方便在控制台调用
  (window as any).testMapboxIntegration = {
    runFullTest: runFullIntegrationTest,
    testDependencies,
    testGeographicalService,
    testComponentImports
  };
  
  console.log('💡 测试工具已加载！在控制台中使用:');
  console.log('   window.testMapboxIntegration.runFullTest()');
}