import React, { memo, useMemo, useCallback } from 'react';
import { shallowEqual } from '../../utils/helpers';

// 高阶组件：创建优化的 memo 组件
export function createMemoComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(Component, areEqual || shallowEqual);
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// 优化的列表项组件
interface OptimizedListItemProps {
  id: string | number;
  data: any;
  index: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (id: string | number) => void;
  onHover?: (id: string | number, isHovered: boolean) => void;
  renderContent: (data: any, index: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const OptimizedListItem = memo<OptimizedListItemProps>(
  ({
    id,
    data,
    index,
    isSelected = false,
    isHovered = false,
    onClick,
    onHover,
    renderContent,
    className,
    style,
  }) => {
    const handleClick = useCallback(() => {
      onClick?.(id);
    }, [onClick, id]);

    const handleMouseEnter = useCallback(() => {
      onHover?.(id, true);
    }, [onHover, id]);

    const handleMouseLeave = useCallback(() => {
      onHover?.(id, false);
    }, [onHover, id]);

    const itemStyle = useMemo(
      () => ({
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: isSelected
          ? '#e6f7ff'
          : isHovered
          ? '#f5f5f5'
          : 'transparent',
        transition: 'background-color 0.2s ease',
        ...style,
      }),
      [isSelected, isHovered, onClick, style]
    );

    const content = useMemo(
      () => renderContent(data, index),
      [renderContent, data, index]
    );

    return (
      <div
        className={className}
        style={itemStyle}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isHovered === nextProps.isHovered &&
      shallowEqual(prevProps.data, nextProps.data) &&
      prevProps.index === nextProps.index &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.onHover === nextProps.onHover &&
      prevProps.renderContent === nextProps.renderContent &&
      prevProps.className === nextProps.className &&
      shallowEqual(prevProps.style, nextProps.style)
    );
  }
);

OptimizedListItem.displayName = 'OptimizedListItem';

// 优化的表格行组件
interface OptimizedTableRowProps {
  rowKey: string | number;
  rowData: Record<string, any>;
  columns: Array<{
    key: string;
    render?: (value: any, rowData: Record<string, any>) => React.ReactNode;
  }>;
  isSelected?: boolean;
  isHovered?: boolean;
  onSelect?: (rowKey: string | number) => void;
  onHover?: (rowKey: string | number, isHovered: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

const OptimizedTableRow = memo<OptimizedTableRowProps>(
  ({
    rowKey,
    rowData,
    columns,
    isSelected = false,
    isHovered = false,
    onSelect,
    onHover,
    className,
    style,
  }) => {
    const handleClick = useCallback(() => {
      onSelect?.(rowKey);
    }, [onSelect, rowKey]);

    const handleMouseEnter = useCallback(() => {
      onHover?.(rowKey, true);
    }, [onHover, rowKey]);

    const handleMouseLeave = useCallback(() => {
      onHover?.(rowKey, false);
    }, [onHover, rowKey]);

    const rowStyle = useMemo(
      () => ({
        cursor: onSelect ? 'pointer' : 'default',
        backgroundColor: isSelected
          ? '#e6f7ff'
          : isHovered
          ? '#f5f5f5'
          : 'transparent',
        transition: 'background-color 0.2s ease',
        ...style,
      }),
      [isSelected, isHovered, onSelect, style]
    );

    const cells = useMemo(
      () =>
        columns.map((column) => {
          const value = rowData[column.key];
          const content = column.render ? column.render(value, rowData) : value;
          
          return (
            <td key={column.key} style={{ padding: '8px 12px' }}>
              {content}
            </td>
          );
        }),
      [columns, rowData]
    );

    return (
      <tr
        className={className}
        style={rowStyle}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {cells}
      </tr>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.rowKey === nextProps.rowKey &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isHovered === nextProps.isHovered &&
      shallowEqual(prevProps.rowData, nextProps.rowData) &&
      shallowEqual(prevProps.columns, nextProps.columns) &&
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.onHover === nextProps.onHover &&
      prevProps.className === nextProps.className &&
      shallowEqual(prevProps.style, nextProps.style)
    );
  }
);

OptimizedTableRow.displayName = 'OptimizedTableRow';

// 优化的卡片组件
interface OptimizedCardProps {
  id: string | number;
  title?: React.ReactNode;
  content?: React.ReactNode;
  actions?: React.ReactNode[];
  cover?: React.ReactNode;
  isLoading?: boolean;
  isSelected?: boolean;
  onClick?: (id: string | number) => void;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

const OptimizedCard = memo<OptimizedCardProps>(
  ({
    id,
    title,
    content,
    actions,
    cover,
    isLoading = false,
    isSelected = false,
    onClick,
    className,
    style,
    bodyStyle,
  }) => {
    const handleClick = useCallback(() => {
      onClick?.(id);
    }, [onClick, id]);

    const cardStyle = useMemo(
      () => ({
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isSelected
          ? '0 2px 8px rgba(24, 144, 255, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'box-shadow 0.2s ease',
        ...style,
      }),
      [isSelected, onClick, style]
    );

    const cardBodyStyle = useMemo(
      () => ({
        padding: '16px',
        ...bodyStyle,
      }),
      [bodyStyle]
    );

    if (isLoading) {
      return (
        <div className={className} style={cardStyle}>
          <div style={cardBodyStyle}>
            <div
              style={{
                height: '20px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                marginBottom: '12px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                height: '60px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={className} style={cardStyle} onClick={handleClick}>
        {cover}
        <div style={cardBodyStyle}>
          {title && (
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#262626',
              }}
            >
              {title}
            </div>
          )}
          {content && (
            <div style={{ color: '#595959', lineHeight: '1.5' }}>
              {content}
            </div>
          )}
          {actions && actions.length > 0 && (
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.title === nextProps.title &&
      prevProps.content === nextProps.content &&
      shallowEqual(prevProps.actions, nextProps.actions) &&
      prevProps.cover === nextProps.cover &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.className === nextProps.className &&
      shallowEqual(prevProps.style, nextProps.style) &&
      shallowEqual(prevProps.bodyStyle, nextProps.bodyStyle)
    );
  }
);

OptimizedCard.displayName = 'OptimizedCard';

// 样式注入（如果需要动画）
const injectStyles = () => {
  const styleId = 'optimized-components-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
};

// 在模块加载时注入样式
if (typeof document !== 'undefined') {
  injectStyles();
}

export { OptimizedListItem, OptimizedTableRow, OptimizedCard };