import React, { useState, useCallback } from 'react';
import {
  Card,
  Upload,
  Button,
  Table,
  Progress,
  Space,
  Tag,
  Alert,
  Modal,
  Form,
  Select,
  Switch,
  InputNumber,
  message,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

// 批量处理文件状态
interface BatchFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  message?: string;
  processingTime?: number;
  outputFiles?: string[];
  error?: string;
}

// 批量处理选项
interface BatchProcessingOptions {
  mode: 'strict' | 'tolerant' | 'repair' | 'preview';
  coordinate_system: 'WCS' | 'UCS' | 'OCS';
  scale_factor: number;
  tolerance: number;
  output_formats: string[];
  parallel_processing: boolean;
  max_concurrent: number;
  quality_check_enabled: boolean;
  fix_geometry_issues: boolean;
  preserve_layers: boolean;
}

// 批量统计信息
interface BatchStatistics {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
  totalSize: number;
  totalTime: number;
  averageTime: number;
}

export const DXFBatchProcessor: React.FC = () => {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [batchOptions, setBatchOptions] = useState<BatchProcessingOptions>({
    mode: 'tolerant',
    coordinate_system: 'WCS',
    scale_factor: 1.0,
    tolerance: 1e-6,
    output_formats: ['geo'],
    parallel_processing: true,
    max_concurrent: 4,
    quality_check_enabled: true,
    fix_geometry_issues: true,
    preserve_layers: true
  });
  const [form] = Form.useForm();

  // 计算批量统计
  const statistics: BatchStatistics = {
    total: files.length,
    completed: files.filter(f => f.status === 'completed').length,
    failed: files.filter(f => f.status === 'failed').length,
    processing: files.filter(f => f.status === 'processing').length,
    pending: files.filter(f => f.status === 'pending').length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    totalTime: files.reduce((sum, f) => sum + (f.processingTime || 0), 0),
    averageTime: files.length > 0 ? files.reduce((sum, f) => sum + (f.processingTime || 0), 0) / files.filter(f => f.processingTime).length : 0
  };

  // 状态图标映射
  const statusIcons = {
    pending: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
    processing: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
    completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    failed: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    paused: <PauseCircleOutlined style={{ color: '#faad14' }} />
  };

  // 状态标签映射
  const statusTags = {
    pending: <Tag color="blue">等待中</Tag>,
    processing: <Tag color="green">处理中</Tag>,
    completed: <Tag color="success">已完成</Tag>,
    failed: <Tag color="error">失败</Tag>,
    paused: <Tag color="warning">暂停</Tag>
  };

  // 文件上传处理
  const handleFileUpload = useCallback((fileList: UploadFile[]) => {
    const newFiles: BatchFile[] = fileList.map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      name: file.name,
      size: file.size || 0,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    message.success(`添加了 ${newFiles.length} 个DXF文件`);
  }, []);

  // 移除文件
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    message.info('文件已移除');
  }, []);

  // 清空所有文件
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    message.info('已清空所有文件');
  }, []);

  // 开始批量处理
  const startBatchProcessing = useCallback(async () => {
    if (files.length === 0) {
      message.warning('请先添加DXF文件');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);

    try {
      // 模拟批量处理过程
      for (let i = 0; i < files.length; i++) {
        if (isPaused) break;

        const file = files[i];
        
        // 更新文件状态为处理中
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'processing', progress: 0 } : f
        ));

        // 模拟处理进度
        for (let progress = 0; progress <= 100; progress += 10) {
          if (isPaused) break;
          
          await new Promise(resolve => setTimeout(resolve, 200));
          
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ));
        }

        // 模拟处理结果
        const success = Math.random() > 0.1; // 90% 成功率
        const processingTime = Math.random() * 5 + 1; // 1-6秒

        setFiles(prev => prev.map(f => 
          f.id === file.id ? {
            ...f,
            status: success ? 'completed' : 'failed',
            progress: 100,
            processingTime: success ? processingTime : undefined,
            message: success ? '处理完成' : '处理失败',
            outputFiles: success ? batchOptions.output_formats.map(fmt => `${file.name.replace('.dxf', '')}.${fmt}`) : undefined,
            error: success ? undefined : '文件格式错误或损坏'
          } : f
        ));
      }

      setIsProcessing(false);
      message.success('批量处理完成！');

    } catch (error) {
      console.error('批量处理失败:', error);
      message.error('批量处理失败');
      setIsProcessing(false);
    }
  }, [files, batchOptions, isPaused]);

  // 暂停/恢复处理
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
    message.info(isPaused ? '已恢复处理' : '已暂停处理');
  }, [isPaused]);

  // 停止处理
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    setIsPaused(false);
    
    // 将处理中的文件状态重置为暂停
    setFiles(prev => prev.map(f => 
      f.status === 'processing' ? { ...f, status: 'paused' } : f
    ));
    
    message.info('已停止批量处理');
  }, []);

  // 重试失败的文件
  const retryFailedFiles = useCallback(() => {
    setFiles(prev => prev.map(f => 
      f.status === 'failed' ? { ...f, status: 'pending', progress: 0, error: undefined } : f
    ));
    message.info('已重置失败文件，可重新处理');
  }, []);

  // 下载所有结果
  const downloadAllResults = useCallback(() => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.outputFiles);
    if (completedFiles.length === 0) {
      message.warning('没有可下载的文件');
      return;
    }

    message.info(`开始下载 ${completedFiles.length} 个文件的处理结果`);
    // 实际项目中这里会调用批量下载API
  }, [files]);

  // 表格列定义
  const columns: ColumnsType<BatchFile> = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => statusIcons[status as keyof typeof statusIcons],
      filters: [
        { text: '等待中', value: 'pending' },
        { text: '处理中', value: 'processing' },
        { text: '已完成', value: 'completed' },
        { text: '失败', value: 'failed' },
        { text: '暂停', value: 'paused' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record) => (
        <Tooltip title={record.error || name}>
          <span style={{ color: record.status === 'failed' ? '#ff4d4f' : undefined }}>
            {name}
          </span>
        </Tooltip>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 200,
      render: (progress: number, record) => (
        <Progress 
          percent={progress} 
          size="small"
          status={record.status === 'failed' ? 'exception' : 
                 record.status === 'completed' ? 'success' : 'active'}
          format={(percent) => `${percent}%`}
        />
      )
    },
    {
      title: '处理时间',
      dataIndex: 'processingTime',
      key: 'processingTime',
      width: 100,
      render: (time?: number) => time ? `${time.toFixed(1)}s` : '-'
    },
    {
      title: '输出格式',
      dataIndex: 'outputFiles',
      key: 'outputFiles',
      width: 150,
      render: (files?: string[]) => (
        <Space size={4} wrap>
          {files?.map(file => {
            const ext = file.split('.').pop()?.toUpperCase();
            return <Tag key={file} color="blue">{ext}</Tag>;
          })}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'completed' && record.outputFiles && (
            <Tooltip title="下载结果">
              <Button 
                type="text" 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => message.info(`下载 ${record.name} 的处理结果`)}
              />
            </Tooltip>
          )}
          
          {(record.status === 'pending' || record.status === 'failed') && (
            <Tooltip title="移除文件">
              <Popconfirm 
                title="确认移除此文件？"
                onConfirm={() => removeFile(record.id)}
              >
                <Button 
                  type="text" 
                  size="small" 
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="DXF批量处理工具">
        {/* 统计信息 */}
        <Alert
          message={
            <Space size="large">
              <span>总文件: {statistics.total}</span>
              <span>已完成: {statistics.completed}</span>
              <span>失败: {statistics.failed}</span>
              <span>处理中: {statistics.processing}</span>
              <span>等待中: {statistics.pending}</span>
              {statistics.totalSize > 0 && (
                <span>总大小: {(statistics.totalSize / 1024 / 1024).toFixed(2)} MB</span>
              )}
              {statistics.averageTime > 0 && (
                <span>平均时间: {statistics.averageTime.toFixed(1)}s</span>
              )}
            </Space>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        {/* 控制栏 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Upload
            multiple
            accept=".dxf"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={({ fileList }) => handleFileUpload(fileList)}
          >
            <Button icon={<UploadOutlined />}>添加DXF文件</Button>
          </Upload>

          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={startBatchProcessing}
            disabled={isProcessing || files.length === 0}
            loading={isProcessing}
          >
            开始批量处理
          </Button>

          {isProcessing && (
            <Button 
              icon={<PauseCircleOutlined />}
              onClick={togglePause}
            >
              {isPaused ? '恢复' : '暂停'}
            </Button>
          )}

          {isProcessing && (
            <Button 
              danger
              onClick={stopProcessing}
            >
              停止
            </Button>
          )}

          <Button 
            onClick={() => setShowOptionsModal(true)}
            disabled={isProcessing}
          >
            处理设置
          </Button>

          {statistics.failed > 0 && (
            <Button 
              type="dashed"
              onClick={retryFailedFiles}
              disabled={isProcessing}
            >
              重试失败文件
            </Button>
          )}

          {statistics.completed > 0 && (
            <Button 
              type="dashed"
              icon={<DownloadOutlined />}
              onClick={downloadAllResults}
            >
              下载所有结果
            </Button>
          )}

          <Popconfirm 
            title="确认清空所有文件？"
            onConfirm={clearAllFiles}
            disabled={isProcessing}
          >
            <Button 
              danger
              type="dashed"
              icon={<DeleteOutlined />}
              disabled={isProcessing}
            >
              清空列表
            </Button>
          </Popconfirm>
        </Space>

        {/* 文件列表 */}
        <Table
          columns={columns}
          dataSource={files}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 项，共 ${total} 个文件`
          }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>

      {/* 处理选项模态框 */}
      <Modal
        title="批量处理设置"
        open={showOptionsModal}
        onCancel={() => setShowOptionsModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            setBatchOptions({ ...batchOptions, ...values });
            setShowOptionsModal(false);
            message.success('设置已保存');
          });
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={batchOptions}
        >
          <Form.Item label="处理模式" name="mode">
            <Select>
              <Option value="strict">严格模式</Option>
              <Option value="tolerant">容错模式</Option>
              <Option value="repair">修复模式</Option>
              <Option value="preview">预览模式</Option>
            </Select>
          </Form.Item>

          <Form.Item label="坐标系统" name="coordinate_system">
            <Select>
              <Option value="WCS">世界坐标系 (WCS)</Option>
              <Option value="UCS">用户坐标系 (UCS)</Option>
              <Option value="OCS">对象坐标系 (OCS)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="缩放因子" name="scale_factor">
            <InputNumber min={0.001} max={1000} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="几何容差" name="tolerance">
            <InputNumber min={1e-12} max={1e-3} step={1e-6} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="输出格式" name="output_formats">
            <Select mode="multiple">
              <Option value="geo">Gmsh几何 (.geo)</Option>
              <Option value="step">STEP文件 (.step)</Option>
              <Option value="iges">IGES文件 (.iges)</Option>
              <Option value="stl">STL网格 (.stl)</Option>
              <Option value="obj">OBJ模型 (.obj)</Option>
              <Option value="gltf">glTF模型 (.gltf)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="并行处理" name="parallel_processing" valuePropName="checked">
            <Switch checkedChildren="并行" unCheckedChildren="串行" />
          </Form.Item>

          {batchOptions.parallel_processing && (
            <Form.Item label="最大并发数" name="max_concurrent">
              <InputNumber min={1} max={8} style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Form.Item name="quality_check_enabled" valuePropName="checked" style={{ margin: 0 }}>
              <Switch checkedChildren="质量检查" unCheckedChildren="跳过检查" />
            </Form.Item>
            
            <Form.Item name="fix_geometry_issues" valuePropName="checked" style={{ margin: 0 }}>
              <Switch checkedChildren="修复几何" unCheckedChildren="保持原样" />
            </Form.Item>
            
            <Form.Item name="preserve_layers" valuePropName="checked" style={{ margin: 0 }}>
              <Switch checkedChildren="保留图层" unCheckedChildren="合并图层" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};