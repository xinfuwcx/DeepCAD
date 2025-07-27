import React, { useState } from 'react';
import { Input, Select, InputNumber, Switch, Button, Tooltip, Form } from 'antd';
import { InfoCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

interface AnimatedInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  type?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  tooltip?: string;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  type = 'text',
  className = '',
  style,
  disabled = false,
  tooltip
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };
  
  return (
    <div className={`animated-input-wrapper ${isFocused ? 'focused' : ''} ${className}`} style={style}>
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        prefix={prefix}
        suffix={
          tooltip ? (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Tooltip>
          ) : (
            suffix
          )
        }
        type={type}
        className="animated-input transition-all"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
      />
    </div>
  );
};

interface AnimatedSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  tooltip?: string;
}

export const AnimatedSelect: React.FC<AnimatedSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  style,
  disabled = false,
  tooltip
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`animated-select-wrapper ${isFocused ? 'focused' : ''} ${className}`} style={style}>
      {tooltip && (
        <Tooltip title={tooltip} placement="topRight">
          <InfoCircleOutlined className="select-tooltip" />
        </Tooltip>
      )}
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="animated-select transition-all"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        options={options}
      />
    </div>
  );
};

interface AnimatedNumberInputProps {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  tooltip?: string;
  unit?: string;
}

export const AnimatedNumberInput: React.FC<AnimatedNumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  precision = 0,
  placeholder,
  className = '',
  style,
  disabled = false,
  tooltip,
  unit
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className={`animated-number-input-wrapper ${isFocused ? 'focused' : ''} ${className}`} style={style}>
      <InputNumber
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        precision={precision}
        placeholder={placeholder}
        className="animated-number-input transition-all"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        addonAfter={unit}
        suffix={
          tooltip ? (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Tooltip>
          ) : undefined
        }
      />
    </div>
  );
};

interface AnimatedSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  tooltip?: string;
  checkedText?: string;
  uncheckedText?: string;
}

export const AnimatedSwitch: React.FC<AnimatedSwitchProps> = ({
  checked,
  onChange,
  className = '',
  style,
  disabled = false,
  tooltip,
  checkedText,
  uncheckedText
}) => {
  return (
    <div className={`animated-switch-wrapper ${className}`} style={style}>
      <Tooltip title={tooltip} placement="topRight">
        <Switch
          checked={checked}
          onChange={onChange}
          className="animated-switch transition-all"
          disabled={disabled}
          checkedChildren={checkedText || <CheckOutlined />}
          unCheckedChildren={uncheckedText || <CloseOutlined />}
        />
      </Tooltip>
    </div>
  );
};

interface AnimatedButtonProps {
  onClick?: () => void;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  htmlType?: 'button' | 'submit' | 'reset';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onClick,
  type = 'default',
  icon,
  children,
  className = '',
  style,
  disabled = false,
  loading = false,
  tooltip,
  htmlType = 'button'
}) => {
  return (
    <Tooltip title={tooltip} placement="top">
      <Button
        onClick={onClick}
        type={type}
        icon={icon}
        className={`animated-button transition-all hover-scale ${className}`}
        style={style}
        disabled={disabled}
        loading={loading}
        htmlType={htmlType}
      >
        {children}
      </Button>
    </Tooltip>
  );
};

interface FormItemWithTooltipProps {
  label: string;
  name?: string;
  tooltip?: string;
  rules?: any[];
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FormItemWithTooltip: React.FC<FormItemWithTooltipProps> = ({
  label,
  name,
  tooltip,
  rules,
  children,
  className = '',
  style
}) => {
  return (
    <Form.Item
      label={
        tooltip ? (
          <span>
            {label}{' '}
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Tooltip>
          </span>
        ) : (
          label
        )
      }
      name={name}
      rules={rules}
      className={`animated-form-item ${className}`}
      style={style}
    >
      {children}
    </Form.Item>
  );
};

export default {
  AnimatedInput,
  AnimatedSelect,
  AnimatedNumberInput,
  AnimatedSwitch,
  AnimatedButton,
  FormItemWithTooltip
}; 