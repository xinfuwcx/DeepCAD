#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Kratos编译脚本
包括IGA（等几何分析）、优化模块等完整编译配置
"""

import os
import sys
import subprocess
import platform
import logging
import shutil
from pathlib import Path
import multiprocessing

# 配置日志
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'kratos_build.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file, mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("KratosBuild")

# 定义颜色
if platform.system() == 'Windows':
    GREEN = ''
    YELLOW = ''
    RED = ''
    BLUE = ''
    RESET = ''
else:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_status(message, status, details=None):
    """打印状态信息"""
    if status == "OK":
        status_color = f"{GREEN}[✓]{RESET}"
    elif status == "WARNING":
        status_color = f"{YELLOW}[!]{RESET}"
    elif status == "ERROR":
        status_color = f"{RED}[✗]{RESET}"
    elif status == "INFO":
        status_color = f"{BLUE}[i]{RESET}"
    else:
        status_color = f"[{status}]"
    
    print(f"{status_color} {message}")
    if details:
        print(f"    {details}")
    
    # 同时记录到日志
    if status == "OK":
        logger.info(f"{message}")
    elif status == "WARNING":
        logger.warning(f"{message}")
    elif status == "ERROR":
        logger.error(f"{message}")
    else:
        logger.info(f"{message}")
    if details:
        logger.info(f"Details: {details}")

def run_command(command, cwd=None, env=None, shell=True):
    """运行命令并返回结果"""
    try:
        print_status(f"执行命令: {command}", "INFO")
        if env and len(env) > len(os.environ):
            print_status(f"使用自定义环境变量 (总数: {len(env)})", "INFO")
        
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=cwd,
            env=env,
            shell=shell,
            check=True,
            encoding='utf-8',
            errors='ignore'
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.output if hasattr(e, 'output') else str(e)

class KratosBuilder:
    def __init__(self, config=None):
        self.config = config or {}
        self.kratos_source = self.config.get('kratos_source', 'Kratos')
        self.build_dir = self.config.get('build_dir', 'kratos_build')
        self.install_dir = self.config.get('install_dir', 'kratos_install')
        self.build_type = self.config.get('build_type', 'Release')
        self.num_cores = self.config.get('num_cores', multiprocessing.cpu_count())
        
        # Windows特定配置
        self.is_windows = platform.system() == 'Windows'
        if self.is_windows:
            self.cmake_generator = self.config.get('cmake_generator', 'Visual Studio 17 2022')
            self.vs_platform = self.config.get('vs_platform', 'x64')
        
    def find_visual_studio(self):
        """查找Visual Studio安装路径"""
        vs_paths = [
            r"D:\Program Files\Microsoft Visual Studio\2022\Professional",
            r"D:\Program Files\Microsoft Visual Studio\2022\Community",
            r"D:\Program Files\Microsoft Visual Studio\2022\Enterprise", 
            r"C:\Program Files\Microsoft Visual Studio\2022\Professional",
            r"C:\Program Files\Microsoft Visual Studio\2022\Community",
            r"C:\Program Files\Microsoft Visual Studio\2022\Enterprise",
            r"C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional",
            r"C:\Program Files (x86)\Microsoft Visual Studio\2019\Community",
            r"C:\Program Files (x86)\Microsoft Visual Studio\2019\Enterprise"
        ]
        
        for vs_path in vs_paths:
            vcvarsall = os.path.join(vs_path, "VC", "Auxiliary", "Build", "vcvarsall.bat")
            if os.path.exists(vcvarsall):
                print_status(f"找到Visual Studio: {vs_path}", "OK")
                return vs_path, vcvarsall
        
        return None, None
    
    def setup_vs_environment(self):
        """设置Visual Studio环境"""
        vs_path, vcvarsall = self.find_visual_studio()
        if not vs_path:
            return None
            
        # 执行vcvarsall.bat并获取环境变量
        cmd = f'cmd /c ""{vcvarsall}" x64 && set"'
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, 
                                  encoding='utf-8', errors='ignore')
            if result.returncode == 0:
                # 解析环境变量
                env = os.environ.copy()
                for line in result.stdout.split('\n'):
                    if '=' in line and not line.startswith('_'):
                        key, value = line.split('=', 1)
                        env[key] = value
                print_status("Visual Studio环境变量设置成功", "OK")
                return env
            else:
                print_status(f"vcvarsall.bat执行失败: {result.stderr}", "WARNING")
        except Exception as e:
            print_status(f"设置Visual Studio环境失败: {e}", "WARNING")
        
        return None
        
    def check_prerequisites(self):
        """检查编译前提条件"""
        print_status("检查编译前提条件", "INFO")
        
        # 检查CMake
        success, output = run_command("cmake --version")
        if not success:
            print_status("CMake未安装", "ERROR", "请安装CMake 3.16或更高版本")
            return False
        print_status("CMake可用", "OK", output.split('\n')[0])
        
        # 检查编译器
        if self.is_windows:
            # 先尝试直接检查cl命令
            success, output = run_command("cl /?", shell=True)
            if not success:
                # 如果直接检查失败，尝试设置VS环境并直接测试
                print_status("正在查找并设置Visual Studio环境...", "INFO")
                vs_path, vcvarsall = self.find_visual_studio()
                if vs_path:
                    # 直接在cmd中执行vcvarsall.bat和cl命令
                    test_cmd = f'cmd /c ""{vcvarsall}" x64 && cl /? > nul"'
                    success, output = run_command(test_cmd, shell=True)
                    if success:
                        print_status("Visual Studio编译器可用 (通过环境设置)", "OK")
                        # 保存VS信息供后续使用
                        self.vs_path = vs_path
                        self.vcvarsall = vcvarsall
                    else:
                        print_status("Visual Studio编译器仍然不可用", "ERROR")
                        print_status(f"错误信息: {output}", "ERROR")
                        return False
                else:
                    print_status("未找到Visual Studio安装", "ERROR", 
                               "请确认Visual Studio 2019或更高版本已正确安装")
                    return False
            else:
                print_status("Visual Studio编译器可用", "OK")
                self.vs_path = None
                self.vcvarsall = None
        else:
            # 检查GCC
            success, output = run_command("gcc --version")
            if not success:
                print_status("GCC未安装", "ERROR", "请安装GCC编译器")
                return False
            print_status("GCC可用", "OK", output.split('\n')[0])
        
        # 检查Git
        success, output = run_command("git --version")
        if not success:
            print_status("Git未安装", "ERROR", "请安装Git")
            return False
        print_status("Git可用", "OK", output.split('\n')[0])
        
        # 检查Python
        if sys.version_info < (3, 7):
            print_status("Python版本过低", "ERROR", f"当前版本: {sys.version}, 需要3.7+")
            return False
        print_status("Python版本满足要求", "OK", f"版本: {sys.version.split()[0]}")
        
        return True
    
    def clone_kratos(self):
        """克隆Kratos源码"""
        if os.path.exists(self.kratos_source):
            print_status(f"Kratos源码已存在: {self.kratos_source}", "INFO")
            # 更新代码
            success, output = run_command("git pull", cwd=self.kratos_source)
            if success:
                print_status("更新Kratos源码成功", "OK")
            else:
                print_status("更新Kratos源码失败", "WARNING", output)
            return True
        
        print_status("克隆Kratos源码", "INFO")
        success, output = run_command(
            "git clone https://github.com/KratosMultiphysics/Kratos.git " + self.kratos_source
        )
        
        if success:
            print_status("克隆Kratos源码成功", "OK")
            return True
        else:
            print_status("克隆Kratos源码失败", "ERROR", output)
            return False
    
    def get_cmake_config(self):
        """获取CMake配置"""
        config = []
        
        # 获取项目根目录
        project_root = Path(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        # 检查并加载离线依赖选项
        offline_options_file = project_root / "temp" / "cmake_offline_options.txt"
        offline_options = []
        if offline_options_file.exists():
            print_status(f"加载离线依赖配置: {offline_options_file}", "INFO")
            with open(offline_options_file, 'r', encoding='utf-8') as f:
                offline_options = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            print_status(f"找到 {len(offline_options)} 个离线配置选项", "INFO")
        
        # 基本配置
        config.extend([
            f"-DCMAKE_BUILD_TYPE={self.build_type}",
            f"-DCMAKE_INSTALL_PREFIX={os.path.abspath(self.install_dir)}",
            "-DCMAKE_C_COMPILER_LAUNCHER=",
            "-DCMAKE_CXX_COMPILER_LAUNCHER="
        ])
        
        # Windows特定配置
        if self.is_windows:
            config.extend([
                f"-G \"{self.cmake_generator}\"",
                f"-A {self.vs_platform}",
                "-DCMAKE_CXX_FLAGS=\"/bigobj /EHsc\"",
                "-DCMAKE_WINDOWS_EXPORT_ALL_SYMBOLS=TRUE"
            ])
        
        # Python配置
        python_executable = sys.executable.replace('\\', '/')
        python_include = os.path.join(sys.prefix, 'include').replace('\\', '/')
        python_library = os.path.join(sys.prefix, 'libs', f'python{sys.version_info.major}{sys.version_info.minor}.lib').replace('\\', '/')
        
        config.extend([
            f"-DPYTHON_EXECUTABLE={python_executable}",
            f"-DPYTHON_INCLUDE_DIR={python_include}",
            f"-DPYTHON_LIBRARY={python_library}"
        ])
        
        # Kratos核心应用
        core_applications = [
            "KRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION=ON",
            "KRATOS_BUILD_FLUID_DYNAMICS_APPLICATION=ON", 
            "KRATOS_BUILD_SOLID_MECHANICS_APPLICATION=ON",
            "KRATOS_BUILD_CONTACT_STRUCTURAL_MECHANICS_APPLICATION=ON",
            "KRATOS_BUILD_MESH_MOVING_APPLICATION=ON",
            "KRATOS_BUILD_LINEAR_SOLVERS_APPLICATION=ON",
            "KRATOS_BUILD_CONVECTION_DIFFUSION_APPLICATION=ON"
        ]
        
        # 地质力学和岩土工程相关
        geomech_applications = [
            "KRATOS_BUILD_GEOMECHANICS_APPLICATION=ON",
            "KRATOS_BUILD_DEM_APPLICATION=ON",
            "KRATOS_BUILD_PFEM_APPLICATION=ON"
        ]
        
        # IGA（等几何分析）相关
        iga_applications = [
            "KRATOS_BUILD_IGA_APPLICATION=ON",
            "KRATOS_BUILD_NURBS_APPLICATION=ON"
        ]
        
        # 优化相关
        optimization_applications = [
            "KRATOS_BUILD_OPTIMIZATION_APPLICATION=ON",
            "KRATOS_BUILD_SHAPE_OPTIMIZATION_APPLICATION=ON",
            "KRATOS_BUILD_TOPOLOGY_OPTIMIZATION_APPLICATION=ON"
        ]
        
        # 多物理场耦合
        multiphysics_applications = [
            "KRATOS_BUILD_FSI_APPLICATION=ON",
            "KRATOS_BUILD_CONJUGATE_HEAT_TRANSFER_APPLICATION=ON",
            "KRATOS_BUILD_COMPRESSIBLE_POTENTIAL_FLOW_APPLICATION=ON"
        ]
        
        # MPI支持
        mpi_config = [
            "KRATOS_BUILD_MPI=ON",
            "KRATOS_BUILD_METIS_APPLICATION=ON",
            "KRATOS_BUILD_TRILINOS_APPLICATION=ON"
        ]
        
        # 外部库支持
        external_libs = [
            "KRATOS_BUILD_EXTERNAL_SOLVERS_APPLICATION=ON",
            "KRATOS_BUILD_EIGEN_SOLVERS_APPLICATION=ON",
            "USE_EIGEN_MKL=ON",
            "USE_EIGEN_FEAST=ON"
        ]
        
        # 添加所有配置
        config.extend([f"-D{app}" for app in core_applications])
        config.extend([f"-D{app}" for app in geomech_applications])
        config.extend([f"-D{app}" for app in iga_applications])
        config.extend([f"-D{app}" for app in optimization_applications])
        config.extend([f"-D{app}" for app in multiphysics_applications])
        config.extend([f"-D{app}" for app in mpi_config])
        config.extend([f"-D{app}" for app in external_libs])
        
        # 添加离线依赖选项（如果有的话）
        if offline_options:
            print_status("应用离线依赖配置", "INFO")
            config.extend(offline_options)
        
        return config
    
    def configure_cmake(self):
        """配置CMake"""
        print_status("配置CMake", "INFO")
        
        # 创建构建目录
        os.makedirs(self.build_dir, exist_ok=True)
        
        # 获取CMake配置
        cmake_config = self.get_cmake_config()
        
        # 构建CMake命令
        cmake_cmd = ["cmake"] + cmake_config + [f"../{self.kratos_source}"]
        cmake_cmd_str = " ".join(cmake_cmd)
        
        print_status(f"CMake配置命令: {cmake_cmd_str}", "INFO")
        
        # 如果需要VS环境，在cmd中设置环境后执行
        if self.is_windows and hasattr(self, 'vcvarsall') and self.vcvarsall:
            full_cmd = f'cmd /c ""{self.vcvarsall}" x64 && {cmake_cmd_str}"'
            success, output = run_command(full_cmd, cwd=self.build_dir, shell=True)
        else:
            success, output = run_command(cmake_cmd_str, cwd=self.build_dir)
        
        if success:
            print_status("CMake配置成功", "OK")
            return True
        else:
            print_status("CMake配置失败", "ERROR", output)
            return False
    
    def build_kratos(self):
        """编译Kratos"""
        print_status(f"开始编译Kratos (使用 {self.num_cores} 个CPU核心)", "INFO")
        
        if self.is_windows:
            # Windows下使用MSBuild
            build_cmd = f"cmake --build . --config {self.build_type} --parallel {self.num_cores}"
        else:
            # Linux下使用make
            build_cmd = f"make -j{self.num_cores}"
        
        # 如果需要VS环境，在cmd中设置环境后执行
        if self.is_windows and hasattr(self, 'vcvarsall') and self.vcvarsall:
            full_cmd = f'cmd /c ""{self.vcvarsall}" x64 && {build_cmd}"'
            success, output = run_command(full_cmd, cwd=self.build_dir, shell=True)
        else:
            success, output = run_command(build_cmd, cwd=self.build_dir)
        
        if success:
            print_status("编译Kratos成功", "OK")
            return True
        else:
            print_status("编译Kratos失败", "ERROR", output)
            return False
    
    def install_kratos(self):
        """安装Kratos"""
        print_status("安装Kratos", "INFO")
        
        if self.is_windows:
            install_cmd = f"cmake --build . --config {self.build_type} --target install"
        else:
            install_cmd = "make install"
        
        # 如果需要VS环境，在cmd中设置环境后执行
        if self.is_windows and hasattr(self, 'vcvarsall') and self.vcvarsall:
            full_cmd = f'cmd /c ""{self.vcvarsall}" x64 && {install_cmd}"'
            success, output = run_command(full_cmd, cwd=self.build_dir, shell=True)
        else:
            success, output = run_command(install_cmd, cwd=self.build_dir)
        
        if success:
            print_status("安装Kratos成功", "OK")
            return True
        else:
            print_status("安装Kratos失败", "ERROR", output)
            return False
    
    def setup_environment(self):
        """设置环境变量"""
        print_status("设置环境变量", "INFO")
        
        install_path = os.path.abspath(self.install_dir)
        python_site_packages = os.path.join(install_path, "lib", "python" + 
                                          f"{sys.version_info.major}.{sys.version_info.minor}", 
                                          "site-packages")
        
        # 获取项目根目录
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        scripts_dir = os.path.join(project_root, 'scripts')
        os.makedirs(scripts_dir, exist_ok=True)
        
        env_script = f"""
