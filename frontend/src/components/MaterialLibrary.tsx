import React, { useState } from 'react';
import { Modal, Button, List, Form, Input, Select, message, Popconfirm } from 'antd';
import { useSceneStore, Material } from '../stores/useSceneStore';

interface MaterialLibraryProps {
  visible: boolean;
  onClose: () => void;
}

const MaterialLibrary: React.FC<MaterialLibraryProps> = ({ visible, onClose }) => {
  const { scene, addMaterial, deleteMaterial } = useSceneStore();
  const [form] = Form.useForm();
  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleAddMaterial = (values: Omit<Material, 'id'>) => {
    addMaterial(values).then(success => {
      if (success) {
        message.success('Material added successfully');
        setIsFormVisible(false);
        form.resetFields();
      } else {
        message.error('Failed to add material');
      }
    });
  };

  const handleDeleteMaterial = (materialId: string) => {
    deleteMaterial(materialId).then(success => {
      if (success) {
        message.success('Material deleted');
      } else {
        message.error('Failed to delete material');
      }
    });
  };

  return (
    <>
      <Modal
        title="Material Library"
        visible={visible}
        onCancel={onClose}
        footer={[
          <Button key="add" type="primary" onClick={() => setIsFormVisible(true)}>
            Add New Material
          </Button>,
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ]}
        width={600}
      >
        <List
          dataSource={scene?.materials || []}
          renderItem={item => (
            <List.Item
              actions={[
                <Popconfirm
                  title="Are you sure you want to delete this material?"
                  onConfirm={() => handleDeleteMaterial(item.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="link" danger>Delete</Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={`Type: ${item.type}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="Add New Material"
        visible={isFormVisible}
        onCancel={() => setIsFormVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleAddMaterial} layout="vertical">
          <Form.Item name="name" label="Material Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Material Type" initialValue="Soil" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Soil">Soil</Select.Option>
              <Select.Option value="Concrete">Concrete</Select.Option>
              <Select.Option value="Steel">Steel</Select.Option>
            </Select>
          </Form.Item>
          {/* For simplicity, parameters are not editable in this form for now */}
        </Form>
      </Modal>
    </>
  );
};

export default MaterialLibrary; 