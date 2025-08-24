#!/bin/bash
# FEniCSx 2025安装脚本 - 适用于WSL Ubuntu
# FEniCSx 2025 Installation Script for WSL Ubuntu

echo "🚀 开始安装FEniCSx 2025..."

# 1. 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 2. 安装必要的系统依赖
echo "🔧 安装系统依赖..."
sudo apt install -y \
    python3-dev \
    python3-pip \
    pkg-config \
    libopenmpi-dev \
    openmpi-bin \
    libhdf5-openmpi-dev \
    libpetsc-real-dev \
    libslepc-real-dev \
    gmsh \
    python3-gmsh \
    git \
    cmake \
    build-essential \
    libboost-dev \
    libboost-filesystem-dev \
    libboost-iostreams-dev \
    libboost-program-options-dev \
    libboost-system-dev \
    libboost-timer-dev \
    libeigen3-dev \
    libhdf5-dev \
    liblapack-dev \
    libparmetis-dev \
    libscotch-dev \
    libsuitesparse-dev \
    libtbb-dev \
    ninja-build

# 3. 升级pip
echo "⬆️ 升级pip..."
python3 -m pip install --upgrade pip

# 4. 安装Python依赖
echo "🐍 安装Python基础包..."
pip3 install --upgrade \
    numpy \
    scipy \
    matplotlib \
    meshio \
    h5py \
    mpi4py \
    petsc4py \
    slepc4py \
    pyvista \
    pygmsh

# 5. 使用conda安装FEniCSx (推荐方式)
echo "🔄 安装conda..."
if ! command -v conda &> /dev/null; then
    # 下载并安装Miniconda
    wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh
    bash miniconda.sh -b -p $HOME/miniconda3
    rm miniconda.sh
    
    # 添加conda到PATH
    echo 'export PATH="$HOME/miniconda3/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
    export PATH="$HOME/miniconda3/bin:$PATH"
    
    # 初始化conda
    conda init bash
fi

# 6. 创建FEniCSx环境
echo "🌍 创建FEniCSx 2025环境..."
conda create -n fenicsx-2025 -y python=3.11

# 7. 激活环境并安装FEniCSx
echo "🔥 安装FEniCSx 2025..."
source $HOME/miniconda3/bin/activate fenicsx-2025

# 安装FEniCSx及相关包
conda install -c conda-forge -y \
    fenics-dolfinx \
    fenics-basix \
    fenics-ufl \
    mpich \
    pyvista \
    meshio \
    gmsh \
    python-gmsh \
    h5py \
    matplotlib \
    numpy \
    scipy \
    jupyter

# 8. 测试安装
echo "🧪 测试FEniCSx安装..."
python3 -c "
try:
    import dolfinx
    import basix
    import ufl
    import mpi4py
    print('✅ FEniCSx 2025 安装成功!')
    print(f'DOLFINx版本: {dolfinx.__version__}')
    print(f'UFL版本: {ufl.__version__}')
    print(f'Basix版本: {basix.__version__}')
except ImportError as e:
    print(f'❌ 安装失败: {e}')
    exit(1)
"

# 9. 创建激活脚本
echo "📝 创建激活脚本..."
cat > ~/activate_fenicsx.sh << 'EOF'
#!/bin/bash
# FEniCSx 2025环境激活脚本
source $HOME/miniconda3/bin/activate fenicsx-2025
export FENICS_PREFIX=$CONDA_PREFIX
export PYTHONPATH=$CONDA_PREFIX/lib/python3.11/site-packages:$PYTHONPATH
echo "✅ FEniCSx 2025环境已激活"
echo "当前Python: $(which python)"
echo "当前环境: $CONDA_DEFAULT_ENV"
EOF

chmod +x ~/activate_fenicsx.sh

# 10. 创建简单测试脚本
echo "🔬 创建测试脚本..."
cat > ~/test_fenicsx.py << 'EOF'
#!/usr/bin/env python3
"""
FEniCSx 2025功能测试脚本
"""

