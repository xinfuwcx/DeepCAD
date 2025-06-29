# 深基坑分析系统安装指南

本文档提供深基坑分析系统的详细安装步骤，包括环境配置、依赖安装和系统启动。

## 1. 系统要求

### 1.1 硬件要求
- **处理器**: 至少4核CPU，推荐8核或更多
- **内存**: 至少8GB RAM，推荐16GB或更多
- **存储**: 至少20GB可用空间
- **显卡**: 支持OpenGL 4.0的显卡（用于3D可视化）

### 1.2 软件要求
- **操作系统**:
  - Windows 10/11 64位
  - Ubuntu 20.04/22.04 LTS
  - macOS 11.0+
- **Python**: 3.9+
- **Node.js**: 18+
- **C++编译器**: 
  - Windows: Visual Studio 2019/2022 with C++ workload
  - Linux: GCC 9.0+
  - macOS: Clang 12.0+

## 2. 基础环境配置

### 2.1 Python环境

#### Windows
```bash
# 下载并安装Python 3.9+
# 从 https://www.python.org/downloads/ 下载

# 验证安装
python --version
pip --version

# 创建虚拟环境
python -m venv env
.\env\Scripts\activate
```

#### Linux/macOS
```bash
# 安装Python
sudo apt update
sudo apt install python3 python3-pip python3-venv  # Ubuntu
# 或
brew install python  # macOS

# 验证安装
python3 --version
pip3 --version

# 创建虚拟环境
python3 -m venv env
source env/bin/activate
```

### 2.2 Node.js环境

#### Windows
```bash
# 从 https://nodejs.org/ 下载并安装Node.js 18+

# 验证安装
node --version
npm --version
```

#### Linux/macOS
```bash
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# macOS
brew install node@18

# 验证安装
node --version
npm --version
```

## 3. Netgen安装

Netgen是系统使用的网格生成工具，需要单独安装。

### 3.1 Windows安装

1. 从官方网站下载Netgen安装包: https://ngsolve.org/downloads
2. 运行安装程序，按照向导完成安装
3. 将Netgen添加到系统PATH环境变量
4. 验证安装:
   ```bash
   netgen --version
   ```

### 3.2 Linux安装

```bash
# Ubuntu
sudo apt-get update
sudo apt-get install netgen netgen-dev

# 验证安装
netgen --version
```

### 3.3 macOS安装

```bash
# 使用Homebrew安装
brew install netgen

# 验证安装
netgen --version
```

### 3.4 从源码编译(高级用户)

如果预编译版本不可用，可以从源码编译:

```bash
git clone https://github.com/NGSolve/netgen.git
cd netgen
mkdir build && cd build
cmake ..
make -j4
sudo make install
```

## 4. Kratos Multiphysics安装

Kratos是系统的核心计算引擎，需要从源码编译。

### 4.1 使用自动化脚本安装

我们提供了自动化脚本简化Kratos的安装过程:

#### Windows
```bash
# 确保已安装Visual Studio 2019/2022 with C++ workload
scripts\build_kratos_extended.bat
```

#### Linux/macOS
```bash
# 确保已安装必要的编译工具
bash scripts/build_kratos_extended.sh
```

### 4.2 手动安装

如果自动化脚本不适用于您的环境，可以按照以下步骤手动安装:

1. 安装依赖:
   ```bash
   # Windows (使用vcpkg)
   vcpkg install boost-filesystem boost-system boost-program-options boost-python

   # Ubuntu
   sudo apt-get install libboost-all-dev python3-dev
   
   # macOS
   brew install boost python
   ```

2. 克隆Kratos仓库:
   ```bash
   git clone https://github.com/KratosMultiphysics/Kratos.git
   cd Kratos
   ```

3. 配置和编译:
   ```bash
   # 创建build目录
   mkdir build
   cd build
   
   # 配置
   cmake .. \
     -DCMAKE_BUILD_TYPE=Release \
     -DUSE_MPI=OFF \
     -DUSE_EIGEN_MKL=OFF \
     -DUSE_METIS=OFF \
     -DUSE_TRILINOS=OFF \
     -DKRATOS_BUILD_TESTING=OFF \
     -DKRATOS_APPLICATIONS="StructuralMechanicsApplication;ConvectionDiffusionApplication;FluidDynamicsApplication"
   
   # 编译
   cmake --build . -j4
   ```

