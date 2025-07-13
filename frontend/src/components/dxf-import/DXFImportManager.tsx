import React, { useState, useCallback } from 'react';
import {
  Upload,
  Button,
  Card,
  Progress,
  Alert,
  Table,
  Space,
  Tag,
  Tooltip,
  Modal,
  Select,
  Row,
  Col,
  Divider,
  Typography,
  Spin,
  notification
} from 'antd';
import {
  InboxOutlined,
  FileSearchOutlined,
  SettingOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { useDXFImport } from '../../hooks/useDXFImport';
import { DXFProcessingOptionsForm } from './DXFProcessingOptionsForm';
import { DXFAnalysisViewer } from './DXFAnalysisViewer';
import { DXFQualityReport } from './DXFQualityReport';
import type { 
  DXFImportTask, 
  DXFProcessingOptions,
  DXFFileStatus,
  DXFAnalysisResult 
} from '../../types/dxf';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

export const DXFImportManager: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<DXFProcessingOptions>({
    mode: 'TOLERANT',
    coordinate_system: 'WCS',
    scale_factor: 1.0,
    unit_conversion: 'METER',
    merge_duplicate_points: true,
    tolerance: 1e-6,
    repair_invalid_geometry: true,
    layer_filter: [],
    entity_filter: []
  });

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DXFImportTask | null>(null);

  const {
    tasks,
    uploadFile,
    getAnalysis,
    getQualityReport,
    deleteTask,
    refreshStatus,
    isLoading
  } = useDXFImport();

  // 文件上传处理
  const handleUpload: UploadProps['customRequest'] = useCallback(async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    try {
      await uploadFile(file as File, selectedOptions, (progress) => {
        onProgress?.({ percent: progress });
      });
      onSuccess?.('上传成功');
      notification.success({
        message: '文件上传成功',
        description: '正在分析DXF文件内容...'
      });
    } catch (error: any) {
      onError?.(error);
      notification.error({
        message: '上传失败',
        description: error.message || '文件上传过程中发生错误'
      });
    }
  }, [uploadFile, selectedOptions]);

  // 获取状态标签颜色
  const getStatusColor = (status: DXFFileStatus): string => {
    const colors = {
      PENDING: 'default',
      ANALYZING: 'processing',
      PROCESSING: 'processing', 
      COMPLETED: 'success',
      FAILED: 'error'
    };
    return colors[status] || 'default';
  };

  // 获取状态图标
  const getStatusIcon = (status: DXFFileStatus): React.ReactNode => {
    const icons = {
      PENDING: <SyncOutlined />,
      ANALYZING: <SyncOutlined spin />,
      PROCESSING: <SyncOutlined spin />,
      COMPLETED: <CheckCircleOutlined />,
      FAILED: <CloseCircleOutlined />
    };
    return icons[status] || <SyncOutlined />;
  };

  // 查看分析结果
  const handleViewAnalysis = async (task: DXFImportTask) => {
    try {
      const analysis = await getAnalysis(task.import_id);
      setSelectedTask({ ...task, analysis });
      setShowAnalysisModal(true);
    } catch (error: any) {
      notification.error({
        message: '获取分析结果失败',
        description: error.message
      });
    }
  };

  // 查看质量报告
  const handleViewQuality = async (task: DXFImportTask) => {
    try {
      const qualityReport = await getQualityReport(task.import_id);
      setSelectedTask({ ...task, qualityReport });
      setShowQualityModal(true);
    } catch (error: any) {
      notification.error({
        message: '获取质量报告失败',
        description: error.message
      });
    }
  };

  // 删除任务
  const handleDelete = async (importId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个DXF导入任务吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteTask(importId);
          notification.success({
            message: '删除成功',
            description: 'DXF导入任务已删除'
          });
        } catch (error: any) {
          notification.error({
            message: '删除失败',
            description: error.message
          });
        }
      }
    });
  };

  // 表格列定义
  const columns: ColumnType<DXFImportTask>[] = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (filename: string) => (
        <Tooltip title={filename}>
          <Text code>{filename}</Text>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: DXFFileStatus) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status === 'PENDING' && '等待中'}
          {status === 'ANALYZING' && '分析中'}
          {status === 'PROCESSING' && '处理中'}
          {status === 'COMPLETED' && '已完成'}
          {status === 'FAILED' && '失败'}
        </Tag>
      )
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: DXFImportTask) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'FAILED' ? 'exception' : 'active'}
          showInfo={progress > 0}
        />
      )
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      }
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: DXFImportTask) => (
        <Space size="small">
          <Tooltip title="查看分析结果">
            <Button
              type="text"
              size="small"
              icon={<FileSearchOutlined />}
              disabled={record.status !== 'COMPLETED'}
              onClick={() => handleViewAnalysis(record)}
            />
          </Tooltip>
          
          <Tooltip title="质量报告">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              disabled={record.status !== 'COMPLETED'}
              onClick={() => handleViewQuality(record)}
            />
          </Tooltip>
          
          <Tooltip title="刷新状态">
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined />}
              onClick={() => refreshStatus(record.import_id)}
            />
          </Tooltip>
          
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.import_id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="dxf-import-manager">
      <Card>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <div className="flex justify-between items-center">
              <Title level={3}>DXF文件导入管理</Title>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowOptionsModal(true)}
              >
                处理选项
              </Button>
            </div>
          </Col>
          
          <Col span={24}>
            <Dragger
              name="file"
              multiple={false}
              accept=".dxf"
              customRequest={handleUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                点击或拖拽DXF文件到此区域上传
              </p>
              <p className="ant-upload-hint">
                支持AutoCAD DXF R12-R2018版本，最大文件大小100MB
              </p>
            </Dragger>
          </Col>
          
          {/* 处理选项摘要 */}
          <Col span={24}>
            <Alert
              message="当前处理选项"
              description={
                <Space wrap>
                  <Tag>模式: {selectedOptions.mode}</Tag>
                  <Tag>坐标系: {selectedOptions.coordinate_system}</Tag>
                  <Tag>缩放: {selectedOptions.scale_factor}x</Tag>
                  <Tag>单位: {selectedOptions.unit_conversion}</Tag>
                  {selectedOptions.repair_invalid_geometry && (
                    <Tag color="blue">自动修复</Tag>
                  )}
                  {selectedOptions.merge_duplicate_points && (
                    <Tag color="green">合并重复点</Tag>
                  )}
                </Space>
              }
              type="info"
              showIcon
            />
          </Col>
          
          <Col span={24}>
            <Divider>导入任务列表</Divider>
            <Spin spinning={isLoading}>
              <Table
                columns={columns}
                dataSource={tasks}
                rowKey="import_id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 个任务`
                }}
                locale={{
                  emptyText: '暂无导入任务'
                }}
              />
            </Spin>
          </Col>
        </Row>
      </Card>

      {/* 处理选项配置模态框 */}
      <Modal
        title="DXF处理选项配置"
        open={showOptionsModal}
        onCancel={() => setShowOptionsModal(false)}
        footer={null}
        width={700}
      >
        <DXFProcessingOptionsForm
          initialOptions={selectedOptions}
          onSave={(options) => {
            setSelectedOptions(options);
            setShowOptionsModal(false);
            notification.success({
              message: '配置已保存',
              description: '新的处理选项将应用于后续上传的文件'
            });
          }}
          onCancel={() => setShowOptionsModal(false)}
        />
      </Modal>

      {/* 分析结果查看模态框 */}
      <Modal
        title="DXF分析结果"
        open={showAnalysisModal}
        onCancel={() => setShowAnalysisModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowAnalysisModal(false)}>
            关闭
          </Button>
        ]}
        width={900}
      >
        {selectedTask?.analysis && (
          <DXFAnalysisViewer analysis={selectedTask.analysis} />
        )}
      </Modal>

      {/* 质量报告查看模态框 */}
      <Modal
        title="DXF质量报告"
        open={showQualityModal}
        onCancel={() => setShowQualityModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowQualityModal(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedTask?.qualityReport && (
          <DXFQualityReport report={selectedTask.qualityReport} />
        )}
      </Modal>
    </div>
  );
};

export default DXFImportManager;