# Kratos环境变量配置
export KRATOS_PATH="{install_path}"
export PYTHONPATH="$PYTHONPATH:{python_site_packages}"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:{install_path}/lib"

# 添加到用户的.bashrc或.zshrc文件
echo 'export KRATOS_PATH="{install_path}"' >> ~/.bashrc
echo 'export PYTHONPATH="$PYTHONPATH:{python_site_packages}"' >> ~/.bashrc  
echo 'export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:{install_path}/lib"' >> ~/.bashrc
"""
        
        if self.is_windows:
            env_script = f"""
# Kratos环境变量配置 (Windows)
set KRATOS_PATH={install_path}
set PYTHONPATH=%PYTHONPATH%;{python_site_packages}
set PATH=%PATH%;{install_path}\\bin

# PowerShell配置
$env:KRATOS_PATH = "{install_path}"
$env:PYTHONPATH = "$env:PYTHONPATH;{python_site_packages}"
$env:PATH = "$env:PATH;{install_path}\\bin"
"""
        
        env_file = os.path.join(scripts_dir, "setup_kratos_env.sh" if not self.is_windows else "setup_kratos_env.bat")
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(env_script)
        
        print_status("环境变量配置文件已生成", "OK", 
                   f"文件位置: {env_file}")
        
        return True
    
    def test_installation(self):
        """测试安装"""
        print_status("测试Kratos安装", "INFO")
        
        # 获取项目根目录和临时目录
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        temp_dir = os.path.join(project_root, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        test_script = f"""
import sys
sys.path.insert(0, r'{os.path.abspath(self.install_dir)}')

