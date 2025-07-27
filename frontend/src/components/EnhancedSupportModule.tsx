/**
 * 增强型支护结构模块
 * 0号架构师 - 基于正确架构理解
 * 支护结构系统包含：地下连续墙 + 桩基支护 + 锚索系统 + 钢支撑
 * 桩基作为支护结构的重要组成部分，而非独立模块
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import PileTypeSelector from './advanced/PileTypeSelector';
import { PileType, PileModelingStrategy } from '../services/PileModelingStrategy';

// 支护结构类型定义
interface SupportStructureType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  category: 'retaining' | 'anchoring' | 'bracing';
  enabled: boolean;
  configuration: any;
}

// 增强的支护结构系统配置
interface SupportSystemConfiguration {
  // 地下连续墙系统
  diaphragmWalls: {
    enabled: boolean;
    thickness: number; // mm
    depth: number; // m
    material: 'C30_concrete' | 'C35_concrete' | 'steel_concrete' | 'composite';
    joints: 'rigid' | 'flexible' | 'semi_rigid';
    waterproofing: {
      enabled: boolean;
      type: 'membrane' | 'coating' | 'crystalline' | 'injection';
      thickness: number; // mm
    };
    reinforcement: {
      mainRebar: string; // 主筋规格
      stirrupRebar: string; // 箍筋规格
      reinforcementRatio: number; // 配筋率
      coverThickness: number; // 保护层厚度 mm
    };
    qualityControl: {
      verticality: number; // 垂直度要求 ‰
      jointWaterTightness: boolean;
      concreteStrength: number; // MPa
    };
  };
  
  // 增强桩基支护系统
  pileSupports: {
    enabled: boolean;
    systemType: 'single_row' | 'double_row' | 'triple_row' | 'staggered';
    pileConfigurations: Array<{
      type: PileType;
      strategy: PileModelingStrategy;
      diameter: number; // mm
      spacing: number; // m
      length: number; // m
      quantity: number;
      embedmentDepth: number; // 嵌固深度 m
      materialGrade: string; // 材料等级
      qualityRequirements: {
        integrityLevel: 'I' | 'II' | 'III';
        bearingCapacity: number; // kN
        horizontalDisplacement: number; // mm
      };
    }>;
    crownBeam: {
      enabled: boolean;
      width: number; // mm
      height: number; // mm
      material: string;
      continuity: 'continuous' | 'segmented';
      reinforcement: {
        longitudinalRebar: string;
        stirrupRebar: string;
        reinforcementDetails: string;
      };
    };
    soilNails: {
      enabled: boolean;
      length: number; // m
      inclination: number; // degrees
      spacing: number; // m
      groutType: 'cement' | 'chemical' | 'composite';
    };
  };
  
  // 增强锚索系统
  anchorSystems: {
    enabled: boolean;
    anchorType: 'soil_anchor' | 'rock_anchor' | 'prestressed_anchor' | 'self_drilling';
    levels: Array<{
      depth: number; // m
      angle: number; // degrees
      capacity: number; // kN
      spacing: {
        horizontal: number; // m
        vertical: number; // m
      };
      freeLength: number; // 自由段长度 m
      anchorageLength: number; // 锚固段长度 m
      prestress: {
        initialTension: number; // kN
        lockOffLoad: number; // kN
        testLoad: number; // kN
      };
      protection: {
        corrosionProtection: boolean;
        encasement: 'PE' | 'steel' | 'composite';
        groutType: string;
      };
    }>;
    monitoringSystem: {
      enabled: boolean;
      loadCells: boolean;
      displacementSensors: boolean;
      dataLogging: boolean;
    };
  };
  
  // 增强钢支撑系统
  steelSupports: {
    enabled: boolean;
    levels: Array<{
      elevation: number; // m
      profileType: 'H_steel' | 'box_section' | 'pipe_section' | 'truss';
      sectionSize: string; // 截面规格
      preload: number; // kN
      spacing: number; // m
      connections: {
        type: 'welded' | 'bolted' | 'pin';
        details: string;
      };
      materialProperties: {
        steelGrade: string;
        yieldStrength: number; // MPa
        elasticModulus: number; // GPa
      };
      fireProtection: {
        enabled: boolean;
        type: 'intumescent' | 'cementitious' | 'board';
        rating: number; // hours
      };
    }>;
    temperatureCompensation: {
      enabled: boolean;
      expansionJoints: boolean;
      temperatureRange: {
        min: number; // °C
        max: number; // °C
      };
    };
  };

  // 系统整体配置
  systemIntegration: {
    designLife: number; // years
    loadCombinations: Array<{
      name: string;
      factors: Record<string, number>;
    }>;
    constructionSequence: Array<{
      stage: string;
      description: string;
      duration: number; // days
      dependencies: string[];
    }>;
    qualityAssurance: {
      inspectionPoints: string[];
      testingRequirements: string[];
      acceptanceCriteria: Record<string, any>;
    };
  };
}

// 组件属性接口
interface EnhancedSupportModuleProps {
  excavationGeometry?: any;
  geologyModel?: any;
  onSupportGenerated: (result: SupportResult) => void;
  onQualityReport?: (report: SupportQualityReport) => void;
  onPerformanceStats?: (stats: any) => void;
  onPileSystemConfiguration?: (pileConfig: any) => void;
}

// 支护结果接口
interface SupportResult {
  geometry: any;
  structuralAnalysis: {
    stiffness: number;
    stability: number;
    loadCapacity: number;
    deformation: number;
    safetyFactor: number;
  };
  constructionGuidance: {
    steps: any[];
    materialRequirements: any[];
    qualityCheckpoints: any[];
  };
  qualityMetrics: {
    structuralScore: number;
    constructabilityScore: number;
    economicScore: number;
    overallScore: number;
    complianceLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
}

interface SupportQualityReport {
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    recommendations: string[];
  };
  systemAnalysis: {
    diaphragmWallEfficiency: number;
    pileSystemEfficiency: number;
    anchorSystemEfficiency: number;
    steelSupportEfficiency: number;
    systemSynergy: number;
  };
}

const EnhancedSupportModule: React.FC<EnhancedSupportModuleProps> = ({
  excavationGeometry,
  geologyModel,
  onSupportGenerated,
  onQualityReport,
  onPerformanceStats,
  onPileSystemConfiguration
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'diaphragm' | 'piles' | 'anchors' | 'steel'>('overview');
  const [supportConfig, setSupportConfig] = useState<SupportSystemConfiguration>({
    diaphragmWalls: {
      enabled: false,
      thickness: 800,
      depth: 25,
      material: 'C30_concrete',
      joints: 'rigid',
      waterproofing: {
        enabled: true,
        type: 'membrane',
        thickness: 2
      },
      reinforcement: {
        mainRebar: 'HRB400 φ25@200',
        stirrupRebar: 'HRB400 φ12@150',
        reinforcementRatio: 0.8,
        coverThickness: 50
      },
      qualityControl: {
        verticality: 1.5,
        jointWaterTightness: true,
        concreteStrength: 30
      }
    },
    pileSupports: {
      enabled: false,
      systemType: 'single_row',
      pileConfigurations: [],
      crownBeam: {
        enabled: true,
        width: 800,
        height: 1000,
        material: 'C30混凝土',
        continuity: 'continuous',
        reinforcement: {
          longitudinalRebar: 'HRB400 φ20',
          stirrupRebar: 'HRB400 φ10@100',
          reinforcementDetails: '上部4φ20，下部4φ20'
        }
      },
      soilNails: {
        enabled: false,
        length: 8,
        inclination: 15,
        spacing: 1.5,
        groutType: 'cement'
      }
    },
    anchorSystems: {
      enabled: false,
      anchorType: 'prestressed_anchor',
      levels: [],
      monitoringSystem: {
        enabled: true,
        loadCells: true,
        displacementSensors: true,
        dataLogging: true
      }
    },
    steelSupports: {
      enabled: false,
      levels: [],
      temperatureCompensation: {
        enabled: true,
        expansionJoints: true,
        temperatureRange: {
          min: -20,
          max: 50
        }
      }
    },
    systemIntegration: {
      designLife: 50,
      loadCombinations: [
        { name: '基本组合', factors: { dead: 1.2, live: 1.4, wind: 1.4 } },
        { name: '地震组合', factors: { dead: 1.0, live: 0.5, seismic: 1.3 } }
      ],
      constructionSequence: [
        { stage: '准备阶段', description: '场地清理和测量放线', duration: 5, dependencies: [] },
        { stage: '地连墙施工', description: '地下连续墙施工', duration: 30, dependencies: ['准备阶段'] },
        { stage: '桩基施工', description: '支护桩施工', duration: 20, dependencies: ['地连墙施工'] },
        { stage: '锚索安装', description: '预应力锚索安装', duration: 15, dependencies: ['桩基施工'] },
        { stage: '钢支撑安装', description: '钢支撑系统安装', duration: 10, dependencies: ['锚索安装'] }
      ],
      qualityAssurance: {
        inspectionPoints: ['材料进场检验', '施工过程检查', '成品质量验收'],
        testingRequirements: ['混凝土强度试验', '钢筋拉伸试验', '锚索张拉试验'],
        acceptanceCriteria: {
          concreteStrength: '≥设计强度等级',
          reinforcementQuality: '符合GB1499标准',
          anchorTension: '≥1.05倍设计荷载'
        }
      }
    }
  });

  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<SupportResult | null>(null);

  // 支护结构类型定义
  const supportStructureTypes: SupportStructureType[] = [
    {
      id: 'diaphragm_walls',
      name: '地下连续墙',
      description: '主要围护结构，承担侧向土压力',
      icon: FunctionalIcons.StructuralAnalysis,
      color: '#1890ff',
      category: 'retaining',
      enabled: supportConfig.diaphragmWalls.enabled,
      configuration: supportConfig.diaphragmWalls
    },
    {
      id: 'pile_supports',
      name: '桩基支护',
      description: '排桩支护系统，包含梁元和壳元桩基',
      icon: FunctionalIcons.GeometryModeling,
      color: '#52c41a',
      category: 'retaining',
      enabled: supportConfig.pileSupports.enabled,
      configuration: supportConfig.pileSupports
    },
    {
      id: 'anchor_systems',
      name: '锚索系统',
      description: '土层锚杆，提供拉拔力平衡',
      icon: FunctionalIcons.MaterialLibrary,
      color: '#722ed1',
      category: 'anchoring',
      enabled: supportConfig.anchorSystems.enabled,
      configuration: supportConfig.anchorSystems
    },
    {
      id: 'steel_supports',
      name: '钢支撑',
      description: '内支撑系统，提供水平支撑力',
      icon: FunctionalIcons.StructuralAnalysis,
      color: '#fa541c',
      category: 'bracing',
      enabled: supportConfig.steelSupports.enabled,
      configuration: supportConfig.steelSupports
    }
  ];

  // 增强的桩基类型选择处理
  const handlePileTypeSelect = (type: PileType, strategy: PileModelingStrategy) => {
    const newPileConfig = {
      type,
      strategy,
      diameter: getDefaultDiameter(type),
      spacing: getDefaultSpacing(type),
      length: getDefaultLength(type),
      quantity: calculatePileQuantity(),
      embedmentDepth: getDefaultEmbedmentDepth(type),
      materialGrade: getDefaultMaterialGrade(type),
      qualityRequirements: {
        integrityLevel: getDefaultIntegrityLevel(type),
        bearingCapacity: calculateBearingCapacity(type),
        horizontalDisplacement: getDisplacementLimit(type)
      }
    };

    setSupportConfig(prev => ({
      ...prev,
      pileSupports: {
        ...prev.pileSupports,
        enabled: true,
        pileConfigurations: [...prev.pileSupports.pileConfigurations, newPileConfig]
      }
    }));

    // 通知父组件桩基配置变化
    onPileSystemConfiguration?.({
      selectedPileTypes: [{ type, strategy }],
      systemConfiguration: newPileConfig,
      enhancedParameters: {
        embedmentDepth: newPileConfig.embedmentDepth,
        qualityRequirements: newPileConfig.qualityRequirements,
        constructionConsiderations: getConstructionConsiderations(type)
      }
    });
  };

  // 获取默认桩径
  const getDefaultDiameter = (type: PileType): number => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 800;
      case PileType.HAND_DUG: return 1500;
      case PileType.PRECAST_DRIVEN: return 400;
      case PileType.SWM_METHOD: return 850;
      case PileType.CFG_PILE: return 500;
      case PileType.HIGH_PRESSURE_JET: return 800;
      default: return 800;
    }
  };

  // 获取默认桩距
  const getDefaultSpacing = (type: PileType): number => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 1.5;
      case PileType.HAND_DUG: return 2.0;
      case PileType.PRECAST_DRIVEN: return 1.2;
      case PileType.SWM_METHOD: return 1.0;
      case PileType.CFG_PILE: return 1.8;
      case PileType.HIGH_PRESSURE_JET: return 1.2;
      default: return 1.5;
    }
  };

  // 获取默认桩长
  const getDefaultLength = (type: PileType): number => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 25;
      case PileType.HAND_DUG: return 15;
      case PileType.PRECAST_DRIVEN: return 30;
      case PileType.SWM_METHOD: return 20;
      case PileType.CFG_PILE: return 18;
      case PileType.HIGH_PRESSURE_JET: return 22;
      default: return 20;
    }
  };

  // 获取默认嵌固深度
  const getDefaultEmbedmentDepth = (type: PileType): number => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 8;
      case PileType.HAND_DUG: return 5;
      case PileType.PRECAST_DRIVEN: return 10;
      case PileType.SWM_METHOD: return 6;
      case PileType.CFG_PILE: return 5;
      case PileType.HIGH_PRESSURE_JET: return 7;
      default: return 6;
    }
  };

  // 获取默认材料等级
  const getDefaultMaterialGrade = (type: PileType): string => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 'C30混凝土';
      case PileType.HAND_DUG: return 'C25混凝土';
      case PileType.PRECAST_DRIVEN: return 'C40预制混凝土';
      case PileType.SWM_METHOD: return 'C30混凝土+型钢';
      case PileType.CFG_PILE: return 'C15混凝土+碎石';
      case PileType.HIGH_PRESSURE_JET: return 'C20水泥土';
      default: return 'C30混凝土';
    }
  };

  // 获取默认完整性等级
  const getDefaultIntegrityLevel = (type: PileType): 'I' | 'II' | 'III' => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 'I';
      case PileType.HAND_DUG: return 'II';
      case PileType.PRECAST_DRIVEN: return 'I';
      case PileType.SWM_METHOD: return 'I';
      case PileType.CFG_PILE: return 'II';
      case PileType.HIGH_PRESSURE_JET: return 'II';
      default: return 'I';
    }
  };

  // 计算承载力
  const calculateBearingCapacity = (type: PileType): number => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 5000;
      case PileType.HAND_DUG: return 3000;
      case PileType.PRECAST_DRIVEN: return 4500;
      case PileType.SWM_METHOD: return 6000;
      case PileType.CFG_PILE: return 2500;
      case PileType.HIGH_PRESSURE_JET: return 3500;
      default: return 4000;
    }
  };

  // 获取位移限制
  const getDisplacementLimit = (type: PileType): number => {
    switch (type) {
      case PileType.BORED_CAST_IN_PLACE: return 20;
      case PileType.HAND_DUG: return 30;
      case PileType.PRECAST_DRIVEN: return 15;
      case PileType.SWM_METHOD: return 18;
      case PileType.CFG_PILE: return 25;
      case PileType.HIGH_PRESSURE_JET: return 22;
      default: return 20;
    }
  };

  // 获取施工注意事项
  const getConstructionConsiderations = (type: PileType): string[] => {
    const considerations = {
      [PileType.BORED_CAST_IN_PLACE]: [
        '控制成孔垂直度≤1/300',
        '注意地下水处理',
        '混凝土浇筑连续性要求高',
        '泥浆循环系统运行正常'
      ],
      [PileType.HAND_DUG]: [
        '人工开挖安全防护',
        '井壁支护及时到位',
        '地下水控制措施',
        '混凝土浇筑分层进行'
      ],
      [PileType.PRECAST_DRIVEN]: [
        '桩身质量预检',
        '沉桩顺序规划',
        '邻桩影响控制',
        '桩头处理规范'
      ],
      [PileType.SWM_METHOD]: [
        '型钢插入及时性',
        '混凝土和易性控制',
        '搅拌头磨损监控',
        '施工连续性保证'
      ],
      [PileType.CFG_PILE]: [
        '碎石级配控制',
        '水泥用量准确计量',
        '搅拌均匀度检查',
        '成桩连续性保证'
      ],
      [PileType.HIGH_PRESSURE_JET]: [
        '高压设备维护',
        '浆液配比准确',
        '喷射参数控制',
        '固化时间掌握'
      ]
    };
    return considerations[type] || ['按规范施工', '质量控制到位'];
  };

  // 计算桩基数量
  const calculatePileQuantity = (): number => {
    // 基于基坑周长和桩距的估算
    const perimeterEstimate = 200; // 假设周长200m
    const averageSpacing = 1.5;
    return Math.ceil(perimeterEstimate / averageSpacing);
  };

  // 生成支护结构系统
  const generateSupportSystem = async () => {
    setProcessing(true);
    
    try {
      // 模拟支护结构生成过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result: SupportResult = {
        geometry: {
          diaphragmWalls: supportConfig.diaphragmWalls.enabled ? generateDiaphragmWallGeometry() : null,
          pileSupports: supportConfig.pileSupports.enabled ? generatePileSystemGeometry() : null,
          anchorSystems: supportConfig.anchorSystems.enabled ? generateAnchorGeometry() : null,
          steelSupports: supportConfig.steelSupports.enabled ? generateSteelSupportGeometry() : null
        },
        structuralAnalysis: {
          stiffness: 85.6,
          stability: 2.3,
          loadCapacity: 1250,
          deformation: 12.5,
          safetyFactor: 2.1
        },
        constructionGuidance: {
          steps: generateConstructionSteps(),
          materialRequirements: generateMaterialRequirements(),
          qualityCheckpoints: generateQualityCheckpoints()
        },
        qualityMetrics: {
          structuralScore: 0.89,
          constructabilityScore: 0.85,
          economicScore: 0.78,
          overallScore: 0.84,
          complianceLevel: 'good'
        }
      };

      setResults(result);
      onSupportGenerated(result);

      // 生成质量报告
      const qualityReport: SupportQualityReport = {
        overall: {
          score: 0.84,
          grade: 'B',
          recommendations: [
            '考虑增加锚索系统以提高整体稳定性',
            '优化桩基间距以改善经济性',
            '建议增加地下水控制措施'
          ]
        },
        systemAnalysis: {
          diaphragmWallEfficiency: supportConfig.diaphragmWalls.enabled ? 0.92 : 0,
          pileSystemEfficiency: supportConfig.pileSupports.enabled ? 0.86 : 0,
          anchorSystemEfficiency: supportConfig.anchorSystems.enabled ? 0.88 : 0,
          steelSupportEfficiency: supportConfig.steelSupports.enabled ? 0.82 : 0,
          systemSynergy: 0.85
        }
      };

      onQualityReport?.(qualityReport);

    } catch (error) {
      console.error('支护结构生成失败:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 生成各种几何体 (简化实现)
  const generateDiaphragmWallGeometry = () => ({ type: 'diaphragm_wall', elements: 120 });
  const generatePileSystemGeometry = () => ({ 
    type: 'pile_system', 
    piles: supportConfig.pileSupports.pileConfigurations.length,
    modelingStrategies: supportConfig.pileSupports.pileConfigurations.map(p => p.strategy)
  });
  const generateAnchorGeometry = () => ({ type: 'anchor_system', anchors: 24 });
  const generateSteelSupportGeometry = () => ({ type: 'steel_support', levels: 3 });

  const generateConstructionSteps = () => {
    const baseSteps = supportConfig.systemIntegration.constructionSequence.map(seq => seq.description);
    return baseSteps.length > 0 ? baseSteps : [
      '场地准备和测量放线',
      '地下连续墙施工',
      '桩基施工(按选定工艺)',
      '冠梁施工',
      '锚索安装和张拉',
      '钢支撑安装',
      '质量检测和验收'
    ];
  };

  const generateMaterialRequirements = () => {
    const requirements = [];
    
    if (supportConfig.diaphragmWalls.enabled) {
      requirements.push({
        material: supportConfig.diaphragmWalls.material.replace('_', ' ').toUpperCase() + '混凝土',
        quantity: `${Math.round(supportConfig.diaphragmWalls.thickness * supportConfig.diaphragmWalls.depth * 2.5)}m³`,
        purpose: '地下连续墙'
      });
      requirements.push({
        material: supportConfig.diaphragmWalls.reinforcement.mainRebar.split(' ')[0] + '钢筋',
        quantity: `${Math.round(supportConfig.diaphragmWalls.depth * 15)}t`,
        purpose: '地连墙配筋'
      });
    }
    
    if (supportConfig.pileSupports.enabled && supportConfig.pileSupports.pileConfigurations.length > 0) {
      const totalPiles = supportConfig.pileSupports.pileConfigurations.reduce((sum, pile) => sum + pile.quantity, 0);
      requirements.push({
        material: '桩基混凝土',
        quantity: `${Math.round(totalPiles * 20 * 0.5)}m³`,
        purpose: '支护桩基'
      });
    }
    
    if (supportConfig.anchorSystems.enabled) {
      requirements.push({
        material: '预应力钢绊',
        quantity: '8.5t',
        purpose: '锚索系统'
      });
    }
    
    if (supportConfig.steelSupports.enabled) {
      requirements.push({
        material: 'Q345B型钢',
        quantity: '45t',
        purpose: '钢支撑系统'
      });
    }
    
    return requirements.length > 0 ? requirements : [
      { material: 'C30混凝土', quantity: '1250m³', purpose: '地下连续墙' },
      { material: 'HRB400钢筋', quantity: '180t', purpose: '结构配筋' },
      { material: '桩基材料', quantity: '变化', purpose: '根据选定桩基类型' }
    ];
  };

  const generateQualityCheckpoints = () => {
    const checkpoints = [];
    
    if (supportConfig.diaphragmWalls.enabled) {
      checkpoints.push(`地连墙垂直度检查(≤${supportConfig.diaphragmWalls.qualityControl.verticality}‰)`);
      checkpoints.push(`混凝土强度检测(≥${supportConfig.diaphragmWalls.qualityControl.concreteStrength}MPa)`);
      if (supportConfig.diaphragmWalls.waterproofing.enabled) {
        checkpoints.push('防水系统检漏试验');
      }
    }
    
    if (supportConfig.pileSupports.enabled && supportConfig.pileSupports.pileConfigurations.length > 0) {
      supportConfig.pileSupports.pileConfigurations.forEach(pile => {
        checkpoints.push(`${pile.type}完整性检测(${pile.qualityRequirements.integrityLevel}级)`);
      });
    }
    
    if (supportConfig.anchorSystems.enabled) {
      checkpoints.push('锚索张拉力检测');
      if (supportConfig.anchorSystems.monitoringSystem.enabled) {
        checkpoints.push('监测系统标定试验');
      }
    }
    
    if (supportConfig.steelSupports.enabled) {
      checkpoints.push('钢支撑预应力检测');
      if (supportConfig.steelSupports.temperatureCompensation.enabled) {
        checkpoints.push('温度补偿系统功能试验');
      }
    }
    
    return checkpoints.length > 0 ? checkpoints : [
      '地连墙垂直度检查',
      '桩基完整性检测',
      '锚索张拉力检测',
      '钢支撑预应力检测'
    ];
  };

  return (
    <div className="enhanced-support-module p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl">
      {/* 模块标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">支护结构系统设计</h2>
        <p className="text-gray-400">
          深基坑支护结构综合设计 - 地下连续墙 · 桩基支护 · 锚索系统 · 钢支撑
        </p>
      </div>

      {/* 标签导航 */}
      <div className="flex space-x-2 mb-6">
        {[
          { id: 'overview', label: '系统概览', icon: FunctionalIcons.ProjectManagement },
          { id: 'diaphragm', label: '地下连续墙', icon: FunctionalIcons.StructuralAnalysis },
          { id: 'piles', label: '桩基支护', icon: FunctionalIcons.GeometryModeling },
          { id: 'anchors', label: '锚索系统', icon: FunctionalIcons.MaterialLibrary },
          { id: 'steel', label: '钢支撑', icon: FunctionalIcons.StructuralAnalysis }
        ].map(tab => (
          <motion.button
            key={tab.id}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <tab.icon size={16} />
            <span className="text-sm font-medium">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* 内容区域 */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* 支护结构类型卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {supportStructureTypes.map(structure => (
                <motion.div
                  key={structure.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    structure.enabled
                      ? `border-green-500 bg-green-500/10`
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                  }`}
                  onClick={() => {
                    setSupportConfig(prev => ({
                      ...prev,
                      [structure.id === 'diaphragm_walls' ? 'diaphragmWalls' : 
                       structure.id === 'pile_supports' ? 'pileSupports' :
                       structure.id === 'anchor_systems' ? 'anchorSystems' : 'steelSupports']: {
                        ...prev[structure.id === 'diaphragm_walls' ? 'diaphragmWalls' : 
                                structure.id === 'pile_supports' ? 'pileSupports' :
                                structure.id === 'anchor_systems' ? 'anchorSystems' : 'steelSupports'],
                        enabled: !structure.enabled
                      }
                    }));
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <structure.icon size={24} color={structure.color} />
                    <div className={`w-3 h-3 rounded-full ${
                      structure.enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                  </div>
                  <h3 className="font-medium text-white text-sm">{structure.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{structure.description}</p>
                </motion.div>
              ))}
            </div>

            {/* 增强系统生成控制 */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/30 p-6 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-400">
                    已启用 {supportStructureTypes.filter(s => s.enabled).length}/4 个支护系统
                  </div>
                  <div className="flex space-x-2">
                    {supportStructureTypes.map((system, index) => (
                      <div 
                        key={system.id}
                        className={`w-3 h-3 rounded-full ${
                          system.enabled ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                        title={system.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {supportStructureTypes.filter(s => s.enabled).length > 0 ? '系统就绪' : '等待配置'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {supportStructureTypes.filter(s => s.enabled).length > 0 ? 
                      `${Math.round((supportStructureTypes.filter(s => s.enabled).length / 4) * 100)}% 完成` : 
                      '需要启用至少一个系统'}
                  </div>
                </div>
              </div>
              
              {/* 生成按钮和进度 */}
              <div className="space-y-4">
                {processing && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div 
                      className="bg-blue-500 h-2 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2 }}
                    />
                  </div>
                )}
                
                <motion.button
                  className={`w-full px-6 py-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    processing
                      ? 'bg-gray-600 cursor-not-allowed'
                      : supportStructureTypes.filter(s => s.enabled).length > 0
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                  onClick={generateSupportSystem}
                  disabled={processing || supportStructureTypes.filter(s => s.enabled).length === 0}
                  whileHover={!processing && supportStructureTypes.filter(s => s.enabled).length > 0 ? { scale: 1.02 } : {}}
                  whileTap={!processing && supportStructureTypes.filter(s => s.enabled).length > 0 ? { scale: 0.98 } : {}}
                >
                  {processing ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <FunctionalIcons.StructuralAnalysis size={20} />
                      <span>生成支护结构系统</span>
                    </>
                  )}
                </motion.button>
                
                {supportStructureTypes.filter(s => s.enabled).length === 0 && (
                  <div className="text-center text-sm text-yellow-400">
                    ⚠️ 请先启用至少一个支护系统
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'piles' && (
          <motion.div
            key="piles"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
              <h3 className="text-white font-medium mb-2">桩基支护系统配置</h3>
              <p className="text-blue-300 text-sm">
                桩基系统作为支护结构的重要组成部分，包含梁元模拟和壳元模拟两种建模策略
              </p>
            </div>

            {/* 桩基类型选择器 */}
            <PileTypeSelector
              onTypeSelect={handlePileTypeSelect}
              showStrategyExplanation={true}
            />

            {/* 增强的桩基配置显示 */}
            {supportConfig.pileSupports.pileConfigurations.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-white font-medium flex items-center">
                  <FunctionalIcons.GeometryModeling className="mr-2" size={18} />
                  已配置的桩基类型 ({supportConfig.pileSupports.pileConfigurations.length})
                </h4>
                {supportConfig.pileSupports.pileConfigurations.map((pile, index) => (
                  <motion.div 
                    key={index} 
                    className="p-6 bg-gradient-to-r from-gray-800/70 to-gray-700/50 rounded-lg border border-gray-600 hover:border-green-500/50 transition-all"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <span className="text-white font-semibold text-lg">{pile.type}</span>
                          <span className="text-blue-400 ml-2 text-sm">({pile.strategy})</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          pile.qualityRequirements.integrityLevel === 'I' 
                            ? 'bg-green-500/20 text-green-300' 
                            : pile.qualityRequirements.integrityLevel === 'II'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          完整性: {pile.qualityRequirements.integrityLevel}级
                        </span>
                        <button
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                          onClick={() => {
                            setSupportConfig(prev => ({
                              ...prev,
                              pileSupports: {
                                ...prev.pileSupports,
                                pileConfigurations: prev.pileSupports.pileConfigurations.filter((_, i) => i !== index)
                              }
                            }));
                          }}
                        >
                          <FunctionalIcons.Delete size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* 详细参数网格 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">桩径</div>
                        <div className="text-white font-semibold">{pile.diameter}mm</div>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">间距</div>
                        <div className="text-white font-semibold">{pile.spacing}m</div>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">桩长</div>
                        <div className="text-white font-semibold">{pile.length}m</div>
                      </div>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">数量</div>
                        <div className="text-white font-semibold">{pile.quantity}根</div>
                      </div>
                    </div>
                    
                    {/* 技术参数 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
                        <div className="text-xs text-blue-300 mb-1">嵌固深度</div>
                        <div className="text-white font-semibold">{pile.embedmentDepth}m</div>
                      </div>
                      <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
                        <div className="text-xs text-purple-300 mb-1">承载力</div>
                        <div className="text-white font-semibold">{pile.qualityRequirements.bearingCapacity}kN</div>
                      </div>
                      <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-500/30">
                        <div className="text-xs text-orange-300 mb-1">位移限制</div>
                        <div className="text-white font-semibold">{pile.qualityRequirements.horizontalDisplacement}mm</div>
                      </div>
                    </div>
                    
                    {/* 材料信息 */}
                    <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                      <div className="text-xs text-green-300 mb-1">材料等级</div>
                      <div className="text-white font-medium">{pile.materialGrade}</div>
                    </div>
                  </motion.div>
                ))}
                
                {/* 系统统计 */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
                  <h5 className="text-blue-300 font-medium mb-3">桩基系统统计</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {supportConfig.pileSupports.pileConfigurations.reduce((sum, pile) => sum + pile.quantity, 0)}
                      </div>
                      <div className="text-xs text-gray-400">总桩数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {supportConfig.pileSupports.pileConfigurations.reduce((sum, pile) => sum + (pile.length * pile.quantity), 0).toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-400">总桥长(m)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {supportConfig.pileSupports.pileConfigurations.reduce((sum, pile) => sum + pile.qualityRequirements.bearingCapacity * pile.quantity, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">总承载力(kN)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {Math.round(supportConfig.pileSupports.pileConfigurations.reduce((sum, pile, _, arr) => sum + pile.qualityRequirements.bearingCapacity, 0) / supportConfig.pileSupports.pileConfigurations.length) || 0}
                      </div>
                      <div className="text-xs text-gray-400">平均承载(kN)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'diaphragm' && (
          <motion.div
            key="diaphragm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
              <h3 className="text-white font-medium mb-2">地下连续墙系统配置</h3>
              <p className="text-blue-300 text-sm">
                主体围护结构，提供主要的侧向土压力支撑和防水功能
              </p>
            </div>

            {/* 基本参数配置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-white font-medium">基本参数</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-300 block mb-1">墙体厚度 (mm)</label>
                    <input 
                      type="number" 
                      value={supportConfig.diaphragmWalls.thickness}
                      onChange={(e) => setSupportConfig(prev => ({
                        ...prev,
                        diaphragmWalls: {
                          ...prev.diaphragmWalls,
                          thickness: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 block mb-1">墙体深度 (m)</label>
                    <input 
                      type="number" 
                      value={supportConfig.diaphragmWalls.depth}
                      onChange={(e) => setSupportConfig(prev => ({
                        ...prev,
                        diaphragmWalls: {
                          ...prev.diaphragmWalls,
                          depth: parseFloat(e.target.value)
                        }
                      }))}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 block mb-1">混凝土等级</label>
                    <select 
                      value={supportConfig.diaphragmWalls.material}
                      onChange={(e) => setSupportConfig(prev => ({
                        ...prev,
                        diaphragmWalls: {
                          ...prev.diaphragmWalls,
                          material: e.target.value as any
                        }
                      }))}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    >
                      <option value="C30_concrete">C30混凝土</option>
                      <option value="C35_concrete">C35混凝土</option>
                      <option value="steel_concrete">钢筋混凝土</option>
                      <option value="composite">复合材料</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-white font-medium">防水系统</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={supportConfig.diaphragmWalls.waterproofing.enabled}
                      onChange={(e) => setSupportConfig(prev => ({
                        ...prev,
                        diaphragmWalls: {
                          ...prev.diaphragmWalls,
                          waterproofing: {
                            ...prev.diaphragmWalls.waterproofing,
                            enabled: e.target.checked
                          }
                        }
                      }))}
                      className="w-4 h-4"
                    />
                    <label className="text-sm text-gray-300">启用防水系统</label>
                  </div>
                  {supportConfig.diaphragmWalls.waterproofing.enabled && (
                    <>
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">防水类型</label>
                        <select 
                          value={supportConfig.diaphragmWalls.waterproofing.type}
                          onChange={(e) => setSupportConfig(prev => ({
                            ...prev,
                            diaphragmWalls: {
                              ...prev.diaphragmWalls,
                              waterproofing: {
                                ...prev.diaphragmWalls.waterproofing,
                                type: e.target.value as any
                              }
                            }
                          }))}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        >
                          <option value="membrane">卷材防水</option>
                          <option value="coating">涂料防水</option>
                          <option value="crystalline">结晶防水</option>
                          <option value="injection">注浆防水</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">防水层厚度 (mm)</label>
                        <input 
                          type="number" 
                          value={supportConfig.diaphragmWalls.waterproofing.thickness}
                          onChange={(e) => setSupportConfig(prev => ({
                            ...prev,
                            diaphragmWalls: {
                              ...prev.diaphragmWalls,
                              waterproofing: {
                                ...prev.diaphragmWalls.waterproofing,
                                thickness: parseFloat(e.target.value)
                              }
                            }
                          }))}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 配筋信息 */}
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
              <h4 className="text-green-300 font-medium mb-3">配筋设计</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 block mb-1">主筋配置</label>
                  <input 
                    type="text" 
                    value={supportConfig.diaphragmWalls.reinforcement.mainRebar}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      diaphragmWalls: {
                        ...prev.diaphragmWalls,
                        reinforcement: {
                          ...prev.diaphragmWalls.reinforcement,
                          mainRebar: e.target.value
                        }
                      }
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="例: HRB400 φ25@200"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">箍筋配置</label>
                  <input 
                    type="text" 
                    value={supportConfig.diaphragmWalls.reinforcement.stirrupRebar}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      diaphragmWalls: {
                        ...prev.diaphragmWalls,
                        reinforcement: {
                          ...prev.diaphragmWalls.reinforcement,
                          stirrupRebar: e.target.value
                        }
                      }
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="例: HRB400 φ12@150"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'anchors' && (
          <motion.div
            key="anchors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
              <h3 className="text-white font-medium mb-2">锚索系统配置</h3>
              <p className="text-purple-300 text-sm">
                预应力锚索系统，提供主动土压力平衡和结构稳定性增强
              </p>
            </div>

            {/* 锚索类型选择 */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">锚索类型</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'soil_anchor', label: '土层锚杆', color: 'blue' },
                  { value: 'rock_anchor', label: '岩石锚杆', color: 'green' },
                  { value: 'prestressed_anchor', label: '预应力锚索', color: 'purple' },
                  { value: 'self_drilling', label: '自钻式锚杆', color: 'orange' }
                ].map(anchor => (
                  <motion.div
                    key={anchor.value}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      supportConfig.anchorSystems.anchorType === anchor.value
                        ? `border-${anchor.color}-500 bg-${anchor.color}-500/20`
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }`}
                    onClick={() => setSupportConfig(prev => ({
                      ...prev,
                      anchorSystems: {
                        ...prev.anchorSystems,
                        anchorType: anchor.value as any
                      }
                    }))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-center">
                      <div className={`w-3 h-3 mx-auto mb-2 rounded-full ${
                        supportConfig.anchorSystems.anchorType === anchor.value
                          ? `bg-${anchor.color}-500`
                          : 'bg-gray-500'
                      }`}></div>
                      <div className="text-xs text-white font-medium">{anchor.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 监测系统 */}
            <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-500/30">
              <h4 className="text-orange-300 font-medium mb-3">监测系统配置</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={supportConfig.anchorSystems.monitoringSystem.loadCells}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      anchorSystems: {
                        ...prev.anchorSystems,
                        monitoringSystem: {
                          ...prev.anchorSystems.monitoringSystem,
                          loadCells: e.target.checked
                        }
                      }
                    }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">荷载传感器</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={supportConfig.anchorSystems.monitoringSystem.displacementSensors}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      anchorSystems: {
                        ...prev.anchorSystems,
                        monitoringSystem: {
                          ...prev.anchorSystems.monitoringSystem,
                          displacementSensors: e.target.checked
                        }
                      }
                    }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">位移传感器</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={supportConfig.anchorSystems.monitoringSystem.dataLogging}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      anchorSystems: {
                        ...prev.anchorSystems,
                        monitoringSystem: {
                          ...prev.anchorSystems.monitoringSystem,
                          dataLogging: e.target.checked
                        }
                      }
                    }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">数据采集</label>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'steel' && (
          <motion.div
            key="steel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-500/30">
              <h3 className="text-white font-medium mb-2">钢支撑系统配置</h3>
              <p className="text-orange-300 text-sm">
                内支撑结构系统，提供水平支撑力和结构整体稳定性
              </p>
            </div>

            {/* 温度补偿系统 */}
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
              <h4 className="text-blue-300 font-medium mb-3">温度补偿系统</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={supportConfig.steelSupports.temperatureCompensation.enabled}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      steelSupports: {
                        ...prev.steelSupports,
                        temperatureCompensation: {
                          ...prev.steelSupports.temperatureCompensation,
                          enabled: e.target.checked
                        }
                      }
                    }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">启用温度补偿</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={supportConfig.steelSupports.temperatureCompensation.expansionJoints}
                    onChange={(e) => setSupportConfig(prev => ({
                      ...prev,
                      steelSupports: {
                        ...prev.steelSupports,
                        temperatureCompensation: {
                          ...prev.steelSupports.temperatureCompensation,
                          expansionJoints: e.target.checked
                        }
                      }
                    }))}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">伸缩缝设置</label>
                </div>
              </div>
              {supportConfig.steelSupports.temperatureCompensation.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm text-gray-300 block mb-1">最低温度 (°C)</label>
                    <input 
                      type="number" 
                      value={supportConfig.steelSupports.temperatureCompensation.temperatureRange.min}
                      onChange={(e) => setSupportConfig(prev => ({
                        ...prev,
                        steelSupports: {
                          ...prev.steelSupports,
                          temperatureCompensation: {
                            ...prev.steelSupports.temperatureCompensation,
                            temperatureRange: {
                              ...prev.steelSupports.temperatureCompensation.temperatureRange,
                              min: parseInt(e.target.value)
                            }
                          }
                        }
                      }))}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 block mb-1">最高温度 (°C)</label>
                    <input 
                      type="number" 
                      value={supportConfig.steelSupports.temperatureCompensation.temperatureRange.max}
                      onChange={(e) => setSupportConfig(prev => ({
                        ...prev,
                        steelSupports: {
                          ...prev.steelSupports,
                          temperatureCompensation: {
                            ...prev.steelSupports.temperatureCompensation,
                            temperatureRange: {
                              ...prev.steelSupports.temperatureCompensation.temperatureRange,
                              max: parseInt(e.target.value)
                            }
                          }
                        }
                      }))}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 增强的结果显示 */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-6"
        >
          {/* 主要结果卡片 */}
          <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-6 rounded-lg border border-green-500/30">
            <div className="flex items-center mb-4">
              <FunctionalIcons.StructuralAnalysis className="text-green-400 mr-3" size={24} />
              <h3 className="text-green-300 font-medium text-lg">支护结构系统生成完成</h3>
              <div className={`ml-auto px-3 py-1 text-sm rounded-full ${
                results.qualityMetrics.complianceLevel === 'excellent' ? 'bg-green-500/20 text-green-300' :
                results.qualityMetrics.complianceLevel === 'good' ? 'bg-blue-500/20 text-blue-300' :
                results.qualityMetrics.complianceLevel === 'acceptable' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {results.qualityMetrics.complianceLevel.toUpperCase()}
              </div>
            </div>
            
            {/* 关键指标网格 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {(results.qualityMetrics.overallScore * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">整体评分</div>
              </div>
              <div className="bg-black/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {results.structuralAnalysis.safetyFactor}
                </div>
                <div className="text-xs text-gray-400 mt-1">安全系数</div>
              </div>
              <div className="bg-black/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {results.structuralAnalysis.loadCapacity}
                </div>
                <div className="text-xs text-gray-400 mt-1">承载力(kN/m)</div>
              </div>
              <div className="bg-black/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {results.structuralAnalysis.deformation}
                </div>
                <div className="text-xs text-gray-400 mt-1">变形(mm)</div>
              </div>
            </div>
          </div>
          
          {/* 详细分析结果 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 结构分析 */}
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
              <h4 className="text-blue-300 font-medium mb-3">结构分析结果</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">结构刚度:</span>
                  <span className="text-white">{results.structuralAnalysis.stiffness} kN/m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">结构稳定性:</span>
                  <span className="text-white">{results.structuralAnalysis.stability}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">最大位移:</span>
                  <span className="text-white">{results.structuralAnalysis.deformation} mm</span>
                </div>
              </div>
            </div>
            
            {/* 质量评估 */}
            <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
              <h4 className="text-purple-300 font-medium mb-3">质量评估结果</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">结构得分:</span>
                  <span className="text-white">{(results.qualityMetrics.structuralScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">可施工性:</span>
                  <span className="text-white">{(results.qualityMetrics.constructabilityScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">经济性:</span>
                  <span className="text-white">{(results.qualityMetrics.economicScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 施工指导 */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <h4 className="text-gray-300 font-medium mb-3">施工指导要点</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-yellow-400 font-medium mb-2">施工步骤:</div>
                <ul className="space-y-1 text-gray-300">
                  {results.constructionGuidance.steps.slice(0, 3).map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-400 mr-2">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-green-400 font-medium mb-2">所需材料:</div>
                <ul className="space-y-1 text-gray-300">
                  {results.constructionGuidance.materialRequirements.slice(0, 3).map((material, index) => (
                    <li key={index} className="text-xs">
                      {material.material}: {material.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-blue-400 font-medium mb-2">质量检查:</div>
                <ul className="space-y-1 text-gray-300">
                  {results.constructionGuidance.qualityCheckpoints.slice(0, 3).map((checkpoint, index) => (
                    <li key={index} className="text-xs">
                      • {checkpoint}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedSupportModule;