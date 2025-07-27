"""
Kratos集成修复和增强模块
解决Kratos导入问题，并提供回退方案
"""

import os
import sys
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List
import json

logger = logging.getLogger(__name__)


class KratosIntegrationManager:
    """
    Kratos集成管理器
    
    功能:
    - 自动检测和修复Kratos安装问题
    - 提供模拟模式作为回退方案
    - 管理Kratos应用模块的加载
    - 监控编译进度和状态
    """
    
    def __init__(self):
        self.kratos_available = False
        self.kratos_module = None
        self.available_applications = []
        self.simulation_mode = True  # 默认启用模拟模式
        self.deepcad_root = Path(__file__).parent.parent.parent.parent
        self.kratos_paths = self._get_kratos_paths()
        
    def _get_kratos_paths(self) -> Dict[str, Path]:
        """获取Kratos相关路径"""
        paths = {
            'source': self.deepcad_root / 'core' / 'kratos_source' / 'kratos',
            'build': self.deepcad_root / 'core' / 'kratos_build',
            'install': self.deepcad_root / 'core' / 'kratos_install',
            'bin_release': self.deepcad_root / 'core' / 'kratos_source' / 'kratos' / 'bin' / 'Release',
            'bin_debug': self.deepcad_root / 'core' / 'kratos_source' / 'kratos' / 'bin' / 'Debug'
        }
        return paths
    
    def diagnose_kratos_installation(self) -> Dict[str, Any]:
        """诊断Kratos安装状态"""
        diagnosis = {
            'timestamp': str(Path(__file__).stat().st_mtime),
            'python_version': sys.version,
            'python_executable': sys.executable,
            'paths': {},
            'compilation_status': {},
            'import_status': {},
            'recommendations': []
        }
        
        # 检查路径
        for name, path in self.kratos_paths.items():
            diagnosis['paths'][name] = {
                'path': str(path),
                'exists': path.exists(),
                'readable': path.exists() and os.access(path, os.R_OK)
            }
        
        # 检查编译产物
        bin_path = self.kratos_paths['bin_release']
        if bin_path.exists():
            diagnosis['compilation_status']['bin_directory'] = True
            
            # 检查核心库
            core_files = ['KratosCore.dll', 'KratosCore.so', 'libKratosCore.so']
            diagnosis['compilation_status']['core_library'] = any(
                (bin_path / 'libs' / f).exists() for f in core_files
            )
            
            # 检查Python模块
            python_path = bin_path / 'KratosMultiphysics'
            diagnosis['compilation_status']['python_module'] = python_path.exists()
            
            if python_path.exists():
                init_file = python_path / '__init__.py'
                diagnosis['compilation_status']['python_init'] = init_file.exists()
        else:
            diagnosis['compilation_status']['bin_directory'] = False
            diagnosis['recommendations'].append("需要编译Kratos核心模块")
        
        # 尝试导入测试
        diagnosis['import_status'] = self._test_kratos_import()
        
        return diagnosis
    
    def _test_kratos_import(self) -> Dict[str, Any]:
        """测试Kratos导入"""
        import_status = {
            'core_importable': False,
            'applications': [],
            'error_message': None
        }
        
        # 添加可能的Kratos路径到Python路径
        for path_name in ['bin_release', 'bin_debug', 'install']:
            path = self.kratos_paths[path_name]
            if path.exists() and str(path) not in sys.path:
                sys.path.insert(0, str(path))
        
        # 设置库路径环境变量
        lib_paths = [
            str(self.kratos_paths['bin_release'] / 'libs'),
            str(self.kratos_paths['install'] / 'libs')
        ]
        
        current_ld_path = os.environ.get('LD_LIBRARY_PATH', '')
        new_ld_path = ':'.join(lib_paths + [current_ld_path])
        os.environ['LD_LIBRARY_PATH'] = new_ld_path
        
        try:
            import KratosMultiphysics
            import_status['core_importable'] = True
            self.kratos_module = KratosMultiphysics
            self.kratos_available = True
            self.simulation_mode = False
            
            # 检查可用应用
            applications = [attr for attr in dir(KratosMultiphysics) 
                          if attr.endswith('Application')]
            import_status['applications'] = applications
            self.available_applications = applications
            
            logger.info(f"✓ Kratos导入成功，可用应用: {applications}")
            
        except Exception as e:
            import_status['error_message'] = str(e)
            logger.warning(f"⚠️ Kratos导入失败: {e}，将使用模拟模式")
            self.simulation_mode = True
        
        return import_status
    
    def fix_kratos_environment(self) -> bool:
        """修复Kratos环境配置"""
        try:
            # 1. 设置环境变量
            env_vars = self._get_environment_variables()
            for key, value in env_vars.items():
                os.environ[key] = value
                logger.info(f"设置环境变量 {key}={value}")
            
            # 2. 更新Python路径
            python_paths = self._get_python_paths()
            for path in python_paths:
                if path not in sys.path:
                    sys.path.insert(0, path)
                    logger.info(f"添加Python路径: {path}")
            
            # 3. 重新测试导入
            import_status = self._test_kratos_import()
            
            return import_status['core_importable']
            
        except Exception as e:
            logger.error(f"修复Kratos环境失败: {e}")
            return False
    
    def _get_environment_variables(self) -> Dict[str, str]:
        """获取必要的环境变量"""
        lib_paths = []
        
        # 添加可能的库路径
        for base_path in [self.kratos_paths['bin_release'], self.kratos_paths['install']]:
            lib_path = base_path / 'libs'
            if lib_path.exists():
                lib_paths.append(str(lib_path))
        
        current_ld_path = os.environ.get('LD_LIBRARY_PATH', '')
        new_ld_path = ':'.join(lib_paths + [current_ld_path] if current_ld_path else lib_paths)
        
        return {
            'LD_LIBRARY_PATH': new_ld_path,
            'KRATOS_ROOT': str(self.kratos_paths['install']),
            'KRATOS_DATA_DIR': str(self.kratos_paths['source'] / 'kratos')
        }
    
    def _get_python_paths(self) -> List[str]:
        """获取需要添加的Python路径"""
        paths = []
        
        for base_path in [self.kratos_paths['bin_release'], self.kratos_paths['install']]:
            if base_path.exists():
                paths.append(str(base_path))
                
                # 检查KratosMultiphysics目录
                kratos_python = base_path / 'KratosMultiphysics'
                if kratos_python.exists():
                    paths.append(str(base_path))
        
        return paths
    
    def start_compilation_if_needed(self) -> bool:
        """如果需要，启动Kratos编译"""
        diagnosis = self.diagnose_kratos_installation()
        
        if not diagnosis['compilation_status'].get('bin_directory', False):
            logger.info("检测到Kratos需要编译，启动编译过程...")
            return self._start_background_compilation()
        
        if not diagnosis['import_status']['core_importable']:
            logger.info("Kratos核心模块导入失败，尝试重新编译...")
            return self._start_background_compilation()
        
        return True
    
    def _start_background_compilation(self) -> bool:
        """启动后台编译"""
        try:
            build_script = self.deepcad_root / 'build_kratos_linux.sh'
            
            if not build_script.exists():
                logger.error("编译脚本不存在，无法启动编译")
                return False
            
            # 检查是否有编译权限
            if not os.access(build_script, os.X_OK):
                logger.warning("编译脚本没有执行权限，尝试使用bash直接执行")
            
            # 启动后台编译进程
            process = subprocess.Popen(
                ['bash', str(build_script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            logger.info(f"已启动Kratos编译进程 (PID: {process.pid})")
            logger.info("编译过程将在后台运行，预计需要30-60分钟")
            
            # 保存进程信息
            self._save_compilation_status(process.pid, 'running')
            
            return True
            
        except Exception as e:
            logger.error(f"启动编译失败: {e}")
            return False
    
    def _save_compilation_status(self, pid: int, status: str):
        """保存编译状态"""
        status_file = self.deepcad_root / 'kratos_compilation_status.json'
        status_data = {
            'pid': pid,
            'status': status,
            'start_time': str(Path(__file__).stat().st_mtime),
            'log_file': str(self.deepcad_root / 'kratos_build.log')
        }
        
        with open(status_file, 'w') as f:
            json.dump(status_data, f, indent=2)
    
    def get_compilation_status(self) -> Dict[str, Any]:
        """获取编译状态"""
        status_file = self.deepcad_root / 'kratos_compilation_status.json'
        
        if not status_file.exists():
            return {'status': 'not_started'}
        
        try:
            with open(status_file, 'r') as f:
                status_data = json.load(f)
            
            # 检查进程是否仍在运行
            pid = status_data.get('pid')
            if pid:
                try:
                    os.kill(pid, 0)  # 检查进程是否存在
                    status_data['status'] = 'running'
                except OSError:
                    status_data['status'] = 'completed_or_failed'
            
            return status_data
            
        except Exception as e:
            logger.error(f"读取编译状态失败: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def get_simulation_solver(self):
        """获取求解器（真实或模拟）"""
        if self.kratos_available:
            return KratosRealSolver(self.kratos_module)
        else:
            return KratosSimulationSolver()


class KratosRealSolver:
    """真实的Kratos求解器"""
    
    def __init__(self, kratos_module):
        self.kratos = kratos_module
        self.model = None
        self.solver = None
    
    def setup_problem(self, parameters: Dict[str, Any]):
        """设置计算问题"""
        # 实现真实的Kratos问题设置
        pass
    
    def solve(self) -> Dict[str, Any]:
        """执行求解"""
        # 实现真实的Kratos求解
        pass


class KratosSimulationSolver:
    """Kratos模拟求解器（用于测试和演示）"""
    
    def __init__(self):
        self.parameters = {}
        self.results = {}
    
    def setup_problem(self, parameters: Dict[str, Any]):
        """设置计算问题（模拟）"""
        self.parameters = parameters
        logger.info("🎭 模拟模式: 设置计算问题")
        
        # 模拟验证参数
        required_params = ['geometry', 'materials', 'boundary_conditions']
        for param in required_params:
            if param not in parameters:
                raise ValueError(f"缺少必要参数: {param}")
    
    def solve(self) -> Dict[str, Any]:
        """执行求解（模拟）"""
        import time
        import random
        
        logger.info("🎭 模拟模式: 开始模拟计算...")
        
        # 模拟计算过程
        time.sleep(0.1)  # 模拟计算时间
        
        # 生成模拟结果
        num_nodes = self.parameters.get('num_nodes', 1000)
        
        self.results = {
            'displacement': {
                'nodes': list(range(num_nodes)),
                'values': [[random.uniform(-0.01, 0.01) for _ in range(3)] 
                          for _ in range(num_nodes)]
            },
            'stress': {
                'elements': list(range(num_nodes // 2)),
                'values': [[random.uniform(-100000, 100000) for _ in range(6)] 
                          for _ in range(num_nodes // 2)]
            },
            'convergence': {
                'iterations': random.randint(5, 15),
                'residual': random.uniform(1e-8, 1e-6)
            },
            'computation_time': random.uniform(0.5, 2.0)
        }
        
        logger.info("✓ 模拟计算完成")
        return self.results
    
    def get_results(self) -> Dict[str, Any]:
        """获取计算结果"""
        return self.results


# 全局实例
_kratos_manager = None

def get_kratos_manager() -> KratosIntegrationManager:
    """获取Kratos集成管理器单例"""
    global _kratos_manager
    if _kratos_manager is None:
        _kratos_manager = KratosIntegrationManager()
    return _kratos_manager


def initialize_kratos() -> bool:
    """初始化Kratos集成"""
    manager = get_kratos_manager()
    
    # 尝试修复环境
    if manager.fix_kratos_environment():
        logger.info("✓ Kratos环境修复成功")
        return True
    
    # 如果修复失败，检查是否需要编译
    if manager.start_compilation_if_needed():
        logger.info("已启动Kratos编译，当前使用模拟模式")
    else:
        logger.warning("Kratos编译启动失败，继续使用模拟模式")
    
    return False


def get_solver():
    """获取求解器实例"""
    manager = get_kratos_manager()
    return manager.get_simulation_solver()


def is_kratos_available() -> bool:
    """检查Kratos是否可用"""
    manager = get_kratos_manager()
    return manager.kratos_available


def get_kratos_status() -> Dict[str, Any]:
    """获取Kratos状态信息"""
    manager = get_kratos_manager()
    return {
        'available': manager.kratos_available,
        'simulation_mode': manager.simulation_mode,
        'applications': manager.available_applications,
        'compilation_status': manager.get_compilation_status(),
        'diagnosis': manager.diagnose_kratos_installation()
    }