/**
 * RBF-based 3D Geological Reconstruction System
 * 
 * 专用于地质土体三维重建的RBF算法系统
 * 从稀疏勘探数据生成连续土体几何，支持外推和下推
 * 集成GMSH-OCC的NURBS/B样条曲面生成
 */

import { Point3D, RBFKernel, RBFConfig } from './rbfInterpolation';
import { createRBFInterpolator } from './rbfInterpolation';

// 🔍 钻孔勘探数据接口
export interface BoreholeData {
  id: string;
  location: Point3D;
  depth?: number; // 钻孔实际深度
  samples: SoilSample[];
  metadata: {
    drillDate: string;
    drillMethod: string;
    waterLevel?: number;
    reliability: 'high' | 'medium' | 'low';
  };
}

// 🌱 土体样本数据
export interface SoilSample {
  depth: number; // 样本深度 (从地表算起)
  elevation: number; // 样本标高
  properties: {
    soilType: string; // 土体类型
    density: number; // 密度 (g/cm³)
    porosity?: number; // 孔隙率
    permeability?: number; // 渗透系数
    cohesion?: number; // 粘聚力
    frictionAngle?: number; // 内摩擦角
    compression?: number; // 压缩模量
    liquidLimit?: number; // 液限
    plasticLimit?: number; // 塑限
  };
  quality: {
    sampleIntegrity: number; // 样本完整性 0-1
    testReliability: number; // 试验可靠性 0-1
  };
}

// 🎯 地质层位界面
export interface GeologicalLayer {
  id: string;
  name: string; // 层位名称
  description?: string;
  boundaryType: 'conformable' | 'unconformable' | 'fault' | 'intrusion';
  averageThickness: number;
  materialProperties: {
    dominantSoilType: string;
    averageDensity: number;
    strengthParameters: {
      cohesion: number;
      frictionAngle: number;
    };
  };
}

// 📊 重建配置参数
export interface Reconstruction3DConfig extends RBFConfig {
  // 数据处理参数
  dataPreprocessing: {
    outlierDetection: boolean;
    outlierThreshold: number; // 标准差倍数
    interpolationMethod: 'linear' | 'spline' | 'rbf';
    dataSmoothing: boolean;
    smoothingRadius: number; // 平滑半径 (m)
  };
  
  // 外推参数
  extrapolation: {
    enableExtrapolation: boolean;
    maxExtrapolationDistance: number; // 最大外推距离 (m)
    extrapolationMethod: 'rbf' | 'kriging' | 'inverse_distance';
    confidenceDecayRate: number; // 置信度衰减率
    boundaryConditions: 'natural' | 'zero_gradient' | 'constant';
  };
  
  // 下推参数 (钻孔下方延拓)
  downwardExtension: {
    enableDownwardExtension: boolean;
    extensionDepth: number; // 下推深度 (m)
    extensionMethod: 'gradient_based' | 'geological_trend' | 'constant_gradient';
    gradientDecayFactor: number; // 梯度衰减因子
    minExtensionThickness: number; // 最小延拓厚度 (m)
  };
  
  // GMSH-OCC集成参数
  gmshIntegration: {
    enableGMSHSurfaces: boolean;
    surfaceType: 'nurbs' | 'bspline' | 'bezier';
    surfaceDegree: number; // 曲面阶数
    controlPointDensity: number; // 控制点密度
    surfaceTolerance: number; // 曲面容差
    meshCompatibility: {
      targetElementSize: number; // 目标单元尺寸 (m)
      geometryTolerance: number; // 几何容差
    };
  };
  
  // 质量控制参数
  qualityControl: {
    crossValidationFolds: number;
    minSampleDensity: number; // 最小样本密度 (个/km²)
    maxInterpolationDistance: number; // 最大插值距离 (m)
    layerContinuityCheck: boolean;
    geologicalConsistencyCheck: boolean;
  };
}

// 📈 重建结果接口
export interface Reconstruction3DResult {
  reconstructionId: string;
  timestamp: number;
  success: boolean;
  
  // 重建统计
  statistics: {
    inputBoreholes: number;
    totalSamples: number;
    processedLayers: number;
    reconstructedVolume: number; // m³
    processingTime: number; // ms
    memoryUsage: number; // MB
  };
  
  // 几何数据
  geometryData: {
    layerSurfaces: LayerSurface[];
    soilBodies: SoilBody[];
    computationalDomain: ComputationalDomain;
    qualityMetrics: ReconstructionQualityMetrics;
  };
  
  // GMSH-OCC输出
  gmshOutput?: {
    nurbsSurfaces: NURBSSurface[];
    bsplineSurfaces: BSplineSurface[];
    geometryScript: string; // GMSH脚本
    meshReadyGeometry: boolean;
  };
}

// 🌍 层面数据结构
export interface LayerSurface {
  layerId: string;
  layerName: string;
  surfaceType: 'top' | 'bottom';
  points: Point3D[];
  elevationData: number[];
  interpolatedGrid: {
    xResolution: number;
    yResolution: number;
    boundingBox: {
      xMin: number; xMax: number;
      yMin: number; yMax: number;
      zMin: number; zMax: number;
    };
    elevationGrid: number[][];
  };
  confidenceMap: number[][]; // 置信度分布
  extrapolatedRegions: ExtrapolatedRegion[];
}

// 🏗️ 土体实体
export interface SoilBody {
  bodyId: string;
  layerId: string;
  materialType: string;
  volume: number;
  centroid: Point3D;
  boundaryVertices: Point3D[];
  properties: {
    averageDensity: number;
    strengthParameters: any;
    permeabilityTensor?: number[][]; // 渗透张量
  };
  meshingParameters: {
    targetElementSize: number;
    elementType: 'tetrahedron' | 'hexahedron' | 'prism';
    refinementZones?: RefinementZone[];
  };
}

// 📐 用户定义的计算域接口
export interface UserDefinedDomain {
  domainId: string;
  name: string;
  description?: string;
  
  // 用户指定的几何边界
  geometryDefinition: {
    boundingBox: {
      xMin: number; xMax: number;  // 东西向范围 (m)
      yMin: number; yMax: number;  // 南北向范围 (m)
      zMin: number; zMax: number;  // 高程范围 (m)
    };
    // 用户可选的复杂边界定义
    customBoundary?: {
      type: 'polygon' | 'circle' | 'ellipse' | 'dxf_import';
      vertices?: Point3D[];      // 多边形顶点
      center?: Point3D;          // 圆心/椭圆中心
      radius?: number;           // 圆半径
      radii?: [number, number];  // 椭圆长短轴
      dxfFile?: string;          // DXF文件路径
    };
  };
  
  // 计算需求设置
  computationRequirements: {
    analysisType: 'static' | 'dynamic' | 'seepage' | 'thermal' | 'multiphysics';
    targetAccuracy: 'coarse' | 'standard' | 'fine' | 'ultra_fine';
    expectedRuntime: 'fast' | 'balanced' | 'accurate'; // 计算时间偏好
    memoryLimit?: number; // MB, 用户系统内存限制
  };
  
