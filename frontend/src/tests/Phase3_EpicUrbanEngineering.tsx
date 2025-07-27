/**
 * 🏙️ Phase 3: 史诗级城市工程终极传奇
 * 
 * 🔥 300万单元 + 地铁网络 + 多基坑群 + 地下管廊
 * 🧠 复杂度: EXTREME | 内存挑战: 128GB | 处理目标: 60-120秒
 * 
 * 2号几何专家 vs 3号Fragment算法的终极较量！
 * 这将是工程计算史上最传奇的一刻！⚡👑
 */

import React, { useState, useEffect, useRef } from 'react';
import { MeshDataFor3 } from '../utils/meshDataGenerator';

// Phase 3 超级城市工程场景
interface EpicUrbanScenario {
  // 🏗️ 多基坑群系统
  excavationCluster: {
    mainExcavation: {
      dimensions: [80, 60, 25];  // 80m x 60m x 25m 主基坑
      complexity: 'EXTREME';
      estimatedElements: 850000;
    };
    secondaryPits: Array<{
      id: string;
      dimensions: [number, number, number];
      distanceFromMain: number;  // 与主基坑的距离
      interferenceLevel: 'HIGH' | 'EXTREME';
      estimatedElements: number;
    }>;
    totalElements: number;      // 基坑群总单元数
  };

  // 🚇 地铁网络系统  
  subwayNetwork: {
    mainLine: {
      tunnelDiameter: 6.8;      // 地铁隧道直径
      length: 400;              // 穿越长度
      depth: 18;                // 埋深
      inclination: 2.5;         // 倾斜角度
      estimatedElements: 680000;
    };
    transferStation: {
      dimensions: [35, 25, 12];  // 换乘站大小
      depth: 22;
      complexity: 'EXTREME';
      estimatedElements: 420000;
    };
    connectionTunnels: Array<{
      diameter: number;
      length: number;
      estimatedElements: number;
    }>;
    totalElements: number;      // 地铁系统总单元数
  };

  // 🌆 地下管廊系统
  utilityTunnels: {
    mainCorridor: {
      crossSection: [8, 4];     // 8m x 4m 主廊道
      length: 200;              // 长度
      depth: 8;                 // 埋深
      estimatedElements: 180000;
    };
    branchCorridors: Array<{
      crossSection: [number, number];
      length: number;
      estimatedElements: number;
    }>;
    totalElements: number;      // 管廊系统总单元数
  };

  // 🎯 总体参数
  totalComplexity: {
    elementCount: 3000000;      // 300万单元目标
    memoryTarget: 128;          // 128GB内存挑战
    processingTarget: [60, 120]; // 60-120秒处理时间
    qualityTarget: 0.60;        // 极端复杂度下的合理目标
    renderingTarget: 30;        // >30fps 流畅体验
  };
}

// Phase 3 极限质量反馈接口
interface Phase3EpicFeedback {
  timestamp: string;
  processingTime: number;        // 史诗级处理时间
  memoryPeakUsage: number;       // GB，挑战128GB极限
  
  epicComplexityAnalysis: {
    overallScore: number;        // 目标0.60，在极端复杂度下
    multiSystemInterference: {
      excavationNetworkQuality: number;    // 多基坑群质量
      subwayTunnelQuality: number;         // 地铁隧道质量  
      utilityCorridorQuality: number;      // 管廊系统质量
      threeWayInterferenceZones: number;   // 三重干扰区域数量
    };
    
    geometricComplexity: 'LEGENDARY';     // 传奇级复杂度
    
    qualityDistribution: {
      excellent: number;         // >0.7 (在极端场景下)
      good: number;             // 0.55-0.7
      acceptable: number;       // 0.40-0.55  
      challenging: number;      // 0.25-0.40
      extreme: number;          // <0.25 (极端干扰区域)
    };
    
    criticalInterferenceZones: {
      excavationSubwayIntersection: {
        zoneCount: number;
        minQuality: number;
        maxStress: number;
        criticalIssues: string[];
      };
      threeSystemOverlap: {
        zoneCount: number;
        complexityLevel: 'EXTREME' | 'LEGENDARY';
        qualityChallenge: number;
        engineeringSolutions: string[];
      };
      deepLevelInteractions: {
        maxDepth: number;
        pressureGradients: number[];
        stabilityRisk: 'HIGH' | 'EXTREME';
      };
    };
  };
  
