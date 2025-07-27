/**
 * Ant Design API版本匹配检查工具
 * 确保组件使用符合当前版本(5.19.1)的API
 */

// ===== API变更检查规则 =====
export const ANTD_API_RULES = {
  // Alert组件 - v5中移除了size属性
  Alert: {
    removedProps: ['size'],
    deprecatedProps: [],
    notes: 'Alert组件在v5中不再支持size属性'
  },
  
  // Progress组件 - status属性值变更
  Progress: {
    removedProps: [],
    deprecatedProps: [],
    statusValues: ['normal', 'active', 'success', 'exception'],
    notes: 'Progress组件不支持warning状态，使用exception代替'
  },

  // Tag组件 - v5中size属性行为变更
  Tag: {
    removedProps: [],
    deprecatedProps: ['size'],
    notes: 'Tag组件的size属性在v5中表现不同，建议使用CSS控制'
  },

  // Button组件 - API基本兼容
  Button: {
    removedProps: [],
    deprecatedProps: [],
    notes: 'Button组件API在v5中基本兼容'
  },

  // Input组件 - API基本兼容
  Input: {
    removedProps: [],
    deprecatedProps: [],
    notes: 'Input组件API在v5中基本兼容'
  },

  // Select组件 - API基本兼容
  Select: {
    removedProps: [],
    deprecatedProps: [],
    notes: 'Select组件API在v5中基本兼容'
  }
};

// ===== 组件使用检查函数 =====
export function checkAntdApiUsage(componentName: string, props: Record<string, any>): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const rules = ANTD_API_RULES[componentName as keyof typeof ANTD_API_RULES];
  if (!rules) {
    return { isValid: true, warnings: [], errors: [] };
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  // 检查已移除的属性
  if (rules.removedProps) {
    for (const prop of rules.removedProps) {
      if (props[prop] !== undefined) {
        errors.push(`${componentName}组件的${prop}属性在Ant Design v5中已被移除`);
      }
    }
  }

  // 检查已废弃的属性
  if (rules.deprecatedProps) {
    for (const prop of rules.deprecatedProps) {
      if (props[prop] !== undefined) {
        warnings.push(`${componentName}组件的${prop}属性在Ant Design v5中已废弃，建议移除`);
      }
    }
  }

  // 检查特定值约束
  if (componentName === 'Progress' && props.status) {
    const validStatuses = rules.statusValues || [];
    if (!validStatuses.includes(props.status)) {
      errors.push(`Progress组件的status值"${props.status}"无效，支持的值: ${validStatuses.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

// ===== 全局API检查工具 =====
export class AntdApiChecker {
  private static instance: AntdApiChecker;
  private checkedComponents = new Set<string>();

  static getInstance(): AntdApiChecker {
    if (!AntdApiChecker.instance) {
      AntdApiChecker.instance = new AntdApiChecker();
    }
    return AntdApiChecker.instance;
  }

  checkComponent(componentName: string, props: Record<string, any>) {
    const key = `${componentName}:${JSON.stringify(props)}`;
    if (this.checkedComponents.has(key)) {
      return; // 避免重复检查
    }

    const result = checkAntdApiUsage(componentName, props);
    
    if (result.warnings.length > 0) {
      console.warn(`[Ant Design API检查] ${componentName}组件:`, result.warnings);
    }
    
    if (result.errors.length > 0) {
      console.error(`[Ant Design API检查] ${componentName}组件:`, result.errors);
    }

    this.checkedComponents.add(key);
  }

  generateReport(): {
    totalChecked: number;
    summary: string;
    recommendations: string[];
  } {
    const recommendations = [
      '移除Alert组件的size属性',
      '将Progress组件的status="warning"改为status="exception"',
      '考虑移除Tag组件的size属性，使用CSS样式控制',
      '确保使用的图标从@ant-design/icons正确导入',
      '升级到Three.js addons路径（从examples/jsm）'
    ];

    return {
      totalChecked: this.checkedComponents.size,
      summary: `已检查${this.checkedComponents.size}个组件使用实例`,
      recommendations
    };
  }
}

// ===== 便捷函数 =====
export const antdApiChecker = AntdApiChecker.getInstance();

export function validateAntdUsage() {
  console.log('🔍 开始Ant Design API版本匹配检查...');
  
  const report = antdApiChecker.generateReport();
  console.log('📊 检查报告:', report);
  
  return report;
}