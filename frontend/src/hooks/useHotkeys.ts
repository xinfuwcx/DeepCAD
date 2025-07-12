/**
 * 快捷键管理 Hook
 */

import { useEffect, useCallback } from 'react';
import { HOTKEY_MAP, ToolbarAction } from '../types/viewport';

interface UseHotkeysOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreModifiers?: boolean;
  excludeTargets?: string[]; // 排除的元素标签名
}

interface HotkeyHandler {
  [key: string]: (event: KeyboardEvent) => void;
}

export function useHotkeys(
  handlers: HotkeyHandler,
  options: UseHotkeysOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    ignoreModifiers = false,
    excludeTargets = ['INPUT', 'TEXTAREA', 'SELECT']
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 检查是否在排除的元素中
      const target = event.target as HTMLElement;
      if (excludeTargets.includes(target.tagName)) {
        return;
      }

      // 检查修饰键
      if (!ignoreModifiers && (event.ctrlKey || event.metaKey || event.altKey)) {
        return;
      }

      const key = event.key.toLowerCase();
      const handler = handlers[key];

      if (handler) {
        if (preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }
        handler(event);
      }
    },
    [enabled, preventDefault, ignoreModifiers, excludeTargets, handlers]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// 视口专用快捷键 Hook
export function useViewportHotkeys(
  onToolAction: (action: ToolbarAction) => void,
  options: UseHotkeysOptions = {}
) {
  const handlers = useCallback(() => {
    const keyHandlers: HotkeyHandler = {};
    
    Object.entries(HOTKEY_MAP).forEach(([key, action]) => {
      keyHandlers[key] = () => onToolAction(action);
    });

    // 添加额外的快捷键
    keyHandlers['escape'] = () => onToolAction(ToolbarAction.SELECT);
    keyHandlers['home'] = () => onToolAction(ToolbarAction.RESET);
    keyHandlers['end'] = () => onToolAction(ToolbarAction.FIT);

    return keyHandlers;
  }, [onToolAction]);

  useHotkeys(handlers(), options);
}

// 获取快捷键显示文本
export function getHotkeyText(action: ToolbarAction): string {
  const key = Object.entries(HOTKEY_MAP).find(([_, a]) => a === action)?.[0];
  if (!key) return '';
  
  // 格式化显示（大写）
  return key.toUpperCase();
}

// 格式化快捷键组合
export function formatHotkey(key: string, modifiers: string[] = []): string {
  const parts = [...modifiers, key.toUpperCase()];
  return parts.join(' + ');
}

// 检查是否为有效的快捷键
export function isValidHotkey(key: string): boolean {
  return Object.keys(HOTKEY_MAP).includes(key.toLowerCase());
}