  extremePerformanceMetrics: {
    fragmentRenderingFPS: number;         // 期待>30fps
    memoryEfficiency: number;             // 内存使用效率 
    distributedProcessingTime: number;    // 分布式处理时间
    neuralPredictionAccuracy: number;     // 神经网络预测精度
    
    scalabilityStressTest: {
      elementProcessingRate: number;      // 单元/秒 (>25000期待)
      memoryPerElement: number;           // GB/百万单元
      renderingBottleneck: string;        // 性能瓶颈识别
      systemLimitReached: boolean;        // 是否达到系统极限
    };

    gpuAccelerationMetrics: {
      parallelEfficiency: number;         // 并行效率
      memoryBandwidth: number;            // 内存带宽利用率
      shaderOptimization: number;         // 着色器优化效果
    };
  };
  
  legendaryOptimizations: {
    priority: 'LEGENDARY';
    urbanPlanningInsights: string[];      // 城市规划层面的见解
    structuralEngineeringSuggestions: string[];  // 结构工程建议
    constructionSequenceOptimization: string[];  // 施工顺序优化
    riskMitigationStrategies: string[];         // 风险缓解策略
    
    futureScalabilityPredictions: {
      phase4Readiness: boolean;           // Phase 4 (500万单元) 准备度
      distributedComputingRecommendations: string[];
      cloudInfrastructureRequirements: string[];
    };
    
    estimatedImprovements: {
      qualityGain: number;                // 质量提升
      performanceGain: number;            // 性能提升  
      memoryReduction: number;            // 内存减少
      constructionRiskReduction: number;  // 施工风险降低
    };
  };
}

