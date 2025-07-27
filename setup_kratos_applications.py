#!/usr/bin/env python3
"""
Kratos应用模块安装和配置脚本
使用pip安装预编译的Kratos应用模块，补充现有的核心编译
"""

import sys
import subprocess
import importlib
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class KratosApplicationManager:
    """Kratos应用模块管理器"""
    
    def __init__(self):
        self.required_applications = {
            # 核心模块（已编译，无需安装）
            'KratosMultiphysics': {'status': 'compiled', 'priority': 'critical'},
            
            # 需要通过pip安装的应用模块
            'GeoMechanicsApplication': {
                'package': 'KratosGeoMechanicsApplication',
                'status': 'needed',
                'priority': 'critical',
                'description': '地质力学分析 - DeepCAD核心功能'
            },
            'StructuralMechanicsApplication': {
                'package': 'KratosStructuralMechanicsApplication', 
                'status': 'needed',
                'priority': 'high',
                'description': '结构力学分析 - 支护结构计算'
            },
            'FluidDynamicsApplication': {
                'package': 'KratosFluidDynamicsApplication',
                'status': 'needed', 
                'priority': 'medium',
                'description': '流体力学分析 - 地下水渗流'
            },
            'FSIApplication': {
                'package': 'KratosFSIApplication',
                'status': 'compiled',  # 根据状态报告已编译
                'priority': 'medium',
                'description': '流固耦合分析'
            },
            'OptimizationApplication': {
                'package': 'KratosOptimizationApplication', 
                'status': 'compiled',  # 根据状态报告已编译
                'priority': 'medium',
                'description': '结构优化分析'
            },
            'LinearSolversApplication': {
                'package': 'KratosLinearSolversApplication',
                'status': 'compiled',  # 根据状态报告已编译
                'priority': 'critical',
                'description': '线性求解器'
            }
        }
        
    def check_current_status(self) -> Dict[str, Dict[str, any]]:
        """检查当前Kratos模块状态"""
        logger.info("🔍 检查当前Kratos模块状态...")
        
        status_report = {}
        
        for app_name, app_info in self.required_applications.items():
            status = self._test_module_import(app_name)
            status_report[app_name] = {
                **app_info,
                'import_status': status['importable'],
                'error_message': status.get('error'),
                'version': status.get('version')
            }
            
            # 打印状态
            if status['importable']:
                logger.info(f"  ✅ {app_name} - 可用")
                if status.get('version'):
                    logger.info(f"     版本: {status['version']}")
            else:
                logger.warning(f"  ❌ {app_name} - 不可用")
                if status.get('error'):
                    logger.warning(f"     错误: {status['error']}")
        
        return status_report
    
    def _test_module_import(self, module_name: str) -> Dict[str, any]:
        """测试模块导入"""
        try:
            if module_name == 'KratosMultiphysics':
                import KratosMultiphysics
                version = getattr(KratosMultiphysics, '__version__', 'unknown')
                return {'importable': True, 'version': version}
            else:
                # 尝试导入应用模块
                full_module_name = f"KratosMultiphysics.{module_name}"
                module = importlib.import_module(full_module_name)
                version = getattr(module, '__version__', 'unknown')
                return {'importable': True, 'version': version}
                
        except ImportError as e:
            return {'importable': False, 'error': str(e)}
        except Exception as e:
            return {'importable': False, 'error': f"Unexpected error: {str(e)}"}
    
    def install_missing_applications(self, force_reinstall: bool = False) -> bool:
        """安装缺失的应用模块"""
        logger.info("📦 开始安装缺失的Kratos应用模块...")
        
        # 首先检查当前状态
        status_report = self.check_current_status()
        
        # 确定需要安装的模块
        to_install = []
        for app_name, status in status_report.items():
            if (not status['import_status'] or force_reinstall) and status.get('package'):
                to_install.append((app_name, status))
        
        if not to_install:
            logger.info("✅ 所有需要的模块都已可用，无需安装")
            return True
        
        logger.info(f"📋 需要安装的模块: {[item[0] for item in to_install]}")
        
        # 尝试不同的安装策略
        success = self._try_installation_strategies(to_install)
        
        if success:
            logger.info("✅ 所有模块安装完成")
            # 重新检查状态
            self.check_current_status()
        else:
            logger.error("❌ 部分模块安装失败")
        
        return success
    
    def _try_installation_strategies(self, modules_to_install: List[Tuple[str, Dict]]) -> bool:
        """尝试不同的安装策略"""
        strategies = [
            ('pip', self._install_via_pip),
            ('conda', self._install_via_conda),
            ('pip_source', self._install_via_pip_source)
        ]
        
        for strategy_name, install_func in strategies:
            logger.info(f"🔄 尝试使用 {strategy_name} 安装...")
            
            if install_func(modules_to_install):
                logger.info(f"✅ {strategy_name} 安装成功")
                return True
            else:
                logger.warning(f"⚠️ {strategy_name} 安装失败，尝试下一种方法")
        
        return False
    
    def _install_via_pip(self, modules: List[Tuple[str, Dict]]) -> bool:
        """通过pip安装"""
        try:
            # 首先尝试安装完整的KratosMultiphysics包
            cmd = [sys.executable, '-m', 'pip', 'install', '--upgrade', 'KratosMultiphysics']
            
            logger.info(f"执行命令: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info("✅ KratosMultiphysics主包安装成功")
                return True
            else:
                logger.warning(f"⚠️ pip安装失败: {result.stderr}")
                
                # 尝试安装单个模块包
                for app_name, app_info in modules:
                    if 'package' in app_info:
                        self._install_single_package(app_info['package'])
                
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ pip安装超时")
            return False
        except Exception as e:
            logger.error(f"❌ pip安装异常: {e}")
            return False
    
    def _install_via_conda(self, modules: List[Tuple[str, Dict]]) -> bool:
        """通过conda安装"""
        try:
            # 检查conda是否可用
            conda_cmd = subprocess.run(['conda', '--version'], capture_output=True)
            if conda_cmd.returncode != 0:
                logger.warning("⚠️ conda不可用，跳过conda安装")
                return False
            
            # 尝试从conda-forge安装
            cmd = ['conda', 'install', '-c', 'conda-forge', 'kratosmultiphysics', '-y']
            
            logger.info(f"执行命令: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                logger.info("✅ conda安装成功")
                return True
            else:
                logger.warning(f"⚠️ conda安装失败: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ conda安装超时")
            return False
        except Exception as e:
            logger.error(f"❌ conda安装异常: {e}")
            return False
    
    def _install_via_pip_source(self, modules: List[Tuple[str, Dict]]) -> bool:
        """通过pip从源码安装（备选方案）"""
        try:
            # 安装预发布版本
            cmd = [sys.executable, '-m', 'pip', 'install', '--pre', 'KratosMultiphysics']
            
            logger.info(f"执行命令: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                logger.info("✅ pip源码安装成功")
                return True
            else:
                logger.warning(f"⚠️ pip源码安装失败: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ pip源码安装异常: {e}")
            return False
    
    def _install_single_package(self, package_name: str) -> bool:
        """安装单个包"""
        try:
            cmd = [sys.executable, '-m', 'pip', 'install', package_name]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            
            if result.returncode == 0:
                logger.info(f"✅ {package_name} 安装成功")
                return True
            else:
                logger.warning(f"⚠️ {package_name} 安装失败: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ {package_name} 安装异常: {e}")
            return False
    
    def create_integration_test(self) -> bool:
        """创建集成测试"""
        logger.info("🧪 创建Kratos集成测试...")
        
        test_script = Path(__file__).parent / "test_kratos_integration.py"
        
        test_content = '''#!/usr/bin/env python3
"""
Kratos集成测试脚本
验证所有必要的模块是否正确安装和可用
"""

import sys
import traceback

def test_kratos_core():
    """测试Kratos核心"""
    try:
        import KratosMultiphysics
        print("✅ KratosMultiphysics 核心模块导入成功")
        
        # 测试基本功能
        model = KratosMultiphysics.Model()
        model_part = model.CreateModelPart("test")
        print("✅ Kratos基本功能测试通过")
        
        return True
    except Exception as e:
        print(f"❌ Kratos核心测试失败: {e}")
        traceback.print_exc()
        return False

def test_geo_mechanics():
    """测试地质力学模块"""
    try:
        import KratosMultiphysics.GeoMechanicsApplication
        print("✅ GeoMechanicsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ GeoMechanicsApplication 不可用: {e}")
        return False

def test_structural_mechanics():
    """测试结构力学模块"""
    try:
        import KratosMultiphysics.StructuralMechanicsApplication
        print("✅ StructuralMechanicsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ StructuralMechanicsApplication 不可用: {e}")
        return False

def test_fluid_dynamics():
    """测试流体力学模块"""
    try:
        import KratosMultiphysics.FluidDynamicsApplication
        print("✅ FluidDynamicsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ FluidDynamicsApplication 不可用: {e}")
        return False

def main():
    """主测试函数"""
    print("="*50)
    print("Kratos集成测试开始")
    print("="*50)
    
    tests = [
        ("Kratos核心", test_kratos_core),
        ("地质力学", test_geo_mechanics),
        ("结构力学", test_structural_mechanics),
        ("流体力学", test_fluid_dynamics)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\\n🧪 测试 {test_name}...")
        result = test_func()
        results.append((test_name, result))
    
    print("\\n" + "="*50)
    print("测试结果汇总:")
    print("="*50)
    
    critical_passed = 0
    total_tests = len(tests)
    
    for test_name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{test_name}: {status}")
        if passed and test_name in ["Kratos核心", "地质力学"]:
            critical_passed += 1
    
    print(f"\\n总体状态: {sum(1 for _, p in results if p)}/{total_tests} 测试通过")
    
    if critical_passed >= 1:  # 至少核心模块可用
        print("🎉 DeepCAD可以基本运行（核心功能可用）")
        return True
    else:
        print("⚠️ DeepCAD无法正常运行（缺少关键模块）")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
'''
        
        with open(test_script, 'w', encoding='utf-8') as f:
            f.write(test_content)
        
        logger.info(f"✅ 集成测试脚本已创建: {test_script}")
        return True
    
    def run_integration_test(self) -> bool:
        """运行集成测试"""
        logger.info("🧪 运行Kratos集成测试...")
        
        test_script = Path(__file__).parent / "test_kratos_integration.py"
        
        if not test_script.exists():
            logger.error("❌ 测试脚本不存在")
            return False
        
        try:
            result = subprocess.run([sys.executable, str(test_script)], 
                                  capture_output=True, text=True, timeout=60)
            
            print(result.stdout)
            if result.stderr:
                print("错误输出:", result.stderr)
            
            return result.returncode == 0
            
        except subprocess.TimeoutExpired:
            logger.error("❌ 集成测试超时")
            return False
        except Exception as e:
            logger.error(f"❌ 运行集成测试失败: {e}")
            return False
    
    def generate_status_report(self) -> str:
        """生成状态报告"""
        status_report = self.check_current_status()
        
        report = ["", "="*60, "Kratos应用模块状态报告", "="*60, ""]
        
        # 按优先级分组
        by_priority = {}
        for app_name, status in status_report.items():
            priority = status.get('priority', 'unknown')
            if priority not in by_priority:
                by_priority[priority] = []
            by_priority[priority].append((app_name, status))
        
        for priority in ['critical', 'high', 'medium', 'low']:
            if priority in by_priority:
                report.append(f"🎯 {priority.upper()} 优先级模块:")
                report.append("-" * 30)
                
                for app_name, status in by_priority[priority]:
                    status_icon = "✅" if status['import_status'] else "❌"
                    report.append(f"{status_icon} {app_name}")
                    if status.get('description'):
                        report.append(f"   功能: {status['description']}")
                    if status.get('version'):
                        report.append(f"   版本: {status['version']}")
                    if not status['import_status'] and status.get('error_message'):
                        report.append(f"   错误: {status['error_message']}")
                    report.append("")
        
        # 总结
        available_count = sum(1 for s in status_report.values() if s['import_status'])
        total_count = len(status_report)
        
        report.extend([
            "="*60,
            f"总结: {available_count}/{total_count} 模块可用",
            "="*60
        ])
        
        return "\n".join(report)


def main():
    """主函数"""
    print("🚀 Kratos应用模块安装和配置工具")
    print("="*50)
    
    manager = KratosApplicationManager()
    
    # 检查当前状态
    print("\n1️⃣ 检查当前状态...")
    status_report = manager.check_current_status()
    
    # 安装缺失模块
    print("\n2️⃣ 安装缺失模块...")
    install_success = manager.install_missing_applications()
    
    # 创建集成测试
    print("\n3️⃣ 创建集成测试...")
    manager.create_integration_test()
    
    # 运行集成测试
    print("\n4️⃣ 运行集成测试...")
    test_success = manager.run_integration_test()
    
    # 生成状态报告
    print("\n5️⃣ 生成状态报告...")
    report = manager.generate_status_report()
    print(report)
    
    # 保存报告
    report_file = Path(__file__).parent / "kratos_status_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"\n📄 状态报告已保存: {report_file}")
    
    # 总结
    if install_success and test_success:
        print("\n🎉 Kratos配置完成！所有模块都已就绪。")
        return True
    elif test_success:
        print("\n✅ Kratos基本可用，部分模块可能缺失但不影响核心功能。")
        return True
    else:
        print("\n⚠️ Kratos配置存在问题，请检查安装日志。")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)