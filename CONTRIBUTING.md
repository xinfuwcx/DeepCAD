# 贡献指南 Contributing Guidelines

感谢您对Deep Excavation项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告Bug
1. 在[Issues](https://github.com/yourusername/deep-excavation/issues)中搜索是否已有相关问题
2. 如果没有，创建新的Issue，包含：
   - 清晰的标题和描述
   - 重现步骤
   - 期望行为和实际行为
   - 环境信息（操作系统、Python版本等）
   - 相关截图或日志

### 提出新功能
1. 在[Discussions](https://github.com/yourusername/deep-excavation/discussions)中讨论您的想法
2. 创建Feature Request Issue，说明：
   - 功能的详细描述
   - 使用场景
   - 可能的实现方式

### 提交代码
1. Fork项目到您的GitHub账户
2. 创建功能分支：`git checkout -b feature/your-feature-name`
3. 提交您的更改：`git commit -m 'Add some feature'`
4. 推送到分支：`git push origin feature/your-feature-name`
5. 创建Pull Request

## 📝 代码规范

### Python代码风格
- 遵循[PEP 8](https://www.python.org/dev/peps/pep-0008/)
- 使用类型提示
- 添加必要的文档字符串
- 保持函数和类的职责单一

### 前端代码风格
- 使用TypeScript
- 遵循React最佳实践
- 保持组件可复用性
- 添加适当的注释

### 提交信息格式
```
type(scope): description

body

footer
```

类型包括：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 🧪 测试

### 运行测试
```bash
# Python测试
python -m pytest tests/

# 前端测试
cd frontend && npm test
```

### 添加测试
- 为新功能添加单元测试
- 确保所有测试通过
- 保持测试覆盖率

## 📚 开发环境设置

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/deep-excavation.git
cd deep-excavation
```

### 2. 设置Python环境
```bash
python -m venv env
source env/bin/activate  # Linux/Mac
# or
.\env\Scripts\activate  # Windows

pip install -r requirements.txt
pip install -r requirements-dev.txt  # 开发依赖
```

### 3. 设置前端环境
```bash
cd frontend
npm install
npm start
```

### 4. 编译Kratos
```bash
python tools/setup/build_kratos.py
```

## 🔄 开发流程

1. **选择Issue**: 从[Issues](https://github.com/yourusername/deep-excavation/issues)中选择一个标记为`good first issue`的任务
2. **分配任务**: 在Issue中评论表示您想要处理这个问题
3. **开发**: 在您的fork中创建分支并开发
4. **测试**: 运行所有测试确保没有破坏现有功能
5. **提交PR**: 创建Pull Request并描述您的更改
6. **代码审查**: 响应审查意见并进行必要的修改
7. **合并**: PR被批准后将被合并到主分支

## 📋 Pull Request检查清单

在提交PR之前，请确保：

- [ ] 代码遵循项目的编码规范
- [ ] 添加了必要的测试
- [ ] 所有测试通过
- [ ] 更新了相关文档
- [ ] 提交信息清晰明了
- [ ] PR描述详细说明了更改内容

## 🏷️ 标签说明

我们使用以下标签来分类Issues和PRs：

- `bug`: Bug报告
- `enhancement`: 新功能或改进
- `documentation`: 文档相关
- `good first issue`: 适合新贡献者的简单任务
- `help wanted`: 需要社区帮助的问题
- `question`: 问题或讨论

## 📞 联系我们

如果您有任何问题，可以通过以下方式联系我们：

- 📧 邮箱: your.email@domain.com
- 💬 [GitHub Discussions](https://github.com/yourusername/deep-excavation/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/deep-excavation/issues)

## 🙏 致谢

感谢所有为此项目做出贡献的开发者！您的参与让这个项目变得更好。

---

再次感谢您的贡献！🎉