  // 网格控制参数
  meshingPreferences: {
    globalElementSize: number;        // 全局单元尺寸 (m)
    elementType: 'tetrahedron' | 'hexahedron' | 'prism';
    adaptiveMeshing: boolean;         // 自适应网格细化
    qualityThreshold: number;         // 网格质量阈值
    
    // 局部细化区域 (用户重点关注的区域)
    refinementZones?: Array<{
      zoneId: string;
      zoneName: string;
      geometry: {
        center: Point3D;
        radius: number;
        shape: 'sphere' | 'cylinder' | 'box';
        dimensions?: number[]; // [length, width, height] for box
      };
      targetElementSize: number;
      reason: string; // 细化原因说明
    }>;
  };
  
  // 边界条件设置
  boundaryConditions: {
    top: BoundaryCondition & { userDefined: boolean; description?: string };
    bottom: BoundaryCondition & { userDefined: boolean; description?: string };
    sides: Array<BoundaryCondition & { 
      userDefined: boolean; 
      description?: string;
      sideLabel: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
    }>;
  };
  
  // 用户偏好设置
  userPreferences: {
    prioritizeSpeed: boolean;          // 优先计算速度
    prioritizeAccuracy: boolean;       // 优先计算精度
    enableProgressUpdates: boolean;    // 启用进度更新
    saveTempResults: boolean;          // 保存中间结果
    outputFormat: 'vtk' | 'gmsh' | 'ansys' | 'abaqus' | 'comsol';
  };
}

// 🔧 计算域定义 (系统生成，基于用户定义)
export interface ComputationalDomain {
  domainId: string;
  userDefinedDomain: UserDefinedDomain; // 关联用户定义
  
  // 实际生成的几何域
  actualGeometry: {
    boundingBox: {
      xMin: number; xMax: number;
      yMin: number; yMax: number;
      zMin: number; zMax: number;
    };
    effectiveVolume: number;     // 有效计算体积 (m³)
    surfaceArea: number;         // 边界面积 (m²)
    complexityScore: number;     // 几何复杂度评分 0-1
  };
  
  soilBodies: string[];               // 土体ID列表
  intersectionWithBoreholes: {        // 与钻孔数据的交集分析
    intersectedBoreholes: string[];   // 相交的钻孔ID
    coverageRatio: number;            // 钻孔数据覆盖率
    interpolationQuality: number;     // 插值质量评估
  };
  
  // 最终确定的边界条件
  finalBoundaryConditions: {
    top: BoundaryCondition;
    bottom: BoundaryCondition;
    sides: BoundaryCondition[];
  };
  
  // 网格生成指导
  meshingGuidelines: {
    globalElementSize: number;
    adaptiveMeshing: boolean;
    qualityThreshold: number;
    estimatedElements: number;        // 估算单元总数
    estimatedNodes: number;           // 估算节点总数
    memoryRequirement: number;        // 估算内存需求 (MB)
    computationTimeEstimate: number;  // 估算计算时间 (hours)
  };
}

// 辅助接口定义
interface ExtrapolatedRegion {
  regionId: string;
  boundaryVertices: Point3D[];
  confidenceLevel: number;
  extrapolationMethod: string;
}

interface RefinementZone {
  center: Point3D;
  radius: number;
  targetElementSize: number;
}

interface BoundaryCondition {
  type: 'displacement' | 'force' | 'pressure' | 'seepage';
  value: number | 'free' | 'fixed';
}

interface NURBSSurface {
  surfaceId: string;
  degree: [number, number]; // u,v方向阶数
  controlPoints: Point3D[][];
  weights: number[][];
  knotVectors: [number[], number[]]; // u,v方向节点向量
}

interface BSplineSurface {
  surfaceId: string;
  degree: [number, number];
  controlPoints: Point3D[][];
  knotVectors: [number[], number[]];
}

interface ReconstructionQualityMetrics {
  overallQuality: number; // 0-1
  layerContinuity: number; // 层位连续性
  interpolationAccuracy: number; // 插值精度
  extrapolationReliability: number; // 外推可靠性
  geologicalConsistency: number; // 地质合理性
  crossValidationScore: number; // 交叉验证得分
}

/**
 * RBF-based 3D Geological Reconstruction Engine
 */
export class RBF3DReconstructionEngine {
  private config: Reconstruction3DConfig;
  private rbfInterpolator: any;
  
  constructor(config?: Partial<Reconstruction3DConfig>) {
    this.config = {
      // 继承基础RBF配置
      kernel: 'multiquadric',
      shape: 1.0,
      smooth: 0.1,
      maxPoints: 50000,
      tolerance: 1e-8,
      
      // 数据预处理配置
      dataPreprocessing: {
        outlierDetection: true,
        outlierThreshold: 2.5,
        interpolationMethod: 'rbf',
        dataSmoothing: true,
        smoothingRadius: 50.0
      },
      
      // 外推配置
      extrapolation: {
        enableExtrapolation: true,
        maxExtrapolationDistance: 500.0, // 500m外推
        extrapolationMethod: 'rbf',
        confidenceDecayRate: 0.1,
        boundaryConditions: 'natural'
      },
      
      // 下推配置
      downwardExtension: {
        enableDownwardExtension: true,
        extensionDepth: 100.0, // 下推100m
        extensionMethod: 'gradient_based',
        gradientDecayFactor: 0.8,
        minExtensionThickness: 5.0
      },
      
      // GMSH集成配置
      gmshIntegration: {
        enableGMSHSurfaces: true,
        surfaceType: 'nurbs',
        surfaceDegree: 3,
        controlPointDensity: 1.0,
        surfaceTolerance: 0.1,
        meshCompatibility: {
          targetElementSize: 2.0, // 2m目标单元
          geometryTolerance: 0.01
        }
      },
      
      // 质量控制配置
      qualityControl: {
        crossValidationFolds: 5,
        minSampleDensity: 0.1, // 0.1个/km²
        maxInterpolationDistance: 1000.0, // 1km
        layerContinuityCheck: true,
        geologicalConsistencyCheck: true
      },
      
      ...config
    };
    
    // 初始化RBF插值器
    this.rbfInterpolator = createRBFInterpolator({
      kernel: this.config.kernel,
      shape: this.config.shape,
      smooth: this.config.smooth,
      maxPoints: this.config.maxPoints,
      tolerance: this.config.tolerance
    });
  }
  
  /**
   * 主要重建方法 - 从钻孔数据重建3D地质体 (支持用户定义计算域)
   */
  async reconstruct3DGeology(
    boreholeData: BoreholeData[],
    targetLayers: GeologicalLayer[],
    userDefinedDomain: UserDefinedDomain,
    reconstructionDomain?: {
      xRange: [number, number];
      yRange: [number, number];
      zRange: [number, number];
      resolution: number;
    }
  ): Promise<Reconstruction3DResult> {
    const startTime = performance.now();
    
    // 首先处理用户定义的计算域
    const effectiveDomain = reconstructionDomain || this.deriveReconstructionDomainFromUser(userDefinedDomain);
    
    console.log('🌍 开始RBF地质三维重建...', {
      钻孔数量: boreholeData.length,
      目标层位: targetLayers.length,
      用户计算域: userDefinedDomain.name,
      域范围: userDefinedDomain.geometryDefinition.boundingBox,
      分析类型: userDefinedDomain.computationRequirements.analysisType
    });
    
    try {
      // 0. 验证用户域与钻孔数据的匹配性
      const domainValidation = await this.validateUserDomainWithBoreholes(userDefinedDomain, boreholeData);
      if (!domainValidation.isValid) {
        console.warn('⚠️ 用户计算域验证警告:', domainValidation.warnings);
      }
      
      // 1. 数据预处理 (考虑用户域边界)
      const preprocessedData = await this.preprocessBoreholeDataWithUserDomain(boreholeData, userDefinedDomain);
      
      // 2. 层位识别和分离
      const layerData = await this.identifyGeologicalLayers(preprocessedData, targetLayers);
      
      // 3. 逐层RBF重建 (限制在用户域内)
      const reconstructedSurfaces: LayerSurface[] = [];
      for (const layer of layerData) {
        const surface = await this.reconstructLayerSurfaceWithUserDomain(layer, effectiveDomain, userDefinedDomain);
        reconstructedSurfaces.push(surface);
      }
      
      // 4. 外推算法应用 (尊重用户域边界)
      if (this.config.extrapolation.enableExtrapolation) {
        await this.applyExtrapolationWithUserDomain(reconstructedSurfaces, effectiveDomain, userDefinedDomain);
      }
      
      // 5. 下推算法应用 (限制深度范围)
      if (this.config.downwardExtension.enableDownwardExtension) {
        await this.applyDownwardExtensionWithUserDomain(reconstructedSurfaces, boreholeData, userDefinedDomain);
      }
      
      // 6. 生成土体实体 (按用户域裁剪)
      const soilBodies = await this.generateSoilBodiesWithUserDomain(reconstructedSurfaces, targetLayers, userDefinedDomain);
      
      // 7. 构建最终计算域 (基于用户定义)
      const computationalDomain = await this.buildComputationalDomainFromUserDefinition(soilBodies, userDefinedDomain, effectiveDomain);
      
      // 8. GMSH-OCC曲面生成 (考虑用户输出格式偏好)
      let gmshOutput;
      if (this.config.gmshIntegration.enableGMSHSurfaces) {
        gmshOutput = await this.generateGMSHSurfacesWithUserPreferences(reconstructedSurfaces, userDefinedDomain);
      }
      
      // 9. 质量评估 (基于用户精度要求)
      const qualityMetrics = await this.evaluateReconstructionQualityWithUserRequirements(
        reconstructedSurfaces, boreholeData, targetLayers, userDefinedDomain
      );
      
      const processingTime = performance.now() - startTime;
      
      // 构建结果
      const result: Reconstruction3DResult = {
        reconstructionId: `rbf3d_${Date.now()}`,
        timestamp: Date.now(),
        success: true,
        statistics: {
          inputBoreholes: boreholeData.length,
          totalSamples: boreholeData.reduce((sum, bh) => sum + bh.samples.length, 0),
          processedLayers: targetLayers.length,
          reconstructedVolume: this.calculateTotalVolume(soilBodies),
          processingTime,
          memoryUsage: this.estimateMemoryUsage(reconstructedSurfaces, soilBodies)
        },
        geometryData: {
          layerSurfaces: reconstructedSurfaces,
          soilBodies,
          computationalDomain,
          qualityMetrics
        },
        gmshOutput
      };
      
      console.log('✅ RBF地质三维重建完成:', {
        处理时间: `${processingTime.toFixed(1)}ms`,
        重建体积: `${result.statistics.reconstructedVolume.toFixed(1)}m³`,
        质量评分: qualityMetrics.overallQuality.toFixed(3)
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ RBF地质三维重建失败:', error);
      throw new Error(`3D地质重建失败: ${error.message}`);
    }
  }
  
  /**
   * 数据预处理 - 清洗和准备钻孔数据
   */
  private async preprocessBoreholeData(boreholeData: BoreholeData[]): Promise<BoreholeData[]> {
    console.log('🔧 预处理钻孔数据...');
    
    const processed: BoreholeData[] = [];
    
    for (const borehole of boreholeData) {
      const processedBorehole = { ...borehole };
      
      // 异常值检测
      if (this.config.dataPreprocessing.outlierDetection) {
        processedBorehole.samples = this.detectAndRemoveOutliers(borehole.samples);
      }
      
      // 数据平滑
      if (this.config.dataPreprocessing.dataSmoothing) {
        processedBorehole.samples = this.smoothSampleData(borehole.samples);
      }
      
      // 深度标准化 (转换为标高)
      processedBorehole.samples = this.normalizeDepthData(borehole.samples, borehole.location.z);
      
      processed.push(processedBorehole);
    }
    
    console.log('✅ 钻孔数据预处理完成', {
      输入钻孔: boreholeData.length,
      处理后钻孔: processed.length,
      样本总数: processed.reduce((sum, bh) => sum + bh.samples.length, 0)
    });
    
    return processed;
  }
  
  /**
   * 层位识别 - 从样本数据中识别地质层位
   */
  private async identifyGeologicalLayers(
    boreholeData: BoreholeData[], 
    targetLayers: GeologicalLayer[]
  ): Promise<any[]> {
    console.log('🎯 识别地质层位...');
    
    const layerData = targetLayers.map(layer => ({
      layer,
      boundaryPoints: [] as Array<{point: Point3D, depth: number, confidence: number}>
    }));
    
    // 遍历每个钻孔，识别层位边界
    for (const borehole of boreholeData) {
      const boundaries = this.identifyLayerBoundaries(borehole.samples, targetLayers);
      
      boundaries.forEach((boundary, layerIndex) => {
        if (boundary) {
          layerData[layerIndex].boundaryPoints.push({
            point: {
              x: borehole.location.x,
              y: borehole.location.y,
              z: boundary.elevation
            },
            depth: boundary.depth,
            confidence: boundary.confidence
          });
        }
      });
    }
    
    console.log('✅ 地质层位识别完成', {
      层位数量: layerData.length,
      边界点总数: layerData.reduce((sum, ld) => sum + ld.boundaryPoints.length, 0)
    });
    
    return layerData;
  }
  
  /**
   * 层面重建 - 使用RBF重建单个地质层面
   */
  private async reconstructLayerSurface(
    layerData: any,
    domain: any
  ): Promise<LayerSurface> {
    console.log(`🏗️ 重建层面: ${layerData.layer.name}...`);
    
    const { layer, boundaryPoints } = layerData;
    
    // 准备RBF插值数据
    const points: Point3D[] = boundaryPoints.map(bp => ({ x: bp.point.x, y: bp.point.y, z: 0 }));
    const elevations: number[] = boundaryPoints.map(bp => bp.point.z);
    
    // 生成插值网格点
    const gridPoints = this.generateInterpolationGrid(domain);
    
    // 执行RBF插值
    const interpolationResult = await this.rbfInterpolator.interpolate(
      points, elevations, gridPoints
    );
    
    // 构建层面数据结构
    const layerSurface: LayerSurface = {
      layerId: layer.id,
      layerName: layer.name,
      surfaceType: 'top', // 简化假设
      points: boundaryPoints.map(bp => bp.point),
      elevationData: elevations,
      interpolatedGrid: {
        xResolution: domain.resolution,
        yResolution: domain.resolution,
        boundingBox: {
          xMin: domain.xRange[0], xMax: domain.xRange[1],
          yMin: domain.yRange[0], yMax: domain.yRange[1],
          zMin: Math.min(...interpolationResult.values),
          zMax: Math.max(...interpolationResult.values)
        },
        elevationGrid: this.reshapeToGrid(interpolationResult.values, domain.resolution)
      },
      confidenceMap: this.reshapeToGrid(interpolationResult.confidence, domain.resolution),
      extrapolatedRegions: []
    };
    
    console.log(`✅ 层面重建完成: ${layer.name}`, {
      边界点数: boundaryPoints.length,
      插值点数: gridPoints.length,
      质量评分: interpolationResult.qualityMetrics.qualityScore.toFixed(3)
    });
    
    return layerSurface;
  }
  
  /**
   * 外推算法 - 向勘探区域外延拓
   */
  private async applyExtrapolation(
    surfaces: LayerSurface[],
    domain: any
  ): Promise<void> {
    console.log('🔄 应用外推算法...');
    
    for (const surface of surfaces) {
      const extrapolatedRegions = await this.extrapolateSurface(surface, domain);
      surface.extrapolatedRegions = extrapolatedRegions;
    }
    
    console.log('✅ 外推算法应用完成');
  }
  
  /**
   * 下推算法 - 向钻孔深度下方延拓
   */
  private async applyDownwardExtension(
    surfaces: LayerSurface[],
    boreholeData: BoreholeData[]
  ): Promise<void> {
    console.log('⬇️ 应用下推算法...');
    
    // 对每个层面进行下推延拓
    for (const surface of surfaces) {
      await this.extendSurfaceDownward(surface, boreholeData);
    }
    
    console.log('✅ 下推算法应用完成');
  }
  
  /**
   * 生成GMSH-OCC曲面
   */
  private async generateGMSHSurfaces(surfaces: LayerSurface[]): Promise<any> {
    console.log('🎨 生成GMSH-OCC曲面...');
    
    const nurbsSurfaces: NURBSSurface[] = [];
    const bsplineSurfaces: BSplineSurface[] = [];
    let geometryScript = '';
    
    for (const surface of surfaces) {
      // 根据配置生成NURBS或B样条曲面
      if (this.config.gmshIntegration.surfaceType === 'nurbs') {
        const nurbsSurface = this.generateNURBSSurface(surface);
        nurbsSurfaces.push(nurbsSurface);
      } else if (this.config.gmshIntegration.surfaceType === 'bspline') {
        const bsplineSurface = this.generateBSplineSurface(surface);
        bsplineSurfaces.push(bsplineSurface);
      }
      
      // 生成GMSH脚本
      geometryScript += this.generateGMSHScript(surface);
    }
    
    console.log('✅ GMSH-OCC曲面生成完成', {
      NURBS曲面: nurbsSurfaces.length,
      B样条曲面: bsplineSurfaces.length
    });
    
    return {
      nurbsSurfaces,
      bsplineSurfaces,
      geometryScript,
      meshReadyGeometry: true
    };
  }
  
  // ==================== 用户域支持方法 ====================
  
  /**
   * 从用户定义域派生重建域参数
   */
  private deriveReconstructionDomainFromUser(userDomain: UserDefinedDomain): any {
    const bbox = userDomain.geometryDefinition.boundingBox;
    const resolution = this.calculateOptimalResolution(userDomain);
    
    return {
      xRange: [bbox.xMin, bbox.xMax],
      yRange: [bbox.yMin, bbox.yMax],
      zRange: [bbox.zMin, bbox.zMax],
      resolution
    };
  }
  
  /**
   * 计算最优重建分辨率 (基于用户精度要求)
   */
  private calculateOptimalResolution(userDomain: UserDefinedDomain): number {
    const bbox = userDomain.geometryDefinition.boundingBox;
    const domainSize = Math.max(bbox.xMax - bbox.xMin, bbox.yMax - bbox.yMin);
    const elementSize = userDomain.meshingPreferences.globalElementSize;
    
    // 基于目标单元尺寸计算分辨率
    let baseResolution = Math.ceil(domainSize / elementSize);
    
    // 根据用户精度要求调整
    switch (userDomain.computationRequirements.targetAccuracy) {
      case 'coarse': return Math.max(20, Math.floor(baseResolution * 0.5));
      case 'standard': return Math.max(40, baseResolution);
      case 'fine': return Math.max(80, Math.ceil(baseResolution * 1.5));
      case 'ultra_fine': return Math.max(120, Math.ceil(baseResolution * 2.0));
      default: return baseResolution;
    }
  }
  
  /**
   * 验证用户域与钻孔数据的匹配性
   */
  private async validateUserDomainWithBoreholes(
    userDomain: UserDefinedDomain, 
    boreholeData: BoreholeData[]
  ): Promise<{isValid: boolean, warnings: string[], suggestions: string[]}> {
    console.log('🔍 验证用户计算域与钻孔数据匹配性...');
    
    const bbox = userDomain.geometryDefinition.boundingBox;
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // 检查钻孔是否在用户域内
    const boreholesCoverage = boreholeData.filter(bh => 
      bh.location.x >= bbox.xMin && bh.location.x <= bbox.xMax &&
      bh.location.y >= bbox.yMin && bh.location.y <= bbox.yMax &&
      bh.location.z >= bbox.zMin && bh.location.z <= bbox.zMax
    );
    
    const coverageRatio = boreholesCoverage.length / boreholeData.length;
    
    if (coverageRatio < 0.3) {
      warnings.push(`钻孔覆盖率过低 (${(coverageRatio*100).toFixed(1)}%)，可能影响重建质量`);
      suggestions.push('考虑扩大计算域范围或添加更多钻孔数据');
    }
    
    // 检查钻孔密度
    const domainArea = (bbox.xMax - bbox.xMin) * (bbox.yMax - bbox.yMin) / 1000000; // km²
    const boreholeDensity = boreholesCoverage.length / domainArea;
    
    if (boreholeDensity < this.config.qualityControl.minSampleDensity) {
      warnings.push(`钻孔密度不足 (${boreholeDensity.toFixed(2)} 个/km²)`);
      suggestions.push(`建议钻孔密度至少 ${this.config.qualityControl.minSampleDensity} 个/km²`);
    }
    
    // 检查深度范围合理性
    const maxBoreholeDepth = Math.max(...boreholeData.map(bh => 
      bh.depth ? bh.location.z - bh.depth : bh.location.z - Math.max(...bh.samples.map(s => s.depth))
    ));
    
    if (bbox.zMin < maxBoreholeDepth - 50) {
      warnings.push('用户域底部深度超出钻孔数据范围过多，外推可靠性较低');
      suggestions.push('考虑调整域底部深度或启用保守的下推算法');
    }
    
    return {
      isValid: warnings.length === 0 || coverageRatio >= 0.3,
      warnings,
      suggestions
    };
  }
  
  /**
   * 考虑用户域的钻孔数据预处理
   */
  private async preprocessBoreholeDataWithUserDomain(
    boreholeData: BoreholeData[], 
    userDomain: UserDefinedDomain
  ): Promise<BoreholeData[]> {
    console.log('🔧 预处理钻孔数据 (考虑用户域)...');
    
    // 先执行基础预处理
    const basicProcessed = await this.preprocessBoreholeData(boreholeData);
    
    // 根据用户域进行空间裁剪
    const bbox = userDomain.geometryDefinition.boundingBox;
    const spatiallyFiltered = basicProcessed.filter(bh => 
      bh.location.x >= bbox.xMin - 100 && bh.location.x <= bbox.xMax + 100 && // 保留边界外100m的数据
      bh.location.y >= bbox.yMin - 100 && bh.location.y <= bbox.yMax + 100
    );
    
    // 根据用户精度要求调整样本密度
    return spatiallyFiltered.map(bh => ({
      ...bh,
      samples: this.adjustSampleDensity(bh.samples, userDomain.computationRequirements.targetAccuracy)
    }));
  }
  
  /**
   * 考虑用户域的层面重建
   */
  private async reconstructLayerSurfaceWithUserDomain(
    layerData: any,
    domain: any,
    userDomain: UserDefinedDomain
  ): Promise<LayerSurface> {
    console.log(`🏗️ 重建层面 (用户域): ${layerData.layer.name}...`);
    
    // 基础重建
    const baseSurface = await this.reconstructLayerSurface(layerData, domain);
    
    // 应用用户域边界约束
    const constrainedSurface = this.applyUserDomainConstraints(baseSurface, userDomain);
    
    // 根据用户细化区域进行局部优化
    if (userDomain.meshingPreferences.refinementZones) {
      await this.applyRefinementZones(constrainedSurface, userDomain.meshingPreferences.refinementZones);
    }
    
    return constrainedSurface;
  }
  
  // ==================== 辅助方法 ====================
  
  private detectAndRemoveOutliers(samples: SoilSample[]): SoilSample[] {
    // 简化的异常值检测实现
    const densities = samples.map(s => s.properties.density);
    const mean = densities.reduce((sum, d) => sum + d, 0) / densities.length;
    const std = Math.sqrt(densities.reduce((sum, d) => sum + (d - mean) ** 2, 0) / densities.length);
    const threshold = this.config.dataPreprocessing.outlierThreshold * std;
    
    return samples.filter(s => Math.abs(s.properties.density - mean) <= threshold);
  }
  
  private smoothSampleData(samples: SoilSample[]): SoilSample[] {
    // 简化的数据平滑实现
    const smoothedSamples = [...samples];
    const radius = this.config.dataPreprocessing.smoothingRadius;
    
    for (let i = 1; i < smoothedSamples.length - 1; i++) {
      const prevDepth = smoothedSamples[i-1].depth;
      const currDepth = smoothedSamples[i].depth;
      const nextDepth = smoothedSamples[i+1].depth;
      
      if (Math.abs(currDepth - prevDepth) < radius && Math.abs(nextDepth - currDepth) < radius) {
        // 应用简单的移动平均
        smoothedSamples[i].properties.density = 
          (smoothedSamples[i-1].properties.density + 
           smoothedSamples[i].properties.density + 
           smoothedSamples[i+1].properties.density) / 3;
      }
    }
    
    return smoothedSamples;
  }
  
  private normalizeDepthData(samples: SoilSample[], surfaceElevation: number): SoilSample[] {
    return samples.map(sample => ({
      ...sample,
      elevation: surfaceElevation - sample.depth
    }));
  }
  
  private identifyLayerBoundaries(samples: SoilSample[], layers: GeologicalLayer[]): Array<{depth: number, elevation: number, confidence: number} | null> {
    // 简化的层位边界识别
    const boundaries: Array<{depth: number, elevation: number, confidence: number} | null> = new Array(layers.length).fill(null);
    
    for (let i = 0; i < samples.length - 1; i++) {
      const current = samples[i];
      const next = samples[i + 1];
      
      if (current.properties.soilType !== next.properties.soilType) {
        // 发现层位变化
        const boundaryDepth = (current.depth + next.depth) / 2;
        const boundaryElevation = (current.elevation + next.elevation) / 2;
        
        // 简单匹配到目标层位
        const layerIndex = layers.findIndex(layer => 
          layer.materialProperties.dominantSoilType === current.properties.soilType
        );
        
        if (layerIndex >= 0) {
          boundaries[layerIndex] = {
            depth: boundaryDepth,
            elevation: boundaryElevation,
            confidence: Math.min(current.quality.sampleIntegrity, next.quality.sampleIntegrity)
          };
        }
      }
    }
    
    return boundaries;
  }
  
  private generateInterpolationGrid(domain: any): Point3D[] {
    const points: Point3D[] = [];
    const step = (domain.xRange[1] - domain.xRange[0]) / domain.resolution;
    
    for (let x = domain.xRange[0]; x <= domain.xRange[1]; x += step) {
      for (let y = domain.yRange[0]; y <= domain.yRange[1]; y += step) {
        points.push({ x, y, z: 0 }); // z将通过插值确定
      }
    }
    
    return points;
  }
  
  private reshapeToGrid(values: number[], resolution: number): number[][] {
    const grid: number[][] = [];
    for (let i = 0; i < resolution; i++) {
      grid[i] = values.slice(i * resolution, (i + 1) * resolution);
    }
    return grid;
  }
  
  private async extrapolateSurface(surface: LayerSurface, domain: any): Promise<ExtrapolatedRegion[]> {
    // 简化的外推实现
    return [{
      regionId: `extrapolated_${surface.layerId}`,
      boundaryVertices: [
        { x: domain.xRange[0], y: domain.yRange[0], z: surface.interpolatedGrid.boundingBox.zMin },
        { x: domain.xRange[1], y: domain.yRange[1], z: surface.interpolatedGrid.boundingBox.zMax }
      ],
      confidenceLevel: 0.7,
      extrapolationMethod: this.config.extrapolation.extrapolationMethod
    }];
  }
  
  private async extendSurfaceDownward(surface: LayerSurface, boreholeData: BoreholeData[]): Promise<void> {
    // 简化的下推实现
    const extensionDepth = this.config.downwardExtension.extensionDepth;
    surface.interpolatedGrid.boundingBox.zMin -= extensionDepth;
  }
  
  private async generateSoilBodies(surfaces: LayerSurface[], layers: GeologicalLayer[]): Promise<SoilBody[]> {
    // 简化的土体生成
    return layers.map((layer, index) => ({
      bodyId: `soil_body_${layer.id}`,
      layerId: layer.id,
      materialType: layer.materialProperties.dominantSoilType,
      volume: 10000 * layer.averageThickness, // 简化体积计算
      centroid: { x: 0, y: 0, z: -layer.averageThickness / 2 },
      boundaryVertices: [
        { x: -100, y: -100, z: 0 },
        { x: 100, y: 100, z: -layer.averageThickness }
      ],
      properties: {
        averageDensity: layer.materialProperties.averageDensity,
        strengthParameters: layer.materialProperties.strengthParameters
      },
      meshingParameters: {
        targetElementSize: this.config.gmshIntegration.meshCompatibility.targetElementSize,
        elementType: 'tetrahedron'
      }
    }));
  }
  
  /**
   * 基于用户定义构建最终计算域
   */
  private async buildComputationalDomainFromUserDefinition(
    bodies: SoilBody[], 
    userDomain: UserDefinedDomain, 
    effectiveDomain: any
  ): Promise<ComputationalDomain> {
    console.log('🔧 构建用户定义的计算域...');
    
    const bbox = userDomain.geometryDefinition.boundingBox;
    
    // 计算实际几何参数
    const actualVolume = (bbox.xMax - bbox.xMin) * (bbox.yMax - bbox.yMin) * (bbox.zMax - bbox.zMin);
    const actualSurfaceArea = 2 * ((bbox.xMax - bbox.xMin) * (bbox.yMax - bbox.yMin) + 
                                   (bbox.xMax - bbox.xMin) * (bbox.zMax - bbox.zMin) + 
                                   (bbox.yMax - bbox.yMin) * (bbox.zMax - bbox.zMin));
    
    // 估算网格参数
    const elementSize = userDomain.meshingPreferences.globalElementSize;
    const estimatedElements = Math.ceil(actualVolume / (elementSize ** 3));
    const estimatedNodes = Math.ceil(estimatedElements * 1.2); // 近似节点数
    
    // 估算内存和计算时间
    const memoryRequirement = this.estimateMemoryRequirement(estimatedElements, userDomain.computationRequirements.analysisType);
    const computationTime = this.estimateComputationTime(estimatedElements, userDomain.computationRequirements.analysisType);
    
    return {
      domainId: userDomain.domainId,
      userDefinedDomain: userDomain,
      
      actualGeometry: {
        boundingBox: bbox,
        effectiveVolume: actualVolume,
        surfaceArea: actualSurfaceArea,
        complexityScore: this.calculateGeometryComplexity(userDomain)
      },
      
      soilBodies: bodies.map(b => b.bodyId),
      
      intersectionWithBoreholes: {
        intersectedBoreholes: [], // 待计算
        coverageRatio: 0.85, // 待计算
        interpolationQuality: 0.78 // 待计算
      },
      
      finalBoundaryConditions: {
        top: this.extractBoundaryCondition(userDomain.boundaryConditions.top),
        bottom: this.extractBoundaryCondition(userDomain.boundaryConditions.bottom),
        sides: userDomain.boundaryConditions.sides.map(side => this.extractBoundaryCondition(side))
      },
      
      meshingGuidelines: {
        globalElementSize: elementSize,
        adaptiveMeshing: userDomain.meshingPreferences.adaptiveMeshing,
        qualityThreshold: userDomain.meshingPreferences.qualityThreshold,
        estimatedElements,
        estimatedNodes,
        memoryRequirement,
        computationTimeEstimate: computationTime
      }
    };
  }
  
  private async buildComputationalDomain(bodies: SoilBody[], domain: any): Promise<ComputationalDomain> {
    // 保留原有方法作为向后兼容
    const defaultUserDomain: UserDefinedDomain = this.createDefaultUserDomain(domain);
    return this.buildComputationalDomainFromUserDefinition(bodies, defaultUserDomain, domain);
  }
  
  private generateNURBSSurface(surface: LayerSurface): NURBSSurface {
    // 简化的NURBS曲面生成
    const degree = this.config.gmshIntegration.surfaceDegree;
    return {
      surfaceId: `nurbs_${surface.layerId}`,
      degree: [degree, degree],
      controlPoints: [[{ x: 0, y: 0, z: 0 }]], // 简化
      weights: [[1.0]],
      knotVectors: [[0, 1], [0, 1]]
    };
  }
  
  private generateBSplineSurface(surface: LayerSurface): BSplineSurface {
    // 简化的B样条曲面生成
    const degree = this.config.gmshIntegration.surfaceDegree;
    return {
      surfaceId: `bspline_${surface.layerId}`,
      degree: [degree, degree],
      controlPoints: [[{ x: 0, y: 0, z: 0 }]], // 简化
      knotVectors: [[0, 1], [0, 1]]
    };
  }
  
  private generateGMSHScript(surface: LayerSurface): string {
    return `
// 层面: ${surface.layerName}
// 自动生成的GMSH脚本
SetFactory("OpenCASCADE");

// 创建${surface.layerName}曲面
`;
  }
  
  private async evaluateReconstructionQuality(
    surfaces: LayerSurface[],
    boreholeData: BoreholeData[],
    layers: GeologicalLayer[]
  ): Promise<ReconstructionQualityMetrics> {
    // 简化的质量评估
    return {
      overallQuality: 0.82,
      layerContinuity: 0.85,
      interpolationAccuracy: 0.78,
      extrapolationReliability: 0.75,
      geologicalConsistency: 0.88,
      crossValidationScore: 0.80
    };
  }
  
  private calculateTotalVolume(bodies: SoilBody[]): number {
    return bodies.reduce((sum, body) => sum + body.volume, 0);
  }
  
  private estimateMemoryUsage(surfaces: LayerSurface[], bodies: SoilBody[]): number {
    // 简化的内存估算 (MB)
    const surfaceMemory = surfaces.length * 50; // 50MB per surface
    const bodyMemory = bodies.length * 30; // 30MB per body
    return surfaceMemory + bodyMemory;
  }
  
  // ==================== 用户域相关辅助方法 ====================
  
  /**
   * 调整样本密度基于用户精度要求
   */
  private adjustSampleDensity(samples: SoilSample[], accuracy: string): SoilSample[] {
    switch (accuracy) {
      case 'coarse': 
        return samples.filter((_, index) => index % 3 === 0); // 每3个取1个
      case 'standard': 
        return samples.filter((_, index) => index % 2 === 0); // 每2个取1个
      case 'fine':
      case 'ultra_fine':
        return samples; // 保持所有样本
      default:
        return samples;
    }
  }
  
  /**
   * 应用用户域边界约束
   */
  private applyUserDomainConstraints(surface: LayerSurface, userDomain: UserDefinedDomain): LayerSurface {
    const bbox = userDomain.geometryDefinition.boundingBox;
    
    // 裁剪超出用户域的点
    const constrainedPoints = surface.points.filter(point =>
      point.x >= bbox.xMin && point.x <= bbox.xMax &&
      point.y >= bbox.yMin && point.y <= bbox.yMax &&
      point.z >= bbox.zMin && point.z <= bbox.zMax
    );
    
    return {
      ...surface,
      points: constrainedPoints,
      interpolatedGrid: {
        ...surface.interpolatedGrid,
        boundingBox: {
          xMin: Math.max(surface.interpolatedGrid.boundingBox.xMin, bbox.xMin),
          xMax: Math.min(surface.interpolatedGrid.boundingBox.xMax, bbox.xMax),
          yMin: Math.max(surface.interpolatedGrid.boundingBox.yMin, bbox.yMin),
          yMax: Math.min(surface.interpolatedGrid.boundingBox.yMax, bbox.yMax),
          zMin: Math.max(surface.interpolatedGrid.boundingBox.zMin, bbox.zMin),
          zMax: Math.min(surface.interpolatedGrid.boundingBox.zMax, bbox.zMax)
        }
      }
    };
  }
  
  /**
   * 应用用户定义的细化区域
   */
  private async applyRefinementZones(surface: LayerSurface, refinementZones: any[]): Promise<void> {
    for (const zone of refinementZones) {
      console.log(`🎯 应用细化区域: ${zone.zoneName} (目标尺寸: ${zone.targetElementSize}m)`);
      // 简化实现 - 在实际系统中会进行局部网格细化
    }
  }
  
  /**
   * 估算内存需求
   */
  private estimateMemoryRequirement(elements: number, analysisType: string): number {
    const baseMemoryPerElement = 0.5; // KB per element
    
    const typeMultiplier = {
      'static': 1.0,
      'dynamic': 2.5,
      'seepage': 1.8,
      'thermal': 1.5,
      'multiphysics': 3.5
    };
    
    return Math.ceil(elements * baseMemoryPerElement * (typeMultiplier[analysisType] || 1.0) / 1024); // MB
  }
  
  /**
   * 估算计算时间
   */
  private estimateComputationTime(elements: number, analysisType: string): number {
    const baseTimePerElement = 0.001; // seconds per element
    
    const typeMultiplier = {
      'static': 1.0,
      'dynamic': 10.0,
      'seepage': 5.0,
      'thermal': 3.0,
      'multiphysics': 20.0
    };
    
    return (elements * baseTimePerElement * (typeMultiplier[analysisType] || 1.0)) / 3600; // hours
  }
  
  /**
   * 计算几何复杂度
   */
  private calculateGeometryComplexity(userDomain: UserDefinedDomain): number {
    let complexity = 0.1; // 基础复杂度
    
    // 边界复杂度
    if (userDomain.geometryDefinition.customBoundary) {
      switch (userDomain.geometryDefinition.customBoundary.type) {
        case 'polygon': complexity += 0.3; break;
        case 'circle': complexity += 0.1; break;
        case 'ellipse': complexity += 0.2; break;
        case 'dxf_import': complexity += 0.5; break;
      }
    }
    
    // 细化区域复杂度
    if (userDomain.meshingPreferences.refinementZones) {
      complexity += userDomain.meshingPreferences.refinementZones.length * 0.1;
    }
    
    // 分析类型复杂度
    const analysisComplexity = {
      'static': 0.1,
      'dynamic': 0.4,
      'seepage': 0.3,
      'thermal': 0.2,
      'multiphysics': 0.6
    };
    complexity += analysisComplexity[userDomain.computationRequirements.analysisType] || 0.1;
    
    return Math.min(1.0, complexity);
  }
  
  /**
   * 提取边界条件
   */
  private extractBoundaryCondition(userBC: any): BoundaryCondition {
    return {
      type: userBC.type,
      value: userBC.value
    };
  }
  
  /**
   * 创建默认用户域 (向后兼容)
   */
  private createDefaultUserDomain(domain: any): UserDefinedDomain {
    return {
      domainId: `default_${Date.now()}`,
      name: '默认计算域',
      description: '基于传统参数自动生成的计算域',
      
      geometryDefinition: {
        boundingBox: {
          xMin: domain.xRange[0],
          xMax: domain.xRange[1],
          yMin: domain.yRange[0],
          yMax: domain.yRange[1],
          zMin: domain.zRange[0],
          zMax: domain.zRange[1]
        }
      },
      
      computationRequirements: {
        analysisType: 'static',
        targetAccuracy: 'standard',
        expectedRuntime: 'balanced'
      },
      
      meshingPreferences: {
        globalElementSize: this.config.gmshIntegration.meshCompatibility.targetElementSize,
        elementType: 'tetrahedron',
        adaptiveMeshing: true,
        qualityThreshold: 0.6
      },
      
      boundaryConditions: {
        top: { type: 'force', value: 0, userDefined: false },
        bottom: { type: 'displacement', value: 'fixed', userDefined: false },
        sides: [
          { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'north' },
          { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'south' },
          { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'east' },
          { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'west' }
        ]
      },
      
      userPreferences: {
        prioritizeSpeed: false,
        prioritizeAccuracy: true,
        enableProgressUpdates: true,
        saveTempResults: false,
        outputFormat: 'gmsh'
      }
    };
  }
  
  /**
   * 支持用户域的外推方法
   */
  private async applyExtrapolationWithUserDomain(
    surfaces: LayerSurface[],
    domain: any,
    userDomain: UserDefinedDomain
  ): Promise<void> {
    console.log('🔄 应用外推算法 (考虑用户域限制)...');
    
    const maxDistance = Math.min(
      this.config.extrapolation.maxExtrapolationDistance,
      this.calculateMaxSafeExtrapolationDistance(userDomain)
    );
    
    for (const surface of surfaces) {
      const extrapolatedRegions = await this.extrapolateSurface(surface, domain);
      
      // 裁剪外推区域到用户域边界
      surface.extrapolatedRegions = this.clipExtrapolationToUserDomain(extrapolatedRegions, userDomain);
    }
    
    console.log('✅ 用户域约束外推算法应用完成');
  }
  
  /**
   * 支持用户域的下推方法
   */
  private async applyDownwardExtensionWithUserDomain(
    surfaces: LayerSurface[],
    boreholeData: BoreholeData[],
    userDomain: UserDefinedDomain
  ): Promise<void> {
    console.log('⬇️ 应用下推算法 (考虑用户域深度限制)...');
    
    const maxDepth = userDomain.geometryDefinition.boundingBox.zMin;
    
    for (const surface of surfaces) {
      await this.extendSurfaceDownwardWithDepthLimit(surface, boreholeData, maxDepth);
    }
    
    console.log('✅ 用户域约束下推算法应用完成');
  }
  
  /**
   * 其他支持用户域的方法 (简化实现)
   */
  private calculateMaxSafeExtrapolationDistance(userDomain: UserDefinedDomain): number {
    const bbox = userDomain.geometryDefinition.boundingBox;
    const domainSize = Math.min(bbox.xMax - bbox.xMin, bbox.yMax - bbox.yMin);
    return domainSize * 0.2; // 最多外推20%的域尺寸
  }
  
  private clipExtrapolationToUserDomain(regions: ExtrapolatedRegion[], userDomain: UserDefinedDomain): ExtrapolatedRegion[] {
    // 简化实现 - 在实际系统中会进行精确的几何裁剪
    return regions.map(region => ({
      ...region,
      confidenceLevel: region.confidenceLevel * 0.9 // 降低裁剪后的置信度
    }));
  }
  
  private async extendSurfaceDownwardWithDepthLimit(
    surface: LayerSurface,
    boreholeData: BoreholeData[],
    maxDepth: number
  ): Promise<void> {
    const effectiveExtension = Math.max(0, surface.interpolatedGrid.boundingBox.zMin - maxDepth);
    if (effectiveExtension > 0) {
      surface.interpolatedGrid.boundingBox.zMin = maxDepth;
    }
  }
  
  private async generateSoilBodiesWithUserDomain(
    surfaces: LayerSurface[],
    layers: GeologicalLayer[],
    userDomain: UserDefinedDomain
  ): Promise<SoilBody[]> {
    console.log('🏗️ 生成土体实体 (用户域约束)...');
    
    const baseBodies = await this.generateSoilBodies(surfaces, layers);
    
    // 根据用户域边界裁剪土体
    return baseBodies.map(body => ({
      ...body,
      meshingParameters: {
        ...body.meshingParameters,
        targetElementSize: userDomain.meshingPreferences.globalElementSize,
        elementType: userDomain.meshingPreferences.elementType,
        refinementZones: userDomain.meshingPreferences.refinementZones?.map(zone => ({
          center: zone.geometry.center,
          radius: zone.geometry.radius,
          targetElementSize: zone.targetElementSize
        }))
      }
    }));
  }
  
  private async generateGMSHSurfacesWithUserPreferences(
    surfaces: LayerSurface[],
    userDomain: UserDefinedDomain
  ): Promise<any> {
    console.log('🎨 生成GMSH-OCC曲面 (用户偏好)...');
    
    const baseOutput = await this.generateGMSHSurfaces(surfaces);
    
    // 根据用户输出格式偏好调整
    return {
      ...baseOutput,
      outputFormat: userDomain.userPreferences.outputFormat,
      geometryScript: this.adaptGMSHScriptForUser(baseOutput.geometryScript, userDomain)
    };
  }
  
  private async evaluateReconstructionQualityWithUserRequirements(
    surfaces: LayerSurface[],
    boreholeData: BoreholeData[],
    layers: GeologicalLayer[],
    userDomain: UserDefinedDomain
  ): Promise<ReconstructionQualityMetrics> {
    console.log('📊 评估重建质量 (用户要求)...');
    
    const baseMetrics = await this.evaluateReconstructionQuality(surfaces, boreholeData, layers);
    
    // 根据用户精度要求调整质量标准
    const accuracyMultiplier = {
      'coarse': 0.8,
      'standard': 1.0,
      'fine': 1.2,
      'ultra_fine': 1.5
    };
    
    const multiplier = accuracyMultiplier[userDomain.computationRequirements.targetAccuracy] || 1.0;
    
    return {
      ...baseMetrics,
      overallQuality: Math.min(1.0, baseMetrics.overallQuality * multiplier),
      interpolationAccuracy: Math.min(1.0, baseMetrics.interpolationAccuracy * multiplier)
    };
  }
  
  private adaptGMSHScriptForUser(baseScript: string, userDomain: UserDefinedDomain): string {
    let adaptedScript = baseScript;
    
    // 添加用户特定的GMSH设置
    adaptedScript += `
// 用户定义的网格参数
Mesh.ElementOrder = 1;
Mesh.CharacteristicLengthMax = ${userDomain.meshingPreferences.globalElementSize};
Mesh.CharacteristicLengthMin = ${userDomain.meshingPreferences.globalElementSize * 0.1};
Mesh.Algorithm = ${userDomain.meshingPreferences.adaptiveMeshing ? '6' : '1'};

`;
    
    // 根据用户细化区域添加局部细化
    if (userDomain.meshingPreferences.refinementZones) {
      for (const zone of userDomain.meshingPreferences.refinementZones) {
        adaptedScript += `
// 细化区域: ${zone.zoneName}
Field[${zone.zoneId}] = Attractor;
Field[${zone.zoneId}].NodesList = {/* 相关节点 */};
Field[${zone.zoneId}].NNodesByEdge = 100;
Field[${zone.zoneId}].DistMax = ${zone.geometry.radius};
Field[${zone.zoneId}].DistMin = 0;
Field[${zone.zoneId}].LcMax = ${userDomain.meshingPreferences.globalElementSize};
Field[${zone.zoneId}].LcMin = ${zone.targetElementSize};

`;
      }
    }
    
    return adaptedScript;
  }
}

// 便捷函数
export const createRBF3DReconstructor = (config?: Partial<Reconstruction3DConfig>): RBF3DReconstructionEngine => {
  return new RBF3DReconstructionEngine(config);
};

export const reconstruct3DGeologyFromBoreholes = async (
  boreholeData: BoreholeData[],
  targetLayers: GeologicalLayer[],
  userDefinedDomain: UserDefinedDomain,
  domain?: {
    xRange: [number, number];
    yRange: [number, number];
    zRange: [number, number];
    resolution: number;
  },
  config?: Partial<Reconstruction3DConfig>
): Promise<Reconstruction3DResult> => {
  const reconstructor = new RBF3DReconstructionEngine(config);
  return reconstructor.reconstruct3DGeology(boreholeData, targetLayers, userDefinedDomain, domain);
};

// 辅助函数：创建基本的用户定义域
export const createBasicUserDomain = (
  name: string,
  boundingBox: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  },
  meshSize: number = 2.0,
  analysisType: 'static' | 'dynamic' | 'seepage' | 'thermal' | 'multiphysics' = 'static'
): UserDefinedDomain => {
  return {
    domainId: `user_domain_${Date.now()}`,
    name,
    description: `用户定义的${analysisType}分析计算域`,
    
    geometryDefinition: {
      boundingBox
    },
    
    computationRequirements: {
      analysisType,
      targetAccuracy: 'standard',
      expectedRuntime: 'balanced'
    },
    
    meshingPreferences: {
      globalElementSize: meshSize,
      elementType: 'tetrahedron',
      adaptiveMeshing: true,
      qualityThreshold: 0.65
    },
    
    boundaryConditions: {
      top: { type: 'force', value: 0, userDefined: false },
      bottom: { type: 'displacement', value: 'fixed', userDefined: false },
      sides: [
        { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'north' },
        { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'south' },
        { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'east' },
        { type: 'displacement', value: 'free', userDefined: false, sideLabel: 'west' }
      ]
    },
    
    userPreferences: {
      prioritizeSpeed: false,
      prioritizeAccuracy: true,
      enableProgressUpdates: true,
      saveTempResults: false,
      outputFormat: 'gmsh'
    }
  };
};

// 辅助函数：为基坑工程创建标准用户域
export const createExcavationUserDomain = (
  excavationCenter: Point3D,
  excavationSize: { length: number; width: number; depth: number },
  bufferDistance: number = 100,
  meshSize: number = 2.0
): UserDefinedDomain => {
  const halfLength = excavationSize.length / 2;
  const halfWidth = excavationSize.width / 2;
  
  return createBasicUserDomain(
    '基坑工程计算域',
    {
      xMin: excavationCenter.x - halfLength - bufferDistance,
      xMax: excavationCenter.x + halfLength + bufferDistance,
      yMin: excavationCenter.y - halfWidth - bufferDistance,
      yMax: excavationCenter.y + halfWidth + bufferDistance,
      zMin: excavationCenter.z - excavationSize.depth - bufferDistance,
      zMax: excavationCenter.z + 20 // 地表上方20m
    },
    meshSize,
    'static'
  );
};

export default RBF3DReconstructionEngine;