## 5. 系统安装

### 5.1 克隆代码仓库

```bash
git clone https://github.com/your-organization/deep-excavation.git
cd deep-excavation
```

### 5.2 安装Python依赖

```bash
# 激活虚拟环境
# Windows
.\env\Scripts\activate
# Linux/macOS
source env/bin/activate

# 安装依赖
pip install -r requirements.minimal.txt
```

### 5.3 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

## 6. 配置系统

### 6.1 配置数据库

默认情况下，系统使用SQLite数据库，无需额外配置。如需使用PostgreSQL:

1. 安装PostgreSQL
2. 创建数据库和用户
3. 更新配置文件:
   ```bash
   # 编辑 src/server/config.py
   DATABASE_URL = "postgresql://username:password@localhost/dbname"
   ```

### 6.2 配置计算引擎

确保Kratos路径正确设置:

```bash
# 编辑 src/config/excavation_config.py
KRATOS_PATH = "/path/to/kratos"  # 修改为实际路径
```

### 6.3 配置Netgen

确保Netgen可执行文件在系统PATH中，或在配置文件中指定路径:

```bash
# 编辑 src/config/excavation_config.py
NETGEN_PATH = "/path/to/netgen"  # 修改为实际路径
```

## 7. 启动系统

### 7.1 启动后端服务

```bash
# 激活虚拟环境
# Windows
.\env\Scripts\activate
# Linux/macOS
source env/bin/activate

# 启动后端
python -m src.server.app
```

后端服务将在 http://localhost:8000 启动。

### 7.2 启动前端服务

```bash
cd frontend
npm run dev
```

前端服务将在 http://localhost:3000 启动。

### 7.3 使用启动脚本

我们提供了一键启动脚本:

#### Windows
```bash
scripts\start_system.bat
```

#### Linux/macOS
```bash
bash scripts/start_system.sh
```

## 8. 验证安装

1. 打开浏览器访问 http://localhost:3000
2. 登录系统 (默认用户名: admin, 密码: admin)
3. 创建新项目并尝试简单的分析任务

## 9. 常见问题

### 9.1 Netgen安装问题

**问题**: Netgen安装后无法找到可执行文件
**解决方案**: 确保Netgen已添加到系统PATH，或在配置文件中指定完整路径

### 9.2 Kratos编译问题

**问题**: Kratos编译失败
**解决方案**: 
- 检查是否安装了所有依赖
- 确保使用了兼容的编译器版本
- 查看详细的编译日志定位问题

### 9.3 前端依赖安装问题

**问题**: npm install 报错
**解决方案**:
- 清除npm缓存: `npm cache clean --force`
- 使用镜像源: `npm install --registry=https://registry.npm.taobao.org`

### 9.4 系统启动问题

**问题**: 后端服务无法启动
**解决方案**:
- 检查端口是否被占用
- 检查Python依赖是否正确安装
- 查看日志文件了解详细错误信息

## 10. 附录

### 10.1 系统目录结构

```
deep-excavation/
├── data/               # 数据文件
├── docs/               # 文档
├── frontend/           # 前端代码
├── logs/               # 日志文件
├── scripts/            # 脚本文件
├── src/                # 后端源代码
├── tools/              # 工具脚本
├── requirements.txt    # Python依赖
└── README.md           # 项目说明
```

### 10.2 参考资源

- [Netgen官方文档](https://ngsolve.org/docu/latest/)
- [Kratos Multiphysics文档](https://kratosmultiphysics.github.io/Kratos/)
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [React文档](https://reactjs.org/docs/getting-started.html)

### 10.3 联系支持

如遇到安装问题，请联系技术支持:
- 邮箱: support@example.com
- 问题追踪: https://github.com/your-organization/deep-excavation/issues 