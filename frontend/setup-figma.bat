@echo off
echo ========================================
echo   Deep Excavation - Figma 集成设置
echo ========================================
echo.

cd /d "%~dp0"

echo 🎨 开始自动配置 Figma 集成...
echo.

echo 📦 安装依赖包...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

echo.
echo 🔧 运行 Figma 自动配置...
call npm run figma:setup
if errorlevel 1 (
    echo ❌ Figma 配置失败
    echo.
    echo 💡 手动配置步骤:
    echo 1. 编辑 .env 文件
    echo 2. 设置 FIGMA_FILE_ID 为您的 Figma 文件 ID
    echo 3. 运行: npm run figma:sync
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Figma 集成配置完成！
echo.
echo 🚀 下一步操作:
echo 1. 如果需要，请在 .env 文件中设置 FIGMA_FILE_ID
echo 2. 运行: npm run figma:sync 来同步设计系统
echo 3. 运行: npm run dev 来启动开发服务器
echo.
echo 📚 查看文档: FIGMA_SETUP.md
echo.

pause
