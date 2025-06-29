@echo off
echo ====================================
echo   Deep Excavation - Figma 集成测试
echo ====================================
echo.

echo 检查 Node.js...
"C:\Program Files\nodejs\node.exe" --version
if errorlevel 1 (
    echo ❌ Node.js 未找到
    pause
    exit /b 1
)

echo.
echo 检查 npm...
"C:\Program Files\nodejs\npm.cmd" --version
if errorlevel 1 (
    echo ❌ npm 未找到
    pause
    exit /b 1
)

echo.
echo 安装依赖包...
"C:\Program Files\nodejs\npm.cmd" install

echo.
echo 检查 Figma 配置...
if not exist .env (
    echo ❌ .env 文件不存在
    pause
    exit /b 1
)

echo ✅ .env 文件存在

echo.
echo 测试 Figma 令牌同步...
"C:\Program Files\nodejs\npm.cmd" run figma:tokens

echo.
echo 生成组件...
"C:\Program Files\nodejs\npm.cmd" run figma:components

echo.
echo 完整同步...
"C:\Program Files\nodejs\npm.cmd" run figma:sync

echo.
echo ====================================
echo   测试完成！
echo ====================================
echo.
echo 查看生成的文件:
echo   - src/styles/tokens/
echo   - src/components/figma-generated/
echo   - figma-sync-report.md
echo.
pause
