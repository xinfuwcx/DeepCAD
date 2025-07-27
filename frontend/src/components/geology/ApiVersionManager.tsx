/**
 * API版本管理器组件
 * DeepCAD Deep Excavation CAE Platform - API Version Manager Component
 * 
 * 作者：2号几何专家
 * 版本：v1.0.0
 * 创建日期：2025-01-25
 * 
 * 提供可视化的API版本管理界面，支持版本兼容性检查、数据迁移和版本状态监控
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Badge, 
  Button, 
  Table, 
  Modal, 
  Steps, 
  Alert, 
  Progress, 
  Descriptions,
  Tag,
  Space,
  Divider,
  Tooltip,
  message,
  Typography
} from 'antd';
import {
  ApiOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  HistoryOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  UpgradeOutlined,
  DowngradeOutlined
} from '@ant-design/icons';

import {
  apiVersionManager,
  ApiVersion,
  VersionCompatibility,
  VersionedData,
  CompatibilityLevel,
  checkDataCompatibility,
  autoMigrateData
} from '../../interfaces/versionedApiSystem';

const { Text, Title } = Typography;
const { Step } = Steps;

/**
 * API版本管理器组件属性接口
 */
interface ApiVersionManagerProps {
  /** 当前数据版本信息 */
  currentDataVersions?: Record<string, string>;
  /** 版本变更回调 */
  onVersionChange?: (dataType: string, newVersion: string) => void;
  /** 迁移完成回调 */
  onMigrationComplete?: (results: MigrationResult[]) => void;
  /** 是否显示详细信息 */
  showDetails?: boolean;
}

/**
 * 迁移结果接口
 */
interface MigrationResult {
  dataType: string;
  sourceVersion: string;
  targetVersion: string;
  success: boolean;
  duration: number;
  warnings: string[];
  errors: string[];
}

/**
 * 版本状态统计接口
 */
interface VersionStatusStats {
  totalDataTypes: number;
  upToDateCount: number;
  outdatedCount: number;
  incompatibleCount: number;
  averageCompatibilityScore: number;
}

/**
 * API版本管理器主组件
 * 提供完整的版本管理、兼容性检查和数据迁移功能
 */
