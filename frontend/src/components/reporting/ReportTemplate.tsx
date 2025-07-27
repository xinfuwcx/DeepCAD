import React from 'react';
import { Row, Col, Card, Typography, Descriptions, Table } from 'antd';
import { useSceneStore } from '../../stores/useSceneStore';
import { useResultsStore } from '../../stores/useResultsStore';
import './ReportTemplate.css';

const { Title, Text, Paragraph } = Typography;

interface ReportTemplateProps {
  viewportImage: string | null;
  legendImage: string | null;
}

const ReportTemplate: React.FC<ReportTemplateProps> = React.forwardRef(({
  viewportImage,
  legendImage
}, ref: React.Ref<HTMLDivElement>) => {
  const scene = useSceneStore(state => state.scene);
  const { currentResult, contour } = useResultsStore(state => ({
    currentResult: state.currentResult,
    contour: state.contour
  }));

  const materialColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '弹性模量 (E)', dataIndex: 'elastic_modulus', key: 'elastic_modulus' },
    { title: '泊松比 (ν)', dataIndex: 'poisson_ratio', key: 'poisson_ratio' },
  ];

  return (
    <div className="report-container" ref={ref}>
      <header className="report-header">
        <Title level={2}>分析计算报告</Title>
        <Text type="secondary">生成日期: {new Date().toLocaleDateString()}</Text>
      </header>
      
      <main>
        <Card title="1. 项目概况" bordered={false} className="report-card">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="项目名称">{scene?.name || '未命名项目'}</Descriptions.Item>
            <Descriptions.Item label="分析类型">{currentResult?.type || '通用静力分析'}</Descriptions.Item>
            <Descriptions.Item label="作者">{currentResult?.author || '默认用户'}</Descriptions.Item>
            <Descriptions.Item label="分析日期">{currentResult ? new Date(currentResult.date).toLocaleDateString() : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="项目描述" span={2}>{'description' in (scene || {}) ? (scene as any).description : '无'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="2. 计算模型与结果" bordered={false} className="report-card">
          <Paragraph>下图展示了分析模型的计算结果云图。</Paragraph>
          <Row justify="center" align="middle" style={{ margin: '20px 0' }}>
            <Col span={24} style={{ textAlign: 'center' }}>
              {viewportImage ? (
                <img src={viewportImage} alt="Viewport Snapshot" style={{ maxWidth: '100%', border: '1px solid #f0f0f0' }}/>
              ) : (
                <div className="report-placeholder">3D 视图截图中...</div>
              )}
            </Col>
          </Row>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="结果场">{contour.variable}</Descriptions.Item>
            <Descriptions.Item label="分量">{contour.component}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="3. 材料属性" bordered={false} className="report-card">
          <Table
            dataSource={scene?.materials}
            columns={materialColumns}
            pagination={false}
            size="small"
            rowKey="id"
          />
        </Card>
      </main>
      
      <footer className="report-footer">
        <Text type="secondary">DeepCAD - 智能岩土工程分析平台</Text>
      </footer>
    </div>
  );
});

export default ReportTemplate; 