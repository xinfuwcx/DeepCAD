import { useEffect, useRef } from 'react';

type KeyCombination = string; // 例如: "ctrl+s", "shift+alt+d"
type KeyHandler = (event: KeyboardEvent) => void;
type KeyboardShortcuts = Record<KeyCombination, KeyHandler>;

/**
 * 解析快捷键组合
 * @param combination 快捷键组合，例如 "ctrl+s"
 */
const parseKeyCombination = (combination: string): { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } => {
  const parts = combination.toLowerCase().split('+');
  const modifiers = {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  };
  
  // 找出非修饰键
  const key = parts.find(part => 
    !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd', 'command'].includes(part)
  ) || '';
  
  return { key, ...modifiers };
};

/**
 * 检查事件是否匹配快捷键组合
 * @param event 键盘事件
 * @param combination 快捷键组合
 */
const matchesCombination = (event: KeyboardEvent, combination: string): boolean => {
  const { key, ctrl, alt, shift, meta } = parseKeyCombination(combination);
  
  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    event.metaKey === meta
  );
};

/**
 * 键盘快捷键钩子
 * @param shortcuts 快捷键配置对象
 * @param isEnabled 是否启用快捷键
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcuts,
  isEnabled: boolean = true
) => {
  // 使用 ref 存储快捷键配置，避免因为依赖变化导致重复注册
  const shortcutsRef = useRef<KeyboardShortcuts>(shortcuts);
  
  // 更新 ref 中的快捷键配置
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);
  
  // 注册和清理键盘事件监听器
  useEffect(() => {
    if (!isEnabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果焦点在输入元素上，不触发快捷键
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }
      
      // 检查是否匹配任何快捷键
      Object.entries(shortcutsRef.current).forEach(([combination, handler]) => {
        if (matchesCombination(event, combination)) {
          event.preventDefault();
          handler(event);
        }
      });
    };
    
    // 添加全局键盘事件监听器
    window.addEventListener('keydown', handleKeyDown);
    
    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled]);
  
  return {
    isEnabled,
  };
};

// 预定义的快捷键组合
export const KeyboardShortcuts = {
  SAVE: 'ctrl+s',
  NEW: 'ctrl+n',
  OPEN: 'ctrl+o',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  CUT: 'ctrl+x',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  SELECT_ALL: 'ctrl+a',
  DELETE: 'delete',
  ESCAPE: 'escape',
  HELP: 'f1',
  FULLSCREEN: 'f11',
  ZOOM_IN: 'ctrl+=',
  ZOOM_OUT: 'ctrl+-',
  ZOOM_RESET: 'ctrl+0',
  TOGGLE_SIDEBAR: 'ctrl+b',
  TOGGLE_PROPERTIES: 'ctrl+p',
  TOGGLE_CONSOLE: 'ctrl+`',
  RUN_ANALYSIS: 'ctrl+r',
  TOGGLE_WIREFRAME: 'ctrl+w',
};

export default useKeyboardShortcuts; 