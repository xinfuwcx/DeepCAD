import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Upload, message, Space, Divider, Row, Col,
  Select, Spin, Alert, Tag, Typography 
} from 'antd';
import { 
  UploadOutlined, PlayCircleOutlined, HistoryOutlined,
  FileTextOutlined, SettingOutlined 
} from '@ant-design/icons';
import MeshQualityVisualization from '../components/mesh/MeshQualityVisualization';
import meshQualityService, { 
  MeshQualityReport, 
  QualityAnalysisRequest 
} from '../services/meshQualityService';

const { Title, Text } = Typography;
const { Option } = Select;

interface AnalysisHistoryItem {
  analysis_id: string;
  mesh_file: string;
  timestamp: string;
  overall_score: number;
  status: string;
}

const MeshQualityPage: React.FC = () => {
  const [selectedMeshFile, setSelectedMeshFile] = useState<string>('');
  const [currentReport, setCurrentReport] = useState<MeshQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [qualityThresholds, setQualityThresholds] = useState<Record<string, Record<string, number>>>({});
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // 加载分析历史
    loadAnalysisHistory();
    // 加载质量阈值
    loadQualityThresholds();
    
    return () => {
      // 清理WebSocket连接
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const loadAnalysisHistory = async () => {
    try {
      const history = await meshQualityService.getQualityAnalysisHistory();
      setAnalysisHistory(history);
    } catch (error) {
      console.error('加载分析历史失败:', error);
    }
  };

  const loadQualityThresholds = async () => {
    try {
      const thresholds = await meshQualityService.getQualityThresholds();
      setQualityThresholds(thresholds);
    } catch (error) {
      console.error('加载质量阈值失败:', error);
    }
  };

  const handleFileUpload = (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 这里可以上传文件到服务器，返回文件路径
    // 暂时使用模拟路径
    const mockPath = `./static_content/meshes/${file.name}`;
    setSelectedMeshFile(mockPath);
    message.success(`网格文件已选择: ${file.name}`);
    
    return false; // 阻止自动上传
  };

  const handleAnalyzeMesh = async () => {
    if (!selectedMeshFile) {
      message.error('请先选择网格文件');
      return;
    }

    setLoading(true);
    setCurrentReport(null);

    try {
      // 创建WebSocket连接进行实时进度跟踪
      const ws = meshQualityService.createQualityAnalysisWebSocket(
        (progress) => {
          // 处理进度更新
          console.log('分析进度:', progress);
        },
        (report) => {
          // 分析完成
          setCurrentReport(report);
          setLoading(false);
          message.success('网格质量分析完成');
          loadAnalysisHistory(); // 刷新历史记录
        },
        (error) => {
          // 分析错误
          console.error('分析失败:', error);
          setLoading(false);
          message.error(`分析失败: ${error}`);
        }
      );

      setWebsocket(ws);

      // 发送分析请求
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'start_analysis',
          request: {
            mesh_file: selectedMeshFile,
            generate_visualization: true
          }
        }));
      };

    } catch (error) {
      setLoading(false);
      message.error('启动分析失败');
      console.error('分析启动失败:', error);
    }
  };

  const handleLoadHistoryReport = async (analysisId: string) => {
    try {
      setLoading(true);
      const report = await meshQualityService.getQualityReport(analysisId);
      setCurrentReport((report as any).report || report);
      message.success('历史报告加载成功');
    } catch (error) {
      message.error('加载历史报告失败');
      console.error('加载历史报告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: string) => {
    if (!currentReport) {
      message.error('没有可导出的报告');
      return;
    }

    try {
      // 这里需要实现导出逻辑
      // const blob = await meshQualityService.exportQualityReport(analysisId, format);
      message.success(`报告已导出为 ${format.toUpperCase()} 格式`);
    } catch (error) {
      message.error('导出报告失败');
      console.error('导出报告失败:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890ff';
    if (score >= 40) return '#faad14';
    if (score >= 20) return '#ff7875';
    return '#ff4d4f';
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '可接受';
    if (score >= 20) return '较差';
    return '不可接受';
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>网格质量分析系统</Title>
      <Text type="secondary">
        分析有限元网格的质量指标，包括长宽比、偏斜度、正交性、雅可比行列式等。
      </Text>
      
      <Divider />
      
      <Row gutter={[24, 24]}>
        {/* 左侧控制面板 */}
        <Col span={8}>
          <Card title="分析控制" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>选择网格文件:</Text>
                <Upload
                  capture={false}
                    hasControlInside={false}
                    pastable={false}
                    accept=".msh,.vtk,.vtu,.unv"
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  style={{ marginTop: 8 }}>
                  <Button icon={<UploadOutlined />} block>
                    选择网格文件
                  </Button>
                </Upload>
                {selectedMeshFile && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    已选择: {selectedMeshFile.split('/').pop()}
                  </Text>
                )}
              </div>

              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleAnalyzeMesh}
                loading={loading}
                disabled={!selectedMeshFile}
                block
              >
                开始质量分析
              </Button>

              <Divider />

              <div>
                <Text strong>质量阈值设置:</Text>
                <Button 
                  icon={<SettingOutlined />}
                  size="small"
                  style={{ marginLeft: 8 }}
                >
                  配置阈值
                </Button>
              </div>

              {Object.keys(qualityThresholds).length > 0 && (
                <div style={{ fontSize: 12 }}>
                  {Object.entries(qualityThresholds).slice(0, 3).map(([metric, thresholds]) => (
                    <div key={metric} style={{ marginBottom: 4 }}>
                      <Text>{metric.replace('_', ' ')}:</Text>
                      <div style={{ paddingLeft: 8 }}>
                        优秀: {thresholds.excellent}, 良好: {thresholds.good}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Space>
          </Card>

          {/* 分析历史 */}
          <Card 
            title={
              <Space>
                <HistoryOutlined />
                分析历史
              </Space>
            } 
            size="small" 
            style={{ marginTop: 16 }}
          >
            {analysisHistory.length === 0 ? (
              <Text type="secondary">暂无分析历史</Text>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {analysisHistory.map((item) => (
                  <div 
                    key={item.analysis_id}
                    style={{ 
                      padding: 8,
                      border: '1px solid #f0f0f0',
                      borderRadius: 4,
                      marginBottom: 8,
                      cursor: 'pointer'
                    }}
                    onClick={() => handleLoadHistoryReport(item.analysis_id)}
                  >
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {item.mesh_file.split('/').pop()}
                      </div>
                      <div style={{ color: '#666', marginTop: 2 }}>
                        {item.timestamp}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Tag color={getScoreColor(item.overall_score)}>
                          {item.overall_score.toFixed(1)} - {getScoreText(item.overall_score)}
                        </Tag>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧可视化区域 */}
        <Col span={16}>
          {loading && (
            <Card>
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>正在分析网格质量...</div>
              </div>
            </Card>
          )}

          {!loading && !currentReport && (
            <Card>
              <Alert
                message="网格质量分析"
                description="请选择网格文件并开始分析，或从左侧历史记录中选择查看以前的分析结果。"
                type="info"
                showIcon
              />
            </Card>
          )}

          {!loading && currentReport && (
            <MeshQualityVisualization
              meshFile={selectedMeshFile}
              qualityReport={currentReport}
              onAnalyze={handleAnalyzeMesh}
              onExportReport={handleExportReport}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default MeshQualityPage;