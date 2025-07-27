/**
 * 数据版本控制面板组件
 * 1号架构师 - 提供直观的版本管理界面
 */

import React, { useState, useMemo } from 'react';
import { 
  Timeline, 
  Button, 
  Modal, 
  Input, 
  Select, 
  Tag, 
  Tooltip, 
  Space, 
  Card, 
  Divider,
  Progress,
  Alert,
  Popconfirm,
  Badge,
  Tree
} from 'antd';
import {
  BranchesOutlined,
  HistoryOutlined,
  SaveOutlined,
  RollbackOutlined,
  TagOutlined,
  CompareOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  MergeOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useDataVersionControl, useSnapshotComparison } from '../../hooks/useDataVersionControl';
import { DataSnapshot, DataBranch } from '../../core/DataVersionControl';

// ==================== 组件Props ====================

interface VersionControlPanelProps {
  className?: string;
  data?: any;
  onDataRestore?: (data: any) => void;
  showBranchManagement?: boolean;
  showComparison?: boolean;
  maxHistoryItems?: number;
}

// ==================== 组件实现 ====================

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  className = '',
  data,
  onDataRestore,
  showBranchManagement = true,
  showComparison = true,
  maxHistoryItems = 50
}) => {
  // 版本控制Hook
  const versionControl = useDataVersionControl();
  const comparison = useSnapshotComparison();

  // 组件状态
  const [activeTab, setActiveTab] = useState<'history' | 'branches' | 'comparison'>('history');
  const [isCreateBranchModalVisible, setIsCreateBranchModalVisible] = useState(false);
  const [isCreateSnapshotModalVisible, setIsCreateSnapshotModalVisible] = useState(false);
  const [isMergeBranchModalVisible, setIsMergeBranchModalVisible] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDescription, setNewBranchDescription] = useState('');
  const [snapshotCommitMessage, setSnapshotCommitMessage] = useState('');
  const [sourceBranchForMerge, setSourceBranchForMerge] = useState('');
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);

  // 获取格式化的时间轴数据
  const timelineItems = useMemo(() => {
    return versionControl.snapshots.slice(0, maxHistoryItems).map((snapshot, index) => {
      const isLatest = index === 0;
      const operationIcons = {
        geometry: '🔷',
        mesh: '🔗',
        material: '⚡',
        computation: '⚙️',
        results: '📊',
        manual: '👤'
      };

      return {
        key: snapshot.id,
        dot: isLatest ? (
          <Badge status="processing" />
        ) : (
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: getStatusColor(snapshot.validation.isValid)
          }} />
        ),
        color: isLatest ? '#1890ff' : '#d9d9d9',
        children: (
          <Card 
            size="small" 
            style={{ marginBottom: '8px', cursor: 'pointer' }}
            hoverable
            onClick={() => handleSnapshotSelect(snapshot.id)}
            className={selectedSnapshots.includes(snapshot.id) ? 'selected-snapshot' : ''}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ marginRight: '8px' }}>
                    {operationIcons[snapshot.metadata.operationType] || '📄'}
                  </span>
                  <strong>{snapshot.relationships.commitMessage}</strong>
                  {isLatest && <Tag color="blue" style={{ marginLeft: '8px' }}>HEAD</Tag>}
                </div>
                
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {snapshot.metadata.author} • {new Date(snapshot.timestamp).toLocaleString()}
                </div>
                
                <div style={{ fontSize: '12px', color: '#888' }}>
                  分支: {snapshot.relationships.branchName} • 
                  大小: {formatFileSize(snapshot.metadata.size)} • 
                  类型: {snapshot.metadata.changeType}
                </div>
                
                {snapshot.metadata.tags.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    {snapshot.metadata.tags.map(tag => (
                      <Tag key={tag} size="small" color="orange">{tag}</Tag>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Space size="small">
                  <Tooltip title="恢复到此版本">
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<RollbackOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreSnapshot(snapshot.id);
                      }}
                    />
                  </Tooltip>
                  
                  <Tooltip title="添加标签">
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<TagOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTag(snapshot.id);
                      }}
                    />
                  </Tooltip>
                  
                  {!isLatest && (
                    <Popconfirm
                      title="确定删除此快照？"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteSnapshot(snapshot.id);
                      }}
                    >
                      <Button 
                        type="text" 
                        size="small" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  )}
                </Space>
                
                {!snapshot.validation.isValid && (
                  <Tooltip title={`验证失败: ${snapshot.validation.errors.join(', ')}`}>
                    <InfoCircleOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                  </Tooltip>
                )}
              </div>
            </div>
          </Card>
        )
      };
    });
  }, [versionControl.snapshots, maxHistoryItems, selectedSnapshots]);

  // 获取分支树数据
  const branchTreeData = useMemo(() => {
    return versionControl.branches.map(branch => {
      const isCurrentBranch = branch.name === versionControl.currentBranch;
      const headSnapshot = versionControl.snapshots.find(s => s.id === branch.head);
      
      return {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <BranchesOutlined style={{ marginRight: '8px' }} />
              <strong style={{ color: isCurrentBranch ? '#1890ff' : 'inherit' }}>
                {branch.name}
              </strong>
              {isCurrentBranch && <Tag color="blue" size="small" style={{ marginLeft: '8px' }}>当前</Tag>}
            </div>
            
            <Space size="small">
              {!isCurrentBranch && (
                <Button 
                  type="text" 
                  size="small"
                  onClick={() => handleSwitchBranch(branch.name)}
                >
                  切换
                </Button>
              )}
              
              <Button 
                type="text" 
                size="small"
                icon={<MergeOutlined />}
                onClick={() => handleOpenMergeModal(branch.name)}
              >
                合并
              </Button>
            </Space>
          </div>
        ),
        key: branch.name,
        children: headSnapshot ? [{
          title: (
            <div style={{ fontSize: '12px', color: '#666' }}>
              最新提交: {headSnapshot.relationships.commitMessage}
              <br />
              时间: {new Date(headSnapshot.timestamp).toLocaleString()}
            </div>
          ),
          key: `${branch.name}-head`,
          isLeaf: true
        }] : []
      };
    });
  }, [versionControl.branches, versionControl.currentBranch, versionControl.snapshots]);

  // 事件处理函数
  const handleSnapshotSelect = (snapshotId: string) => {
    setSelectedSnapshots(prev => {
      if (prev.includes(snapshotId)) {
        return prev.filter(id => id !== snapshotId);
      } else if (prev.length < 2) {
        return [...prev, snapshotId];
      } else {
        return [prev[1], snapshotId];
      }
    });
  };

  const handleCreateSnapshot = async () => {
    if (!data) {
      Modal.error({ title: '错误', content: '没有可保存的数据' });
      return;
    }

    try {
      await versionControl.createSnapshot(
        data,
        {
          operationType: 'manual',
          changeType: 'create',
          description: snapshotCommitMessage || 'Manual snapshot',
          tags: ['manual']
        },
        snapshotCommitMessage || 'Manual snapshot'
      );
      
      setIsCreateSnapshotModalVisible(false);
      setSnapshotCommitMessage('');
      Modal.success({ title: '成功', content: '数据快照已创建' });
    } catch (error) {
      Modal.error({ 
        title: '创建快照失败', 
        content: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    try {
      const restoredData = await versionControl.restoreToSnapshot(snapshotId);
      onDataRestore?.(restoredData);
      Modal.success({ title: '成功', content: '数据已恢复到指定版本' });
    } catch (error) {
      Modal.error({ 
        title: '恢复失败', 
        content: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) {
      Modal.error({ title: '错误', content: '分支名称不能为空' });
      return;
    }

    try {
      versionControl.createBranch(newBranchName.trim(), undefined, newBranchDescription);
      setIsCreateBranchModalVisible(false);
      setNewBranchName('');
      setNewBranchDescription('');
      Modal.success({ title: '成功', content: `分支 "${newBranchName}" 已创建` });
    } catch (error) {
      Modal.error({ 
        title: '创建分支失败', 
        content: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleSwitchBranch = (branchName: string) => {
    try {
      versionControl.switchBranch(branchName);
      Modal.success({ title: '成功', content: `已切换到分支 "${branchName}"` });
    } catch (error) {
      Modal.error({ 
        title: '切换分支失败', 
        content: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleOpenMergeModal = (branchName: string) => {
    setSourceBranchForMerge(branchName);
    setIsMergeBranchModalVisible(true);
  };

  const handleMergeBranch = async () => {
    if (!sourceBranchForMerge) return;

    try {
      await versionControl.mergeBranch(sourceBranchForMerge);
      setIsMergeBranchModalVisible(false);
      setSourceBranchForMerge('');
      Modal.success({ title: '成功', content: '分支合并完成' });
    } catch (error) {
      Modal.error({ 
        title: '合并失败', 
        content: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleAddTag = (snapshotId: string) => {
    Modal.confirm({
      title: '添加标签',
      content: (
        <Input 
          placeholder="输入标签名称"
          onPressEnter={(e) => {
            const tag = (e.target as HTMLInputElement).value.trim();
            if (tag) {
              versionControl.addTag(snapshotId, tag);
              Modal.destroyAll();
            }
          }}
        />
      ),
    });
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    try {
      versionControl.deleteSnapshot(snapshotId);
      Modal.success({ title: '成功', content: '快照已删除' });
    } catch (error) {
      Modal.error({ 
        title: '删除失败', 
        content: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleCompareSnapshots = () => {
    if (selectedSnapshots.length !== 2) {
      Modal.error({ title: '错误', content: '请选择两个快照进行比较' });
      return;
    }

    comparison.compareSnapshots(selectedSnapshots[0], selectedSnapshots[1]);
    setActiveTab('comparison');
  };

  // 辅助函数
  const getStatusColor = (isValid: boolean): string => {
    return isValid ? '#52c41a' : '#ff4d4f';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'history':
        return (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={() => setIsCreateSnapshotModalVisible(true)}
                  disabled={!data}
                >
                  创建快照
                </Button>
                
                {selectedSnapshots.length === 2 && showComparison && (
                  <Button 
                    style={{ marginLeft: '8px' }}
                    icon={<CompareOutlined />}
                    onClick={handleCompareSnapshots}
                  >
                    比较快照
                  </Button>
                )}
              </div>
              
              <div style={{ fontSize: '12px', color: '#666' }}>
                当前分支: <strong>{versionControl.currentBranch}</strong>
              </div>
            </div>

            {versionControl.error && (
              <Alert 
                message="错误" 
                description={versionControl.error}
                type="error" 
                style={{ marginBottom: '16px' }}
                showIcon 
              />
            )}

            {versionControl.isLoading && (
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <Progress type="circle" size={60} />
              </div>
            )}

            <Timeline items={timelineItems} />
          </div>
        );

      case 'branches':
        return (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsCreateBranchModalVisible(true)}
              >
                创建分支
              </Button>
            </div>

            <Tree
              treeData={branchTreeData}
              defaultExpandAll
              showLine
            />
          </div>
        );

      case 'comparison':
        return (
          <div>
            {comparison.comparison ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Button onClick={comparison.clearComparison}>清除比较</Button>
                </div>
                
                <Card title="比较结果" size="small">
                  <div style={{ marginBottom: '16px' }}>
                    <div><strong>快照A:</strong> {comparison.comparison.snapshotA}</div>
                    <div><strong>快照B:</strong> {comparison.comparison.snapshotB}</div>
                  </div>
                  
                  <Divider />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Card size="small" title={`新增 (${comparison.comparison.statistics.additionsCount})`}>
                      {comparison.comparison.differences.added.map((item, index) => (
                        <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                          + {item.path}
                        </div>
                      ))}
                    </Card>
                    
                    <Card size="small" title={`删除 (${comparison.comparison.statistics.deletionsCount})`}>
                      {comparison.comparison.differences.removed.map((item, index) => (
                        <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                          - {item.path}
                        </div>
                      ))}
                    </Card>
                    
                    <Card size="small" title={`修改 (${comparison.comparison.statistics.modificationsCount})`}>
                      {comparison.comparison.differences.modified.map((item, index) => (
                        <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                          ~ {item.path}
                        </div>
                      ))}
                    </Card>
                  </div>
                </Card>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                请选择两个快照进行比较
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`version-control-panel ${className}`}>
      <Card
        title="版本控制"
        size="small"
        extra={
          <Space>
            <Button 
              type={activeTab === 'history' ? 'primary' : 'default'}
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => setActiveTab('history')}
            >
              历史
            </Button>
            
            {showBranchManagement && (
              <Button 
                type={activeTab === 'branches' ? 'primary' : 'default'}
                size="small"
                icon={<BranchesOutlined />}
                onClick={() => setActiveTab('branches')}
              >
                分支
              </Button>
            )}
            
            {showComparison && (
              <Button 
                type={activeTab === 'comparison' ? 'primary' : 'default'}
                size="small"
                icon={<CompareOutlined />}
                onClick={() => setActiveTab('comparison')}
              >
                比较
              </Button>
            )}
          </Space>
        }
      >
        {renderTabContent()}
      </Card>

      {/* 创建快照模态框 */}
      <Modal
        title="创建数据快照"
        open={isCreateSnapshotModalVisible}
        onOk={handleCreateSnapshot}
        onCancel={() => setIsCreateSnapshotModalVisible(false)}
        confirmLoading={versionControl.isLoading}
      >
        <Input.TextArea
          placeholder="输入提交信息..."
          value={snapshotCommitMessage}
          onChange={e => setSnapshotCommitMessage(e.target.value)}
          rows={3}
        />
      </Modal>

      {/* 创建分支模态框 */}
      <Modal
        title="创建新分支"
        open={isCreateBranchModalVisible}
        onOk={handleCreateBranch}
        onCancel={() => setIsCreateBranchModalVisible(false)}
      >
        <div style={{ marginBottom: '16px' }}>
          <label>分支名称:</label>
          <Input
            placeholder="输入分支名称..."
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            style={{ marginTop: '4px' }}
          />
        </div>
        
        <div>
          <label>描述 (可选):</label>
          <Input.TextArea
            placeholder="输入分支描述..."
            value={newBranchDescription}
            onChange={e => setNewBranchDescription(e.target.value)}
            rows={2}
            style={{ marginTop: '4px' }}
          />
        </div>
      </Modal>

      {/* 合并分支模态框 */}
      <Modal
        title="合并分支"
        open={isMergeBranchModalVisible}
        onOk={handleMergeBranch}
        onCancel={() => setIsMergeBranchModalVisible(false)}
        confirmLoading={versionControl.isLoading}
      >
        <div style={{ marginBottom: '16px' }}>
          <div>将分支 <strong>{sourceBranchForMerge}</strong> 合并到 <strong>{versionControl.currentBranch}</strong></div>
        </div>
        
        <Alert
          message="注意"
          description="合并操作将创建一个新的合并快照，此操作不可撤销。"
          type="warning"
          showIcon
        />
      </Modal>

      <style dangerouslySetInnerHTML={{__html: `
        .selected-snapshot {
          border: 2px solid #1890ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
        }
      `}} />
    </div>
  );
};

export default VersionControlPanel;