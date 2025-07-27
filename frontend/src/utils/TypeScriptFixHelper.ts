/**
 * TypeScript修复助手
 * 1号架构师 - 系统化修复TypeScript类型错误的工具集
 */

export interface TypeScriptError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  category: 'interface' | 'import' | 'props' | 'generic' | 'other';
}

export interface FixPattern {
  name: string;
  description: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  category: TypeScriptError['category'];
}

class TypeScriptFixHelper {
  private commonFixPatterns: FixPattern[] = [
    {
      name: 'Ant Design size prop',
      description: '修复Ant Design组件的size属性错误',
      pattern: /size:\s*["']small["']/g,
      replacement: '',
      category: 'props'
    },
    {
      name: 'Missing icon import',
      description: '修复缺失的图标导入',
      pattern: /ExclamationTriangleOutlined/g,
      replacement: 'ExclamationCircleOutlined',
      category: 'import'
    },
    {
      name: 'Alert size prop removal',
      description: '移除Alert组件的size属性',
      pattern: /(<Alert[^>]*)\s*size\s*=\s*["'][^"']*["']([^>]*>)/g,
      replacement: '$1$2',
      category: 'props'
    },
    {
      name: 'Tag size prop removal',
      description: '移除Tag组件的size属性',
      pattern: /(<Tag[^>]*)\s*size\s*=\s*["'][^"']*["']([^>]*>)/g,
      replacement: '$1$2',
      category: 'props'
    },
    {
      name: 'JSX angle brackets',
      description: '修复JSX中的角括号',
      pattern: /([^&])[<>](\d)/g,
      replacement: (match) => {
        return match.replace('<', '&lt;').replace('>', '&gt;');
      },
      category: 'other'
    },
    {
      name: 'Progress status warning',
      description: '修复Progress组件的status属性',
      pattern: /status\s*=\s*["']warning["']/g,
      replacement: 'status="normal"',
      category: 'props'
    }
  ];

  /**
   * 分析TypeScript错误
   */
  public analyzeErrors(errors: string[]): TypeScriptError[] {
    return errors.map(error => this.parseError(error)).filter(Boolean);
  }

  /**
   * 解析单个错误
   */
  private parseError(errorText: string): TypeScriptError | null {
    // 解析错误格式: src/path/file.tsx(line,col): error TSxxxx: message
    const match = errorText.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s*TS(\d+):\s*(.+)$/);
    
    if (!match) return null;

    const [, file, line, column, severity, code, message] = match;
    
    return {
      file,
      line: parseInt(line),
      column: parseInt(column),
      code: `TS${code}`,
      message,
      severity: severity as 'error' | 'warning',
      category: this.categorizeError(message)
    };
  }

  /**
   * 错误分类
   */
  private categorizeError(message: string): TypeScriptError['category'] {
    if (message.includes('Property') && message.includes('does not exist')) {
      return 'props';
    }
    if (message.includes('Cannot find module') || message.includes('has no exported member')) {
      return 'import';
    }
    if (message.includes('Type') && (message.includes('is not assignable') || message.includes('missing'))) {
      return 'interface';
    }
    if (message.includes('Generic')) {
      return 'generic';
    }
    return 'other';
  }

  /**
   * 自动修复文件
   */
  public async autoFixFile(filePath: string, content: string): Promise<{
    fixed: boolean;
    newContent: string;
    appliedFixes: string[];
  }> {
    let newContent = content;
    const appliedFixes: string[] = [];

    for (const pattern of this.commonFixPatterns) {
      const originalContent = newContent;
      
      if (typeof pattern.replacement === 'string') {
        newContent = newContent.replace(pattern.pattern, pattern.replacement);
      } else {
        newContent = newContent.replace(pattern.pattern, pattern.replacement);
      }

      if (newContent !== originalContent) {
        appliedFixes.push(pattern.name);
      }
    }

    return {
      fixed: appliedFixes.length > 0,
      newContent,
      appliedFixes
    };
  }

  /**
   * 生成修复报告
   */
  public generateFixReport(errors: TypeScriptError[]): {
    total: number;
    byCategory: Record<string, number>;
    byFile: Record<string, number>;
    topErrors: { message: string; count: number }[];
    autoFixable: number;
  } {
    const byCategory: Record<string, number> = {};
    const byFile: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    errors.forEach(error => {
      // 按类别统计
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      
      // 按文件统计
      byFile[error.file] = (byFile[error.file] || 0) + 1;
      
      // 按错误信息统计
      const key = error.message.substring(0, 100); // 截取前100字符
      errorMessages[key] = (errorMessages[key] || 0) + 1;
    });

    // 获取最常见的错误
    const topErrors = Object.entries(errorMessages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    // 估算可自动修复的数量
    const autoFixable = errors.filter(error => 
      this.commonFixPatterns.some(pattern => pattern.category === error.category)
    ).length;

    return {
      total: errors.length,
      byCategory,
      byFile,
      topErrors,
      autoFixable
    };
  }

  /**
   * 优先级排序
   */
  public prioritizeErrors(errors: TypeScriptError[]): TypeScriptError[] {
    const priorityMap = {
      'interface': 3,
      'import': 2,
      'props': 1,
      'generic': 1,
      'other': 0
    };

    return errors.sort((a, b) => {
      // 首先按类别优先级排序
      const priorityDiff = priorityMap[b.category] - priorityMap[a.category];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 然后按文件路径排序（核心组件优先）
      const aCoreComponent = a.file.includes('components/') ? 1 : 0;
      const bCoreComponent = b.file.includes('components/') ? 1 : 0;
      
      return bCoreComponent - aCoreComponent;
    });
  }

  /**
   * 生成修复建议
   */
  public generateFixSuggestions(errors: TypeScriptError[]): {
    immediate: string[];
    mediumTerm: string[];
    longTerm: string[];
  } {
    const report = this.generateFixReport(errors);
    
    const immediate: string[] = [];
    const mediumTerm: string[] = [];
    const longTerm: string[] = [];

    // 立即修复建议
    if (report.byCategory.import > 0) {
      immediate.push(`修复 ${report.byCategory.import} 个导入错误 - 这些会阻止编译`);
    }
    
    if (report.autoFixable > 0) {
      immediate.push(`自动修复 ${report.autoFixable} 个常见错误 - 使用修复工具`);
    }

    // 中期修复建议
    if (report.byCategory.props > 0) {
      mediumTerm.push(`重构 ${report.byCategory.props} 个属性类型错误 - 需要重新设计接口`);
    }

    if (report.byCategory.interface > 0) {
      mediumTerm.push(`完善 ${report.byCategory.interface} 个接口定义 - 需要2号3号配合`);
    }

    // 长期修复建议
    if (report.byCategory.generic > 0) {
      longTerm.push(`优化 ${report.byCategory.generic} 个泛型使用 - 提升类型安全`);
    }

    return { immediate, mediumTerm, longTerm };
  }
}

// 导出单例
export const tsFixHelper = new TypeScriptFixHelper();

// 开发工具
export const TypeScriptFixDevTools = {
  /**
   * 分析当前构建错误
   */
  analyzeBuildErrors: async () => {
    console.log('🔍 分析TypeScript构建错误中...');
    // 这里可以集成实际的构建错误获取逻辑
    return {
      message: '请运行 npm run build 获取错误列表，然后使用 analyzeBuildErrors(errors) 分析'
    };
  },

  /**
   * 分析错误数组
   */
  analyzeErrors: (errorTexts: string[]) => {
    const errors = tsFixHelper.analyzeErrors(errorTexts);
    const report = tsFixHelper.generateFixReport(errors);
    const suggestions = tsFixHelper.generateFixSuggestions(errors);
    
    console.group('📊 TypeScript错误分析报告');
    console.log('总错误数:', report.total);
    console.log('按类别:', report.byCategory);
    console.log('可自动修复:', report.autoFixable);
    console.log('修复建议:', suggestions);
    console.groupEnd();

    return { errors, report, suggestions };
  },

  /**
   * 自动修复文件内容
   */
  autoFix: async (content: string) => {
    return tsFixHelper.autoFixFile('', content);
  }
};

// 在开发环境中暴露
if (process.env.NODE_ENV === 'development') {
  (window as any).TypeScriptFixDevTools = TypeScriptFixDevTools;
}