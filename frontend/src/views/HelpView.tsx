import React, { useState } from 'react';
import { Typography, Row, Col, Card, Tree, Input, Collapse, Button, Divider, Space, List } from 'antd';
import { 
  SearchOutlined, 
  QuestionCircleOutlined, 
  BookOutlined, 
  VideoCameraOutlined,
  FileTextOutlined,
  LinkOutlined,
  RightOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

const HelpView: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>('getting-started');

  // Sample tree data for the help topics
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
        { title: 'Mesh Refinement', key: 'mesh-refinement' },
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
        { title: 'Performance Tips', key: 'performance-tips' },
      ],
    },
  ];

  const handleSearch = (value: string) => {
    setSearchText(value);
    // In a real app, you would filter the tree data based on the search text
  };

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
              Welcome to DeepCAD, a powerful tool for structural engineering and analysis. This guide will help you get started with the basic features and workflows.
            </Paragraph>
            
            <Title level={3} style={{ color: 'white' }}>System Requirements</Title>
            <Paragraph style={{ color: 'white' }}>
              Before you begin, make sure your system meets the following requirements:
            </Paragraph>
            <ul>
              {['Windows 10 or higher / macOS 10.15 or higher / Linux (Ubuntu 20.04 or higher)', 
                '8GB RAM minimum, 16GB recommended', 
                '4-core CPU minimum', 
                'OpenGL 4.0 compatible graphics card',
                'At least 5GB of free disk space'].map((item, index) => (
                <li key={index}><Text style={{ color: 'white' }}>{item}</Text></li>
              ))}
            </ul>
            
            <Title level={3} style={{ color: 'white' }}>Quick Start Guide</Title>
            <Collapse ghost>
              <Panel header={<Text style={{ color: 'white' }}>1. Creating a New Project</Text>} key="1">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  To create a new project, click on the "New Project" button on the Dashboard or go to File > New Project. 
                  Enter a project name, select a template if desired, and click "Create".
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>2. Creating Geometry</Text>} key="2">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  Navigate to the Geometry tab to start creating your model. Use the component creation tools to add elements
                  such as piles, walls, and other structural components.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>3. Meshing</Text>} key="3">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  Once your geometry is ready, go to the Meshing tab to generate a finite element mesh. 
                  Adjust the mesh settings as needed for your analysis requirements.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>4. Running Analysis</Text>} key="4">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  In the Analysis tab, set up your boundary conditions, loads, and material properties. 
                  Click "Run Analysis" to start the simulation.
                </Paragraph>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>5. Viewing Results</Text>} key="5">
                <Paragraph style={{ color: 'white', paddingLeft: '20px' }}>
                  After the analysis is complete, go to the Results tab to view displacement, stress, and other results. 
                  Use the visualization tools to explore your data.
                </Paragraph>
              </Panel>
            </Collapse>
            
            <Divider style={{ borderColor: '#424242' }} />
            
            <Title level={3} style={{ color: 'white' }}>Video Tutorials</Title>
            <Row gutter={[16, 16]}>
              {['Introduction to DeepCAD', 'Creating Your First Model', 'Basic Analysis Workflow'].map((title, index) => (
                <Col span={8} key={index}>
                  <Card 
                    hoverable 
                    style={{ background: '#3a3a3a', borderColor: '#424242' }}
                    cover={
                      <div style={{ height: '120px', background: '#2a2a2a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <VideoCameraOutlined style={{ fontSize: '32px', color: '#aaa' }} />
                      </div>
                    }
                  >
                    <Card.Meta 
                      title={<Text style={{ color: 'white' }}>{title}</Text>} 
                      description={<Text style={{ color: '#aaa' }}>Duration: 5:30</Text>} 
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        );
      
      case 'creating-components':
        return (
          <>
            <Title level={2} style={{ color: 'white' }}>Creating Components</Title>
            <Paragraph style={{ color: 'white' }}>
              DeepCAD provides a variety of tools for creating different structural components. This guide explains how to create and configure various component types.
            </Paragraph>
            
            <Title level={3} style={{ color: 'white' }}>Available Component Types</Title>
            <List
              bordered
              style={{ backgroundColor: '#2c2c2c', borderColor: '#424242' }}
              dataSource={[
                { title: 'Pile', description: 'Vertical structural elements used to transfer loads to deeper soil layers' },
                { title: 'Diaphragm Wall', description: 'Reinforced concrete walls used for deep excavations and foundations' },
                { title: 'Anchor Rod', description: 'Tensile elements used to stabilize retaining walls and other structures' },
                { title: 'Soil Layer', description: 'Representation of soil strata with specific properties' },
                { title: 'Building Load', description: 'Simplified representation of building loads on foundations' }
              ]}
              renderItem={item => (
                <List.Item style={{ borderColor: '#424242' }}>
                  <List.Item.Meta
                    title={<Text style={{ color: 'white' }}>{item.title}</Text>}
                    description={<Text style={{ color: '#aaa' }}>{item.description}</Text>}
                  />
                </List.Item>
              )}
            />
            
            <Title level={3} style={{ color: 'white', marginTop: '24px' }}>Creating a Component</Title>
            <Paragraph style={{ color: 'white' }}>
              To create a new component:
            </Paragraph>
            <ol>
              {[
                'Navigate to the Geometry tab',
                'Click on the "Create Component" button in the toolbar',
                'Select the component type from the dropdown menu',
                'Fill in the required parameters in the component form',
                'Click "Create" to add the component to your model'
              ].map((step, index) => (
                <li key={index}><Text style={{ color: 'white' }}>{step}</Text></li>
              ))}
            </ol>
            
            <Divider style={{ borderColor: '#424242' }} />
            
            <Title level={3} style={{ color: 'white' }}>Component Parameters</Title>
            <Paragraph style={{ color: 'white' }}>
              Each component type has specific parameters that need to be configured. Here are some common parameters:
            </Paragraph>
            
            <Collapse ghost>
              <Panel header={<Text style={{ color: 'white' }}>Pile Parameters</Text>} key="pile">
                <ul style={{ color: 'white', paddingLeft: '20px' }}>
                  <li>Diameter/Width</li>
                  <li>Length</li>
                  <li>Material properties</li>
                  <li>Position (X, Y coordinates)</li>
                  <li>Orientation</li>
                </ul>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>Diaphragm Wall Parameters</Text>} key="wall">
                <ul style={{ color: 'white', paddingLeft: '20px' }}>
                  <li>Thickness</li>
                  <li>Depth</li>
                  <li>Length</li>
                  <li>Material properties</li>
                  <li>Position and orientation</li>
                </ul>
              </Panel>
              <Panel header={<Text style={{ color: 'white' }}>Soil Layer Parameters</Text>} key="soil">
                <ul style={{ color: 'white', paddingLeft: '20px' }}>
                  <li>Top and bottom elevations</li>
                  <li>Material model (e.g., Mohr-Coulomb, Hardening Soil)</li>
                  <li>Soil properties (cohesion, friction angle, etc.)</li>
                  <li>Groundwater conditions</li>
                </ul>
              </Panel>
            </Collapse>
          </>
        );
      
      default:
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column' }}>
            <QuestionCircleOutlined style={{ fontSize: '64px', color: '#aaa' }} />
            <Text style={{ color: 'white', marginTop: '16px' }}>Select a topic from the menu to view help content</Text>
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
              onSearch={handleSearch}
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
                { icon: <FileTextOutlined />, title: 'API Documentation', link: '#' },
                { icon: <LinkOutlined />, title: 'Community Forum', link: '#' },
              ]}
              renderItem={item => (
                <List.Item style={{ borderBottom: 'none' }}>
                  <Button 
                    type="text" 
                    icon={item.icon} 
                    style={{ color: '#1890ff', padding: '0' }}
                  >
                    {item.title}
                  </Button>
                </List.Item>
              )}
            />
            
            <Divider style={{ borderColor: '#424242', margin: '12px 0' }} />
            
            <Button type="primary" block>
              Contact Support
            </Button>
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