@echo off
echo.
echo ================================================
echo   Deep Excavation - Figma 集成最终测试
echo ================================================
echo.

cd /d "e:\Deep Excavation\frontend"

echo 📋 运行 Figma 集成测试...
"C:\Program Files\nodejs\node.exe" scripts/test-figma.js

echo.
echo 📁 检查生成的文件...
echo.

if exist ".env" (
    echo ✅ .env 配置文件存在
) else (
    echo ❌ .env 配置文件缺失
)

if exist "src\styles\tokens.json" (
    echo ✅ 设计令牌 JSON 文件存在
) else (
    echo ❌ 设计令牌 JSON 文件缺失
)

if exist "src\styles\tokens.ts" (
    echo ✅ 设计令牌 TypeScript 文件存在
) else (
    echo ❌ 设计令牌 TypeScript 文件缺失
)

if exist "src\styles\tokens.css" (
    echo ✅ 设计令牌 CSS 文件存在
) else (
    echo ❌ 设计令牌 CSS 文件缺失
)

if exist "src\components\theme\FigmaThemeProvider.tsx" (
    echo ✅ Figma 主题提供者存在
) else (
    echo ❌ Figma 主题提供者缺失
)

if exist "src\components\FigmaIntegrationDemo.tsx" (
    echo ✅ Figma 集成演示组件存在
) else (
    echo ❌ Figma 集成演示组件缺失
)

echo.
echo ================================================
echo   📋 快速使用指南
echo ================================================
echo.
echo 1. 导入设计令牌:
echo    import ^{ tokens ^} from './styles/tokens';
echo.
echo 2. 使用 CSS 变量:
echo    color: var(--color-primary);
echo.
echo 3. 使用主题提供者:
echo    ^<FigmaThemeProvider^>^<App /^>^</FigmaThemeProvider^>
echo.
echo ================================================
echo   🎉 Figma 集成测试完成！
echo ================================================
echo.
pause
