@echo off
REM GitHub上传脚本 (Windows版)
REM 使用方法: upload_to_github.bat <github-username> <repository-name>

if "%~2"=="" (
    echo 使用方法: %0 ^<github-username^> ^<repository-name^>
    echo 示例: %0 myusername deep-excavation
    exit /b 1
)

set GITHUB_USER=%1
set REPO_NAME=%2
set GITHUB_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo 🚀 开始上传到GitHub...
echo 用户名: %GITHUB_USER%
echo 仓库名: %REPO_NAME%
echo URL: %GITHUB_URL%
echo.

REM 检查是否已经有远程仓库
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    echo 🔄 检测到已存在的远程仓库，更新URL...
    git remote set-url origin %GITHUB_URL%
) else (
    echo ➕ 添加远程仓库...
    git remote add origin %GITHUB_URL%
)

REM 检查是否有提交
for /f %%i in ('git rev-list --count HEAD 2^>nul') do set COMMIT_COUNT=%%i
if "%COMMIT_COUNT%"=="0" (
    echo ❌ 错误: 没有检测到任何提交，请先运行 git commit
    exit /b 1
)

REM 推送到GitHub
echo 📤 推送到GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ 成功上传到GitHub!
echo 🔗 仓库地址: %GITHUB_URL%
echo 🌐 网页地址: https://github.com/%GITHUB_USER%/%REPO_NAME%
echo.
echo 📋 后续步骤:
echo 1. 在GitHub上完善仓库描述和标签
echo 2. 设置GitHub Pages (如果需要)
echo 3. 配置GitHub Actions secrets (如果使用CI/CD)
echo 4. 邀请协作者 (如果是团队项目)

pause
