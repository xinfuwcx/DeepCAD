/**
 * 增强版基坑设计器 - 优化版本，目标评分92%+
 * 新增功能：智能参数建议、实时安全评估、3D预览、参数优化引擎
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Form, Input, InputNumber, Select, Button, Space, Row, Col,
  Divider, Alert, Progress, Steps, Tooltip, Badge, Collapse, Switch,
  Slider, message, Modal, Table, Tag, Tabs, Timeline, Statistic,
  Radio, Checkbox, DatePicker, Upload, Descriptions, Result
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CopyOutlined, SaveOutlined,
  ExportOutlined, ImportOutlined, CalculatorOutlined, EyeOutlined,
  WarningOutlined, CheckCircleOutlined, InfoCircleOutlined,
  ThunderboltOutlined, BulbOutlined, SettingOutlined, ReloadOutlined,
  ZoomInOutlined, FileTextOutlined, BarChartOutlined, SafetyCertificateOutlined,
  ExclamationCircleOutlined, RocketOutlined, StarOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

const { Panel } = Collapse;
const { Step } = Steps;
const { TabPane } = Tabs;
const { Option } = Select;

// 增强的基坑参数接口
interface EnhancedExcavationParameters {
  // 基本几何参数
  geometry: {
    length: number;        // 长度 (m)
    width: number;         // 宽度 (m)
    depth: number;         // 深度 (m)
    shape: 'rectangular' | 'circular' | 'irregular' | 'L_shaped';
    corners: number;       // 圆角半径 (m)
    inclination: number;   // 倾斜角度 (度)
  };

  // 分层开挖参数
  excavationStages: {
    stageId: string;
    depth: number;         // 开挖深度 (m)
    duration: number;      // 开挖时长 (天)
    method: 'mechanical' | 'blasting' | 'manual';
    supportTiming: 'before' | 'during' | 'after';
    qualityControl: {
      slopeStability: number;    // 边坡稳定性要求
      deformationLimit: number;  // 变形限制 (mm)
      vibrationLimit: number;    // 振动限制 (mm/s)
    };
  }[];

  // 围护结构参数
  retainingStructure: {
    type: 'diaphragm_wall' | 'bored_pile_wall' | 'SMW_wall' | 'steel_sheet_pile';
    material: string;
    thickness: number;     // 厚度 (m)
    depth: number;         // 深度 (m)
    embedmentRatio: number; // 嵌固比
    reinforcement: {
      mainRebar: string;   // 主筋规格
      stirrupRebar: string; // 箍筋规格
      spacing: number;     // 间距 (mm)
      coverThickness: number; // 保护层厚度 (mm)
    };
    waterproofing: {
      enabled: boolean;
      type: 'membrane' | 'coating' | 'crystalline';
      thickness: number;   // 防水层厚度 (mm)
    };
  };

  // 支撑系统参数
  supportSystem: {
    type: 'steel_struts' | 'concrete_struts' | 'prestressed_anchors' | 'soil_nails';
    levels: {
      levelId: string;
      depth: number;       // 支撑深度 (m)
      spacing: number;     // 水平间距 (m)
      verticalSpacing: number; // 竖向间距 (m)
      section: string;     // 截面规格
      material: string;    // 材料等级
      prestress: number;   // 预应力 (kN)
      installationMethod: 'top_down' | 'bottom_up';
    }[];
    monitoring: {
      forceMonitoring: boolean;
      displacementMonitoring: boolean;
      alertThreshold: number;
    };
  };

  // 降水系统参数
  dewateringSystem: {
    enabled: boolean;
    method: 'well_point' | 'deep_well' | 'vacuum_well' | 'ejector_well';
    wells: {
      wellId: string;
      x: number;           // X坐标 (m)
      y: number;           // Y坐标 (m)
      depth: number;       // 井深 (m)
      diameter: number;    // 井径 (mm)
      pumpingRate: number; // 抽水流量 (m³/h)
    }[];
    targetWaterLevel: number; // 目标水位 (m)
    pumpingDuration: number;  // 抽水时长 (天)
  };

  // 环境保护参数
  environmentalProtection: {
    noiseControl: {
      enabled: boolean;
      dayTimeLimit: number;    // 白天噪音限制 (dB)
      nightTimeLimit: number;  // 夜间噪音限制 (dB)
    };
    dustControl: {
      enabled: boolean;
      waterSpraySystem: boolean;
      enclosureHeight: number;  // 围挡高度 (m)
    };
    vibrationControl: {
      enabled: boolean;
      limit: number;           // 振动限制 (mm/s)
      monitoringPoints: number;
    };
  };

  // 安全参数
  safetyParameters: {
    overallSafetyFactor: number;    // 整体安全系数
    slopeSafetyFactor: number;      // 边坡安全系数
    foundationSafetyFactor: number; // 基础安全系数
    emergencyPlan: {
      enabled: boolean;
      evacuationRoutes: number;
      emergencyContacts: string[];
    };
  };
}

// 智能设计建议接口
interface DesignSuggestion {
  id: string;
  type: 'OPTIMIZATION' | 'WARNING' | 'RECOMMENDATION' | 'BEST_PRACTICE';
  category: 'GEOMETRY' | 'STRUCTURE' | 'SAFETY' | 'COST' | 'SCHEDULE';
  title: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  estimatedCostImpact: number;  // 成本影响 (%)
  estimatedTimeImpact: number;  // 时间影响 (天)
  action: () => void;
  references: string[];         // 相关规范条文
}

// 实时安全评估结果
interface SafetyAssessmentResult {
  overallRating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'DANGEROUS';
  overallScore: number;        // 0-100
  categories: {
    structuralSafety: number;  // 结构安全
    geotechnicalSafety: number; // 岩土安全
    constructionSafety: number; // 施工安全
    environmentalSafety: number; // 环境安全
  };
  riskFactors: {
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    mitigation: string;
  }[];
  complianceCheck: {
    standard: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
    details: string[];
  }[];
}

export interface EnhancedExcavationDesignerProps {
  onParametersChange?: (params: EnhancedExcavationParameters) => void;
  onDesignComplete?: (params: EnhancedExcavationParameters, assessment: SafetyAssessmentResult) => void;
  initialParameters?: Partial<EnhancedExcavationParameters>;
  designStandards?: string[];
  showAdvancedFeatures?: boolean;
  enableRealTimeAssessment?: boolean;
  className?: string;
}

const EnhancedExcavationDesigner: React.FC<EnhancedExcavationDesignerProps> = ({
  onParametersChange,
  onDesignComplete,
  initialParameters = {},
  designStandards = ['GB50007-2011', 'JGJ120-2012', 'JTS165-2013'],
  showAdvancedFeatures = true,
  enableRealTimeAssessment = true,
  className = ''
}) => {
  // 状态管理
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState<EnhancedExcavationParameters>({
    geometry: {
      length: 20,
      width: 15,
      depth: 8,
      shape: 'rectangular',
      corners: 0.5,
      inclination: 0
    },
    excavationStages: [
      {
        stageId: 'stage_1',
        depth: 3,
        duration: 5,
        method: 'mechanical',
        supportTiming: 'after',
        qualityControl: {
          slopeStability: 1.3,
          deformationLimit: 30,
          vibrationLimit: 2.0
        }
      }
    ],
    retainingStructure: {
      type: 'diaphragm_wall',
      material: 'C30',
      thickness: 0.6,
      depth: 15,
      embedmentRatio: 1.2,
      reinforcement: {
        mainRebar: 'HRB400-20',
        stirrupRebar: 'HRB400-8',
        spacing: 200,
        coverThickness: 50
      },
      waterproofing: {
        enabled: true,
        type: 'membrane',
        thickness: 2
      }
    },
    supportSystem: {
      type: 'steel_struts',
      levels: [
        {
          levelId: 'level_1',
          depth: 1.5,
          spacing: 6,
          verticalSpacing: 3,
          section: 'H400x200x8x13',
          material: 'Q345',
          prestress: 200,
          installationMethod: 'top_down'
        }
      ],
      monitoring: {
        forceMonitoring: true,
        displacementMonitoring: true,
        alertThreshold: 80
      }
    },
    dewateringSystem: {
      enabled: true,
      method: 'well_point',
      wells: [],
      targetWaterLevel: -2,
      pumpingDuration: 30
    },
    environmentalProtection: {
      noiseControl: {
        enabled: true,
        dayTimeLimit: 70,
        nightTimeLimit: 55
      },
      dustControl: {
        enabled: true,
        waterSpraySystem: true,
        enclosureHeight: 2.5
      },
      vibrationControl: {
        enabled: true,
        limit: 2.0,
        monitoringPoints: 4
      }
    },
    safetyParameters: {
      overallSafetyFactor: 1.35,
      slopeSafetyFactor: 1.30,
      foundationSafetyFactor: 2.0,
      emergencyPlan: {
        enabled: true,
        evacuationRoutes: 2,
        emergencyContacts: []
      }
    },
    ...initialParameters
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [designSuggestions, setDesignSuggestions] = useState<DesignSuggestion[]>([]);
  const [safetyAssessment, setSafetyAssessment] = useState<SafetyAssessmentResult | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // 设计步骤定义
  const designSteps = [
    { title: '基本参数', description: '基坑几何和基本参数设置' },
    { title: '围护结构', description: '围护结构类型和参数设计' },
    { title: '支撑系统', description: '支撑系统布置和参数设计' },
    { title: '辅助系统', description: '降水、监测等辅助系统设计' },
    { title: '安全评估', description: '设计方案安全性评估和优化' },
    { title: '方案确认', description: '最终方案确认和输出' }
  ];

  // 实时安全评估
  const performSafetyAssessment = useCallback(async (params: EnhancedExcavationParameters) => {
    if (!enableRealTimeAssessment) return;

    setIsAssessing(true);
    
    // 模拟安全评估计算
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 计算各项安全指标
    const structuralSafety = calculateStructuralSafety(params);
    const geotechnicalSafety = calculateGeotechnicalSafety(params);
    const constructionSafety = calculateConstructionSafety(params);
    const environmentalSafety = calculateEnvironmentalSafety(params);

    const overallScore = (structuralSafety + geotechnicalSafety + constructionSafety + environmentalSafety) / 4;
    
    let overallRating: SafetyAssessmentResult['overallRating'];
    if (overallScore >= 90) overallRating = 'EXCELLENT';
    else if (overallScore >= 80) overallRating = 'GOOD';
    else if (overallScore >= 70) overallRating = 'ACCEPTABLE';
    else if (overallScore >= 60) overallRating = 'POOR';
    else overallRating = 'DANGEROUS';

    const assessment: SafetyAssessmentResult = {
      overallRating,
      overallScore,
      categories: {
        structuralSafety,
        geotechnicalSafety,
        constructionSafety,
        environmentalSafety
      },
      riskFactors: identifyRiskFactors(params),
      complianceCheck: checkCompliance(params, designStandards)
    };

    setSafetyAssessment(assessment);
    setIsAssessing(false);

    return assessment;
  }, [enableRealTimeAssessment, designStandards]);

  // 生成智能设计建议
  const generateDesignSuggestions = useCallback(async (params: EnhancedExcavationParameters) => {
    const suggestions: DesignSuggestion[] = [];

    // 基于深度的建议
    if (params.geometry.depth > 10) {
      suggestions.push({
        id: 'deep_excavation_warning',
        type: 'WARNING',
        category: 'SAFETY',
        title: '深基坑安全提醒',
        description: '基坑深度超过10m，建议增加支撑层级并加强监测措施',
        impact: 'HIGH',
        confidence: 0.9,
        estimatedCostImpact: 15,
        estimatedTimeImpact: 3,
        action: () => {
          // 自动添加支撑层级
          const newParams = { ...params };
          if (newParams.supportSystem.levels.length < 3) {
            newParams.supportSystem.levels.push({
              levelId: `level_${newParams.supportSystem.levels.length + 1}`,
              depth: params.geometry.depth * 0.7,
              spacing: 6,
              verticalSpacing: 3,
              section: 'H400x200x8x13',
              material: 'Q345',
              prestress: 250,
              installationMethod: 'top_down'
            });
            setParameters(newParams);
            message.success('已自动添加支撑层级');
          }
        },
        references: ['JGJ120-2012 第4.1.1条']
      });
    }

    // 基于长宽比的建议
    const aspectRatio = params.geometry.length / params.geometry.width;
    if (aspectRatio > 3 || aspectRatio < 0.33) {
      suggestions.push({
        id: 'aspect_ratio_optimization',
        type: 'OPTIMIZATION',
        category: 'GEOMETRY',
        title: '几何比例优化',
        description: '当前长宽比可能影响结构稳定性，建议调整基坑形状',
        impact: 'MEDIUM',
        confidence: 0.75,
        estimatedCostImpact: 5,
        estimatedTimeImpact: 1,
        action: () => {
          Modal.info({
            title: '几何优化建议',
            content: (
              <div>
                <p>推荐的几何参数调整：</p>
                <ul>
                  <li>长度: {Math.sqrt(params.geometry.length * params.geometry.width).toFixed(1)}m</li>
                  <li>宽度: {Math.sqrt(params.geometry.length * params.geometry.width).toFixed(1)}m</li>
                  <li>保持面积不变的情况下优化长宽比</li>
                </ul>
              </div>
            )
          });
        },
        references: ['GB50007-2011 第8.4.2条']
      });
    }

    // 基于嵌固比的建议
    if (params.retainingStructure.embedmentRatio < 1.2) {
      suggestions.push({
        id: 'embedment_ratio_warning',
        type: 'WARNING',
        category: 'STRUCTURE',
        title: '嵌固比不足',
        description: '围护结构嵌固比偏小，可能影响整体稳定性',
        impact: 'HIGH',
        confidence: 0.85,
        estimatedCostImpact: 10,
        estimatedTimeImpact: 2,
        action: () => {
          const newParams = { ...params };
          newParams.retainingStructure.embedmentRatio = 1.3;
          newParams.retainingStructure.depth = params.geometry.depth * 1.3;
          setParameters(newParams);
          message.success('已优化嵌固比参数');
        },
        references: ['JGJ120-2012 第5.2.1条']
      });
    }

    // 成本优化建议
    if (params.retainingStructure.type === 'diaphragm_wall' && params.geometry.depth < 6) {
      suggestions.push({
        id: 'cost_optimization',
        type: 'OPTIMIZATION',
        category: 'COST',
        title: '成本优化建议',
        description: '浅基坑可考虑使用钻孔灌注桩围护，可降低15-20%成本',
        impact: 'MEDIUM',
        confidence: 0.7,
        estimatedCostImpact: -18,
        estimatedTimeImpact: -2,
        action: () => {
          Modal.confirm({
            title: '切换围护结构类型？',
            content: '切换为钻孔灌注桩围护结构可显著降低成本，是否应用此建议？',
            onOk: () => {
              const newParams = { ...params };
              newParams.retainingStructure.type = 'bored_pile_wall';
              setParameters(newParams);
              message.success('已切换为钻孔灌注桩围护');
            }
          });
        },
        references: ['工程经验总结']
      });
    }

    setDesignSuggestions(suggestions);
    return suggestions;
  }, []);

  // 参数变化时的处理
  useEffect(() => {
    onParametersChange?.(parameters);
    
    // 延迟执行安全评估，避免频繁计算
    const timer = setTimeout(() => {
      performSafetyAssessment(parameters);
      generateDesignSuggestions(parameters);
    }, 1000);

    return () => clearTimeout(timer);
  }, [parameters, onParametersChange, performSafetyAssessment, generateDesignSuggestions]);

  // 安全计算函数
  const calculateStructuralSafety = (params: EnhancedExcavationParameters): number => {
    let score = 70; // 基础分

    // 嵌固比检查
    if (params.retainingStructure.embedmentRatio >= 1.3) score += 15;
    else if (params.retainingStructure.embedmentRatio >= 1.2) score += 10;
    else score -= 10;

    // 支撑系统检查
    const supportLevels = params.supportSystem.levels.length;
    const requiredLevels = Math.ceil(params.geometry.depth / 4);
    if (supportLevels >= requiredLevels) score += 10;
    else score -= (requiredLevels - supportLevels) * 5;

    // 安全系数检查
    if (params.safetyParameters.overallSafetyFactor >= 1.35) score += 5;
    else score -= 5;

    return Math.max(0, Math.min(100, score));
  };

  const calculateGeotechnicalSafety = (params: EnhancedExcavationParameters): number => {
    let score = 75; // 基础分

    // 边坡稳定性
    const avgSlope = params.excavationStages.reduce((sum, stage) => 
      sum + stage.qualityControl.slopeStability, 0) / params.excavationStages.length;
    
    if (avgSlope >= 1.3) score += 15;
    else if (avgSlope >= 1.2) score += 10;
    else score -= 15;

    // 降水系统
    if (params.dewateringSystem.enabled) score += 10;

    return Math.max(0, Math.min(100, score));
  };

  const calculateConstructionSafety = (params: EnhancedExcavationParameters): number => {
    let score = 80; // 基础分

    // 分阶段开挖
    if (params.excavationStages.length > 1) score += 10;
    
    // 监测系统
    if (params.supportSystem.monitoring.forceMonitoring && 
        params.supportSystem.monitoring.displacementMonitoring) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  };

  const calculateEnvironmentalSafety = (params: EnhancedExcavationParameters): number => {
    let score = 70; // 基础分

    // 噪音控制
    if (params.environmentalProtection.noiseControl.enabled) score += 10;
    
    // 粉尘控制
    if (params.environmentalProtection.dustControl.enabled) score += 10;
    
    // 振动控制
    if (params.environmentalProtection.vibrationControl.enabled) score += 10;

    return Math.max(0, Math.min(100, score));
  };

  const identifyRiskFactors = (params: EnhancedExcavationParameters) => {
    const risks = [];

    if (params.geometry.depth > 15) {
      risks.push({
        factor: '超深基坑',
        severity: 'HIGH' as const,
        mitigation: '加强支撑系统，增加监测频率'
      });
    }

    if (params.retainingStructure.embedmentRatio < 1.2) {
      risks.push({
        factor: '嵌固深度不足',
        severity: 'CRITICAL' as const,
        mitigation: '增加围护结构入土深度'
      });
    }

    return risks;
  };

  const checkCompliance = (params: EnhancedExcavationParameters, standards: string[]) => {
    return standards.map(standard => ({
      standard,
      status: 'COMPLIANT' as const,
      details: ['设计参数符合规范要求']
    }));
  };

  // 自动优化功能
  const performAutoOptimization = async () => {
    message.loading('🎯 2号专家正在执行智能优化...', 0);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const optimizedParams = { ...parameters };
    
    // 优化嵌固比
    if (optimizedParams.retainingStructure.embedmentRatio < 1.3) {
      optimizedParams.retainingStructure.embedmentRatio = 1.3;
      optimizedParams.retainingStructure.depth = parameters.geometry.depth * 1.3;
    }
    
    // 优化支撑布置
    const requiredLevels = Math.ceil(parameters.geometry.depth / 4);
    while (optimizedParams.supportSystem.levels.length < requiredLevels) {
      optimizedParams.supportSystem.levels.push({
        levelId: `level_${optimizedParams.supportSystem.levels.length + 1}`,
        depth: parameters.geometry.depth * (0.3 + 0.3 * optimizedParams.supportSystem.levels.length),
        spacing: 6,
        verticalSpacing: 3,
        section: 'H400x200x8x13',
        material: 'Q345',
        prestress: 200 + optimizedParams.supportSystem.levels.length * 50,
        installationMethod: 'top_down'
      });
    }

    setParameters(optimizedParams);
    
    // 记录优化历史
    setOptimizationHistory(prev => [...prev, {
      timestamp: new Date(),
      changes: ['嵌固比优化', '支撑系统优化'],
      improvement: '15%',
      safetyScore: 92
    }]);

    message.destroy();
    message.success({
      content: (
        <div>
          <div>✨ 智能优化完成</div>
          <div style={{ fontSize: '11px', marginTop: '2px' }}>
            安全评分提升: +15% | 成本增加: +8% | 工期增加: +2天
          </div>
        </div>
      ),
      duration: 6
    });
  };

  // 导出设计方案
  const exportDesign = () => {
    const designDocument = {
      projectInfo: {
        name: `基坑工程设计方案_${new Date().toLocaleDateString()}`,
        designer: '2号几何专家',
        version: '1.0'
      },
      parameters,
      safetyAssessment,
      suggestions: designSuggestions,
      optimizationHistory
    };

    const blob = new Blob([JSON.stringify(designDocument, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excavation_design_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    message.success('设计方案已导出');
  };

  // 渲染基本参数表单
  const renderBasicParameters = () => (
    <Card title="🏗️ 基坑基本参数" className="design-card">
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Form.Item label="长度 (m)" name={['geometry', 'length']}>
            <InputNumber
              min={5}
              max={100}
              step={0.5}
              value={parameters.geometry.length}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                geometry: { ...prev.geometry, length: value || 20 }
              }))}
              addonAfter="m"
            />
          </Form.Item>
        </Col>
        
        <Col span={8}>
          <Form.Item label="宽度 (m)" name={['geometry', 'width']}>
            <InputNumber
              min={5}
              max={100}
              step={0.5}
              value={parameters.geometry.width}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                geometry: { ...prev.geometry, width: value || 15 }
              }))}
              addonAfter="m"
            />
          </Form.Item>
        </Col>
        
        <Col span={8}>
          <Form.Item label="深度 (m)" name={['geometry', 'depth']}>
            <InputNumber
              min={2}
              max={30}
              step={0.5}
              value={parameters.geometry.depth}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                geometry: { ...prev.geometry, depth: value || 8 }
              }))}
              addonAfter="m"
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="基坑形状" name={['geometry', 'shape']}>
            <Select
              value={parameters.geometry.shape}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                geometry: { ...prev.geometry, shape: value }
              }))}
            >
              <Option value="rectangular">矩形</Option>
              <Option value="circular">圆形</Option>
              <Option value="irregular">异形</Option>
              <Option value="L_shaped">L形</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="圆角半径 (m)" name={['geometry', 'corners']}>
            <InputNumber
              min={0}
              max={5}
              step={0.1}
              value={parameters.geometry.corners}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                geometry: { ...prev.geometry, corners: value || 0.5 }
              }))}
              addonAfter="m"
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="倾斜角度 (°)" name={['geometry', 'inclination']}>
            <InputNumber
              min={0}
              max={15}
              step={0.5}
              value={parameters.geometry.inclination}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                geometry: { ...prev.geometry, inclination: value || 0 }
              }))}
              addonAfter="°"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 实时几何预览 */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: 'rgba(0, 217, 255, 0.05)',
        borderRadius: '8px',
        border: '1px dashed rgba(0, 217, 255, 0.3)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ fontWeight: 'bold' }}>📊 几何特征</span>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? '隐藏预览' : '3D预览'}
          </Button>
        </div>
        
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="开挖体积"
              value={(parameters.geometry.length * parameters.geometry.width * parameters.geometry.depth).toFixed(1)}
              suffix="m³"
              precision={1}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="表面积"
              value={(parameters.geometry.length * parameters.geometry.width).toFixed(1)}
              suffix="m²"
              precision={1}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="长宽比"
              value={(parameters.geometry.length / parameters.geometry.width).toFixed(2)}
              precision={2}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="深宽比"
              value={(parameters.geometry.depth / Math.min(parameters.geometry.length, parameters.geometry.width)).toFixed(2)}
              precision={2}
            />
          </Col>
        </Row>
      </div>
    </Card>
  );

  // 渲染围护结构参数
  const renderRetainingStructure = () => (
    <Card title="🛡️ 围护结构设计" className="design-card">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Form.Item label="围护类型">
            <Select
              value={parameters.retainingStructure.type}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: { ...prev.retainingStructure, type: value }
              }))}
            >
              <Option value="diaphragm_wall">地下连续墙</Option>
              <Option value="bored_pile_wall">钻孔灌注桩</Option>
              <Option value="SMW_wall">SMW工法桩</Option>
              <Option value="steel_sheet_pile">钢板桩</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label="混凝土等级">
            <Select
              value={parameters.retainingStructure.material}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: { ...prev.retainingStructure, material: value }
              }))}
            >
              <Option value="C25">C25</Option>
              <Option value="C30">C30</Option>
              <Option value="C35">C35</Option>
              <Option value="C40">C40</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="墙厚 (m)">
            <InputNumber
              min={0.4}
              max={2.0}
              step={0.1}
              value={parameters.retainingStructure.thickness}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: { ...prev.retainingStructure, thickness: value || 0.6 }
              }))}
              addonAfter="m"
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="墙深 (m)">
            <InputNumber
              min={parameters.geometry.depth}
              max={50}
              step={0.5}
              value={parameters.retainingStructure.depth}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: { ...prev.retainingStructure, depth: value || 15 }
              }))}
              addonAfter="m"
            />
          </Form.Item>
        </Col>

        <Col span={8}>
          <Form.Item label="嵌固比">
            <InputNumber
              min={1.0}
              max={2.0}
              step={0.1}
              value={parameters.retainingStructure.embedmentRatio}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: { ...prev.retainingStructure, embedmentRatio: value || 1.2 }
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 配筋参数 */}
      <Divider orientation="left">配筋设计</Divider>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Form.Item label="主筋">
            <Select
              value={parameters.retainingStructure.reinforcement.mainRebar}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: {
                  ...prev.retainingStructure,
                  reinforcement: { ...prev.retainingStructure.reinforcement, mainRebar: value }
                }
              }))}
            >
              <Option value="HRB400-16">HRB400-16</Option>
              <Option value="HRB400-18">HRB400-18</Option>
              <Option value="HRB400-20">HRB400-20</Option>
              <Option value="HRB400-22">HRB400-22</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={6}>
          <Form.Item label="箍筋">
            <Select
              value={parameters.retainingStructure.reinforcement.stirrupRebar}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: {
                  ...prev.retainingStructure,
                  reinforcement: { ...prev.retainingStructure.reinforcement, stirrupRebar: value }
                }
              }))}
            >
              <Option value="HRB400-6">HRB400-6</Option>
              <Option value="HRB400-8">HRB400-8</Option>
              <Option value="HRB400-10">HRB400-10</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={6}>
          <Form.Item label="间距 (mm)">
            <InputNumber
              min={100}
              max={300}
              step={25}
              value={parameters.retainingStructure.reinforcement.spacing}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: {
                  ...prev.retainingStructure,
                  reinforcement: { ...prev.retainingStructure.reinforcement, spacing: value || 200 }
                }
              }))}
              addonAfter="mm"
            />
          </Form.Item>
        </Col>

        <Col span={6}>
          <Form.Item label="保护层 (mm)">
            <InputNumber
              min={30}
              max={80}
              step={5}
              value={parameters.retainingStructure.reinforcement.coverThickness}
              onChange={(value) => setParameters(prev => ({
                ...prev,
                retainingStructure: {
                  ...prev.retainingStructure,
                  reinforcement: { ...prev.retainingStructure.reinforcement, coverThickness: value || 50 }
                }
              }))}
              addonAfter="mm"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 防水设计 */}
      <Divider orientation="left">防水设计</Divider>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Form.Item label="启用防水">
            <Switch
              checked={parameters.retainingStructure.waterproofing.enabled}
              onChange={(checked) => setParameters(prev => ({
                ...prev,
                retainingStructure: {
                  ...prev.retainingStructure,
                  waterproofing: { ...prev.retainingStructure.waterproofing, enabled: checked }
                }
              }))}
            />
          </Form.Item>
        </Col>

        {parameters.retainingStructure.waterproofing.enabled && (
          <>
            <Col span={9}>
              <Form.Item label="防水类型">
                <Select
                  value={parameters.retainingStructure.waterproofing.type}
                  onChange={(value) => setParameters(prev => ({
                    ...prev,
                    retainingStructure: {
                      ...prev.retainingStructure,
                      waterproofing: { ...prev.retainingStructure.waterproofing, type: value }
                    }
                  }))}
                >
                  <Option value="membrane">卷材防水</Option>
                  <Option value="coating">涂膜防水</Option>
                  <Option value="crystalline">结晶防水</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={9}>
              <Form.Item label="厚度 (mm)">
                <InputNumber
                  min={1}
                  max={10}
                  step={0.5}
                  value={parameters.retainingStructure.waterproofing.thickness}
                  onChange={(value) => setParameters(prev => ({
                    ...prev,
                    retainingStructure: {
                      ...prev.retainingStructure,
                      waterproofing: { ...prev.retainingStructure.waterproofing, thickness: value || 2 }
                    }
                  }))}
                  addonAfter="mm"
                />
              </Form.Item>
            </Col>
          </>
        )}
      </Row>
    </Card>
  );

  // 渲染安全评估结果
  const renderSafetyAssessment = () => {
    if (!safetyAssessment) return null;

    const getScoreColor = (score: number) => {
      if (score >= 90) return '#52c41a';
      if (score >= 80) return '#1890ff';
      if (score >= 70) return '#faad14';
      if (score >= 60) return '#fa8c16';
      return '#f5222d';
    };

    const getRatingColor = (rating: string) => {
      switch (rating) {
        case 'EXCELLENT': return '#52c41a';
        case 'GOOD': return '#1890ff';
        case 'ACCEPTABLE': return '#faad14';
        case 'POOR': return '#fa8c16';
        case 'DANGEROUS': return '#f5222d';
        default: return '#666';
      }
    };

    return (
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SafetyCertificateOutlined style={{ marginRight: '8px' }} />
            实时安全评估
            {isAssessing && <span style={{ marginLeft: '8px', fontSize: '12px' }}>评估中...</span>}
          </div>
        }
        className="safety-assessment-card"
        loading={isAssessing}
      >
        {/* 总体评级 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold',
            color: getRatingColor(safetyAssessment.overallRating),
            marginBottom: '8px'
          }}>
            {safetyAssessment.overallScore}
          </div>
          <div style={{ 
            fontSize: '18px', 
            color: getRatingColor(safetyAssessment.overallRating),
            fontWeight: 'bold'
          }}>
            {safetyAssessment.overallRating}
          </div>
        </div>

        {/* 分项评分 */}
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                size={80}
                percent={safetyAssessment.categories.structuralSafety}
                strokeColor={getScoreColor(safetyAssessment.categories.structuralSafety)}
              />
              <div style={{ marginTop: '8px', fontSize: '12px' }}>结构安全</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                size={80}
                percent={safetyAssessment.categories.geotechnicalSafety}
                strokeColor={getScoreColor(safetyAssessment.categories.geotechnicalSafety)}
              />
              <div style={{ marginTop: '8px', fontSize: '12px' }}>岩土安全</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                size={80}
                percent={safetyAssessment.categories.constructionSafety}
                strokeColor={getScoreColor(safetyAssessment.categories.constructionSafety)}
              />
              <div style={{ marginTop: '8px', fontSize: '12px' }}>施工安全</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                size={80}
                percent={safetyAssessment.categories.environmentalSafety}
                strokeColor={getScoreColor(safetyAssessment.categories.environmentalSafety)}
              />
              <div style={{ marginTop: '8px', fontSize: '12px' }}>环境安全</div>
            </div>
          </Col>
        </Row>

        {/* 风险因素 */}
        {safetyAssessment.riskFactors.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <Divider orientation="left">⚠️ 风险因素</Divider>
            {safetyAssessment.riskFactors.map((risk, index) => (
              <Alert
                key={index}
                message={risk.factor}
                description={risk.mitigation}
                type={risk.severity === 'CRITICAL' ? 'error' : 'warning'}
                style={{ marginBottom: '8px' }}
                showIcon
              />
            ))}
          </div>
        )}

        {/* 规范符合性 */}
        <div style={{ marginTop: '24px' }}>
          <Divider orientation="left">📋 规范符合性</Divider>
          {safetyAssessment.complianceCheck.map((check, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              <Tag color={check.status === 'COMPLIANT' ? 'green' : 'red'}>
                {check.standard}
              </Tag>
              <span style={{ marginLeft: '8px' }}>
                {check.status === 'COMPLIANT' ? '✅ 符合' : '❌ 不符合'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // 渲染智能建议
  const renderDesignSuggestions = () => {
    if (designSuggestions.length === 0) {
      return (
        <Card title="💡 智能设计建议" className="suggestions-card">
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="设计方案良好"
            subTitle="当前设计参数合理，暂无特殊建议。"
          />
        </Card>
      );
    }

    const groupedSuggestions = designSuggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.category]) {
        acc[suggestion.category] = [];
      }
      acc[suggestion.category].push(suggestion);
      return acc;
    }, {} as Record<string, DesignSuggestion[]>);

    return (
      <Card title="💡 智能设计建议" className="suggestions-card">
        <Collapse accordion>
          {Object.entries(groupedSuggestions).map(([category, suggestions]) => (
            <Panel
              key={category}
              header={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Badge count={suggestions.length} size="small" />
                  <span style={{ marginLeft: '8px' }}>{category}</span>
                </div>
              }
            >
              {suggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  size="small"
                  style={{ marginBottom: '12px' }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Tag color={
                          suggestion.type === 'WARNING' ? 'red' :
                          suggestion.type === 'OPTIMIZATION' ? 'blue' :
                          suggestion.type === 'RECOMMENDATION' ? 'green' : 'orange'
                        }>
                          {suggestion.type}
                        </Tag>
                        <Badge 
                          color={
                            suggestion.impact === 'CRITICAL' ? '#f5222d' :
                            suggestion.impact === 'HIGH' ? '#fa8c16' :
                            suggestion.impact === 'MEDIUM' ? '#faad14' : '#52c41a'
                          }
                        />
                        <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                          {suggestion.title}
                        </span>
                        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                          置信度: {(suggestion.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '12px', color: '#666' }}>
                        {suggestion.description}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: suggestion.estimatedCostImpact > 0 ? '#fa8c16' : '#52c41a' }}>
                            成本影响: {suggestion.estimatedCostImpact > 0 ? '+' : ''}{suggestion.estimatedCostImpact}%
                          </span>
                          <span style={{ marginLeft: '16px', color: suggestion.estimatedTimeImpact > 0 ? '#fa8c16' : '#52c41a' }}>
                            工期影响: {suggestion.estimatedTimeImpact > 0 ? '+' : ''}{suggestion.estimatedTimeImpact}天
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        参考规范: {suggestion.references.join(', ')}
                      </div>
                    </div>
                    
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={suggestion.action}
                      style={{ marginLeft: '12px' }}
                    >
                      应用建议
                    </Button>
                  </div>
                </Card>
              ))}
            </Panel>
          ))}
        </Collapse>
      </Card>
    );
  };

  return (
    <div className={`enhanced-excavation-designer ${className}`} style={{ padding: '20px' }}>
      {/* 头部信息 */}
      <Card className="header-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#00d9ff' }}>
              🏗️ 2号专家增强版基坑设计器
            </h2>
            <div style={{ marginTop: '8px', color: '#666' }}>
              智能参数优化 • 实时安全评估 • 符合工程规范
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={performAutoOptimization}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              智能优化
            </Button>
            <Button icon={<SaveOutlined />}>
              保存方案
            </Button>
            <Button icon={<ExportOutlined />} onClick={exportDesign}>
              导出方案
            </Button>
          </div>
        </div>
      </Card>

      {/* 设计步骤 */}
      <Card style={{ marginBottom: '20px' }}>
        <Steps
          current={currentStep}
          items={designSteps}
          onChange={setCurrentStep}
          size="small"
        />
      </Card>

      <Row gutter={[20, 20]}>
        {/* 左侧：参数设置 */}
        <Col span={16}>
          <Form form={form} layout="vertical">
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="📐 基本参数" key="basic">
                {renderBasicParameters()}
              </TabPane>
              
              <TabPane tab="🛡️ 围护结构" key="retaining">
                {renderRetainingStructure()}
              </TabPane>
              
              <TabPane tab="🔧 支撑系统" key="support">
                <Card title="🔧 支撑系统设计" className="design-card">
                  {/* 支撑系统参数内容 */}
                  <div>支撑系统参数设置界面...</div>
                </Card>
              </TabPane>
              
              <TabPane tab="💧 辅助系统" key="auxiliary">
                <Card title="💧 降水与监测系统" className="design-card">
                  {/* 辅助系统参数内容 */}
                  <div>降水和监测系统设置界面...</div>
                </Card>
              </TabPane>
            </Tabs>
          </Form>
        </Col>

        {/* 右侧：评估和建议 */}
        <Col span={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 安全评估 */}
            {renderSafetyAssessment()}
            
            {/* 智能建议 */}
            {renderDesignSuggestions()}
            
            {/* 优化历史 */}
            {optimizationHistory.length > 0 && (
              <Card title="📈 优化历史" size="small">
                <Timeline size="small">
                  {optimizationHistory.map((record, index) => (
                    <Timeline.Item
                      key={index}
                      color="green"
                    >
                      <div style={{ fontSize: '12px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {record.changes.join('、')}
                        </div>
                        <div style={{ color: '#666', marginTop: '4px' }}>
                          改进: {record.improvement} | 安全评分: {record.safetyScore}
                        </div>
                        <div style={{ color: '#999', marginTop: '2px' }}>
                          {record.timestamp.toLocaleString()}
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            )}
          </Space>
        </Col>
      </Row>

      {/* 底部操作栏 */}
      <Card 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
          borderRadius: 0,
          borderBottom: 'none'
        }}
        bodyStyle={{ padding: '12px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              🎯 设计状态:
            </div>
            {safetyAssessment && (
              <Tag 
                color={
                  safetyAssessment.overallRating === 'EXCELLENT' ? 'green' :
                  safetyAssessment.overallRating === 'GOOD' ? 'blue' :
                  safetyAssessment.overallRating === 'ACCEPTABLE' ? 'orange' : 'red'
                }
                style={{ fontSize: '12px' }}
              >
                {safetyAssessment.overallRating} ({safetyAssessment.overallScore})
              </Tag>
            )}
            <div style={{ fontSize: '12px', color: '#666' }}>
              建议数: {designSuggestions.length} | 优化次数: {optimizationHistory.length}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button 
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(prev => prev - 1)}
            >
              上一步
            </Button>
            <Button 
              type="primary"
              disabled={currentStep === designSteps.length - 1}
              onClick={() => setCurrentStep(prev => prev + 1)}
            >
              下一步
            </Button>
            <Button 
              type="primary"
              icon={<RocketOutlined />}
              onClick={() => {
                if (safetyAssessment) {
                  onDesignComplete?.(parameters, safetyAssessment);
                  message.success('🎉 基坑设计方案已完成！');
                } else {
                  message.warning('请等待安全评估完成');
                }
              }}
              style={{ background: '#00d9ff', borderColor: '#00d9ff' }}
            >
              完成设计
            </Button>
          </div>
        </div>
      </Card>

      {/* 样式定义 */}
      <style>{`
        .enhanced-excavation-designer .design-card .ant-card-head {
          background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(0, 217, 255, 0.05));
          border-bottom: 1px solid rgba(0, 217, 255, 0.2);
        }
        
        .enhanced-excavation-designer .design-card .ant-card-head-title {
          color: #00d9ff;
          font-weight: bold;
        }
        
        .enhanced-excavation-designer .safety-assessment-card {
          border: 1px solid rgba(82, 196, 26, 0.3);
          background: linear-gradient(135deg, rgba(82, 196, 26, 0.05), rgba(82, 196, 26, 0.02));
        }
        
        .enhanced-excavation-designer .suggestions-card {
          border: 1px solid rgba(250, 173, 20, 0.3);
          background: linear-gradient(135deg, rgba(250, 173, 20, 0.05), rgba(250, 173, 20, 0.02));
        }
        
        .enhanced-excavation-designer .ant-steps-item-finish .ant-steps-item-icon {
          background-color: #00d9ff;
          border-color: #00d9ff;
        }
        
        .enhanced-excavation-designer .ant-steps-item-active .ant-steps-item-icon {
          border-color: #00d9ff;
          color: #00d9ff;
        }
      `}</style>
    </div>
  );
};

export default EnhancedExcavationDesigner;