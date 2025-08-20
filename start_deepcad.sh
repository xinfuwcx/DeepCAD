#!/bin/bash
# DeepCAD Professional CAE System 启动脚本 (Linux/macOS)

echo "======================================================"
echo " DeepCAD Professional CAE System v2.0"
echo " 专业级工程分析平台"
echo "======================================================"
echo

# 检查Python是否可用
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "错误: 未找到Python解释器"
        echo "请确保Python 3.8+已安装"
        echo
        echo "Ubuntu/Debian: sudo apt install python3"
        echo "CentOS/RHEL: sudo yum install python3"
        echo "macOS: brew install python3"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

# 显示Python版本
echo "检测到Python版本:"
$PYTHON_CMD --version
echo

# 切换到脚本目录
cd "$(dirname "$0")"

# 检查虚拟环境
if [ -d "venv" ]; then
    echo "检测到虚拟环境，正在激活..."
    source venv/bin/activate
    echo "虚拟环境已激活"
    echo
fi

# 启动应用程序
echo "正在启动DeepCAD Professional CAE System..."
echo
$PYTHON_CMD start_deepcad.py

# 检查退出代码
if [ $? -ne 0 ]; then
    echo
    echo "程序异常退出，错误代码: $?"
    read -p "按Enter键退出..."
fi