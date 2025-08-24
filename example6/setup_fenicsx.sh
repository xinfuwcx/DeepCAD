#!/bin/bash
# 直接安装FEniCSx的简化脚本

echo "🚀 开始FEniCSx快速安装..."

# 1. 检查或安装miniconda
if [ ! -d "$HOME/miniconda3" ]; then
    echo "📦 下载安装Miniconda..."
    cd /tmp
    wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
    bash Miniconda3-latest-Linux-x86_64.sh -b -p $HOME/miniconda3
    rm Miniconda3-latest-Linux-x86_64.sh
fi

# 2. 设置环境变量
export PATH="$HOME/miniconda3/bin:$PATH"
source $HOME/miniconda3/etc/profile.d/conda.sh

# 3. 初始化conda
$HOME/miniconda3/bin/conda init bash

# 4. 创建环境
echo "🌍 创建FEniCSx环境..."
$HOME/miniconda3/bin/conda create -n fenicsx-2025 python=3.11 -y

# 5. 激活并安装
echo "🔥 安装FEniCSx 2025..."
$HOME/miniconda3/bin/conda activate fenicsx-2025

$HOME/miniconda3/bin/conda install -n fenicsx-2025 -c conda-forge -y \
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
    mpi4py \
    petsc4py

# 6. 创建激活脚本
echo "📝 创建激活脚本..."
cat > $HOME/activate_fenicsx.sh << 'EOF'
#!/bin/bash
export PATH="$HOME/miniconda3/bin:$PATH"
source $HOME/miniconda3/etc/profile.d/conda.sh
conda activate fenicsx-2025
export FENICS_PREFIX=$CONDA_PREFIX
echo "✅ FEniCSx 2025环境已激活"
echo "Python: $(which python)"
EOF

chmod +x $HOME/activate_fenicsx.sh

# 7. 测试安装
echo "🧪 测试FEniCSx安装..."
source $HOME/activate_fenicsx.sh

python3 << 'PYTHON_TEST'
try:
    import dolfinx
    import basix
    import ufl
    import mpi4py
    import gmsh
    print("✅ FEniCSx 2025 安装成功!")
    print(f"DOLFINx版本: {dolfinx.__version__}")
    print(f"UFL版本: {ufl.__version__}")
    print(f"Basix版本: {basix.__version__}")
    
    # 简单功能测试
    from mpi4py import MPI
    import numpy as np
    
    domain = dolfinx.mesh.create_unit_square(
        MPI.COMM_WORLD, 5, 5, dolfinx.mesh.CellType.triangle
    )
    print(f"测试网格: {domain.topology.index_map(2).size_local} 个单元")
    print("🎉 基础功能测试通过!")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    exit(1)
PYTHON_TEST

echo ""
echo "🎉 FEniCSx 2025安装完成!"
echo ""
echo "使用方法:"
echo "  激活环境: source ~/activate_fenicsx.sh"
echo "  运行测试: cd /mnt/e/DeepCAD/example6 && python fenicsx_scour_solver.py"