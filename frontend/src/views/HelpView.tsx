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
            <Title level={2} style={{ color: 'white' }}>Getting Started with DeepCAD</Title>
            <Paragraph style={{ color: 'white' }}>
              Welcome to DeepCAD. This guide will help you get started.
            </Paragraph>
            
            <Title level={3} style={{ color: 'white' }}>System Requirements</Title>
            <ul>
              {['Windows 10 / macOS 10.15 / Linux (Ubuntu 20.04)', 
                '16GB RAM', 
                '4-core CPU', 
                'OpenGL 4.0 compatible GPU',
                '5GB disk space'].map((item, index) => (
                <li key={index}><Text style={{ color: 'white' }}>{item}</Text></li>
              ))}
            </ul>
            
            <Title level={3} style={{ color: 'white' }}>Quick Start Guide</Title>
            <Collapse ghost>
              <Panel header={<Text style={{ color: 'white' }}>1. New Project</Text>} key="1">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  Go to File {'>'} New Project.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>2. Geometry</Text>} key="2">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  Navigate to the Geometry tab to create your model.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>3. Meshing</Text>} key="3">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  Go to the Meshing tab to generate a mesh.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>4. Analysis</Text>} key="4">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  In the Analysis tab, set up conditions and run the simulation.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>5. Results</Text>} key="5">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  View results in the Results tab.
                </Paragraph>
              </Panel>
            </Collapse>
          </>
        );
      
      case 'creating-components':
        return (
          <>
            <Title level={2} style={{ color: 'white' }}>Creating Components</Title>
            <Paragraph style={{ color: 'white' }}>
              DeepCAD provides tools for creating various structural components.
            </Paragraph>
          </>
        );
      
      default:
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column' }}>
            <QuestionCircleOutlined style={{ fontSize: '64px', color: '#aaa' }} />
            <Text style={{ color: 'white', marginTop: '16px' }}>Select a topic to view help content.</Text>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>Help & Documentation</Title>
      
      <Row gutter={24}>
        <Col span={6}>
          <Card style={{ background: '#2c2c2c', borderColor: '#424242', marginBottom: '16px' }}>
            <Search
              placeholder="Search help topics"
              allowClear
              enterButton={<SearchOutlined />}
              style={{ marginBottom: '16px' }}
            />
            
            <Tree
              showLine={{ showLeafIcon: false }}
              defaultExpandedKeys={['getting-started']}
              defaultSelectedKeys={['getting-started']}
              treeData={treeData}
              onSelect={handleSelect}
              style={{ background: 'transparent', color: 'white' }}
            />
          </Card>
          
          <Card style={{ background: '#2c2c2c', borderColor: '#424242' }}>
            <Title level={4} style={{ color: 'white' }}>Quick Links</Title>
            <List
              size="small"
              dataSource={[
                { icon: <BookOutlined />, title: 'User Manual', link: '#' },
                { icon: <VideoCameraOutlined />, title: 'Video Tutorials', link: '#' },
                { icon: <FileTextOutlined />, title: 'API Docs', link: '#' },
                { icon: <LinkOutlined />, title: 'Community Forum', link: '#' },
              ]}
              renderItem={item => (
                <List.Item style={{ borderBottom: 'none' }}>
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