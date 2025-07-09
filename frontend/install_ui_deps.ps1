# install_ui_deps.ps1

# 1. 将 Node.js 的正确路径添加到当前终端会话的环境变量中
# 这能确保 npm 和 npx 命令可以被找到
$env:Path = "C:\Program Files\nodejs;" + $env:Path

# 2. 打印 Node.js 和 npm 的版本，以确认环境已设置正确
Write-Host "Verifying Node.js and npm versions..."
node --version
npm --version

# 3. 安装 FusionUI 所需的核心依赖
Write-Host "Installing FusionUI dependencies..."
npm install framer-motion @headlessui/react clsx tailwind-merge daisyui react-icons

# 4. 提示用户脚本执行完成
Write-Host "UI dependencies installation complete. You can now continue with the setup." 