#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 环境设置和依赖检查脚本
自动检查和安装必要的依赖包
"""

import sys
import subprocess
import importlib
import platform
from pathlib import Path
from typing import List, Tuple, Dict, Any


class EnvironmentChecker:
    """环境检查器"""
    
    def __init__(self):
        self.python_version = sys.version_info
        self.platform_info = platform.platform()
        self.required_packages = self._get_required_packages()
        self.optional_packages = self._get_optional_packages()
        
    def _get_required_packages(self) -> Dict[str, str]:
        """获取必需的包列表"""
        return {
            'PyQt6': '6.4.0',
            'numpy': '1.24.0',
            'pandas': '2.0.0',
            'pyvista': '0.42.0',
            'pyvistaqt': '0.11.0',
            'vtk': '9.2.0',
            'scipy': '1.10.0',
            'pathlib2': '2.3.0',
            'requests': '2.28.0'
        }
    
    def _get_optional_packages(self) -> Dict[str, str]:
        """获取可选的包列表"""
        return {
            'KratosMultiphysics': '9.0.0',
            'gmsh': '4.11.0',
            'meshio': '5.3.0'
        }
    
    def check_python_version(self) -> Tuple[bool, str]:
        """检查Python版本"""
        if self.python_version < (3, 8):
            return False, f"Python版本过低: {sys.version}，需要Python 3.8+"
        elif self.python_version < (3, 10):
            return True, f"Python版本: {sys.version}，建议升级到3.10+"
        else:
            return True, f"Python版本: {sys.version} ✓"
    
    def check_package(self, package_name: str, min_version: str = None) -> Tuple[bool, str, str]:
        """
        检查单个包是否安装
        
        Returns:
            (是否安装, 当前版本, 状态消息)
        """
        try:
            module = importlib.import_module(package_name)
            
            # 获取版本信息
            version = "未知版本"
            for attr in ['__version__', 'version', 'VERSION']:
                if hasattr(module, attr):
                    version = getattr(module, attr)
                    break
            
            # 版本比较（简单实现）
            if min_version and version != "未知版本":
                try:
                    from packaging import version as pkg_version
                    if pkg_version.parse(str(version)) < pkg_version.parse(min_version):
                        return True, version, f"版本过低，需要 {min_version}+"
                except ImportError:
                    # 如果没有packaging包，跳过版本检查
                    pass
            
            return True, version, "✓"
            
        except ImportError:
            return False, "", "未安装"
        except Exception as e:
            return False, "", f"检查失败: {e}"
    
    def check_all_packages(self) -> Dict[str, Any]:
        """检查所有包的安装状态"""
        results = {
            'required': {},
            'optional': {},
            'missing_required': [],
            'missing_optional': []
        }
        
        print("检查必需的包...")
        for package, min_version in self.required_packages.items():
            installed, version, status = self.check_package(package, min_version)
            results['required'][package] = {
                'installed': installed,
                'version': version,
                'status': status,
                'min_version': min_version
            }
            
            if not installed:
                results['missing_required'].append(package)
            
            print(f"  {package:15} {version:15} {status}")
        
        print("\n检查可选的包...")
        for package, min_version in self.optional_packages.items():
            installed, version, status = self.check_package(package, min_version)
            results['optional'][package] = {
                'installed': installed,
                'version': version,
                'status': status,
                'min_version': min_version
            }
            
            if not installed:
                results['missing_optional'].append(package)
            
            print(f"  {package:15} {version:15} {status}")
        
        return results
    
    def install_package(self, package_name: str) -> Tuple[bool, str]:
        """安装单个包"""
        try:
            print(f"正在安装 {package_name}...")
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'install', package_name],
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
            
            if result.returncode == 0:
                return True, f"成功安装 {package_name}"
            else:
                return False, f"安装失败: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return False, f"安装超时: {package_name}"
        except Exception as e:
            return False, f"安装异常: {e}"
    
    def install_missing_packages(self, missing_packages: List[str]) -> Dict[str, bool]:
        """批量安装缺失的包"""
        results = {}
        
        for package in missing_packages:
            success, message = self.install_package(package)
            results[package] = success
            print(message)
            
            if not success:
                print(f"⚠️  {package} 安装失败，可能需要手动安装")
        
        return results
    
    def generate_install_command(self, missing_packages: List[str]) -> str:
        """生成安装命令"""
        if not missing_packages:
            return ""
        
        packages_with_versions = []
        for package in missing_packages:
            if package in self.required_packages:
                min_version = self.required_packages[package]
                packages_with_versions.append(f"{package}>={min_version}")
            elif package in self.optional_packages:
                min_version = self.optional_packages[package]
                packages_with_versions.append(f"{package}>={min_version}")
            else:
                packages_with_versions.append(package)
        
        return f"pip install {' '.join(packages_with_versions)}"
    
    def create_requirements_file(self, filepath: str = "requirements_generated.txt"):
        """创建requirements文件"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("# Example2 自动生成的依赖文件\n")
            f.write(f"# 生成时间: {platform.platform()}\n")
            f.write(f"# Python版本: {sys.version}\n\n")
            
            f.write("# 必需的包\n")
            for package, version in self.required_packages.items():
                f.write(f"{package}>={version}\n")
            
            f.write("\n# 可选的包\n")
            for package, version in self.optional_packages.items():
                f.write(f"# {package}>={version}\n")
        
        print(f"已生成requirements文件: {filepath}")


