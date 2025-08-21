import React, { useState } from 'react';
import { Drawer, Tabs, Button, Space, Table, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import styles from './SystemManagementDrawer.module.css';

interface SystemManagementDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Mock datasets
const mockUnits = [
  { id: 'u1', name: '市政集团', parent: '-', level: '集团' },
  { id: 'u2', name: '一公司', parent: '市政集团', level: '子公司' }
];

const mockProjects = [
  { id: 'p1', name: 'CBD地铁站基坑', city: '北京', status: 'active' },
  { id: 'p2', name: '中心广场地下空间', city: '上海', status: 'planning' }
];

const mockRoles = [
  { id: 'r1', name: '管理员', perms: ['全部'] },
  { id: 'r2', name: '项目经理', perms: ['项目管理', '传感器查看'] }
];

const mockUsers = [
  { id: 'a1', username: 'admin', role: '管理员' },
  { id: 'a2', username: 'pm_001', role: '项目经理' }
];

const mockSensors = [
  { id: 's1', name: '沉降计#01', type: '沉降', freq: '10min' },
  { id: 's2', name: '位移计#03', type: '位移', freq: '5min' }
];

const SystemManagementDrawer: React.FC<SystemManagementDrawerProps> = ({ open, onClose }) => {
  const [units, setUnits] = useState(mockUnits);
  const [projects, setProjects] = useState(mockProjects);
  const [roles, setRoles] = useState(mockRoles);
  const [users, setUsers] = useState(mockUsers);
  const [sensors, setSensors] = useState(mockSensors);

  // Unit columns
  const unitColumns = [
    { title: '单位名称', dataIndex: 'name' },
    { title: '上级单位', dataIndex: 'parent' },
    { title: '级别', dataIndex: 'level' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => message.info(`编辑单位 ${record.name}`)}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => setUnits(prev => prev.filter(u => u.id !== record.id))}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Project columns
  const projectColumns = [
    { title: '项目名称', dataIndex: 'name' },
    { title: '城市', dataIndex: 'city' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v==='active'?'green':v==='planning'?'blue': 'default'}>{v}</Tag> },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => setProjects(prev => prev.filter(p => p.id !== record.id))}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Role columns
  const roleColumns = [
    { title: '角色名称', dataIndex: 'name' },
    { title: '权限', dataIndex: 'perms', render: (arr: string[]) => arr.map(a => <Tag key={a}>{a}</Tag>) },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>配置权限</Button>
          <Popconfirm title="确认删除?" onConfirm={() => setRoles(prev => prev.filter(r => r.id !== record.id))}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // User columns
  const userColumns = [
    { title: '账号', dataIndex: 'username' },
    { title: '角色', dataIndex: 'role' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>重置密码</Button>
          <Popconfirm title="确认删除?" onConfirm={() => setUsers(prev => prev.filter(u => u.id !== record.id))}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Sensor columns
  const sensorColumns = [
    { title: '传感器', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type' },
    { title: '采集频率', dataIndex: 'freq' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>配置</Button>
          <Popconfirm title="确认删除?" onConfirm={() => setSensors(prev => prev.filter(s => s.id !== record.id))}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const tabItems = [
    {
      key: 'units',
      label: '单位管理',
      children: (
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <strong>管理单位基础信息及上下级单位</strong>
              <div className={styles.note}>支持创建、编辑、删除、挂接上级单位</div>
            </div>
            <div className={styles.toolbar}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={()=> message.success('新建单位')}>新建单位</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={()=> message.success('已刷新')}>刷新</Button>
            </div>
          </div>
          <Table rowKey="id" size="small" columns={unitColumns as any} dataSource={units} pagination={{ pageSize: 6 }} />
        </div>
      )
    },
    {
      key: 'projects',
      label: '项目管理',
      children: (
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <strong>管理项目基础信息</strong>
              <div className={styles.note}>名称、位置、状态、负责人等字段</div>
            </div>
            <div className={styles.toolbar}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={()=> message.success('新建项目')}>新建项目</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={()=> message.success('已刷新')}>刷新</Button>
            </div>
          </div>
          <Table rowKey="id" size="small" columns={projectColumns as any} dataSource={projects} pagination={{ pageSize: 6 }} />
        </div>
      )
    },
    {
      key: 'roles',
      label: '角色管理',
      children: (
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <strong>配置权限</strong>
              <div className={styles.note}>按模块授权，如项目管理、传感器管理等</div>
            </div>
            <div className={styles.toolbar}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={()=> message.success('新建角色')}>新建角色</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={()=> message.success('已刷新')}>刷新</Button>
            </div>
          </div>
          <Table rowKey="id" size="small" columns={roleColumns as any} dataSource={roles} pagination={{ pageSize: 6 }} />
        </div>
      )
    },
    {
      key: 'users',
      label: '用户管理',
      children: (
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <strong>维护用户账号、密码、角色</strong>
              <div className={styles.note}>支持重置密码、调整角色、禁用启用等</div>
            </div>
            <div className={styles.toolbar}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={()=> message.success('新建用户')}>新建用户</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={()=> message.success('已刷新')}>刷新</Button>
            </div>
          </div>
          <Table rowKey="id" size="small" columns={userColumns as any} dataSource={users} pagination={{ pageSize: 6 }} />
        </div>
      )
    },
    {
      key: 'sensors',
      label: '传感器管理',
      children: (
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <strong>传感器基础参数配置</strong>
              <div className={styles.note}>采集频率、报警阈值、标定参数</div>
            </div>
            <div className={styles.toolbar}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={()=> message.success('新增传感器')}>新增传感器</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={()=> message.success('已刷新')}>刷新</Button>
            </div>
          </div>
          <Table rowKey="id" size="small" columns={sensorColumns as any} dataSource={sensors} pagination={{ pageSize: 6 }} />
        </div>
      )
    }
  ];

  return (
    <Drawer
      title="系统管理"
      placement="right"
      width={900}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <div className={styles.root}>
        <Tabs
          defaultActiveKey="projects"
          items={tabItems as any}
        />
      </div>
    </Drawer>
  );
};

export default SystemManagementDrawer;