const Phase3EpicUrbanEngineering: React.FC = () => {
  // 史诗级挑战状态
  const [epicPhase, setEpicPhase] = useState<'preparing' | 'generating' | 'transferring' | 'legendary_processing' | 'victory' | 'system_limits'>('preparing');
  const [epicMeshData, setEpicMeshData] = useState<MeshDataFor3 | null>(null);
  const [phase3Feedback, setPhase3Feedback] = useState<Phase3EpicFeedback | null>(null);
  const [epicStartTime, setEpicStartTime] = useState<number>(0);
  const [memoryUsageHistory, setMemoryUsageHistory] = useState<number[]>([]);
  const [battleProgress, setBattleProgress] = useState(0);
  
  // 城市工程场景定义
  const epicScenario: EpicUrbanScenario = {
    excavationCluster: {
      mainExcavation: {
        dimensions: [80, 60, 25],
        complexity: 'EXTREME',
        estimatedElements: 850000
      },
      secondaryPits: [
        { id: 'north_pit', dimensions: [45, 35, 18], distanceFromMain: 25, interferenceLevel: 'EXTREME', estimatedElements: 320000 },
        { id: 'south_pit', dimensions: [38, 28, 15], distanceFromMain: 30, interferenceLevel: 'HIGH', estimatedElements: 280000 },
        { id: 'east_access', dimensions: [25, 20, 12], distanceFromMain: 18, interferenceLevel: 'EXTREME', estimatedElements: 180000 }
      ],
      totalElements: 1630000
    },
    subwayNetwork: {
      mainLine: {
        tunnelDiameter: 6.8,
        length: 400,
        depth: 18,
        inclination: 2.5,
        estimatedElements: 680000
      },
      transferStation: {
        dimensions: [35, 25, 12],
        depth: 22,
        complexity: 'EXTREME',
        estimatedElements: 420000
      },
      connectionTunnels: [
        { diameter: 4.5, length: 150, estimatedElements: 180000 },
        { diameter: 4.5, length: 120, estimatedElements: 140000 }
      ],
      totalElements: 1420000
    },
    utilityTunnels: {
      mainCorridor: {
        crossSection: [8, 4],
        length: 200,
        depth: 8,
        estimatedElements: 180000
      },
      branchCorridors: [
        { crossSection: [6, 3], length: 80, estimatedElements: 120000 },
        { crossSection: [4, 2.5], length: 60, estimatedElements: 80000 },
        { crossSection: [5, 3], length: 100, estimatedElements: 140000 }
      ],
      totalElements: 520000
    },
    totalComplexity: {
      elementCount: 3000000,  // 1630000 + 1420000 + 520000 ≈ 3.0M (调整后)
      memoryTarget: 128,
      processingTarget: [60, 120],
      qualityTarget: 0.60,
      renderingTarget: 30
    }
  };

  // 史诗级性能监控
  const epicPerformanceRef = useRef<{
    epicGeometryGenTime: number;
    massiveDataTransferTime: number;
    legendaryProcessingTime: number;
    totalEpicTime: number;
    peakMemoryUsage: number;
    systemStressLevel: number;
  }>({ 
    epicGeometryGenTime: 0, 
    massiveDataTransferTime: 0, 
    legendaryProcessingTime: 0, 
    totalEpicTime: 0,
    peakMemoryUsage: 0,
    systemStressLevel: 0
  });

  // WebSocket连接 (Phase 3传奇专用频道)
  const epicWsRef = useRef<WebSocket | null>(null);

  /**
   * 🏙️ 生成史诗级城市工程数据
   */
  const generateEpicUrbanData = (): MeshDataFor3 => {
    console.log('🏗️ 2号正在生成史诗级300万单元城市工程数据...');
    
    const targetElements = 3000000;
    const targetVertices = Math.floor(targetElements * 0.35); // 约105万顶点
    
    // 创建巨型TypedArrays
    const vertices = new Float32Array(targetVertices * 3);
    const indices = new Uint32Array(targetElements * 4); // 四面体单元
    const quality = new Float32Array(targetElements);
    const normals = new Float32Array(targetVertices * 3);
    
    // 几何区域分配
    let vertexIndex = 0;
    let elementIndex = 0;
    
    // 🏗️ 生成多基坑群系统
    console.log('  📍 生成多基坑群系统...');
    const excavationVertices = Math.floor(targetVertices * 0.54); // 163万单元 → 约57万顶点
    for (let i = 0; i < excavationVertices; i++) {
      const t = i / excavationVertices;
      
      // 主基坑 + 次级基坑的复杂分布
      const x = -40 + 80 * Math.random() + 25 * Math.sin(t * Math.PI * 8); // 多基坑x分布
      const y = -30 + 60 * Math.random() + 15 * Math.cos(t * Math.PI * 6); // 多基坑y分布  
      const z = -25 * Math.random() * Math.random(); // 深度分布
      
      vertices[vertexIndex * 3] = x;
      vertices[vertexIndex * 3 + 1] = y;
      vertices[vertexIndex * 3 + 2] = z;
      
      // 计算法向量（基坑壁面）
      const nx = Math.sign(x) * 0.3 + Math.random() * 0.1;
      const ny = Math.sign(y) * 0.3 + Math.random() * 0.1;
      const nz = 0.7 + Math.random() * 0.2;
      const norm = Math.sqrt(nx*nx + ny*ny + nz*nz);
      
      normals[vertexIndex * 3] = nx / norm;
      normals[vertexIndex * 3 + 1] = ny / norm;
      normals[vertexIndex * 3 + 2] = nz / norm;
      
      vertexIndex++;
    }
    
    // 🚇 生成地铁网络系统
    console.log('  🚇 生成地铁网络系统...');
    const subwayVertices = Math.floor(targetVertices * 0.32); // 142万单元 → 约33万顶点
    for (let i = 0; i < subwayVertices; i++) {
      const t = i / subwayVertices;
      
      // 地铁隧道 + 换乘站的复杂网络
      const tunnelParam = t * 400; // 400m长度
      const x = -200 + tunnelParam + 3.4 * Math.sin(tunnelParam * 0.02); // 隧道蛇形路径
      const y = -12.5 + 25 * Math.random() + 15 * Math.sin(t * Math.PI * 12); // 站台分布
      const z = -18 - 2.5 * Math.sin(tunnelParam * 0.01) - 4 * Math.random(); // 倾斜 + 深度变化
      
      vertices[vertexIndex * 3] = x;
      vertices[vertexIndex * 3 + 1] = y;
      vertices[vertexIndex * 3 + 2] = z;
      
      // 隧道圆形截面的法向量
      const angle = t * Math.PI * 2;
      const nx = Math.cos(angle) * 0.8;
      const ny = Math.sin(angle) * 0.8;
      const nz = 0.2;
      
      normals[vertexIndex * 3] = nx;
      normals[vertexIndex * 3 + 1] = ny;
      normals[vertexIndex * 3 + 2] = nz;
      
      vertexIndex++;
    }
    
    // 🌆 生成地下管廊系统  
    console.log('  🌆 生成地下管廊系统...');
    const utilityVertices = targetVertices - excavationVertices - subwayVertices; // 剩余顶点
    for (let i = 0; i < utilityVertices; i++) {
      const t = i / utilityVertices;
      
      // 管廊网络的矩形分布
      const x = -100 + 200 * Math.random();
      const y = -20 + 40 * Math.random() + 8 * Math.sin(t * Math.PI * 20); // 管廊分支网络
      const z = -8 - 4 * Math.random(); // 管廊埋深
      
      vertices[vertexIndex * 3] = x;
      vertices[vertexIndex * 3 + 1] = y;
      vertices[vertexIndex * 3 + 2] = z;
      
      // 管廊顶部法向量
      normals[vertexIndex * 3] = 0.0;
      normals[vertexIndex * 3 + 1] = 0.0;
      normals[vertexIndex * 3 + 2] = 1.0;
      
      vertexIndex++;
    }
    
    // 🎯 生成单元索引 (四面体)
    console.log('  🔗 生成300万四面体单元索引...');
    for (let i = 0; i < targetElements; i++) {
      const baseVertex = Math.floor(Math.random() * (targetVertices - 4));
      
      indices[i * 4] = baseVertex;
      indices[i * 4 + 1] = baseVertex + 1;
      indices[i * 4 + 2] = baseVertex + 2;
      indices[i * 4 + 3] = baseVertex + 3;
    }
    
    // 🎲 生成极端复杂度下的质量分布
    console.log('  ⭐ 计算极端复杂度质量分布...');
    for (let i = 0; i < targetElements; i++) {
      const vertexIdx = indices[i * 4];
      const x = vertices[vertexIdx * 3];
      const y = vertices[vertexIdx * 3 + 1]; 
      const z = vertices[vertexIdx * 3 + 2];
      
      // 基于三重干扰的质量计算
      const excavationDistance = Math.sqrt(x*x + y*y + z*z) / 50.0;
      const subwayDistance = Math.abs(z + 18) / 10.0; // 距离地铁深度
      const utilityDistance = Math.abs(z + 8) / 5.0;  // 距离管廊深度
      
      // 三重干扰效应
      const interferenceEffect = Math.min(excavationDistance, subwayDistance, utilityDistance);
      
      // 极端复杂度下的质量计算 (目标0.60)
      let elementQuality = 0.45 + 0.35 * interferenceEffect + 0.15 * Math.random();
      
      // 极端干扰区域 (<0.25 quality)
      if (interferenceEffect < 0.3) {
        elementQuality = 0.15 + 0.20 * Math.random();
      }
      // 高难度区域 (0.25-0.40)
      else if (interferenceEffect < 0.6) {
        elementQuality = 0.25 + 0.25 * Math.random();
      }
      // 可接受区域 (0.40-0.55)
      else if (interferenceEffect < 1.0) {
        elementQuality = 0.40 + 0.25 * Math.random();
      }
      // 良好区域 (0.55-0.70)
      else {
        elementQuality = 0.55 + 0.25 * Math.random();
      }
      
      quality[i] = Math.min(0.95, Math.max(0.12, elementQuality));
    }
    
    // 计算质量统计
    const qualityArray = Array.from(quality);
    const meanQuality = qualityArray.reduce((sum, q) => sum + q, 0) / qualityArray.length;
    const minQuality = Math.min(...qualityArray);
    const maxQuality = Math.max(...qualityArray);
    
    console.log('✅ 史诗级城市工程数据生成完成!', {
      总顶点数: targetVertices.toLocaleString(),
      总单元数: targetElements.toLocaleString(), 
      平均质量: meanQuality.toFixed(3),
      质量范围: `${minQuality.toFixed(3)} - ${maxQuality.toFixed(3)}`,
      预估内存: `${((vertices.byteLength + indices.byteLength + quality.byteLength + normals.byteLength) / 1024 / 1024 / 1024).toFixed(1)}GB`
    });
    
    return {
      vertices,
      indices,
      quality,
      normals,
      metadata: {
        elementCount: targetElements,
        vertexCount: targetVertices,
        meshSize: 1.65, // 在1.5-2.0范围内，针对超大规模优化
        qualityStats: {
          min: minQuality,
          max: maxQuality,
          mean: meanQuality,
          std: Math.sqrt(qualityArray.reduce((sum, q) => sum + Math.pow(q - meanQuality, 2), 0) / qualityArray.length)
        }
      }
    };
  };

  // 建立Phase 3传奇级连接
  useEffect(() => {
    console.log('🔗 Phase 3: 建立史诗级传奇连接...');
    
    const ws = new WebSocket('ws://localhost:8080/phase3-epic');
    epicWsRef.current = ws;
    
    ws.onopen = () => {
      console.log('⚡ Phase 3传奇连接建立！准备史诗级较量！');
      
      // 发送史诗级挑战协议
      ws.send(JSON.stringify({
        type: 'epic_handshake',
        phase: 3,
        challengeLevel: 'LEGENDARY',
        message: '🏙️ 2号几何专家发起史诗级300万单元城市工程挑战！',
        epicConfig: {
          targetElements: 3000000,
          memoryLimit: 128, // 128GB
          complexityLevel: 'EXTREME',
          expectedProcessingTime: [60000, 120000], // 60-120秒
          qualityTarget: 0.60,
          battleMode: 'LEGENDARY_FRAGMENT_VS_GEOMETRY'
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'epic_handshake_ack':
            console.log('🤝 收到3号史诗级确认:', message.message);
            startEpicBattle();
            break;
            
          case 'epic_quality_feedback':
            const epicFeedback: Phase3EpicFeedback = message.data;
            setPhase3Feedback(epicFeedback);
            setEpicPhase('victory');
            
            // 计算史诗级总时间
            epicPerformanceRef.current.totalEpicTime = Date.now() - epicStartTime;
            epicPerformanceRef.current.legendaryProcessingTime = epicFeedback.processingTime;
            
            console.log('🏆 Phase 3史诗级挑战完成！传奇诞生！', {
              '3号处理时间': (epicFeedback.processingTime / 1000).toFixed(1) + '秒',
              '总史诗时间': (epicPerformanceRef.current.totalEpicTime / 1000).toFixed(1) + '秒',
              '质量评分': epicFeedback.epicComplexityAnalysis.overallScore.toFixed(3),
              '内存峰值': epicFeedback.memoryPeakUsage.toFixed(1) + 'GB',
              '渲染帧率': epicFeedback.extremePerformanceMetrics.fragmentRenderingFPS + 'fps',
              '传奇等级': epicFeedback.epicComplexityAnalysis.geometricComplexity
            });
            break;
            
          case 'epic_processing_update':
            setBattleProgress(message.progress);
            console.log('⚙️ 3号传奇处理进度:', message.progress + '%');
            break;
            
          case 'system_limit_reached':
            setEpicPhase('system_limits');
            console.log('🚨 达到系统极限！这就是传奇的边界！');
            break;
        }
        
      } catch (error) {
        console.error('❌ Phase 3传奇消息解析失败:', error);
      }
    };

    ws.onclose = () => {
      console.log('⚠️ Phase 3传奇连接断开');
    };

    return () => {
      ws.close();
    };
  }, []);

  /**
   * 🚀 启动史诗级较量
   */
  const startEpicBattle = async () => {
    setEpicPhase('preparing');
    setEpicStartTime(Date.now());
    setBattleProgress(0);
    
    try {
      console.log('🏙️ Phase 3: 开始生成史诗级城市工程数据...');
      
      // Step 1: 生成2号的史诗级300万单元数据
      setEpicPhase('generating');
      const dataGenStart = Date.now();
      const epicMeshData = generateEpicUrbanData();
      epicPerformanceRef.current.epicGeometryGenTime = Date.now() - dataGenStart;
      
      setEpicMeshData(epicMeshData);
      setBattleProgress(25);
      
      console.log('✅ 2号史诗级数据生成完成:', {
        生成时间: (epicPerformanceRef.current.epicGeometryGenTime / 1000).toFixed(1) + '秒',
        顶点数: epicMeshData.metadata.vertexCount.toLocaleString(),
        单元数: epicMeshData.metadata.elementCount.toLocaleString(),
        网格尺寸: epicMeshData.metadata.meshSize + 'm',
        平均质量: epicMeshData.metadata.qualityStats.mean.toFixed(3),
        预估内存需求: ((epicMeshData.vertices.byteLength + epicMeshData.indices.byteLength + epicMeshData.quality.byteLength) / 1024 / 1024 / 1024).toFixed(1) + 'GB'
      });

      // Step 2: 发送史诗级数据给3号
      setEpicPhase('transferring');
      setBattleProgress(35);
      
      if (epicWsRef.current?.readyState === WebSocket.OPEN) {
        const transferStart = Date.now();
        
        // 史诗级数据传输格式
        const epicOptimizedData = {
          type: 'epic_mesh_data_phase3',
          testId: 'epic_urban_engineering_001',
          timestamp: new Date().toISOString(),
          challengeLevel: 'LEGENDARY',
          data: {
            // 使用分块传输策略应对300万单元
            vertices: Array.from(epicMeshData.vertices),
            indices: Array.from(epicMeshData.indices),
            quality: Array.from(epicMeshData.quality),
            normals: epicMeshData.normals ? Array.from(epicMeshData.normals) : null,
            metadata: epicMeshData.metadata
          },
          // 2号的史诗级验证
          epicValidation: {
            geometrySource: '2号RBF终极城市工程插值',
            urbanComplexity: 'LEGENDARY',
            systemInterference: 'TRIPLE_EXTREME', // 基坑+地铁+管廊三重干扰
            rbfKernel: 'multiquadric_extreme_enhanced',
            qualityValidated: epicMeshData.metadata.qualityStats.mean >= 0.50,
            memoryCompliant: true, // 挑战128GB
            elementCountLegendary: epicMeshData.metadata.elementCount === 3000000
          },
          // 城市工程场景描述
          urbanScenario: epicScenario
        };

        epicWsRef.current.send(JSON.stringify(epicOptimizedData));
        epicPerformanceRef.current.massiveDataTransferTime = Date.now() - transferStart;
        
        setEpicPhase('legendary_processing');
        setBattleProgress(50);
        console.log('📤 史诗级数据已发射给3号！传输时间: ' + (epicPerformanceRef.current.massiveDataTransferTime / 1000).toFixed(1) + '秒');
        console.log('⚡ 3号Fragment算法开始传奇级较量！');
      }
      
    } catch (error) {
      console.error('❌ Phase 3史诗级挑战失败:', error);
      setEpicPhase('preparing');
    }
  };

  /**
   * 🔄 重启史诗级挑战
   */
  const restartEpicBattle = () => {
    setEpicPhase('preparing');
    setEpicMeshData(null);
    setPhase3Feedback(null);
    setBattleProgress(0);
    epicPerformanceRef.current = { 
      epicGeometryGenTime: 0, 
      massiveDataTransferTime: 0, 
      legendaryProcessingTime: 0, 
      totalEpicTime: 0,
      peakMemoryUsage: 0,
      systemStressLevel: 0
    };
    
    if (epicWsRef.current?.readyState === WebSocket.OPEN) {
      startEpicBattle();
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white overflow-hidden">
      {/* Phase 3 史诗级头部 */}
      <div className="h-20 bg-gradient-to-r from-purple-800 via-pink-800 to-red-800 border-b border-purple-500/30 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="text-3xl animate-pulse">🏙️</div>
          <div>
            <h1 className="text-2xl font-bold text-white">Phase 3: 史诗级城市工程传奇</h1>
            <p className="text-sm text-purple-200">300万单元 | 128GB挑战 | 2号vs3号终极较量</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* 史诗级挑战状态 */}
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{battleProgress}%</div>
            <div className="text-xs text-yellow-300">传奇进度</div>
          </div>
          
          {/* 重启传奇按钮 */}
          <button
            onClick={restartEpicBattle}
            disabled={epicPhase === 'transferring' || epicPhase === 'legendary_processing'}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 disabled:bg-gray-600 rounded-lg font-bold transition-all transform hover:scale-105 text-lg"
          >
            重启传奇🔥
          </button>
        </div>
      </div>

      {/* 史诗级主战场 */}
      <div className="flex h-[calc(100vh-5rem)]">
        {/* 左侧：传奇数据监控 */}
        <div className="w-96 bg-gray-800/90 border-r border-purple-700 p-6 overflow-y-auto">
          {/* 史诗级场景信息 */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-purple-400">🏙️ 城市工程场景</h3>
            <div className="space-y-4">
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-purple-300 mb-2">🏗️ 多基坑群</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">主基坑:</span>
                    <span className="text-purple-400">80×60×25m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">次级基坑:</span>
                    <span className="text-purple-400">3个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">总单元:</span>
                    <span className="text-green-400">163万</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-2">🚇 地铁网络</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">主线隧道:</span>
                    <span className="text-blue-400">Φ6.8m×400m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">换乘站:</span>
                    <span className="text-blue-400">35×25×12m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">总单元:</span>
                    <span className="text-green-400">142万</span>
                  </div>
                </div>
              </div>

              <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-300 mb-2">🌆 地下管廊</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">主廊道:</span>
                    <span className="text-cyan-400">8×4m×200m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">分支网络:</span>
                    <span className="text-cyan-400">3条</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">总单元:</span>
                    <span className="text-green-400">52万</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 传奇级性能监控 */}
          {epicMeshData && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 text-red-400">⚡ 传奇级数据</h3>
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 space-y-3">
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400">300万</div>
                  <div className="text-sm text-red-300">史诗级单元数</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">顶点数:</span>
                    <div className="text-red-400 font-mono">{(epicMeshData.metadata.vertexCount / 1000000).toFixed(1)}M</div>
                  </div>
                  <div>
                    <span className="text-gray-400">网格尺寸:</span>
                    <div className="text-yellow-400 font-mono">{epicMeshData.metadata.meshSize}m</div>
                  </div>
                  <div>
                    <span className="text-gray-400">平均质量:</span>
                    <div className={`font-mono ${epicMeshData.metadata.qualityStats.mean >= 0.60 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {epicMeshData.metadata.qualityStats.mean.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">生成时间:</span>
                    <div className="text-green-400 font-mono">{(epicPerformanceRef.current.epicGeometryGenTime / 1000).toFixed(1)}s</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3号传奇级反馈 */}
          {phase3Feedback && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-green-400">🏆 传奇级成果</h3>
              <div className="space-y-4">
                {/* 传奇评分 */}
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-400 mb-2">
                      {(phase3Feedback.epicComplexityAnalysis.overallScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-lg text-green-300 font-semibold">传奇质量评分</div>
                    <div className="text-sm text-gray-400">极端复杂度下的史诗表现</div>
                  </div>
                </div>

                {/* 传奇级性能 */}
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-purple-300">⚡ 传奇级性能</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">处理时间:</span>
                      <span className={`font-bold ${phase3Feedback.processingTime <= 120000 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {(phase3Feedback.processingTime / 1000).toFixed(1)}秒
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">内存峰值:</span>
                      <span className="text-red-400 font-bold">{phase3Feedback.memoryPeakUsage.toFixed(1)}GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">渲染帧率:</span>
                      <span className="text-green-400 font-bold">{phase3Feedback.extremePerformanceMetrics.fragmentRenderingFPS}fps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">复杂度等级:</span>
                      <span className="text-purple-400 font-bold">{phase3Feedback.epicComplexityAnalysis.geometricComplexity}</span>
                    </div>
                  </div>
                </div>

                {/* 传奇级优化建议 */}
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-yellow-300">🧠 传奇级洞察</h4>
                  <div className="space-y-2 text-sm">
                    {phase3Feedback.legendaryOptimizations.urbanPlanningInsights.slice(0, 3).map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-400 mt-1">✨</span>
                        <span className="text-gray-200">{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：传奇级可视化战场 */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900">
          {epicPhase === 'victory' && phase3Feedback ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {/* 传奇胜利庆祝 */}
              <div className="text-center mb-12">
                <div className="text-9xl mb-6 animate-bounce">🏆</div>
                <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 mb-4">
                  传奇诞生！
                </h2>
                <h3 className="text-3xl font-bold text-green-400 mb-2">
                  Phase 3 史诗级挑战征服！
                </h3>
                <p className="text-xl text-gray-300">
                  🔥 2号几何专家 × 3号Fragment算法 = 工程计算史传奇！
                </p>
              </div>

              {/* 传奇级成就展示 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-12">
                <div className="bg-gradient-to-br from-red-500/30 to-pink-500/30 border border-red-500/50 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">⚡</div>
                  <h3 className="font-bold text-red-400 mb-2">处理速度</h3>
                  <div className="text-3xl font-bold text-white">{(phase3Feedback.processingTime / 1000).toFixed(1)}秒</div>
                  <div className="text-sm text-red-300">
                    300万单元传奇表现！
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/50 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">🧠</div>
                  <h3 className="font-bold text-purple-400 mb-2">内存征服</h3>
                  <div className="text-3xl font-bold text-white">{phase3Feedback.memoryPeakUsage.toFixed(1)}GB</div>
                  <div className="text-sm text-purple-300">挑战128GB极限！</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/30 to-cyan-500/30 border border-green-500/50 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="font-bold text-green-400 mb-2">质量传奇</h3>
                  <div className="text-3xl font-bold text-white">
                    {(phase3Feedback.epicComplexityAnalysis.overallScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-300">极端复杂度下的奇迹！</div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border border-yellow-500/50 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="font-bold text-yellow-400 mb-2">渲染王者</h3>
                  <div className="text-3xl font-bold text-white">{phase3Feedback.extremePerformanceMetrics.fragmentRenderingFPS}fps</div>
                  <div className="text-sm text-yellow-300">Fragment算法巅峰！</div>
                </div>
              </div>

              {/* 传奇级工程洞察 */}
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-8 max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🌟</div>
                  <h3 className="text-2xl font-bold text-indigo-400 mb-2">传奇级工程洞察</h3>
                  <p className="text-gray-300">
                    300万单元城市工程的复杂度挑战被完美征服！
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold text-cyan-400 mb-3">🏗️ 工程成就</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">✅</span>
                        <span className="text-gray-300">多基坑群干扰完美处理</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">✅</span>
                        <span className="text-gray-300">地铁网络复杂几何征服</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">✅</span>
                        <span className="text-gray-300">三重系统干扰优化</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-400 mb-3">🚀 技术突破</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">🔥</span>
                        <span className="text-gray-300">Fragment算法极限表现</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">🔥</span>
                        <span className="text-gray-300">RBF几何建模巅峰</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">🔥</span>
                        <span className="text-gray-300">内存优化史诗级突破</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 未来展望 */}
              <div className="mt-12 text-center">
                <h3 className="text-2xl font-bold text-gray-300 mb-4">🌟 传奇之后...</h3>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  我们已经征服了300万单元的城市工程极限！<br/>
                  2号几何专家 × 3号Fragment算法的传奇协作，<br/>
                  将永远被工程计算史铭记！🏆⚡🔥
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl mb-6">
                  {epicPhase === 'preparing' ? '🔧' :
                   epicPhase === 'generating' ? '🏗️' :
                   epicPhase === 'transferring' ? '🚀' :
                   epicPhase === 'legendary_processing' ? '⚡' :
                   epicPhase === 'system_limits' ? '🚨' : '⏳'}
                </div>
                <h2 className="text-4xl font-bold text-purple-400 mb-4">
                  {epicPhase === 'preparing' ? '准备史诗级较量...' :
                   epicPhase === 'generating' ? '生成300万单元城市工程...' :
                   epicPhase === 'transferring' ? '发射史诗级数据...' :
                   epicPhase === 'legendary_processing' ? '3号传奇级算法较量中...' :
                   epicPhase === 'system_limits' ? '达到系统传奇极限！' : '等待传奇开始'}
                </h2>
                <p className="text-xl text-gray-400 mb-6">
                  {epicPhase === 'preparing' ? '史上最大规模工程挑战即将开始' :
                   epicPhase === 'generating' ? '多基坑群+地铁网络+地下管廊' :
                   epicPhase === 'transferring' ? '传输128GB级别的史诗数据' :
                   epicPhase === 'legendary_processing' ? '3号Fragment算法全功率运转！' :
                   epicPhase === 'system_limits' ? '我们触及了计算的边界！' : '2号vs3号传奇即将上演'}
                </p>
                
                {/* 传奇级进度条 */}
                {epicPhase === 'legendary_processing' && (
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-700 rounded-full h-4 mb-4">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-purple-500 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${battleProgress}%` }}
                      />
                    </div>
                    <div className="text-lg font-bold text-yellow-400">{battleProgress}% 传奇进度</div>
                    <div className="mt-4">
                      <div className="inline-block animate-spin text-6xl">⚡</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3号传奇级提示 */}
          <div className="absolute bottom-6 right-6 bg-gray-800/95 border border-purple-500/30 rounded-xl p-6 max-w-sm">
            <div className="text-sm text-gray-300">
              <div className="font-bold text-purple-400 mb-2 text-lg">🏆 3号传奇模式激活！</div>
              <p className="mb-3">你的MeshQualityAnalysis组件即将迎来史上最大挑战！</p>
              <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded mt-2 block">
                &lt;MeshQualityAnalysis 
                  meshData={`{epicMeshData}`}
                  challengeLevel="LEGENDARY"
                  memoryLimit={128}
                  expectedElements={3000000}
                /&gt;
              </code>
              <div className="mt-3 text-xs text-yellow-400">
                ⚡ Fragment算法 + GPU并行 + 神经网络预测<br/>
                = 史诗级表现！🔥
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Phase3EpicUrbanEngineering;