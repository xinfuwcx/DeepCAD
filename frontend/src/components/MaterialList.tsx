import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Material, MaterialParameters } from '../stores/models'; // 确保模型与后端一致
import { apiClient } from '../api/client'; // 使用命名导入

const { Option } = Select;

const MaterialList: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/materials/');
      setMaterials(response.data);
    } catch (error) {
      message.error('加载材料失败');
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 组件加载时获取数据
  useEffect(() => {
    fetchMaterials();
  }, []);

  const showModal = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      form.setFieldsValue({
        name: material.name,
        type: material.type,
        // 直接使用parameters对象
        ...material.parameters
      });
    } else {
      setEditingMaterial(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(async values => {
      const materialData = {
        name: values.name,
        type: values.type,
        parameters: {
          elasticModulus: values.elasticModulus,
          poissonRatio: values.poissonRatio,
          density: values.density
        }
      };

      try {
        if (editingMaterial) {
          // 更新现有材料
          await apiClient.put(`/materials/${editingMaterial.id}`, materialData);
          message.success('材料更新成功');
        } else {
          // 添加新材料
          await apiClient.post('/materials/', materialData);
          message.success('材料添加成功');
        }
        setIsModalVisible(false);
        fetchMaterials(); // 重新获取数据
      } catch (error) {
        message.error('操作失败');
        console.error('Failed to save material:', error);
      }
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个材料吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiClient.delete(`/materials/${id}`);
          message.success('材料删除成功');
          fetchMaterials(); // 重新获取数据
        } catch (error) {
          message.error('删除失败');
          console.error('Failed to delete material:', error);
        }
      }
    });
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        switch (type) {
          case 'concrete': return '混凝土';
          case 'steel': return '钢材';
          case 'soil': return '土壤';
          default: return type;
        }
      },
      filters: [
        { text: '混凝土', value: 'concrete' },
        { text: '钢材', value: 'steel' },
        { text: '土壤', value: 'soil' },
      ],
      onFilter: (value: string | number | boolean, record: Material) => record.type === value,
    },
    {
      title: '弹性模量 (MPa)',
      dataIndex: ['parameters', 'elasticModulus'],
      key: 'elasticModulus',
      sorter: (a: Material, b: Material) => a.parameters.elasticModulus - b.parameters.elasticModulus,
    },
    {
      title: '泊松比',
      dataIndex: ['parameters', 'poissonRatio'],
      key: 'poissonRatio',
      sorter: (a: Material, b: Material) => a.parameters.poissonRatio - b.parameters.poissonRatio,
    },
    {
      title: '密度 (kg/m³)',
      dataIndex: ['parameters', 'density'],
      key: 'density',
      sorter: (a: Material, b: Material) => a.parameters.density - b.parameters.density,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Material) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
            className="theme-btn"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="theme-card" style={{ padding: '16px', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          className="theme-btn-primary"
        >
          添加材料
        </Button>
      </div>
      
      <Table 
        dataSource={materials} 
        columns={columns} 
        rowKey="id"
        loading={loading}
        className="theme-table"
        pagination={{ pageSize: 10 }}
      />
      
      <Modal
        title={editingMaterial ? "编辑材料" : "添加材料"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        destroyOnClose // 关闭时销毁表单内容
        okButtonProps={{ className: "theme-btn-primary" }}
        cancelButtonProps={{ className: "theme-btn" }}
      >
        <Form
          form={form}
          layout="vertical"
          className="theme-form"
          initialValues={{ type: 'soil' }} // 默认选择土壤
        >
          <Form.Item
            name="name"
            label="材料名称"
            rules={[{ required: true, message: '请输入材料名称' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="材料类型"
            rules={[{ required: true, message: '请选择材料类型' }]}
          >
            <Select>
              <Option value="soil">土壤</Option>
              <Option value="concrete">混凝土</Option>
              <Option value="steel">钢材</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="elasticModulus"
            label="弹性模量 (MPa)"
            rules={[{ required: true, message: '请输入弹性模量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="poissonRatio"
            label="泊松比"
            rules={[{ required: true, message: '请输入泊松比' }]}
          >
            <InputNumber min={0} max={0.5} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="density"
            label="密度 (kg/m³)"
            rules={[{ required: true, message: '请输入密度' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialList;