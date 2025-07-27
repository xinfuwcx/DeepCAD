# 导入关系优化说明

## 已弃用的直接导入

为了优化导入关系并避免循环依赖，以下文件的直接导入已被弃用。请使用统一的服务入口：

### 请使用: `import { ... } from '../services'`

### 已弃用的直接导入:

- ❌ `import { ... } from '../services/PileModelingStrategy'`
- ❌ `import { ... } from '../services/KratosDataConverter'`
- ❌ `import { ... } from '../services/GeometryAlgorithmIntegration'`
- ❌ `import { ... } from '../services/PyVistaIntegrationService'`

### 重复定义清理

以下文件存在重复的枚举或类型定义，已统一到主要服务文件：

#### PileModelingStrategy 枚举重复定义:
- ✅ **主要定义**: `services/PileModelingStrategy.ts`
- 🔄 **需要更新**: `services/enhancedPileCalculationService.ts`
- 🔄 **需要更新**: `components/advanced/PileTypeSelector.tsx`
- 🔄 **需要更新**: `core/modeling/GeometryToFEMMapper.ts`
- 🔄 **需要更新**: `types/PileModelingInterfaces.ts`

#### PileType 枚举重复定义:
- ✅ **主要定义**: `services/PileModelingStrategy.ts`
- 🔄 **其他文件应从主要定义导入**

## 推荐的导入模式

```typescript
// ✅ 推荐：使用统一服务入口
import { 
  PileType, 
  PileModelingStrategy,
  KratosElementConverter,
  geometryAlgorithmIntegration 
} from '../services';

// ❌ 不推荐：直接导入具体服务文件
import { PileType } from '../services/PileModelingStrategy';
import { KratosElementConverter } from '../services/KratosDataConverter';
```

## 优化收益

1. **避免循环依赖**: 通过中央导出避免模块间的循环引用
2. **减少重复定义**: 统一类型和枚举定义的来源
3. **简化导入**: 一个统一的导入入口，便于维护
4. **更好的类型检查**: TypeScript 可以更好地进行类型推断
5. **打包优化**: 减少重复代码，优化打包体积

## 迁移指南

1. 将所有服务导入更改为从 `../services` 导入
2. 删除重复的枚举和类型定义
3. 更新所有组件使用统一的类型定义
4. 确保测试文件也使用新的导入方式