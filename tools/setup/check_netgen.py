#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Netgen安装检查脚本
检查Netgen是否正确安装并能够生成简单的网格
"""

import os
import platform


def check_netgen_installation():
    """检查Netgen是否已正确安装"""
    print("正在检查Netgen安装状态...")
    
    try:
        import netgen
        print(f"Netgen版本: {netgen.__version__}")
        print("Netgen安装正常！")
        return True
    except ImportError as e:
        print(f"无法导入Netgen模块: {e}")
        print("请确保已安装netgen-mesher包")
        return False


def create_simple_mesh():
    """创建一个简单的立方体网格"""
    try:
        import netgen.meshing as ngmesh
        import netgen.csg as csg
        
        print("创建简单立方体网格...")
        
        # 创建一个立方体
        cube = csg.OrthoBrick(csg.Pnt(-1, -1, -1), csg.Pnt(1, 1, 1))
        
        # 设置网格参数
        mesh_params = ngmesh.MeshingParameters(maxh=0.3)
        
        # 生成网格
        mesh = ngmesh.GenerateMesh(cube, mesh_params)
        
        # 输出网格信息
        print("网格生成成功!")
        print(f"节点数: {mesh.nv}")
        print(f"单元数: {mesh.ne}")
        
        # 保存网格
        output_dir = "data/mesh"
        os.makedirs(output_dir, exist_ok=True)
        mesh.Export(os.path.join(output_dir, "simple_cube.vol"), "Netgen")
        print(f"网格已保存到 {os.path.join(output_dir, 'simple_cube.vol')}")
        
        return True
    except Exception as e:
        print(f"创建网格时出错: {e}")
        return False


def check_netgen_gui():
    """检查Netgen GUI是否可用"""
    try:
        # 仅检查模块是否可导入
        import netgen.gui  # noqa: F401
        print("Netgen GUI 模块可用")
        return True
    except ImportError:
        print("Netgen GUI 模块不可用 (这在某些环境中是正常的)")
        return False


def main():
    """主函数"""
    print("=" * 50)
    print("Netgen检查工具")
    print("=" * 50)
    print(f"Python版本: {platform.python_version()}")
    print(f"操作系统: {platform.system()} {platform.release()}")
    print("-" * 50)
    
    if check_netgen_installation():
        create_simple_mesh()
        check_netgen_gui()
    
    print("=" * 50)


if __name__ == "__main__":
    main() 