def main():
    """主函数"""
    print("=" * 60)
    print("Example2 - DeepCAD系统测试程序")
    print("环境检查和依赖安装工具")
    print("=" * 60)
    
    checker = EnvironmentChecker()
    
    # 检查Python版本
    python_ok, python_msg = checker.check_python_version()
    print(f"\nPython版本检查: {python_msg}")
    
    if not python_ok:
        print("❌ Python版本不符合要求，请升级Python")
        return False
    
    # 检查所有包
    print(f"\n平台信息: {checker.platform_info}")
    print("\n" + "=" * 60)
    
    results = checker.check_all_packages()
    
    # 显示总结
    print("\n" + "=" * 60)
    print("检查总结:")
    print(f"必需包: {len(checker.required_packages) - len(results['missing_required'])}/{len(checker.required_packages)} 已安装")
    print(f"可选包: {len(checker.optional_packages) - len(results['missing_optional'])}/{len(checker.optional_packages)} 已安装")
    
    # 处理缺失的包
    if results['missing_required']:
        print(f"\n❌ 缺少必需的包: {', '.join(results['missing_required'])}")
        
        # 询问是否自动安装
        try:
            response = input("\n是否自动安装缺失的必需包? (y/n): ").lower().strip()
            if response in ['y', 'yes', '是']:
                print("\n开始安装缺失的包...")
                install_results = checker.install_missing_packages(results['missing_required'])
                
                # 重新检查
                print("\n重新检查安装结果...")
                new_results = checker.check_all_packages()
                
                if not new_results['missing_required']:
                    print("✅ 所有必需的包已成功安装!")
                else:
                    print(f"⚠️  仍有包未安装: {', '.join(new_results['missing_required'])}")
            else:
                print("\n手动安装命令:")
                print(checker.generate_install_command(results['missing_required']))
                
        except KeyboardInterrupt:
            print("\n用户取消操作")
    
    if results['missing_optional']:
        print(f"\n💡 可选包未安装: {', '.join(results['missing_optional'])}")
        print("这些包提供额外功能，可根据需要安装")
        print("安装命令:")
        print(checker.generate_install_command(results['missing_optional']))
    
    # 生成requirements文件
    checker.create_requirements_file()
    
    # 最终状态
    if not results['missing_required']:
        print("\n✅ 环境检查完成，所有必需依赖已满足!")
        print("可以运行: python main.py")
        return True
    else:
        print("\n❌ 环境检查未通过，请安装缺失的依赖")
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n用户中断操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 环境检查过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
