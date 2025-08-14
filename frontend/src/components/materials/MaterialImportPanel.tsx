import React, { useState } from 'react';
import {
  Modal, Upload, Button, Steps, Table, Alert, message, 
  Card, Row, Col, Progress, Typography, Space, Divider,
  Tag, Descriptions, Collapse
} from 'antd';
import {
  UploadOutlined, CheckOutlined, ExclamationCircleOutlined,
  FileExcelOutlined, DatabaseOutlined, BulbOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface MaterialImportPanelProps {
  visible: boolean;
  onCancel: () => void;
  onImportComplete: (materials: any[]) => void;
}

interface ParsedMaterial {
  name: string;
  material_type: string;
  properties: Record<string, number>;
  source: string;
  valid: boolean;
  errors?: string[];
}

const MaterialImportPanel: React.FC<MaterialImportPanelProps> = ({
  visible,
  onCancel,
  onImportComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsedMaterials, setParsedMaterials] = useState<ParsedMaterial[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);

  // 材料参数模板信息
  const materialTemplate = {
    required_columns: [
      { name: '名称', description: '材料名称', example: '粘土' },
      { name: '弹性模量', description: '弹性模量 (MPa)', example: '50' },
      { name: '泊松比', description: '泊松比', example: '0.35' },
      { name: '密度', description: '密度 (kg/m³)', example: '1800' }
    ],
    optional_columns: [
      { name: '粘聚力', description: '粘聚力 (kPa)', example: '20' },
      { name: '内摩擦角', description: '内摩擦角 (度)', example: '25' },
      { name: '渗透系数', description: '渗透系数 (m/s)', example: '1e-8' },
      { name: '抗压强度', description: '抗压强度 (MPa)', example: '30' },
      { name: '抗拉强度', description: '抗拉强度 (MPa)', example: '2.4' }
    ]
  };

  const handleFileUpload: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);
  };

  const validateFile = async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的Excel文件');
      return;
    }

    setUploading(true);
    setCurrentStep(1);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);

      const response = await fetch('/api/materials/validate-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.valid) {
        setParsedMaterials(result.preview || []);
        setCurrentStep(2);
        message.success(`文件验证成功，找到 ${result.material_count} 个材料参数`);
      } else {
        message.error(`文件验证失败: ${result.error}`);
        setCurrentStep(0);
      }
    } catch (error) {
      message.error('文件验证过程发生错误');
      setCurrentStep(0);
    } finally {
      setUploading(false);
    }
  };

  const importMaterials = async () => {
    if (fileList.length === 0) return;

    setUploading(true);
    setCurrentStep(3);
    setImportProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);

      const response = await fetch('/api/materials/import-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      setImportProgress(100);
      setImportResults(result);
      setCurrentStep(4);

      if (result.imported_count > 0) {
        message.success(`成功导入 ${result.imported_count} 个材料参数`);
        onImportComplete(result.materials || []);
      } else {
        message.warning('没有材料参数被导入');
      }
    } catch (error) {
      message.error('材料导入过程发生错误');
      setCurrentStep(2);
    } finally {
      setUploading(false);
    }
  };

  const resetImport = () => {
    setCurrentStep(0);
    setFileList([]);
    setParsedMaterials([]);
    setImportProgress(0);
    setImportResults(null);
  };

  const renderUploadStep = () => (
    <Card title="选择Excel文件" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Upload.Dragger
            fileList={fileList}
            onChange={handleFileUpload}
            beforeUpload={() => false}
            accept=".xlsx,.xls"
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽上传Excel文件</p>
            <p className="ant-upload-hint">
              支持 .xlsx 和 .xls 格式文件
            </p>
          </Upload.Dragger>
        </Col>
        <Col span={12}>
          <Card title="Excel模板格式" size="small">
            <Collapse size="small">
              <Panel header="必需列" key="required">
                {materialTemplate.required_columns.map((col, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Tag color="red">{col.name}</Tag>
                    <Text type="secondary"> - {col.description}</Text>
                    <br />
                    <Text type="success">示例: {col.example}</Text>
                  </div>
                ))}
              </Panel>
              <Panel header="可选列" key="optional">
                {materialTemplate.optional_columns.map((col, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Tag color="blue">{col.name}</Tag>
                    <Text type="secondary"> - {col.description}</Text>
                    <br />
                    <Text type="success">示例: {col.example}</Text>
                  </div>
                ))}
              </Panel>
            </Collapse>
          </Card>
        </Col>
      </Row>
    </Card>
  );

  const renderValidationStep = () => (
    <Card title="验证文件格式" style={{ marginBottom: 16 }}>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <FileExcelOutlined 
          style={{ fontSize: 64, color: uploading ? '#1890ff' : '#52c41a' }} 
          spin={uploading}
        />
        <Title level={4} style={{ marginTop: 16 }}>
          {uploading ? '正在验证文件...' : '文件验证完成'}
        </Title>
        {!uploading && parsedMaterials.length > 0 && (
          <Paragraph>
            找到 {parsedMaterials.length} 个有效的材料参数
          </Paragraph>
        )}
      </div>
    </Card>
  );

  const renderPreviewStep = () => (
    <Card title="材料参数预览" style={{ marginBottom: 16 }}>
      <Alert
        message="预览前3个材料参数"
        description="请检查解析的参数是否正确，确认无误后点击开始导入"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      {parsedMaterials.slice(0, 3).map((material, index) => (
        <Card key={index} size="small" style={{ marginBottom: 12 }}>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="材料名称">
              <Tag color="blue">{material.name}</Tag>
            </Descriptions.Item>
          </Descriptions>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <Row gutter={16}>
            {Object.entries(material.properties).map(([key, value]) => (
              <Col span={8} key={key}>
                <Text strong>{key}: </Text>
                <Text>{value}</Text>
              </Col>
            ))}
          </Row>
        </Card>
      ))}
    </Card>
  );

  const renderImportStep = () => (
    <Card title="导入材料参数" style={{ marginBottom: 16 }}>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <DatabaseOutlined 
          style={{ fontSize: 64, color: '#1890ff' }} 
          spin={uploading}
        />
        <Title level={4} style={{ marginTop: 16 }}>
          {uploading ? '正在导入材料参数...' : '导入完成'}
        </Title>
        
        {uploading && (
          <Progress 
            percent={importProgress} 
            style={{ marginTop: 16, maxWidth: 300 }}
          />
        )}
      </div>
    </Card>
  );

  const renderResultsStep = () => (
    <Card title="导入结果" style={{ marginBottom: 16 }}>
      {importResults && (
        <>
          <Alert
            message={`导入完成: 成功导入 ${importResults.imported_count} 个材料参数`}
            description={`共找到 ${importResults.total_found} 个材料，成功导入 ${importResults.imported_count} 个`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          {importResults.errors && importResults.errors.length > 0 && (
            <Alert
              message="部分材料导入失败"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {importResults.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Button type="primary" onClick={() => {
            resetImport();
            onCancel();
          }}>
            完成
          </Button>
        </>
      )}
    </Card>
  );

  const steps = [
    {
      title: '选择文件',
      content: renderUploadStep(),
      icon: <UploadOutlined />
    },
    {
      title: '验证格式',
      content: renderValidationStep(),
      icon: <CheckOutlined />
    },
    {
      title: '预览数据',
      content: renderPreviewStep(),
      icon: <InfoCircleOutlined />
    },
    {
      title: '导入数据',
      content: renderImportStep(),
      icon: <DatabaseOutlined />
    },
    {
      title: '导入完成',
      content: renderResultsStep(),
      icon: <BulbOutlined />
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined />
          Excel材料参数导入
        </Space>
      }
      open={visible}
      onCancel={() => {
        resetImport();
        onCancel();
      }}
      width={900}
      footer={
        <Space>
          <Button onClick={() => {
            resetImport();
            onCancel();
          }}>
            关闭
          </Button>
          
          {currentStep === 0 && fileList.length > 0 && (
            <Button type="primary" onClick={validateFile} loading={uploading}>
              验证文件
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button type="primary" onClick={importMaterials} loading={uploading}>
              开始导入
            </Button>
          )}
          
          {currentStep < 4 && currentStep > 0 && (
            <Button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}>
              上一步
            </Button>
          )}
        </Space>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            icon={step.icon}
            status={
              index < currentStep ? 'finish' : 
              index === currentStep ? 'process' : 
              'wait'
            }
          />
        ))}
      </Steps>

      {steps[currentStep]?.content}
    </Modal>
  );
};

export default MaterialImportPanel;