import React, { useState } from 'react';
import { Card, Button, Typography } from 'antd';
import { 
  ExpandOutlined, 
  CompressOutlined, 
  CloseOutlined,
  DragOutlined
} from '@ant-design/icons';

const { Title } = Typography;

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  defaultFloating?: boolean;
  onClose?: () => void;
  width?: number;
  height?: number;
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  defaultCollapsed = false,
  defaultFloating = false,
  onClose,
  width = 320,
  height = 400
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [floating, setFloating] = useState(defaultFloating);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!floating) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !floating) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  React.useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, dragOffset]);

  const panelStyle: React.CSSProperties = {
    width: width,
    height: collapsed ? 'auto' : height,
    transition: 'all 0.3s ease',
    ...(floating ? {
      position: 'fixed',
      top: position.y,
      left: position.x,
      zIndex: 1000,
      cursor: dragging ? 'grabbing' : 'grab'
    } : {})
  };

  return (
    <Card
      className="glass-card"
      style={panelStyle}
      styles={{
        body: {
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }
      }}
    >
      {/* 头部工具栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: collapsed ? 0 : '16px',
          cursor: floating ? 'grab' : 'default'
        }}
        onMouseDown={handleMouseDown}
      >
        <Title level={5} style={{ 
          color: 'var(--primary-color)', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {floating && <DragOutlined />}
          {title}
        </Title>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            type="text"
            size="small"
            icon={collapsed ? <ExpandOutlined /> : <CompressOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: 'var(--text-secondary)' }}
          />
          
          <Button
            type="text"
            size="small"
            icon={floating ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={() => setFloating(!floating)}
            style={{ color: 'var(--text-secondary)' }}
            title={floating ? '停靠' : '浮动'}
          />
          
          {onClose && (
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{ color: 'var(--text-secondary)' }}
            />
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {!collapsed && (
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          transition: 'all 0.3s ease'
        }}>
          {children}
        </div>
      )}
    </Card>
  );
};

export default CollapsiblePanel;