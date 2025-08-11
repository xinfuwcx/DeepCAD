/**
 * 岩土工程材料库使用示例
 * 展示如何集成和使用专业的岩土工程材料库系统
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Space, message, Divider, Typography, Alert } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import GeotechnicalMaterialLibrary from '../components/materials/GeotechnicalMaterialLibrary';
import {
  GeotechnicalMaterial,
  GeotechnicalMaterialType,
  ConstitutiveModel,
  SoilMaterialProperties
} from '../types/GeotechnicalMaterials';
import { geotechnicalMaterialService } from '../services/GeotechnicalMaterialService';
import { MaterialValidationUtils, MaterialCalculationUtils } from '../utils/MaterialValidationUtils';

const { Title, Text, Paragraph } = Typography;

const GeotechnicalMaterialLibraryExample: React.FC = () => {
  const [selectedMaterials, setSelectedMaterials] = useState<GeotechnicalMaterial[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  // 演示创建自定义材料
  const createCustomMaterial = async () => {
    const customMaterial: GeotechnicalMaterial = {
      id: `custom_clay_${Date.now()}`,
      name: '工程示例粘土',
      type: GeotechnicalMaterialType.CLAY,
      constitutiveModel: ConstitutiveModel.MOHR_COULOMB,
      properties: {
        density: 1850,
        unitWeight: 18.5,
        elasticModulus: 12000,
        poissonRatio: 0.35,
        cohesion: 25,
        frictionAngle: 18,
        permeability: 5e-9,
        liquidLimit: 42,
        plasticLimit: 19,
        plasticityIndex: 23,
        compressionIndex: 0.28,
        swellingIndex: 0.06
      } as SoilMaterialProperties,
      description: '项目特定的粘土材料参数，基于现场试验数据',
      source: '现场试验报告',
      standard: 'GB 50007-2011',
      reliability: 'experimental',
      status: 'draft',
      validated: false,
      version: '1.0.0',
      created: new Date(),
      modified: new Date(),
      tags: ['粘土', '现场试验', '项目特定'],
      category: '天然土体',
      parameterRanges: {
        density: { min: 1700, max: 2000, recommended: [1800, 1900], unit: 'kg/m³' },
        cohesion: { min: 15, max: 40, recommended: [20, 30], unit: 'kPa' },
        frictionAngle: { min: 12, max: 25, recommended: [15, 22], unit: '°' }
      }
    };

    try {
      const success = await geotechnicalMaterialService.addMaterial(customMaterial);
      if (success) {
        message.success('自定义材料创建成功！');
        return customMaterial;
      } else {
        message.error('创建材料失败');
        return null;
      }
    } catch (error) {
      message.error('创建材料时发生错误');
      console.error('Error creating custom material:', error);
      return null;
    }
  };

  // 演示材料验证
  const validateMaterials = async () => {
    if (selectedMaterials.length === 0) {
      message.warning('请先选择要验证的材料');
      return;
    }

    const results = [];
    for (const material of selectedMaterials) {
      const validation = await MaterialValidationUtils.validateMaterialParameters(material);
      results.push({
        material: material,
        validation: validation
      });
    }

    setValidationResults(results);
    message.success(`完成 ${results.length} 个材料的验证`);
  };

  // 演示参数计算
  const demonstrateCalculations = () => {
    if (selectedMaterials.length === 0) {
      message.warning('请先选择材料');
      return;
    }

    const material = selectedMaterials[0];
    const props = material.properties;

    // 计算派生参数
    const shearModulus = MaterialCalculationUtils.calculateShearModulus(
      props.elasticModulus, 
      props.poissonRatio
    );
    const bulkModulus = MaterialCalculationUtils.calculateBulkModulus(
      props.elasticModulus, 
      props.poissonRatio
    );
    const unitWeight = MaterialCalculationUtils.calculateUnitWeight(props.density);

    message.info(
      `材料 "${material.name}" 的计算结果:\n` +
      `剪切模量: ${shearModulus.toFixed(0)} kPa\n` +
      `体积模量: ${bulkModulus.toFixed(0)} kPa\n` +
      `重度: ${unitWeight.toFixed(1)} kN/m³`
    );
  };

  // 演示SPT参数估算
  const demonstrateSPTEstimation = () => {
    const N = 15; // SPT击数
    const soilType = 'clay';
    
    const estimatedParams = MaterialCalculationUtils.estimateParametersFromSPT(N, soilType);
    
    message.info(
      `基于SPT-N值 ${N} 的参数估算:\n` +
      `粘聚力: ${estimatedParams.cohesion?.toFixed(1)} kPa\n` +
      `内摩擦角: ${estimatedParams.frictionAngle?.toFixed(1)}°\n` +
      `弹性模量: ${estimatedParams.elasticModulus?.toFixed(0)} kPa`
    );
  };

  // 获取统计信息
  const statistics = geotechnicalMaterialService.getStatistics();

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ExperimentOutlined style={{ marginRight: '8px' }} />
          岩土工程材料库集成示例
        </Title>
        <Paragraph>
          这个示例展示了如何在项目中集成和使用岩土工程材料库系统。
          包括材料管理、参数验证、计算工具等功能的完整演示。
        </Paragraph>
      </div>

      {/* 功能演示区 */}
      <Card title="功能演示" style={{ marginBottom: 24 }}>
        <Space wrap size="large">
          <Button type="primary" onClick={createCustomMaterial}>
            创建自定义材料
          </Button>
          <Button onClick={validateMaterials}>
            验证选中材料
          </Button>
          <Button onClick={demonstrateCalculations}>
            参数计算演示
          </Button>
          <Button onClick={demonstrateSPTEstimation}>
            SPT参数估算
          </Button>
          <Button 
            type={showLibrary ? 'default' : 'primary'}
            onClick={() => setShowLibrary(!showLibrary)}
          >
            {showLibrary ? '隐藏' : '显示'}材料库
          </Button>
        </Space>
      </Card>

      {/* 系统统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {statistics.totalMaterials}
              </div>
              <div>材料总数</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {statistics.validatedMaterials}
              </div>
              <div>已验证材料</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                {statistics.totalLibraries}
              </div>
              <div>材料库数</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {selectedMaterials.length}
              </div>
              <div>已选择材料</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 验证结果展示 */}
      {validationResults.length > 0 && (
        <Card title="材料验证结果" style={{ marginBottom: 24 }}>
          {validationResults.map(({ material, validation }, index) => (
            <Card 
              key={index}
              size="small" 
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <span>{material.name}</span>
                  {validation.isValid ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <WarningOutlined style={{ color: '#faad14' }} />
                  )}
                  <span>评分: {validation.overallScore.toFixed(1)}</span>
                </Space>
              }
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>验证详情:</Text>
                  </div>
                  <div>基本属性: {validation.results.basicProperties.passed ? '✓' : '✗'} ({validation.results.basicProperties.score}分)</div>
                  <div>强度参数: {validation.results.strengthParameters.passed ? '✓' : '✗'} ({validation.results.strengthParameters.score}分)</div>
                  <div>本构模型: {validation.results.constitutiveModel.passed ? '✓' : '✗'} ({validation.results.constitutiveModel.score}分)</div>
                  <div>适用性检查: {validation.results.applicabilityCheck.passed ? '✓' : '✗'} ({validation.results.applicabilityCheck.score}分)</div>
                </Col>
                <Col span={12}>
                  {validation.warnings.length > 0 && (
                    <Alert
                      message="警告"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {validation.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      }
                      type="warning"
                      size="small"
                    />
                  )}
                  {validation.errors.length > 0 && (
                    <Alert
                      message="错误"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {validation.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      }
                      type="error"
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Col>
              </Row>
            </Card>
          ))}
        </Card>
      )}

      {/* 材料库组件 */}
      {showLibrary && (
        <Card title="岩土工程材料库" style={{ marginBottom: 24 }}>
          <GeotechnicalMaterialLibrary
            mode="select"
            onMaterialSelect={(material) => {
              if (!selectedMaterials.find(m => m.id === material.id)) {
                setSelectedMaterials([...selectedMaterials, material]);
                message.success(`已选择材料: ${material.name}`);
              } else {
                message.info(`材料 ${material.name} 已在选择列表中`);
              }
            }}
            selectedMaterialIds={selectedMaterials.map(m => m.id)}
          />
        </Card>
      )}

      {/* 技术特性说明 */}
      <Card title="系统特性" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" title="材料类型支持">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>粘性土、砂土、粉土、砾石土</li>
                <li>硬质岩、软质岩、风化岩</li>
                <li>混凝土、钢材、钢筋</li>
                <li>填土、有机质土等特殊材料</li>
              </ul>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="本构模型">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>线弹性、摩尔-库伦</li>
                <li>德鲁克-普拉格、剑桥模型</li>
                <li>硬化土模型、软土模型</li>
                <li>霍克-布朗、节理岩体模型</li>
              </ul>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="验证功能">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>参数合理性检查</li>
                <li>本构模型兼容性验证</li>
                <li>工程经验对比</li>
                <li>参数一致性分析</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 使用说明 */}
      <Card title="集成使用说明">
        <Alert
          message="集成步骤"
          description={
            <div>
              <p><strong>1. 导入组件和服务:</strong></p>
              <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
{`import GeotechnicalMaterialLibrary from './components/materials/GeotechnicalMaterialLibrary';
import { geotechnicalMaterialService } from './services/GeotechnicalMaterialService';
import { MaterialValidationUtils } from './utils/MaterialValidationUtils';`}
              </pre>

              <p><strong>2. 使用材料库组件:</strong></p>
              <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
{`<GeotechnicalMaterialLibrary
  mode="select"
  onMaterialSelect={(material) => {
    // 处理材料选择
    console.log('Selected material:', material);
  }}
/>`}
              </pre>

              <p><strong>3. 调用验证服务:</strong></p>
              <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
{`const validation = await MaterialValidationUtils.validateMaterialParameters(material);
console.log('Validation result:', validation);`}
              </pre>

              <p><strong>4. 使用计算工具:</strong></p>
              <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
{`const shearModulus = MaterialCalculationUtils.calculateShearModulus(E, nu);
const unitWeight = MaterialCalculationUtils.calculateUnitWeight(density);`}
              </pre>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default GeotechnicalMaterialLibraryExample;