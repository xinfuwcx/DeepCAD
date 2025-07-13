import React, { Suspense } from 'react';
import { ConfigProvider } from 'antd';
import { useI18n } from '../hooks/useI18n';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { Spin } from 'antd';

interface I18nProviderProps {
  children: React.ReactNode;
}

const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { currentLanguage, isReady } = useI18n();

  // 映射语言到Ant Design语言包
  const getAntdLocale = (language: string) => {
    switch (language) {
      case 'zh':
      case 'zh-CN':
        return zhCN;
      case 'en':
      case 'en-US':
      default:
        return enUS;
    }
  };

  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" tip="Loading language resources..." />
      </div>
    );
  }

  return (
    <ConfigProvider locale={getAntdLocale(currentLanguage)}>
      <Suspense fallback={
        <div className="flex justify-center items-center h-screen">
          <Spin size="large" />
        </div>
      }>
        {children}
      </Suspense>
    </ConfigProvider>
  );
};

export default I18nProvider;