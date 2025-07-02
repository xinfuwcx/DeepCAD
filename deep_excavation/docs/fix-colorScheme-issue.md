# 修复 Chili3DVisualizer 组件中的变量重复声明问题

## 问题描述

在 `components/chili3d/Chili3DVisualizer.tsx` 文件中存在变量 `colorScheme` 重复声明的问题，导致编译错误：

```
[plugin:vite:react-babel] Identifier 'colorScheme' has already been declared. (62:2)
```

## 解决方案

1. 打开 `components/chili3d/Chili3DVisualizer.tsx` 文件
2. 找到约第110行处的内部状态变量声明：
   ```typescript
   // 添加配色方案状态
   const [colorScheme, setColorScheme] = useState<'default' | 'blue' | 'rainbow' | 'terrain'>('default');
   ```

3. 将内部状态变量重命名为 `colorSchemeState`：
   ```typescript
   // 添加配色方案状态
   const [colorSchemeState, setColorScheme] = useState<'default' | 'blue' | 'rainbow' | 'terrain'>('default');
   ```

4. 在文件中查找所有使用 `colorScheme` 状态变量的地方，将它们也更新为 `colorSchemeState`：
   - 在 `renderSceneData` 函数中（约第432行）
   - 在 `renderSeepageResults` 函数中（约第577行和第616行）
   - 在 `changeColorScheme` 函数中（约第939行）
   - 在 `addLegend` 函数调用处（约第707行）

5. 保存文件并重新启动前端开发服务器

## 确认修复

修复完成后，编译错误应该消失，Chili3D可视化组件应该能够正常工作。

## 注意事项

- 这个问题是因为组件接收了一个名为 `colorScheme` 的props参数，同时在组件内部也声明了一个同名的状态变量
- 我们通过将内部状态变量重命名为 `colorSchemeState` 来解决这个命名冲突
- 修改后的代码仍然保留了原始功能，只是避免了变量名冲突 