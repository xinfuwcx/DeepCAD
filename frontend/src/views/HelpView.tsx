/**
 * HelpView.tsx - 帮助文档中心
 * 
 * 功能描述:
 * - 系统帮助文档和用户指南界面
 * - 提供分层级的文档导航和内容展示
 * - 支持文档搜索和快速定位功能
 * - 集成视频教程、API文档、FAQ等多种帮助资源
 * 
 * 文档结构:
 * 1. 快速入门 - 系统介绍、安装指南、界面说明
 * 2. 功能模块 - 各个功能模块的详细使用说明
 * 3. 高级功能 - 脚本开发、API调用、插件扩展
 * 4. 故障排除 - 常见问题和解决方案
 * 5. 视频教程 - 操作演示和案例讲解
 * 
 * 主要功能:
 * - 文档树形导航
 * - 全文搜索
 * - 内容收藏
 * - 在线反馈
 * 
 * 技术特点: 分类导航、全文检索、多媒体支持
 */
import React, { useState } from 'react';
import { Typography, Row, Col, Card, Tree, Input, Collapse, Button, Divider, List } from 'antd';
import { 
  SearchOutlined, 
  QuestionCircleOutlined, 
  BookOutlined, 
  VideoCameraOutlined,
  FileTextOutlined,
  LinkOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

const HelpView: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string>('getting-started');

  const treeData: DataNode[] = [
    {
      title: 'Getting Started',
      key: 'getting-started',
      children: [
        { title: 'Introduction', key: 'introduction' },
        { title: 'Installation', key: 'installation' },
        { title: 'User Interface', key: 'user-interface' },
      ],
    },
    {
      title: 'Geometry',
      key: 'geometry',
      children: [
        { title: 'Creating Components', key: 'creating-components' },
        { title: 'Editing Geometry', key: 'editing-geometry' },
        { title: 'Importing Models', key: 'importing-models' },
      ],
    },
    {
      title: 'Meshing',
      key: 'meshing',
      children: [
        { title: 'Mesh Generation', key: 'mesh-generation' },
        { title: 'Mesh Quality', key: 'mesh-quality' },
      ],
    },
    {
      title: 'Analysis',
      key: 'analysis',
      children: [
        { title: 'Setting Up Analysis', key: 'setting-up-analysis' },
        { title: 'Running Simulations', key: 'running-simulations' },
        { title: 'Interpreting Results', key: 'interpreting-results' },
      ],
    },
    {
      title: 'Troubleshooting',
      key: 'troubleshooting',
      children: [
        { title: 'Common Issues', key: 'common-issues' },
        { title: 'Error Messages', key: 'error-messages' },
      ],
    },
  ];

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      setSelectedTopic(selectedKeys[0] as string);
    }
  };

  const renderContent = () => {
    switch (selectedTopic) {
      case 'getting-started':
        return (
          <>
            <Title level={2} className="text-primary">Getting Started with DeepCAD</Title>
            <Paragraph className="text-primary">
              Welcome to DeepCAD. This guide will help you get started.
            </Paragraph>
            
            <Title level={3} className="text-primary">System Requirements</Title>
            <ul>
              {['Windows 10 / macOS 10.15 / Linux (Ubuntu 20.04)', 
                '16GB RAM', 
                '4-core CPU', 
                'OpenGL 4.0 compatible GPU',
                '5GB disk space'].map((item, index) => (
                <li key={index}><Text className="text-primary">{item}</Text></li>
              ))}
            </ul>
            
            <Title level={3} className="text-primary">Quick Start Guide</Title>
            <Collapse 
              ghost
              items={[
                {
                  key: '1',
                  label: <Text className="text-primary">1. New Project</Text>,
                  children: (
                    <Paragraph className="text-primary pl-5">
                      Go to File {'>'} New Project.
                    </Paragraph>
                  )
                },
                {
                  key: '2', 
                  label: <Text className="text-primary">2. Geometry</Text>,
                  children: (
                    <Paragraph className="text-primary pl-5">
                      Navigate to the Geometry tab to create your model.
                    </Paragraph>
                  )
                },
                {
                  key: '3',
                  label: <Text className="text-primary">3. Meshing</Text>,
                  children: (
                    <Paragraph className="text-primary pl-5">
                      Go to the Meshing tab to generate a mesh.
                    </Paragraph>
                  )
                },
                {
                  key: '4',
                  label: <Text className="text-primary">4. Analysis</Text>,
                  children: (
                    <Paragraph className="text-primary pl-5">
                      In the Analysis tab, set up conditions and run the simulation.
                    </Paragraph>
                  )
                },
                {
                  key: '5',
                  label: <Text className="text-primary">5. Results</Text>,
                  children: (
                    <Paragraph className="text-primary pl-5">
                      View results in the Results tab.
                    </Paragraph>
                  )
                }
              ]}
            />
          </>
        );
      
      case 'creating-components':
        return (
          <>
            <Title level={2} className="text-primary">Creating Components</Title>
            <Paragraph className="text-primary">
              DeepCAD provides tools for creating various structural components.
            </Paragraph>
          </>
        );
      
      default:
        return (
          <div className="flex justify-center items-center h-96 flex-col">
            <QuestionCircleOutlined className="text-6xl text-gray-400" />
            <Text className="text-primary mt-4">Select a topic to view help content.</Text>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <Title level={2} className="text-primary mb-6">Help & Documentation</Title>
      
      <Row gutter={24}>
        <Col span={6}>
          <Card className="bg-card border-glass-border mb-4">
            <Search
              placeholder="Search help topics"
              allowClear
              enterButton={<SearchOutlined />}
              className="mb-4"
            />
            
            <Tree
              showLine={{ showLeafIcon: false }}
              defaultExpandedKeys={['getting-started']}
              defaultSelectedKeys={['getting-started']}
              treeData={treeData}
              onSelect={handleSelect}
              className="bg-transparent text-primary"
            />
          </Card>
          
          <Card className="bg-card border-glass-border">
            <Title level={4} className="text-primary">Quick Links</Title>
            <List
              size="small"
              dataSource={[
                { icon: <BookOutlined />, title: 'User Manual', link: '#' },
                { icon: <VideoCameraOutlined />, title: 'Video Tutorials', link: '#' },
                { icon: <FileTextOutlined />, title: 'API Docs', link: '#' },
                { icon: <LinkOutlined />, title: 'Community Forum', link: '#' },
              ]}
              renderItem={item => (
                <List.Item className="border-b-0">
                  <Button 
                    type="text" 
                    icon={item.icon} 
                    style={{ color: '#1890ff', padding: '0' }}
                    href={item.link}
                  >
                    {item.title}
                  </Button>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col span={18}>
          <Card style={{ background: '#2c2c2c', borderColor: '#424242', minHeight: '600px' }}>
            {renderContent()}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HelpView; 