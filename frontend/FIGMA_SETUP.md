# Figma 集成设置指南

## 🎨 Figma 自动界面设计集成

您的深基坑工程项目现在已经集成了 Figma 自动界面设计功能！这个系统可以：

- 🔄 **自动同步设计令牌** - 从 Figma 获取颜色、字体、间距等设计规范
- 🧩 **自动生成 React 组件** - 基于 Figma 设计自动生成代码
- 📱 **响应式设计支持** - 自动适配不同屏幕尺寸
- 🎭 **Storybook 集成** - 自动生成组件文档和演示
- 🔧 **TypeScript 支持** - 完整的类型安全

## 📋 快速设置步骤

### 1. 获取 Figma Access Token

1. 访问 [Figma 开发者设置](https://www.figma.com/developers/api#access-tokens)
2. 登录您的 Figma 账户
3. 点击 **"Create a new personal access token"**
4. 输入 Token 名称，如 "Deep Excavation CAE"
5. 点击 **"Create token"**
6. 📋 **复制生成的 token** (只显示一次，请妥善保存)

### 2. 获取 Figma 文件 ID

1. 打开您的 Figma 设计文件
2. 从 URL 中提取文件 ID：
   ```
   https://www.figma.com/file/[FILE_ID]/file-name
   ```
   例如：`https://www.figma.com/file/ABC123DEF456/my-design`
   文件 ID 就是：`ABC123DEF456`

### 3. 配置环境变量

1. 复制 `.env.example` 为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入实际值：
   ```bash
   FIGMA_ACCESS_TOKEN=figd_your_actual_token_here
   FIGMA_FILE_ID=your_actual_file_id_here
   FIGMA_TEAM_ID=your_team_id_here  # 可选
   ```

### 4. 安装依赖

```bash
cd frontend
npm install
```

### 5. 运行同步

```bash
# 完整同步（推荐首次使用）
npm run figma:sync

# 仅同步设计令牌
npm run figma:tokens

# 仅生成组件
npm run figma:components
```

## 🛠️ 使用方法

### 使用设计令牌

```tsx
// 导入设计令牌
import { tokens } from './styles/tokens/tokens';

// 使用颜色令牌
const MyComponent = () => (
  <div style={{ color: tokens.colors.primary }}>
    使用 Figma 同步的主色调
  </div>
);

// 使用 CSS 变量
const StyledComponent = styled.div`
  color: var(--color-primary);
  font-size: var(--font-body-size);
  margin: var(--spacing-base);
`;
```

### 使用自动生成的组件

```tsx
// 导入生成的组件
import { Button, Card, Modal } from './components/figma-generated';

const App = () => (
  <div>
    <Button variant="primary" size="large">
      Figma 设计的按钮
    </Button>
    <Card>
      <h3>自动生成的卡片组件</h3>
    </Card>
  </div>
);
```

## 📁 文件结构

同步后会生成以下文件：

```
frontend/
├── src/
│   ├── styles/
│   │   ├── tokens/
│   │   │   ├── tokens.json      # JSON 格式令牌
│   │   │   ├── tokens.js        # JavaScript 格式
│   │   │   ├── tokens.ts        # TypeScript 格式
│   │   │   ├── tokens.css       # CSS 变量
│   │   │   └── types.ts         # TypeScript 类型
│   │   └── theme-generated.ts   # MUI 主题配置
│   ├── components/
│   │   └── figma-generated/     # 自动生成的组件
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── index.ts
│   └── stories/                 # Storybook 故事
├── docs/
│   └── figma-integration.md     # 详细文档
└── figma-sync-report.md         # 同步报告
```

## ⚙️ 自定义配置

编辑 `figma.config.js` 可以自定义：

```javascript
module.exports = {
  // 设计令牌配置
  tokens: {
    outputPath: './src/styles/tokens',
    formats: ['css', 'scss', 'js', 'ts', 'json']
  },
  
  // 组件生成配置
  components: {
    outputPath: './src/components/figma-generated',
    styleSystem: 'emotion', // 或 'styled-components'
    uiLibrary: 'mui'        // 或 'antd', 'chakra'
  },
  
  // 自动化配置
  automation: {
    autoSync: false,      // 是否自动同步
    syncInterval: 30,     // 同步间隔（分钟）
    buildTimeSync: true   // 构建时是否同步
  }
};
```

## 🔧 高级功能

### 1. 自动同步设置

```bash
# 启用自动同步
echo "FIGMA_AUTO_SYNC=true" >> .env
echo "FIGMA_SYNC_INTERVAL=15" >> .env  # 15分钟间隔
```

### 2. 与构建流程集成

在 `package.json` 中添加：

```json
{
  "scripts": {
    "prebuild": "npm run figma:sync",
    "build": "npm run design:build && vite build"
  }
}
```

### 3. Git 钩子集成

```bash
# 添加 pre-commit 钩子
echo "npm run figma:sync" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 🐛 常见问题

### Q: Token 无效错误
**A:** 检查 FIGMA_ACCESS_TOKEN 是否正确，确保有文件访问权限

### Q: 文件 ID 错误
**A:** 确保从正确的 URL 提取文件 ID，格式为 24 位数字字母组合

### Q: 组件生成失败
**A:** 检查 Figma 文件中是否有组件，确保组件已发布到组库

### Q: 同步后样式不生效
**A:** 检查是否正确导入了生成的令牌文件

## 📞 支持

如果遇到问题，请：

1. 查看 `figma-sync-report.md` 同步报告
2. 检查控制台错误信息
3. 确认 Figma 文件权限设置
4. 验证网络连接

## 🎯 最佳实践

1. **定期同步** - 建议每天或设计更新后同步
2. **版本控制** - 将生成的文件加入版本控制
3. **设计规范** - 在 Figma 中建立一致的命名规范
4. **组件组织** - 合理组织 Figma 组件库结构
5. **文档维护** - 及时更新设计文档

---

🎉 **恭喜！您已成功集成 Figma 自动界面设计系统！**

现在您可以享受设计与开发的无缝协作体验了。