import numpy as np
from mpi4py import MPI
import dolfinx
import dolfinx.mesh
import dolfinx.fem
import dolfinx.io
import ufl

def test_basic_functionality():
    """测试基本功能"""
    print("🧪 测试FEniCSx基本功能...")
    
    # 创建简单网格
    domain = dolfinx.mesh.create_unit_square(
        MPI.COMM_WORLD, 10, 10, dolfinx.mesh.CellType.triangle
    )
    print(f"✅ 网格创建成功: {domain.topology.index_map(2).size_local} 个单元")
    
    # 定义函数空间
    V = dolfinx.fem.FunctionSpace(domain, ("CG", 1))
    print(f"✅ 函数空间创建成功: {V.dofmap.index_map.size_local} 个自由度")
    
    # 定义简单问题 (Poisson方程)
    u = ufl.TrialFunction(V)
    v = ufl.TestFunction(V)
    
    # 边界条件
    def boundary(x):
        return np.logical_or(
            np.isclose(x[0], 0), np.isclose(x[0], 1)
        )
    
    boundary_dofs = dolfinx.fem.locate_dofs_geometrical(V, boundary)
    u_bc = dolfinx.fem.Function(V)
    u_bc.x.array[:] = 0.0
    
    bc = dolfinx.fem.dirichletbc(u_bc, boundary_dofs)
    
    # 变分形式
    a = ufl.dot(ufl.grad(u), ufl.grad(v)) * ufl.dx
    L = dolfinx.fem.Constant(domain, 1.0) * v * ufl.dx
    
    # 求解
    problem = dolfinx.fem.petsc.LinearProblem(
        a, L, bcs=[bc], petsc_options={"ksp_type": "preonly", "pc_type": "lu"}
    )
    
    uh = problem.solve()
    print("✅ Poisson方程求解成功")
    
    # 保存结果
    with dolfinx.io.VTKFile(MPI.COMM_WORLD, "test_result.pvd", "w") as file:
        file.write_function(uh)
    
    print("✅ VTK结果文件保存成功: test_result.pvd")
    
    return True

def test_navier_stokes_setup():
    """测试Navier-Stokes方程设置"""
    print("🌊 测试Navier-Stokes方程设置...")
    
    # 创建2D矩形域
    domain = dolfinx.mesh.create_rectangle(
        MPI.COMM_WORLD,
        [np.array([-2, -1]), np.array([6, 1])],
        [40, 10],
        dolfinx.mesh.CellType.triangle
    )
    
    # Taylor-Hood元素 (P2-P1)
    P2 = ufl.VectorElement("Lagrange", domain.ufl_cell(), 2)
    P1 = ufl.FiniteElement("Lagrange", domain.ufl_cell(), 1)
    TH = ufl.MixedElement([P2, P1])
    
    W = dolfinx.fem.FunctionSpace(domain, TH)
    print(f"✅ Taylor-Hood混合空间创建成功: {W.dofmap.index_map.size_local} 个自由度")
    
    return True

if __name__ == "__main__":
    print("🚀 开始FEniCSx 2025测试...")
    print("=" * 50)
    
    try:
        test_basic_functionality()
        test_navier_stokes_setup()
        
        print("=" * 50)
        print("🎉 所有测试通过! FEniCSx 2025安装成功并可以正常工作")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
EOF

# 11. 最终信息
echo ""
echo "🎉 FEniCSx 2025安装完成!"
echo ""
echo "📋 使用方法:"
echo "1. 激活环境: source ~/activate_fenicsx.sh"
echo "2. 运行测试: python3 ~/test_fenicsx.py"
echo "3. 验证安装: python3 -c 'import dolfinx; print(dolfinx.__version__)'"
echo ""
echo "🔧 环境信息:"
echo "   - FEniCSx环境名称: fenicsx-2025"
echo "   - Python版本: 3.11"
echo "   - 激活脚本: ~/activate_fenicsx.sh"
echo "   - 测试脚本: ~/test_fenicsx.py"
echo ""
echo "💡 提示: 重新打开终端后需要运行 'source ~/activate_fenicsx.sh' 来激活环境"