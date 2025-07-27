import React, { useState } from 'react';
import { Tree, Button, Input, Dropdown, Menu, Tooltip, Badge } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined, 
  MoreOutlined,
  SelectOutlined
} from '@ant-design/icons';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { useMultiSelect } from '../hooks/useMultiSelect';
import type { DataNode } from 'antd/es/tree';
import type { TreeProps } from 'antd/es/tree/Tree';

interface SceneTreeProps {
  onAddComponent?: () => void;
}

const SceneTree: React.FC<SceneTreeProps> = ({ onAddComponent }) => {
  const { scene, selectedComponentId, setSelectedComponentId, deleteComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      selectedComponentId: state.selectedComponentId,
      setSelectedComponentId: state.setSelectedComponentId,
      deleteComponent: state.deleteComponent,
    }))
  );
  
  // 使用多选钩子
  const { 
    isMultiSelectMode, 
    selectedIds, 
    toggleMultiSelectMode, 
    selectComponent, 
    isSelected 
  } = useMultiSelect();

  const [searchText, setSearchText] = useState('');
  
  // 构建树数据
  const buildTreeData = (): DataNode[] => {
    if (!scene) return [];
    
    // 过滤组件
    const filteredComponents = scene.components.filter(comp => 
      comp.name.toLowerCase().includes(searchText.toLowerCase())
    );
    
    // 按类型分组
    const componentsByType: Record<string, DataNode[]> = {};
    
    filteredComponents.forEach(comp => {
      if (!componentsByType[comp.type]) {
        componentsByType[comp.type] = [];
      }
      
      // 创建组件节点
      componentsByType[comp.type].push({
        key: comp.id,
        title: (
          <div className="component-node">
            <span className="component-title theme-text-primary">
              {comp.name}
            </span>
            <div className="component-actions">
              <Dropdown 
                overlay={
                  <Menu className="theme-menu">
                    <Menu.Item key="edit" icon={<EditOutlined />}>编辑</Menu.Item>
                    <Menu.Item key="hide" icon={<EyeInvisibleOutlined />}>隐藏</Menu.Item>
                    <Menu.Item 
                      key="delete" 
                      icon={<DeleteOutlined />}
                      danger
                      onClick={({ domEvent }) => {
                        domEvent.stopPropagation();
                        deleteComponent(comp.id);
                      }}
                    >
                      删除
                    </Menu.Item>
                  </Menu>
                } 
                trigger={['click']}
              >
                <Button 
                  type="text" 
                  size="small" 
                  icon={<MoreOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  className="theme-btn"
                />
              </Dropdown>
            </div>
          </div>
        ),
        isLeaf: true,
      });
    });
    
    // 创建类型组节点
    const treeData: DataNode[] = Object.entries(componentsByType).map(([type, children]) => ({
      key: `type-${type}`,
      title: (
        <span className="component-type theme-text-secondary">
          {getComponentTypeName(type)} ({children.length})
        </span>
      ),
      children,
    }));
    
    return treeData;
  };
  
  // 获取组件类型的显示名称
  const getComponentTypeName = (type: string): string => {
    switch (type) {
      case 'diaphragm_wall':
        return '地下连续墙';
      case 'pile_arrangement':
        return '桩基布置';
      case 'anchor_rod':
        return '锚杆';
      case 'excavation':
        return '开挖';
      case 'tunnel':
        return '隧道';
      default:
        return type;
    }
  };
  
  // 处理节点选择
  const handleSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    const key = selectedKeys[0]?.toString();
    
    // 忽略类型组节点的选择
    if (key && !key.startsWith('type-')) {
      selectComponent(key);
    }
  };
  
  // 处理多选
  const handleCheck: TreeProps['onCheck'] = (checkedKeys, info) => {
    // 过滤出组件节点（非类型组节点）
    const componentKeys = (checkedKeys as string[])
      .filter(key => !key.startsWith('type-'));
    
    // 更新选中的组件
    if (componentKeys.length > 0) {
      // 设置最后一个选中的组件为当前选中组件
      setSelectedComponentId(componentKeys[componentKeys.length - 1]);
    } else {
      setSelectedComponentId(null);
    }
  };

  return (
    <div className="scene-tree theme-card" style={{ height: '100%', padding: '16px' }}>
      <div className="scene-tree-header">
        <h3 className="theme-text-primary">场景树</h3>
        <div className="scene-tree-actions">
          <Tooltip title="添加组件">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="small" 
              onClick={onAddComponent}
              className="theme-btn-primary"
            />
          </Tooltip>
          <Tooltip title={isMultiSelectMode ? "退出多选模式" : "进入多选模式"}>
            <Button
              type={isMultiSelectMode ? "primary" : "default"}
              icon={<SelectOutlined />}
              size="small"
              onClick={toggleMultiSelectMode}
              className={isMultiSelectMode ? "theme-btn-primary" : "theme-btn"}
            />
          </Tooltip>
        </div>
      </div>
      
      <Input.Search
        placeholder="搜索组件..."
        allowClear
        size="small"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 8 }}
        className="theme-form"
      />
      
      {scene ? (
        isMultiSelectMode ? (
          <Tree
            checkable
            checkedKeys={selectedIds}
            onCheck={handleCheck}
            treeData={buildTreeData()}
            defaultExpandAll
            className="theme-tree"
          />
        ) : (
          <Tree
            selectedKeys={selectedComponentId ? [selectedComponentId] : []}
            onSelect={handleSelect}
            treeData={buildTreeData()}
            defaultExpandAll
            className="theme-tree"
          />
        )
      ) : (
        <div className="empty-scene theme-text-secondary">
          <p>没有加载场景</p>
        </div>
      )}
      
      <style>{`
        .scene-tree {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .scene-tree-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .scene-tree-header h3 {
          margin: 0;
        }
        
        .scene-tree-actions {
          display: flex;
          gap: 8px;
        }
        
        .component-node {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        
        .component-actions {
          visibility: hidden;
        }
        
        :global(.ant-tree-node-content-wrapper:hover .component-actions) {
          visibility: visible;
        }
        
        .empty-scene {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
        
        /* 主题相关样式 */
        :global(.theme-tree) {
          background-color: transparent;
        }
        
        :global(.theme-tree .ant-tree-node-content-wrapper) {
          transition: background-color 0.3s;
        }
        
        :global(.theme-tree .ant-tree-node-content-wrapper:hover) {
          background-color: var(--bg-tertiary);
        }
        
        :global(.theme-tree .ant-tree-node-selected) {
          background-color: var(--primary-color-outline) !important;
        }
      `}</style>
    </div>
  );
};

export default SceneTree; 