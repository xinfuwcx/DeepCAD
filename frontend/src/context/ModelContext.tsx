import React, { createContext, useContext, useState, ReactNode } from 'react';

// 定义模型上下文类型
interface ModelContextType {
  modelData: any | null;
  setModelData: (data: any) => void;
  isModelLoaded: boolean;
  setIsModelLoaded: (loaded: boolean) => void;
}

// 创建上下文
const ModelContext = createContext<ModelContextType | undefined>(undefined);

// 提供者组件
export const ModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modelData, setModelData] = useState<any | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);

  // 上下文值
  const value = {
    modelData,
    setModelData,
    isModelLoaded,
    setIsModelLoaded,
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

// 自定义钩子以便使用上下文
export const useModelContext = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModelContext must be used within a ModelProvider');
  }
  return context;
}; 