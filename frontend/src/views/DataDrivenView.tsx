import React, { useState, useCallback } from 'react';
import { Upload, Button, Card, Row, Col, Typography, Steps, message, Spin } from 'antd';
import { InboxOutlined, RocketOutlined, CloudOutlined as CloudUploadOutlined } from '@ant-design/icons';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const DataDrivenView: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.name.endsWith('.csv')) {
      setFile(uploadedFile);
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedData(results.data);
          message.success(`${uploadedFile.name} 文件上传并解析成功!`);
          setCurrentStep(1);
        },
        error: (err) => {
          message.error(`文件解析失败: ${err.message}`);
        },
      });
    } else {
      message.error('请上传有效的CSV文件。');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const handleGenerateModel = async () => {
    if (!parsedData.length) {
      message.error('没有可用于生成模型的数据。');
      return;
    }
    setIsLoading(true);
    setCurrentStep(2);
    // 模拟后端API调用
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setCurrentStep(3);
    message.success('地质模型已成功生成!');
  };

  return (
    <div className="data-driven-view fade-in" style={{ padding: '24px' }}>
      <Title level={2}>数据驱动的地质建模</Title>
      <Paragraph>
        通过上传标准格式的地质勘探数据（如钻孔数据CSV文件），系统将自动为您构建三维地质模型。
      </Paragraph>

      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        <Step title="上传数据" description="上传CSV格式的地质数据。" />
        <Step title="预览与确认" description="检查解析后的数据。" />
        <Step title="生成模型" description="系统自动构建三维地质体。" />
        <Step title="完成" description="模型已在场景中可用。" />
      </Steps>

      <Row gutter={16}>
        <Col span={24}>
          {currentStep === 0 && (
            <Card>
              <div
                {...getRootProps()}
                style={{
                  border: `2px dashed ${isDragActive ? '#1890ff' : '#d9d9d9'}`,
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.3s',
                }}
              >
                <input {...getInputProps()} />
                <p style={{ fontSize: '48px', color: '#1890ff' }}>
                  <CloudUploadOutlined />
                </p>
                <p>拖拽CSV文件到此区域，或点击选择文件</p>
                <Text type="secondary">仅支持.csv格式</Text>
              </div>
            </Card>
          )}

          {currentStep >= 1 && (
            <Card title="数据预览与操作">
              <Paragraph>文件名: <Text strong>{file?.name}</Text></Paragraph>
              <Paragraph>共解析出 <Text strong>{parsedData.length}</Text> 条数据记录。</Paragraph>
              <Button
                type="primary"
                icon={<RocketOutlined />}
                onClick={handleGenerateModel}
                disabled={isLoading || currentStep > 2}
                loading={isLoading}
              >
                {isLoading ? '正在生成模型...' : '生成地质模型'}
              </Button>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DataDrivenView; 