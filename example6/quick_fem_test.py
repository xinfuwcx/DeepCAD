#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys

# Fix Windows console encoding
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
"""
FEniCSx快速测试脚本
Quick FEniCSx Test Script

验证安装和基本功能
"""

import subprocess
import sys
import json
import time

def test_wsl_fenicsx():
    """测试WSL中的FEniCSx"""
    
    print("🧪 测试WSL中的FEniCSx...")
    
    # 创建测试脚本
    test_script = """
import sys
sys.path.insert(0, '/mnt/e/DeepCAD/example6')

try:
    # 设置环境
    import os
    os.environ['PATH'] = os.path.expanduser('~') + '/miniconda3/envs/fenicsx-2025/bin:' + os.environ.get('PATH', '')
    
    # 导入FEniCSx
    import dolfinx
    import dolfinx.mesh
    import dolfinx.fem
    from mpi4py import MPI
    import ufl
    import numpy as np
    
    print("✅ FEniCSx模块导入成功")
    print(f"DOLFINx版本: {dolfinx.__version__}")
    
    # 创建简单测试网格
    domain = dolfinx.mesh.create_unit_square(
        MPI.COMM_WORLD, 5, 5, dolfinx.mesh.CellType.triangle
    )
    
    print(f"✅ 网格创建成功: {domain.topology.index_map(2).size_local} 个单元")
    
    # 定义简单函数空间
    V = dolfinx.fem.FunctionSpace(domain, ("CG", 1))
    print(f"✅ 函数空间创建: {V.dofmap.index_map.size_local} 个自由度")
    
    # 测试基本求解
    u = ufl.TrialFunction(V)
    v = ufl.TestFunction(V)
    
    # 简单Poisson问题
    a = ufl.dot(ufl.grad(u), ufl.grad(v)) * ufl.dx
    L = dolfinx.fem.Constant(domain, 1.0) * v * ufl.dx
    
    # 边界条件
    def boundary(x):
        return np.logical_or(np.isclose(x[0], 0), np.isclose(x[0], 1))
    
    boundary_dofs = dolfinx.fem.locate_dofs_geometrical(V, boundary)
    u_bc = dolfinx.fem.Function(V)
    u_bc.x.array[:] = 0.0
    
    bc = dolfinx.fem.dirichletbc(u_bc, boundary_dofs)
    
    # 求解
    problem = dolfinx.fem.petsc.LinearProblem(
        a, L, bcs=[bc],
        petsc_options={"ksp_type": "preonly", "pc_type": "lu"}
    )
    
    uh = problem.solve()
    print("✅ Poisson方程求解成功")
    
    # 保存结果到VTK
    with dolfinx.io.VTKFile(MPI.COMM_WORLD, "/tmp/test_result.pvd", "w") as file:
        file.write_function(uh)
    
    print("✅ VTK文件保存成功")
    
    print("FENICSX_TEST_SUCCESS")
    
except ImportError as e:
    print(f"IMPORT_ERROR: {e}")
except Exception as e:
    print(f"TEST_ERROR: {e}")
    import traceback
    traceback.print_exc()
"""
    
    try:
        # 执行测试
        cmd = [
            "wsl", "-e", "bash", "-c",
            f"cd /mnt/e/DeepCAD/example6 && export PATH=\"$HOME/miniconda3/envs/fenicsx-2025/bin:$PATH\" && python3 -c '{test_script}'"
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(f"📤 返回码: {result.returncode}")
        print(f"📤 输出:\n{result.stdout}")
        
        if result.stderr:
            print(f"❌ 错误:\n{result.stderr}")
        
        if "FENICSX_TEST_SUCCESS" in result.stdout:
            print("🎉 FEniCSx测试成功!")
            return True
        else:
            print("❌ FEniCSx测试失败")
            return False
    
    except Exception as e:
        print(f"❌ 测试执行失败: {e}")
        return False

def test_fem_interface():
    """测试FEM接口"""
    
    print("🔧 测试FEM接口...")
    
    try:
        from fem_interface import FEMInterface
        
        interface = FEMInterface()
        
        print(f"WSL可用: {interface.wsl_available}")
        print(f"FEniCSx可用: {interface.fenicsx_available}")
        
        return interface.fenicsx_available
        
    except Exception as e:
        print(f"❌ FEM接口测试失败: {e}")
        return False

def main():
    """主测试函数"""
    
    print("🚀 FEniCSx 2025 快速测试")
    print("=" * 50)
    
    # 测试1: WSL中的FEniCSx
    fenicsx_ok = test_wsl_fenicsx()
    
    # 测试2: FEM接口
    interface_ok = test_fem_interface()
    
    print("\n" + "=" * 50)
    print("📊 测试结果总结")
    print("=" * 50)
    
    print(f"FEniCSx基础功能: {'✅ 通过' if fenicsx_ok else '❌ 失败'}")
    print(f"FEM接口: {'✅ 通过' if interface_ok else '❌ 失败'}")
    
    if fenicsx_ok and interface_ok:
        print("\n🎉 所有测试通过! FEM系统可以使用")
        print("\n🚀 下一步:")
        print("   python run_fem_complete.py  # 运行完整FEM分析")
        return True
    else:
        print("\n❌ 部分测试失败，需要检查安装")
        if not fenicsx_ok:
            print("   请等待FEniCSx安装完成")
        return False

if __name__ == "__main__":
    main()