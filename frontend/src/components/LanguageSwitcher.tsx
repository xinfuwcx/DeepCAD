import React from 'react';
import { Select, Button, Dropdown, Space } from 'antd';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import { useI18n } from '../hooks/useI18n';
import { GlassButton } from './ui/GlassComponents';

const { Option } = Select;

interface LanguageSwitcherProps {
  variant?: 'select' | 'button' | 'dropdown';
  size?: 'small' | 'middle' | 'large';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'select',
  size = 'middle',
  className,
  showIcon = true,
  showText = true
}) => {
  const { 
    currentLanguage, 
    changeLanguage, 
    getAvailableLanguages, 
    getLanguageDisplayName 
  } = useI18n();

  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng);
  };

  // Convert size to GlassButton format
  const glassButtonSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md';

  if (variant === 'select') {
    return (
      <Select
        value={currentLanguage}
        onChange={handleLanguageChange}
        size={size}
        className={className}
        suffixIcon={showIcon ? <GlobalOutlined /> : undefined}
      >
        {availableLanguages.map(lng => (
          <Option key={lng} value={lng}>
            <Space>
              {showIcon && lng === currentLanguage && <CheckOutlined />}
              {getLanguageDisplayName(lng)}
            </Space>
          </Option>
        ))}
      </Select>
    );
  }

  if (variant === 'button') {
    return (
      <Space className={className}>
        {availableLanguages.map(lng => (
          <GlassButton
            key={lng}
            variant={lng === currentLanguage ? 'primary' : 'ghost'}
            size={glassButtonSize}
            onClick={() => handleLanguageChange(lng)}
            icon={showIcon && lng === currentLanguage ? <CheckOutlined /> : undefined}
          >
            {showText ? getLanguageDisplayName(lng) : lng.toUpperCase()}
          </GlassButton>
        ))}
      </Space>
    );
  }

  if (variant === 'dropdown') {
    const menuItems = availableLanguages.map(lng => ({
      key: lng,
      label: (
        <Space>
          {lng === currentLanguage && <CheckOutlined className="text-primary" />}
          {getLanguageDisplayName(lng)}
        </Space>
      ),
      onClick: () => handleLanguageChange(lng)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        className={className}
      >
        <GlassButton
          variant="ghost"
          size={glassButtonSize}
          icon={showIcon ? <GlobalOutlined /> : undefined}
        >
          {showText ? getLanguageDisplayName(currentLanguage) : currentLanguage.toUpperCase()}
        </GlassButton>
      </Dropdown>
    );
  }

  return null;
};

export default LanguageSwitcher;