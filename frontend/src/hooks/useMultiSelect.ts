import { useState, useCallback } from 'react';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * 用于管理多选功能的钩子
 */
export function useMultiSelect() {
  // 多选模式状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  // 选中的组件 ID 列表
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 从 store 获取当前选中的组件 ID
  const { selectedComponentId, setSelectedComponentId } = useSceneStore(
    useShallow(state => ({
      selectedComponentId: state.selectedComponentId,
      setSelectedComponentId: state.setSelectedComponentId,
    }))
  );
  
  // 切换多选模式
  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => {
      const newMode = !prev;
      
      // 如果进入多选模式，并且有当前选中的组件，将其添加到多选列表
      if (newMode && selectedComponentId) {
        setSelectedIds([selectedComponentId]);
      }
      // 如果退出多选模式，清空多选列表，保留当前选中的组件
      else if (!newMode) {
        setSelectedIds(selectedComponentId ? [selectedComponentId] : []);
      }
      
      return newMode;
    });
  }, [selectedComponentId]);
  
  // 选择组件
  const selectComponent = useCallback((id: string | null) => {
    if (isMultiSelectMode) {
      if (id === null) {
        // 清除所有选择
        setSelectedIds([]);
        setSelectedComponentId(null);
      } else {
        // 在多选模式下，切换组件的选择状态
        setSelectedIds(prev => {
          const isSelected = prev.includes(id);
          
          if (isSelected) {
            // 如果已经选中，则取消选中
            const newIds = prev.filter(selectedId => selectedId !== id);
            // 更新主选择为最后一个选中的组件，如果没有则为 null
            setSelectedComponentId(newIds.length > 0 ? newIds[newIds.length - 1] : null);
            return newIds;
          } else {
            // 如果未选中，则添加到选中列表
            const newIds = [...prev, id];
            setSelectedComponentId(id);
            return newIds;
          }
        });
      }
    } else {
      // 非多选模式，直接设置选中的组件
      setSelectedComponentId(id);
      setSelectedIds(id ? [id] : []);
    }
  }, [isMultiSelectMode, setSelectedComponentId]);
  
  // 清除所有选择
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedComponentId(null);
  }, [setSelectedComponentId]);
  
  // 检查组件是否被选中
  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);
  
  return {
    isMultiSelectMode,
    selectedIds,
    toggleMultiSelectMode,
    selectComponent,
    clearSelection,
    isSelected,
  };
} 