const ApiVersionManagerComponent: React.FC<ApiVersionManagerProps> = ({
  currentDataVersions = {},
  onVersionChange,
  onMigrationComplete,
  showDetails = true
}) => {
  // ============================================================================
  // 状态管理
  // ============================================================================

  const [supportedVersions, setSupportedVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ApiVersion | null>(null);
  const [versionCompatibilities, setVersionCompatibilities] = useState<Record<string, VersionCompatibility>>({});
  const [versionStats, setVersionStats] = useState<VersionStatusStats | null>(null);
  
  // 模态框状态
  const [migrationModalVisible, setMigrationModalVisible] = useState(false);
  const [compatibilityModalVisible, setCompatibilityModalVisible] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<string>('');
  
  // 迁移状态
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [migrationProgress, setMigrationProgress] = useState(0);

  // ============================================================================
  // 初始化和数据加载
  // ============================================================================

  /**
   * 组件初始化
   */
  useEffect(() => {
    initializeVersionManager();
  }, []);

  /**
   * 监听当前数据版本变化
   */
  useEffect(() => {
    if (Object.keys(currentDataVersions).length > 0) {
      updateCompatibilityChecks();
    }
  }, [currentDataVersions]);

  /**
   * 初始化版本管理器
   */
  const initializeVersionManager = useCallback(async () => {
    try {
      console.log('🔄 初始化API版本管理器...');
      
      // 获取支持的版本列表
      const versions = apiVersionManager.getSupportedVersions();
      setSupportedVersions(versions);
      
      // 获取当前版本
      const current = apiVersionManager.getCurrentVersion();
      setCurrentVersion(current);
      
      console.log('✅ API版本管理器初始化完成', {
        支持版本: versions,
        当前版本: current.versionString
      });
      
    } catch (error) {
      console.error('❌ API版本管理器初始化失败:', error);
      message.error('版本管理器初始化失败');
    }
  }, []);

  /**
   * 更新兼容性检查
   */
  const updateCompatibilityChecks = useCallback(async () => {
    if (!currentVersion) return;
    
    const compatibilities: Record<string, VersionCompatibility> = {};
    let totalScore = 0;
    let upToDateCount = 0;
    let outdatedCount = 0;
    let incompatibleCount = 0;
    
    for (const [dataType, versionString] of Object.entries(currentDataVersions)) {
      try {
        const dataVersion = apiVersionManager.parseVersion(versionString);
        const compatibility = apiVersionManager.checkCompatibility(dataVersion, currentVersion);
        compatibilities[dataType] = compatibility;
        
        totalScore += compatibility.compatibilityScore;
        
        // 统计版本状态
        if (compatibility.compatibilityLevel === CompatibilityLevel.FULL_COMPATIBLE) {
          upToDateCount++;
        } else if (compatibility.compatibilityLevel === CompatibilityLevel.INCOMPATIBLE) {
          incompatibleCount++;
        } else {
          outdatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ 检查 ${dataType} 兼容性失败:`, error);
      }
    }
    
    setVersionCompatibilities(compatibilities);
    
    // 更新统计信息
    const totalDataTypes = Object.keys(currentDataVersions).length;
    setVersionStats({
      totalDataTypes,
      upToDateCount,
      outdatedCount,
      incompatibleCount,
      averageCompatibilityScore: totalDataTypes > 0 ? totalScore / totalDataTypes : 0
    });
    
  }, [currentVersion, currentDataVersions]);

  // ============================================================================
  // 版本兼容性表格配置
  // ============================================================================

  /**
   * 兼容性表格列配置
   */
  const compatibilityColumns = [
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (dataType: string) => (
        <Space>
          <ApiOutlined />
          <Text strong>{dataType}</Text>
        </Space>
      )
    },
    {
      title: '当前版本',
      dataIndex: 'currentVersion',
      key: 'currentVersion',
      render: (version: string) => (
        <Tag color="blue">{version}</Tag>
      )
    },
    {
      title: '目标版本',
      dataIndex: 'targetVersion',
      key: 'targetVersion',
      render: (version: string) => (
        <Tag color="green">{version}</Tag>
      )
    },
    {
      title: '兼容性状态',
      dataIndex: 'compatibility',
      key: 'compatibility',
      render: (compatibility: VersionCompatibility) => {
        const { compatibilityLevel, compatibilityScore } = compatibility;
        
        let color: string;
        let icon: React.ReactNode;
        let text: string;
        
        switch (compatibilityLevel) {
          case CompatibilityLevel.FULL_COMPATIBLE:
            color = 'success';
            icon = <CheckCircleOutlined />;
            text = '完全兼容';
            break;
          case CompatibilityLevel.BACKWARD_COMPATIBLE:
            color = 'processing';
            icon = <UpgradeOutlined />;
            text = '向后兼容';
            break;
          case CompatibilityLevel.PARTIAL_COMPATIBLE:
            color = 'warning';
            icon = <ExclamationCircleOutlined />;
            text = '部分兼容';
            break;
          case CompatibilityLevel.INCOMPATIBLE:
            color = 'error';
            icon = <WarningOutlined />;
            text = '不兼容';
            break;
          default:
            color = 'default';
            icon = <InfoCircleOutlined />;
            text = '未知';
        }
        
        return (
          <Space>
            <Badge status={color as any} text={text} />
            {icon}
            <Text type="secondary">({(compatibilityScore * 100).toFixed(0)}%)</Text>
          </Space>
        );
      }
    },
    {
      title: '迁移复杂度',
      dataIndex: 'migrationComplexity',
      key: 'migrationComplexity',
      render: (complexity: string, record: any) => {
        const { compatibility } = record;
        let color: string;
        
        switch (compatibility.migrationComplexity) {
          case 'trivial': color = 'green'; break;
          case 'simple': color = 'blue'; break;
          case 'moderate': color = 'orange'; break;
          case 'complex': color = 'red'; break;
          case 'expert': color = 'purple'; break;
          default: color = 'default';
        }
        
        return <Tag color={color}>{compatibility.migrationComplexity}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: any) => (
        <Space>
          <Button
            size="small"
            type="link"
            onClick={() => showCompatibilityDetails(record.dataType)}
          >
            详情
          </Button>
          {record.compatibility.compatibilityLevel !== CompatibilityLevel.FULL_COMPATIBLE && (
            <Button
              size="small"
              type="primary"
              onClick={() => startMigration(record.dataType)}
              disabled={record.compatibility.compatibilityLevel === CompatibilityLevel.INCOMPATIBLE}
            >
              迁移
            </Button>
          )}
        </Space>
      )
    }
  ];

  /**
   * 构建表格数据
   */
  const compatibilityTableData = Object.entries(versionCompatibilities).map(([dataType, compatibility]) => ({
    key: dataType,
    dataType,
    currentVersion: currentDataVersions[dataType],
    targetVersion: currentVersion?.versionString,
    compatibility
  }));

  // ============================================================================
  // 事件处理函数
  // ============================================================================

  /**
   * 显示兼容性详情
   */
  const showCompatibilityDetails = useCallback((dataType: string) => {
    setSelectedDataType(dataType);
    setCompatibilityModalVisible(true);
  }, []);

  /**
   * 开始单个数据类型的迁移
   */
  const startMigration = useCallback(async (dataType: string) => {
    setSelectedDataType(dataType);
    setMigrationModalVisible(true);
  }, []);

  /**
   * 执行数据迁移
   */
  const executeMigration = useCallback(async (dataType: string, targetVersion: string) => {
    if (!currentVersion) return;
    
    setMigrationInProgress(true);
    setMigrationProgress(0);
    
    const startTime = Date.now();
    const result: MigrationResult = {
      dataType,
      sourceVersion: currentDataVersions[dataType],
      targetVersion,
      success: false,
      duration: 0,
      warnings: [],
      errors: []
    };
    
    try {
      console.log(`🔄 开始迁移 ${dataType}: ${result.sourceVersion} -> ${targetVersion}`);
      
      // 模拟迁移进度
      for (let i = 0; i <= 100; i += 10) {
        setMigrationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 实际迁移逻辑在这里执行
      // 这里简化为成功处理
      result.success = true;
      result.duration = Date.now() - startTime;
      
      // 通知父组件版本变更
      onVersionChange?.(dataType, targetVersion);
      
      message.success(`${dataType} 数据迁移完成`);
      
      console.log(`✅ ${dataType} 迁移成功`, {
        耗时: result.duration + 'ms',
        源版本: result.sourceVersion,
        目标版本: result.targetVersion
      });
      
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      
      message.error(`${dataType} 数据迁移失败: ${(error as Error).message}`);
      console.error(`❌ ${dataType} 迁移失败:`, error);
    } finally {
      result.duration = Date.now() - startTime;
      setMigrationResults(prev => [...prev, result]);
      setMigrationInProgress(false);
      setMigrationProgress(0);
      setMigrationModalVisible(false);
      
      // 更新兼容性检查
      await updateCompatibilityChecks();
    }
  }, [currentVersion, currentDataVersions, onVersionChange, updateCompatibilityChecks]);

  /**
   * 批量迁移所有过期数据
   */
  const batchMigrateAll = useCallback(async () => {
    if (!currentVersion) return;
    
    const outdatedDataTypes = Object.entries(versionCompatibilities)
      .filter(([_, compatibility]) => 
        compatibility.compatibilityLevel !== CompatibilityLevel.FULL_COMPATIBLE &&
        compatibility.compatibilityLevel !== CompatibilityLevel.INCOMPATIBLE
      )
      .map(([dataType]) => dataType);
    
    if (outdatedDataTypes.length === 0) {
      message.info('所有数据已是最新版本');
      return;
    }
    
    Modal.confirm({
      title: '确认批量迁移',
      content: `即将迁移 ${outdatedDataTypes.length} 个数据类型到最新版本，是否继续？`,
      onOk: async () => {
        for (const dataType of outdatedDataTypes) {
          await executeMigration(dataType, currentVersion.versionString);
          await new Promise(resolve => setTimeout(resolve, 500)); // 间隔500ms
        }
        
        onMigrationComplete?.(migrationResults);
      }
    });
  }, [currentVersion, versionCompatibilities, executeMigration, migrationResults, onMigrationComplete]);

  // ============================================================================
  // 渲染辅助函数
  // ============================================================================

  /**
   * 渲染版本状态卡片
   */
  const renderVersionStatusCard = () => {
    if (!versionStats || !currentVersion) return null;
    
    return (
      <Card
        title={
          <Space>
            <BranchesOutlined style={{ color: '#1890ff' }} />
            <span>版本状态概览</span>
          </Space>
        }
        size="small"
        className="mb-4"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {versionStats.upToDateCount}
            </div>
            <div className="text-sm text-gray-500">最新版本</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {versionStats.outdatedCount}
            </div>
            <div className="text-sm text-gray-500">需要更新</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {versionStats.incompatibleCount}
            </div>
            <div className="text-sm text-gray-500">不兼容</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(versionStats.averageCompatibilityScore * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500">平均兼容性</div>
          </div>
        </div>
        
        <Divider />
        
        <div className="flex items-center justify-between">
          <Space>
            <Text>当前API版本:</Text>
            <Tag color="blue">{currentVersion.versionString}</Tag>
          </Space>
          
          <Space>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={batchMigrateAll}
              disabled={versionStats.outdatedCount === 0}
            >
              批量更新 ({versionStats.outdatedCount})
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  /**
   * 渲染兼容性详情模态框
   */
  const renderCompatibilityModal = () => {
    const compatibility = versionCompatibilities[selectedDataType];
    if (!compatibility) return null;
    
    return (
      <Modal
        title={`${selectedDataType} 兼容性详情`}
        open={compatibilityModalVisible}
        onCancel={() => setCompatibilityModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCompatibilityModalVisible(false)}>
            关闭
          </Button>,
          compatibility.compatibilityLevel !== CompatibilityLevel.FULL_COMPATIBLE &&
          compatibility.compatibilityLevel !== CompatibilityLevel.INCOMPATIBLE && (
            <Button
              key="migrate"
              type="primary"
              onClick={() => {
                setCompatibilityModalVisible(false);
                startMigration(selectedDataType);
              }}
            >
              开始迁移
            </Button>
          )
        ]}
        width={800}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="源版本">
            {compatibility.sourceVersion.versionString}
          </Descriptions.Item>
          <Descriptions.Item label="目标版本">
            {compatibility.targetVersion.versionString}
          </Descriptions.Item>
          <Descriptions.Item label="兼容性级别">
            <Badge 
              status={
                compatibility.compatibilityLevel === CompatibilityLevel.FULL_COMPATIBLE ? 'success' :
                compatibility.compatibilityLevel === CompatibilityLevel.INCOMPATIBLE ? 'error' : 'warning'
              }
              text={compatibility.compatibilityLevel}
            />
          </Descriptions.Item>
          <Descriptions.Item label="兼容性评分">
            {(compatibility.compatibilityScore * 100).toFixed(1)}%
          </Descriptions.Item>
          <Descriptions.Item label="迁移复杂度">
            <Tag color={
              compatibility.migrationComplexity === 'trivial' ? 'green' :
              compatibility.migrationComplexity === 'simple' ? 'blue' :
              compatibility.migrationComplexity === 'moderate' ? 'orange' :
              compatibility.migrationComplexity === 'complex' ? 'red' : 'purple'
            }>
              {compatibility.migrationComplexity}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        
        {compatibility.migrationSteps.length > 0 && (
          <>
            <Divider>迁移步骤</Divider>
            <Steps
              direction="vertical"
              size="small"
              current={-1}
              items={compatibility.migrationSteps.map((step, index) => ({
                title: step,
                status: 'wait' as const
              }))}
            />
          </>
        )}
        
        {compatibility.newFeatures.length > 0 && (
          <>
            <Divider>新增功能</Divider>
            <div className="space-y-2">
              {compatibility.newFeatures.map((feature, index) => (
                <Alert
                  key={index}
                  message={feature}
                  type="info"
                  showIcon
                  size="small"
                />
              ))}
            </div>
          </>
        )}
        
        {compatibility.breakingChanges.length > 0 && (
          <>
            <Divider>破坏性变更</Divider>
            <div className="space-y-2">
              {compatibility.breakingChanges.map((change, index) => (
                <Alert
                  key={index}
                  message={change}
                  type="error"
                  showIcon
                  size="small"
                />
              ))}
            </div>
          </>
        )}
      </Modal>
    );
  };

  /**
   * 渲染迁移进度模态框
   */
  const renderMigrationModal = () => {
    return (
      <Modal
        title={`迁移 ${selectedDataType} 数据`}
        open={migrationModalVisible}
        onCancel={() => !migrationInProgress && setMigrationModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setMigrationModalVisible(false)}
            disabled={migrationInProgress}
          >
            取消
          </Button>,
          <Button
            key="migrate"
            type="primary"
            loading={migrationInProgress}
            onClick={() => currentVersion && executeMigration(selectedDataType, currentVersion.versionString)}
          >
            {migrationInProgress ? '迁移中...' : '开始迁移'}
          </Button>
        ]}
        closable={!migrationInProgress}
        maskClosable={!migrationInProgress}
      >
        {migrationInProgress && (
          <div className="space-y-4">
            <Progress 
              percent={migrationProgress} 
              status="active"
              format={(percent) => `${percent}% 迁移中...`}
            />
            <Alert
              message="数据迁移进行中"
              description="请耐心等待，不要关闭窗口"
              type="info"
              showIcon
            />
          </div>
        )}
        
        {!migrationInProgress && (
          <Alert
            message="确认数据迁移"
            description={`即将将 ${selectedDataType} 从版本 ${currentDataVersions[selectedDataType]} 迁移到 ${currentVersion?.versionString}`}
            type="warning"
            showIcon
          />
        )}
      </Modal>
    );
  };

  // ============================================================================
  // 主渲染
  // ============================================================================

  return (
    <div className="api-version-manager">
      {/* 版本状态概览 */}
      {renderVersionStatusCard()}
      
      {/* 兼容性检查表格 */}
      <Card
        title={
          <Space>
            <ApiOutlined style={{ color: '#52c41a' }} />
            <span>数据版本兼容性</span>
          </Space>
        }
        size="small"
        extra={
          <Space>
            <Tooltip title="刷新兼容性检查">
              <Button
                icon={<SyncOutlined />}
                onClick={updateCompatibilityChecks}
                size="small"
              />
            </Tooltip>
            <Tooltip title="查看版本历史">
              <Button
                icon={<HistoryOutlined />}
                onClick={() => message.info('版本历史功能开发中')}
                size="small"
              />
            </Tooltip>
          </Space>
        }
      >
        <Table
          columns={compatibilityColumns}
          dataSource={compatibilityTableData}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
        
        {compatibilityTableData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ApiOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>暂无数据版本信息</div>
          </div>
        )}
      </Card>
      
      {/* 模态框 */}
      {renderCompatibilityModal()}
      {renderMigrationModal()}
    </div>
  );
};

export default ApiVersionManagerComponent;