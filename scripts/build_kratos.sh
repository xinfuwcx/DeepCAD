# Kratos编译脚本 - Linux/macOS版本
# 深基坑工程专用，包含IGA、优化、地质力学等模块

#!/bin/bash

echo "======================================"
echo "Kratos编译脚本 - 深基坑工程专用"
echo "包含IGA、优化、地质力学等模块"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} $1 未安装或未添加到PATH"
        echo "请先安装 $1"
        exit 1
    else
        echo -e "${GREEN}[OK]${NC} $1 可用"
    fi
}

# 检查环境
echo -e "${BLUE}[INFO]${NC} 检查编译环境..."
check_command python3
check_command cmake
check_command git
check_command gcc

# 检查Python版本
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo -e "${GREEN}[OK]${NC} Python版本: $python_version"

if (( $(echo "$python_version < 3.7" | bc -l) )); then
    echo -e "${RED}[ERROR]${NC} Python版本过低，需要3.7或更高版本"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} 环境检查完成，开始编译..."
echo

# 运行Python编译脚本
python3 tools/setup/build_kratos_quick.py

if [ $? -ne 0 ]; then
    echo
    echo -e "${RED}[ERROR]${NC} 编译失败！"
    echo "请检查上述错误信息"
    exit 1
fi

echo
echo -e "${GREEN}[SUCCESS]${NC} Kratos编译完成！"
echo "请运行 source setup_kratos_env.sh 设置环境变量"
echo
