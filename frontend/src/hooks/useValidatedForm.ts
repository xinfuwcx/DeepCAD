/**
 * 统一的表单验证Hook
 * 集成Zod验证和Ant Design Form
 */

import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
import { validateWithSchema, formatValidationErrors } from '../validation/schemas';

interface UseValidatedFormOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit?: (data: T) => Promise<void> | void;
  onValidationError?: (errors: Array<{field: string, message: string, code: string}>) => void;
  enableRealTimeValidation?: boolean;
  transformData?: (formData: any) => any;
}

interface UseValidatedFormReturn<T> {
  form: any;
  loading: boolean;
  errors: Array<{field: string, message: string, code: string}> | null;
  validate: (data?: any) => Promise<boolean>;
  handleSubmit: () => Promise<void>;
  validateField: (field: string, value: any) => Promise<boolean>;
  resetForm: () => void;
  setFieldValue: (field: string, value: any) => void;
  getFieldValue: (field: string) => any;
  isFieldValid: (field: string) => boolean;
}

export function useValidatedForm<T = any>(
  options: UseValidatedFormOptions<T>
): UseValidatedFormReturn<T> {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{field: string, message: string, code: string}> | null>(null);
  const [fieldValidationStatus, setFieldValidationStatus] = useState<Record<string, boolean>>({});

  const {
    schema,
    onSubmit,
    onValidationError,
    enableRealTimeValidation = true,
    transformData
  } = options;

  // 验证整个表单
  const validate = useCallback(async (data?: any): Promise<boolean> => {
    try {
      const formData = data || form.getFieldsValue();
      const transformedData = transformData ? transformData(formData) : formData;
      
      const result = validateWithSchema(schema, transformedData);
      
      if (result.success) {
        setErrors(null);
        // 清除Ant Design表单错误
        form.setFields(
          Object.keys(formData).map(field => ({
            name: field,
            errors: []
          }))
        );
        return true;
      } else {
        setErrors(result.errors);
        
        // 设置Ant Design表单错误
        const fieldErrors: any[] = [];
        result.errors?.forEach(error => {
          const fieldPath = error.field.split('.');
          fieldErrors.push({
            name: fieldPath,
            errors: [error.message]
          });
        });
        form.setFields(fieldErrors);
        
        if (onValidationError) {
          onValidationError(result.errors || []);
        }
        
        return false;
      }
    } catch (error) {
      console.error('表单验证错误:', error);
      message.error('表单验证失败');
      return false;
    }
  }, [form, schema, transformData, onValidationError]);

  // 验证单个字段
  const validateField = useCallback(async (field: string, value: any): Promise<boolean> => {
    if (!enableRealTimeValidation) return true;

    try {
      // 获取字段对应的schema
      const fieldSchema = getFieldSchema(schema, field);
      if (!fieldSchema) return true;

      const result = validateWithSchema(fieldSchema, value);
      
      const isValid = result.success;
      setFieldValidationStatus(prev => ({
        ...prev,
        [field]: isValid
      }));

      if (!isValid && result.errors) {
        // 设置单个字段错误
        form.setFields([{
          name: field,
          errors: result.errors.map(e => e.message)
        }]);
      } else {
        // 清除字段错误
        form.setFields([{
          name: field,
          errors: []
        }]);
      }

      return isValid;
    } catch (error) {
      console.error(`字段${field}验证错误:`, error);
      return false;
    }
  }, [form, schema, enableRealTimeValidation]);

  // 处理表单提交
  const handleSubmit = useCallback(async (): Promise<void> => {
    setLoading(true);
    
    try {
      const formData = form.getFieldsValue();
      const isValid = await validate(formData);
      
      if (!isValid) {
        message.error('表单验证失败，请检查输入');
        return;
      }

      if (onSubmit) {
        const transformedData = transformData ? transformData(formData) : formData;
        await onSubmit(transformedData);
        message.success('操作成功');
      }
    } catch (error: any) {
      console.error('表单提交错误:', error);
      message.error(`操作失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [form, validate, onSubmit, transformData]);

  // 重置表单
  const resetForm = useCallback(() => {
    form.resetFields();
    setErrors(null);
    setFieldValidationStatus({});
  }, [form]);

  // 设置字段值
  const setFieldValue = useCallback((field: string, value: any) => {
    form.setFieldValue(field, value);
    
    // 如果启用实时验证，验证该字段
    if (enableRealTimeValidation) {
      validateField(field, value);
    }
  }, [form, validateField, enableRealTimeValidation]);

  // 获取字段值
  const getFieldValue = useCallback((field: string) => {
    return form.getFieldValue(field);
  }, [form]);

  // 检查字段是否有效
  const isFieldValid = useCallback((field: string): boolean => {
    return fieldValidationStatus[field] !== false;
  }, [fieldValidationStatus]);

  return {
    form,
    loading,
    errors,
    validate,
    handleSubmit,
    validateField,
    resetForm,
    setFieldValue,
    getFieldValue,
    isFieldValid
  };
}

// 辅助函数：从schema中提取字段schema
function getFieldSchema(schema: z.ZodSchema, fieldPath: string): z.ZodSchema | null {
  try {
    const path = fieldPath.split('.');
    let currentSchema: any = schema;

    for (const segment of path) {
      if (currentSchema instanceof z.ZodObject) {
        const shape = currentSchema._def.shape();
        currentSchema = shape[segment];
      } else if (currentSchema instanceof z.ZodArray) {
        currentSchema = currentSchema._def.type;
      } else {
        return null;
      }
    }

    return currentSchema || null;
  } catch (error) {
    console.warn(`无法获取字段${fieldPath}的schema:`, error);
    return null;
  }
}

// 表单字段装饰器Hook
export function useFormField<T = any>(
  field: string,
  validatedForm: UseValidatedFormReturn<T>,
  options: {
    required?: boolean;
    placeholder?: string;
    helpText?: string;
  } = {}
) {
  const { form, validateField, isFieldValid } = validatedForm;
  const { required = false, placeholder, helpText } = options;

  const fieldProps = {
    value: form.getFieldValue(field),
    onChange: (value: any) => {
      form.setFieldValue(field, value);
      validateField(field, value);
    },
    status: isFieldValid(field) ? '' : 'error',
    placeholder,
    required
  };

  const formItemProps = {
    name: field,
    rules: required ? [{ required: true, message: `请输入${field}` }] : [],
    help: helpText,
    validateStatus: isFieldValid(field) ? 'success' : 'error'
  };

  return {
    fieldProps,
    formItemProps,
    isValid: isFieldValid(field)
  };
}

// 批量验证Hook
export function useBatchValidation<T = any>(
  forms: Array<UseValidatedFormReturn<T>>
) {
  const [loading, setLoading] = useState(false);

  const validateAll = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    
    try {
      const results = await Promise.all(
        forms.map(form => form.validate())
      );
      
      const isAllValid = results.every(result => result);
      
      if (!isAllValid) {
        message.error('部分表单验证失败，请检查输入');
      }
      
      return isAllValid;
    } catch (error) {
      console.error('批量验证错误:', error);
      message.error('表单验证失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [forms]);

  const submitAll = useCallback(async (): Promise<void> => {
    const isValid = await validateAll();
    
    if (isValid) {
      await Promise.all(
        forms.map(form => form.handleSubmit())
      );
    }
  }, [validateAll, forms]);

  return {
    loading,
    validateAll,
    submitAll
  };
}

// 条件验证Hook
export function useConditionalValidation<T = any>(
  baseSchema: z.ZodSchema<T>,
  conditions: Array<{
    when: (data: any) => boolean;
    then: z.ZodSchema<T>;
    otherwise?: z.ZodSchema<T>;
  }>
) {
  const getDynamicSchema = useCallback((data: any): z.ZodSchema<T> => {
    for (const condition of conditions) {
      if (condition.when(data)) {
        return condition.then;
      }
    }
    
    // 返回默认的otherwise schema或base schema
    const lastCondition = conditions[conditions.length - 1];
    return lastCondition?.otherwise || baseSchema;
  }, [baseSchema, conditions]);

  return { getDynamicSchema };
}