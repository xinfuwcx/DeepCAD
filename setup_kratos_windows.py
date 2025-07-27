#!/usr/bin/env python
"""
Windows环境下的Kratos集成配置脚本
使用已编译的Kratos核心 + pip安装应用模块
"""

import sys
import os
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class WindowsKratosManager:
    """Windows环境下的Kratos管理器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.kratos_paths = self._detect_kratos_paths()
        self.python_executable = sys.executable
        
    def _detect_kratos_paths(self) -> Dict[str, Path]:
        """检测Kratos安装路径"""
        paths = {}
        
        # 检测已编译的Kratos路径
        possible_kratos_dirs = [
            self.project_root / "core" / "kratos_source" / "kratos" / "bin" / "Release",
            self.project_root / "core" / "kratos_install",
            Path("C:/Kratos"),  # 常见安装路径
        ]
        
        for kratos_dir in possible_kratos_dirs:
            if kratos_dir.exists():
                paths['kratos_bin'] = kratos_dir
                logger.info(f"✅ 找到Kratos编译目录: {kratos_dir}")
                break
        
        # 检测Python包路径
        python_site_packages = Path(sys.executable).parent / "Lib" / "site-packages"
        if python_site_packages.exists():
            paths['site_packages'] = python_site_packages
            
        return paths
    
    def setup_kratos_environment(self) -> bool:
        """设置Kratos环境"""
        logger.info("🔧 配置Kratos环境...")
        
        if 'kratos_bin' not in self.kratos_paths:
            logger.error("❌ 未找到已编译的Kratos，请先完成Kratos核心编译")
            return False
        
        kratos_bin = self.kratos_paths['kratos_bin']
        
        # 1. 添加Kratos到Python路径
        kratos_python_path = kratos_bin / "KratosMultiphysics"
        if kratos_python_path.exists():
            if str(kratos_bin) not in sys.path:
                sys.path.insert(0, str(kratos_bin))
                logger.info(f"✅ 添加Kratos Python路径: {kratos_bin}")
        
        # 2. 设置环境变量
        kratos_libs = kratos_bin / "libs"
        if kratos_libs.exists():
            current_path = os.environ.get('PATH', '')
            if str(kratos_libs) not in current_path:
                os.environ['PATH'] = str(kratos_libs) + os.pathsep + current_path
                logger.info(f"✅ 添加Kratos库路径到PATH: {kratos_libs}")
        
        # 3. 设置Kratos数据目录
        kratos_data_dir = self.project_root / "core" / "kratos_source" / "kratos" / "kratos"
        if kratos_data_dir.exists():
            os.environ['KRATOS_DATA_DIR'] = str(kratos_data_dir)
            logger.info(f"✅ 设置KRATOS_DATA_DIR: {kratos_data_dir}")
        
        return True
    
    def test_kratos_core(self) -> bool:
        """测试Kratos核心是否可用"""
        logger.info("🧪 测试Kratos核心...")
        
        try:
            import KratosMultiphysics
            logger.info("✅ Kratos核心导入成功")
            
            # 测试基本功能
            model = KratosMultiphysics.Model()
            model_part = model.CreateModelPart("test")
            logger.info("✅ Kratos基本功能测试通过")
            
            # 获取版本信息
            version = getattr(KratosMultiphysics, '__version__', 'unknown')
            logger.info(f"📋 Kratos版本: {version}")
            
            return True
            
        except ImportError as e:
            logger.error(f"❌ Kratos核心导入失败: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Kratos功能测试失败: {e}")
            return False
    
    def install_application_modules(self) -> bool:
        """安装Kratos应用模块"""
        logger.info("📦 安装Kratos应用模块...")
        
        # 检查pip是否可用
        try:
            subprocess.run([self.python_executable, '-m', 'pip', '--version'], 
                         check=True, capture_output=True)
            logger.info("✅ pip可用")
        except subprocess.CalledProcessError:
            logger.error("❌ pip不可用，无法安装应用模块")
            return False
        
        # 需要安装的模块列表
        modules_to_install = [
            "KratosMultiphysics[GeoMechanicsApplication]",
            "KratosMultiphysics[StructuralMechanicsApplication]", 
            "KratosMultiphysics[FluidDynamicsApplication]"
        ]
        
        success_count = 0
        
        for module in modules_to_install:
            if self._install_single_module(module):
                success_count += 1
        
        logger.info(f"📊 安装结果: {success_count}/{len(modules_to_install)} 模块安装成功")
        return success_count > 0
    
    def _install_single_module(self, module_name: str) -> bool:
        """安装单个模块"""
        logger.info(f"📦 安装模块: {module_name}")
        
        try:
            # 尝试通过pip安装
            cmd = [self.python_executable, '-m', 'pip', 'install', '--upgrade', module_name]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info(f"✅ {module_name} 安装成功")
                return True
            else:
                logger.warning(f"⚠️ {module_name} 安装失败: {result.stderr}")
                
                # 尝试备选安装方法
                return self._try_alternative_install(module_name)
                
        except subprocess.TimeoutExpired:
            logger.error(f"❌ {module_name} 安装超时")
            return False
        except Exception as e:
            logger.error(f"❌ {module_name} 安装异常: {e}")
            return False
    
    def _try_alternative_install(self, module_name: str) -> bool:
        """尝试备选安装方法"""
        # 如果主包安装失败，尝试安装基础KratosMultiphysics
        if "KratosMultiphysics" in module_name:
            try:
                cmd = [self.python_executable, '-m', 'pip', 'install', 'KratosMultiphysics']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    logger.info("✅ 基础KratosMultiphysics安装成功")
                    return True
                    
            except Exception as e:
                logger.warning(f"⚠️ 备选安装也失败: {e}")
        
        return False
    
    def test_all_modules(self) -> Dict[str, bool]:
        """测试所有模块"""
        logger.info("🧪 测试所有Kratos模块...")
        
        modules_to_test = {
            'KratosMultiphysics': '核心模块',
            'KratosMultiphysics.GeoMechanicsApplication': '地质力学',
            'KratosMultiphysics.StructuralMechanicsApplication': '结构力学',
            'KratosMultiphysics.FluidDynamicsApplication': '流体力学',
            'KratosMultiphysics.LinearSolversApplication': '线性求解器',
            'KratosMultiphysics.OptimizationApplication': '优化算法',
            'KratosMultiphysics.FSIApplication': '流固耦合'
        }
        
        results = {}
        
        for module_name, description in modules_to_test.items():
            try:
                __import__(module_name)
                logger.info(f"✅ {description} ({module_name}) - 可用")
                results[module_name] = True
            except ImportError:
                logger.warning(f"❌ {description} ({module_name}) - 不可用")
                results[module_name] = False
        
        return results
    
    def create_startup_script(self) -> bool:
        """创建Kratos启动脚本"""
        logger.info("📜 创建Kratos启动脚本...")
        
        if 'kratos_bin' not in self.kratos_paths:
            logger.error("❌ 未找到Kratos路径，无法创建启动脚本")
            return False
        
        script_content = f'''@echo off
REM Kratos环境启动脚本 - Windows版本
REM 自动生成于DeepCAD项目

echo ========================================
echo DeepCAD Kratos环境配置
echo ========================================

REM 设置Kratos路径
set KRATOS_ROOT={self.kratos_paths['kratos_bin']}
set KRATOS_DATA_DIR={self.project_root / "core" / "kratos_source" / "kratos" / "kratos"}

REM 添加Kratos库到PATH
set PATH=%KRATOS_ROOT%\\libs;%PATH%

REM 设置Python路径
set PYTHONPATH=%KRATOS_ROOT%;%PYTHONPATH%

echo ✅ Kratos环境已配置
echo Kratos根目录: %KRATOS_ROOT%
echo Python路径已更新
echo ========================================

REM 启动Python并测试Kratos
echo 🧪 测试Kratos导入...
{self.python_executable} -c "import KratosMultiphysics; print('✅ Kratos导入成功')"

cmd /k
'''
        
        script_path = self.project_root / "start_kratos_env.bat"
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        logger.info(f"✅ 启动脚本已创建: {script_path}")
        return True
    
    def generate_report(self, test_results: Dict[str, bool]) -> str:
        """生成配置报告"""
        available_count = sum(test_results.values())
        total_count = len(test_results)
        
        report = [
            "=" * 60,
            "DeepCAD Kratos配置报告 - Windows环境",
            "=" * 60,
            "",
            f"🔧 Python环境: {self.python_executable}",
            f"📁 项目根目录: {self.project_root}",
            ""
        ]
        
        if 'kratos_bin' in self.kratos_paths:
            report.extend([
                f"📦 Kratos目录: {self.kratos_paths['kratos_bin']}",
                ""
            ])
        
        report.extend([
            "📋 模块测试结果:",
            "-" * 30
        ])
        
        for module_name, available in test_results.items():
            status = "✅ 可用" if available else "❌ 不可用"
            module_short = module_name.split('.')[-1]
            report.append(f"{status} {module_short}")
        
        report.extend([
            "",
            "=" * 60,
            f"📊 总结: {available_count}/{total_count} 模块可用",
            "=" * 60
        ])
        
        if available_count >= 1:  # 至少核心可用
            report.append("🎉 DeepCAD基本可用！")
        else:
            report.append("⚠️ DeepCAD无法运行，需要修复Kratos配置")
        
        return "\\n".join(report)


def main():
    """主函数"""
    print("🚀 DeepCAD Kratos配置工具 - Windows版本")
    print("=" * 50)
    
    manager = WindowsKratosManager()
    
    # 1. 设置环境
    print("\\n1️⃣ 配置Kratos环境...")
    if not manager.setup_kratos_environment():
        print("❌ 环境配置失败")
        return False
    
    # 2. 测试核心
    print("\\n2️⃣ 测试Kratos核心...")
    if not manager.test_kratos_core():
        print("❌ Kratos核心不可用，请检查编译")
        return False
    
    # 3. 安装应用模块
    print("\\n3️⃣ 安装应用模块...")
    manager.install_application_modules()
    
    # 4. 测试所有模块
    print("\\n4️⃣ 测试所有模块...")
    test_results = manager.test_all_modules()
    
    # 5. 创建启动脚本
    print("\\n5️⃣ 创建启动脚本...")
    manager.create_startup_script()
    
    # 6. 生成报告
    print("\\n6️⃣ 生成配置报告...")
    report = manager.generate_report(test_results)
    print(report)
    
    # 保存报告
    report_file = Path(__file__).parent / "kratos_windows_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"\\n📄 报告已保存: {report_file}")
    
    # 判断成功状态
    available_count = sum(test_results.values())
    success = available_count >= 1
    
    if success:
        print("\\n🎉 Kratos配置完成！")
        print("💡 提示: 运行 start_kratos_env.bat 启动Kratos环境")
    else:
        print("\\n⚠️ Kratos配置需要进一步调试")
    
    return success


if __name__ == "__main__":
    success = main()
    input("\\n按Enter键退出...")
    sys.exit(0 if success else 1)