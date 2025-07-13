import React from 'react';
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import { InputNumber, Select, Slider, Switch, Form, Input } from 'antd';
import { GlassCard } from '../ui/GlassComponents';
import { cn } from '../../utils/cn';

const { Option } = Select;
const { TextArea } = Input;

// 基础表单字段接口
interface BaseFormFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

// 表单字段错误接口
interface FormFieldError {
  message?: string;
}

// 获取字段错误的辅助函数
const getFieldError = (errors: any, fieldName: string): FormFieldError | undefined => {
  return errors?.[fieldName];
};

// 统一的表单项包装器
interface FormFieldWrapperProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  label,
  description,
  error,
  required,
  className,
  children
}) => (
  <Form.Item
    label={label && (
      <span className="text-sm font-medium text-primary">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
    )}
    validateStatus={error ? 'error' : ''}
    help={error || description}
    className={cn('mb-4', className)}
  >
    {children}
  </Form.Item>
);

// 数字输入框组件
interface FormInputNumberProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
  precision?: number;
}

export const FormInputNumber = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  min,
  max,
  step,
  placeholder,
  unit,
  precision
}: FormInputNumberProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <div className="relative">
            <InputNumber
              {...field}
              className="w-full"
              min={min}
              max={max}
              step={step}
              precision={precision}
              placeholder={placeholder}
              disabled={disabled}
              status={error ? 'error' : undefined}
            />
            {unit && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-secondary">
                {unit}
              </span>
            )}
          </div>
        </FormFieldWrapper>
      );
    }}
  />
);

// 选择框组件
interface FormSelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface FormSelectProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  options: FormSelectOption[];
  placeholder?: string;
  showSearch?: boolean;
  allowClear?: boolean;
}

export const FormSelect = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  options,
  placeholder,
  showSearch,
  allowClear
}: FormSelectProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <Select
            {...field}
            className="w-full"
            placeholder={placeholder}
            disabled={disabled}
            showSearch={showSearch}
            allowClear={allowClear}
            status={error ? 'error' : undefined}
          >
            {options.map((option) => (
              <Option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.icon && <span className="mr-2">{option.icon}</span>}
                {option.label}
              </Option>
            ))}
          </Select>
        </FormFieldWrapper>
      );
    }}
  />
);

// 滑块组件
interface FormSliderProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  min?: number;
  max?: number;
  step?: number;
  marks?: Record<number, string>;
  showValue?: boolean;
  unit?: string;
}

export const FormSlider = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  min = 0,
  max = 100,
  step = 1,
  marks,
  showValue = true,
  unit
}: FormSliderProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Slider
                {...field}
                className="flex-1 mr-4"
                min={min}
                max={max}
                step={step}
                marks={marks}
                disabled={disabled}
              />
              {showValue && (
                <div className="min-w-[80px] text-right">
                  <span className="font-medium">{field.value}</span>
                  {unit && <span className="text-secondary ml-1">{unit}</span>}
                </div>
              )}
            </div>
          </div>
        </FormFieldWrapper>
      );
    }}
  />
);

// 开关组件
interface FormSwitchProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  checkedChildren?: React.ReactNode;
  unCheckedChildren?: React.ReactNode;
  size?: 'default' | 'small';
}

export const FormSwitch = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  checkedChildren,
  unCheckedChildren,
  size = 'default'
}: FormSwitchProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <Switch
            {...field}
            checked={field.value}
            disabled={disabled}
            size={size}
            checkedChildren={checkedChildren}
            unCheckedChildren={unCheckedChildren}
          />
        </FormFieldWrapper>
      );
    }}
  />
);

// 文本输入框组件
interface FormInputProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'url';
  maxLength?: number;
  showCount?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const FormInput = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  placeholder,
  type = 'text',
  maxLength,
  showCount,
  prefix,
  suffix
}: FormInputProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <Input
            {...field}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            showCount={showCount}
            prefix={prefix}
            suffix={suffix}
            status={error ? 'error' : undefined}
          />
        </FormFieldWrapper>
      );
    }}
  />
);

// 文本域组件
interface FormTextAreaProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

export const FormTextArea = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  placeholder,
  rows = 4,
  maxLength,
  showCount,
  autoSize
}: FormTextAreaProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <TextArea
            {...field}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            showCount={showCount}
            autoSize={autoSize}
            status={error ? 'error' : undefined}
          />
        </FormFieldWrapper>
      );
    }}
  />
);

// 表单分组组件
interface FormGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
  className
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  if (!collapsible) {
    return (
      <GlassCard variant="subtle" className={cn('p-4 mb-4', className)}>
        {title && (
          <div className="mb-4 border-b border-glass-border/30 pb-2">
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            {description && (
              <p className="text-sm text-secondary mt-1">{description}</p>
            )}
          </div>
        )}
        {children}
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="subtle" className={cn('mb-4', className)}>
      <div
        className="p-4 cursor-pointer border-b border-glass-border/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            {description && (
              <p className="text-sm text-secondary mt-1">{description}</p>
            )}
          </div>
          <span className={cn(
            'transform transition-transform duration-200',
            expanded ? 'rotate-180' : 'rotate-0'
          )}>
            ▼
          </span>
        </div>
      </div>
      {expanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </GlassCard>
  );
};

// 复合滑块+数字输入组件 (常用于CAE参数调整)
interface FormSliderInputProps<T extends FieldValues> extends BaseFormFieldProps<T> {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  precision?: number;
  marks?: Record<number, string>;
}

export const FormSliderInput = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  className,
  disabled,
  required,
  min = 0,
  max = 100,
  step = 1,
  unit,
  precision,
  marks
}: FormSliderInputProps<T>) => (
  <Controller
    name={name}
    control={control}
    render={({ field, formState: { errors } }) => {
      const error = getFieldError(errors, name)?.message;
      
      return (
        <FormFieldWrapper
          label={label}
          description={description}
          error={error}
          required={required}
          className={className}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Slider
                {...field}
                className="flex-1"
                min={min}
                max={max}
                step={step}
                marks={marks}
                disabled={disabled}
              />
              <div className="relative min-w-[100px]">
                <InputNumber
                  {...field}
                  className="w-full"
                  min={min}
                  max={max}
                  step={step}
                  precision={precision}
                  disabled={disabled}
                  status={error ? 'error' : undefined}
                />
                {unit && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-secondary">
                    {unit}
                  </span>
                )}
              </div>
            </div>
          </div>
        </FormFieldWrapper>
      );
    }}
  />
);

// 导出所有组件
export {
  FormFieldWrapper,
  type BaseFormFieldProps,
  type FormSelectOption
};