try:
    import KratosMultiphysics
    print("✓ Kratos核心模块导入成功")
    
    # 测试核心应用
    applications = [
        "StructuralMechanicsApplication",
        "FluidDynamicsApplication", 
        "IgaApplication",
        "OptimizationApplication",
        "GeomechanicsApplication"
    ]
    
    imported_apps = []
    for app in applications:
        try:
            exec(f"import KratosMultiphysics.{{app}}")
            imported_apps.append(app)
            print(f"✓ {{app}} 导入成功")
        except ImportError as e:
            print(f"✗ {{app}} 导入失败: {{e}}")
    
    print(f"\\n成功导入 {{len(imported_apps)}} 个应用程序")
    
    # 基本功能测试
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("TestPart")
    print("✓ 基本功能测试成功")
    
except Exception as e:
    print(f"✗ Kratos测试失败: {{e}}")
    sys.exit(1)
"""
        
        test_file = os.path.join(temp_dir, "test_kratos_install.py")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(test_script)
        
        success, output = run_command([sys.executable, test_file])
        
        try:
            os.remove(test_file)
        except:
            pass
        
        if success:
            print_status("Kratos安装测试成功", "OK", output)
            return True
        else:
            print_status("Kratos安装测试失败", "ERROR", output)
            return False
    
    def build_full(self):
        """完整构建流程"""
        print("\n" + "=" * 60)
        print("Kratos完整编译流程")
        print("包含IGA、优化模块等")
        print("=" * 60 + "\n")
        
        steps = [
            ("检查前提条件", self.check_prerequisites),
            ("克隆源码", self.clone_kratos),
            ("配置CMake", self.configure_cmake),
            ("编译Kratos", self.build_kratos),
            ("安装Kratos", self.install_kratos),
            ("设置环境", self.setup_environment),
            ("测试安装", self.test_installation)
        ]
        
        for step_name, step_func in steps:
            print_status(f"开始: {step_name}", "INFO")
            if not step_func():
                print_status(f"失败: {step_name}", "ERROR")
                return False
            print_status(f"完成: {step_name}", "OK")
            print()
        
        print("\n" + "=" * 60)
        print("Kratos编译完成!")
        print("=" * 60 + "\n")
        
        print_status(f"编译日志保存在: {log_file}", "INFO")
        print_status("环境配置文件已保存到 scripts/ 目录", "INFO")
        
        return True

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Kratos编译脚本")
    parser.add_argument("--source", default="Kratos", help="Kratos源码目录")
    parser.add_argument("--build", default="kratos_build", help="构建目录")
    parser.add_argument("--install", default="kratos_install", help="安装目录")
    parser.add_argument("--type", default="Release", choices=["Release", "Debug"], help="构建类型")
    parser.add_argument("--cores", type=int, default=multiprocessing.cpu_count(), help="编译核心数")
    parser.add_argument("--generator", default="Visual Studio 17 2022", help="CMake生成器 (Windows)")
    
    args = parser.parse_args()
    
    config = {
        'kratos_source': args.source,
        'build_dir': args.build,
        'install_dir': args.install,
        'build_type': args.type,
        'num_cores': args.cores,
        'cmake_generator': args.generator
    }
    
    builder = KratosBuilder(config)
    success = builder.build_full()
    
    if success:
        print_status("Kratos编译成功完成!", "OK")
        sys.exit(0)
    else:
        print_status("Kratos编译失败!", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()
