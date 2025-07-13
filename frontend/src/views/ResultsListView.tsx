import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Table, Tag, Button, Space, Input, Select, DatePicker, Tooltip } from 'antd';
import { SearchOutlined, FilterOutlined, CaretUpOutlined as SortAscendingOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ResultData {
  key: string;
  id: string;
  name: string;
  date: string;
  author: string;
  status: 'completed' | 'failed' | 'processing';
  type: string;
}

const ResultsListView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultData[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    
    // Mock data - in a real app, this would be an API call
    setTimeout(() => {
      const mockData: ResultData[] = Array(15).fill(0).map((_, index) => ({
        key: String(index),
        id: `${1000 + index}`,
        name: `Analysis Result ${1000 + index}`,
        date: new Date(Date.now() - index * 86400000).toLocaleString(),
        author: index % 3 === 0 ? 'System User' : 'Admin User',
        status: index % 5 === 0 ? 'failed' : index % 7 === 0 ? 'processing' : 'completed',
        type: index % 2 === 0 ? 'Structural Analysis' : 'Geotechnical Analysis',
      }));
      
      setResults(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="success">Completed</Tag>;
      case 'failed':
        return <Tag color="error">Failed</Tag>;
      case 'processing':
        return <Tag color="processing">Processing</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    // In a real app, you would filter the results based on the search text
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text style={{ color: 'white' }}>{text}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ResultData) => (
        <Link to={`/results/${record.id}`} style={{ color: '#1890ff' }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => <Text style={{ color: 'white' }}>{text}</Text>,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      render: (text: string) => <Text style={{ color: 'white' }}>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => <Text style={{ color: 'white' }}>{text}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ResultData) => (
        <Space size="middle">
          <Tooltip title="View">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              style={{ color: '#1890ff' }}
              onClick={() => window.location.href = `/results/${record.id}`}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="results-view">
      <div className="results-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>Analysis Results</Title>
      </div>
      
      <Card className="result-card" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6} lg={6} xl={6}>
            <Search
              placeholder="Search results"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} sm={8} md={6} lg={4} xl={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="completed">Completed</Option>
              <Option value="failed">Failed</Option>
              <Option value="processing">Processing</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6} lg={4} xl={4}>
            <Select
              placeholder="Type"
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="structural">Structural</Option>
              <Option value="geotechnical">Geotechnical</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <RangePicker style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} xl={4}>
            <Space>
              <Button icon={<FilterOutlined />}>Filter</Button>
              <Button icon={<SortAscendingOutlined />}>Sort</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      <Card className="result-card">
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" danger disabled={!hasSelected} style={{ marginRight: 8 }}>
            Delete Selected
          </Button>
          <Button disabled={!hasSelected}>
            Download Selected
          </Button>
          <span style={{ marginLeft: 8, color: 'white' }}>
            {hasSelected ? `Selected ${selectedRowKeys.length} items` : ''}
          </span>
        </div>
        <Table 
          rowSelection={rowSelection}
          columns={columns} 
          dataSource={results} 
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Total ${total} items`
          }}
          style={{ 
            backgroundColor: '#2c2c2c', 
            color: 'white' 
          }}
          className="results-list"
        />
      </Card>
    </div>
  );
};

export default ResultsListView; 