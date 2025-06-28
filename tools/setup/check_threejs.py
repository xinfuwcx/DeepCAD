#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Three.js检查脚本
用于检查Three.js前端库是否正确安装
"""

import os
import sys
import subprocess
import platform
import logging
import json
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('threejs_check.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("ThreeJSChecker")

# 定义颜色和符号 (使用ASCII字符而非Unicode)
if platform.system() == 'Windows':
    # Windows命令行颜色
    GREEN = ''
    YELLOW = ''
    RED = ''
    BLUE = ''
    RESET = ''
    # ASCII符号
    CHECK_MARK = '[v]'  # 替代 ✓
    CROSS_MARK = '[x]'  # 替代 ✗
    INFO_MARK = '[i]'   # 替代 ℹ
    WARN_MARK = '[!]'   # 替代 ⚠
else:
    # ANSI颜色
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    # ASCII符号
    CHECK_MARK = '[v]'  # 替代 ✓
    CROSS_MARK = '[x]'  # 替代 ✗
    INFO_MARK = '[i]'   # 替代 ℹ
    WARN_MARK = '[!]'   # 替代 ⚠

def print_status(message, status, details=None):
    """打印状态信息"""
    if status == "OK":
        status_color = f"{GREEN}{CHECK_MARK}{RESET}"
    elif status == "WARNING":
        status_color = f"{YELLOW}{WARN_MARK}{RESET}"
    elif status == "ERROR":
        status_color = f"{RED}{CROSS_MARK}{RESET}"
    elif status == "INFO":
        status_color = f"{BLUE}{INFO_MARK}{RESET}"
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

def run_command(command, cwd=None, env=None):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd,
            env=env,
            shell=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def check_node_npm():
    """检查Node.js和npm是否已安装"""
    # 检查Node.js
    success_node, output_node = run_command(["node", "--version"])
    if success_node:
        print_status("Node.js已安装", "OK", f"版本: {output_node.strip()}")
        node_available = True
    else:
        print_status("Node.js未安装", "ERROR")
        node_available = False
    
    # 检查npm
    success_npm, output_npm = run_command(["npm", "--version"])
    if success_npm:
        print_status("npm已安装", "OK", f"版本: {output_npm.strip()}")
        npm_available = True
    else:
        print_status("npm未安装", "ERROR")
        npm_available = False
    
    return node_available and npm_available

def check_frontend_package_json():
    """检查前端项目的package.json文件"""
    # 可能的package.json位置
    package_paths = [
        "frontend/package.json",
        "frontend/src/package.json"
    ]
    
    for path in package_paths:
        if os.path.exists(path):
            print_status(f"找到package.json: {path}", "OK")
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                
                # 检查Three.js依赖
                dependencies = package_data.get('dependencies', {})
                dev_dependencies = package_data.get('devDependencies', {})
                
                threejs_version = dependencies.get('three')
                if not threejs_version:
                    threejs_version = dev_dependencies.get('three')
                
                if threejs_version:
                    print_status("Three.js已在package.json中声明", "OK", f"版本: {threejs_version}")
                    return True, path, threejs_version
                else:
                    print_status("Three.js未在package.json中声明", "WARNING")
            except Exception as e:
                print_status(f"读取package.json失败", "ERROR", str(e))
    
    print_status("未找到有效的package.json文件", "WARNING")
    return False, None, None

def check_threejs_files():
    """检查Three.js文件是否存在"""
    # 可能的Three.js文件位置
    threejs_paths = [
        "frontend/node_modules/three",
        "frontend/src/node_modules/three"
    ]
    
    for path in threejs_paths:
        if os.path.exists(path):
            print_status(f"找到Three.js文件: {path}", "OK")
            
            # 检查版本
            version_file = os.path.join(path, "package.json")
            if os.path.exists(version_file):
                try:
                    with open(version_file, 'r', encoding='utf-8') as f:
                        package_data = json.load(f)
                    version = package_data.get('version')
                    if version:
                        print_status("Three.js版本", "OK", f"版本: {version}")
                        return True, path, version
                except Exception as e:
                    print_status(f"读取Three.js版本失败", "ERROR", str(e))
            
            return True, path, "未知版本"
    
    print_status("未找到Three.js文件", "WARNING")
    return False, None, None

def check_threejs_imports():
    """检查项目中是否有Three.js导入"""
    # 可能包含Three.js导入的文件路径
    js_paths = [
        "frontend/js",
        "frontend/src/js",
        "frontend/src",
        "frontend/components",
        "frontend/src/components"
    ]
    
    found_imports = []
    
    for base_path in js_paths:
        if not os.path.exists(base_path):
            continue
        
        for root, _, files in os.walk(base_path):
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        if "from 'three'" in content or 'from "three"' in content or "import * as THREE from" in content:
                            found_imports.append(file_path)
                    except Exception:
                        # 忽略无法读取的文件
                        pass
    
    if found_imports:
        print_status(f"找到{len(found_imports)}个文件导入了Three.js", "OK")
        for file_path in found_imports[:5]:  # 只显示前5个
            print_status(f"Three.js导入", "INFO", file_path)
        if len(found_imports) > 5:
            print_status(f"还有{len(found_imports) - 5}个文件导入了Three.js", "INFO")
        return True, found_imports
    else:
        print_status("未找到Three.js导入", "WARNING")
        return False, []

def install_threejs(package_path):
    """安装Three.js"""
    if not os.path.exists(os.path.dirname(package_path)):
        print_status(f"目录不存在: {os.path.dirname(package_path)}", "ERROR")
        return False
    
    print_status("正在安装Three.js...", "INFO")
    
    # 切换到package.json所在目录
    cwd = os.path.dirname(package_path)
    
    # 安装Three.js
    success, output = run_command(["npm", "install", "--save", "three"], cwd=cwd)
    if success:
        print_status("Three.js安装成功", "OK")
        return True
    else:
        print_status("Three.js安装失败", "ERROR", output)
        return False

def check_threejs_examples():
    """检查项目中是否有Three.js示例代码"""
    # 可能包含Three.js示例的文件路径
    js_paths = [
        "frontend/js",
        "frontend/src/js",
        "frontend/src/components",
        "frontend/components"
    ]
    
    found_examples = []
    
    for base_path in js_paths:
        if not os.path.exists(base_path):
            continue
        
        for root, _, files in os.walk(base_path):
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        # 检查是否包含Three.js场景创建代码
                        if (("new THREE.Scene" in content or "THREE.Scene()" in content) and 
                            ("new THREE.WebGLRenderer" in content or "THREE.WebGLRenderer()" in content) and
                            ("new THREE.Camera" in content or "THREE.Camera()" in content or 
                             "new THREE.PerspectiveCamera" in content or "THREE.PerspectiveCamera()" in content)):
                            found_examples.append(file_path)
                    except Exception:
                        # 忽略无法读取的文件
                        pass
    
    if found_examples:
        print_status(f"找到{len(found_examples)}个Three.js示例", "OK")
        for file_path in found_examples[:3]:  # 只显示前3个
            print_status(f"Three.js示例", "INFO", file_path)
        if len(found_examples) > 3:
            print_status(f"还有{len(found_examples) - 3}个Three.js示例", "INFO")
        return True, found_examples
    else:
        print_status("未找到Three.js示例", "INFO")
        return False, []

def check_threejs_renderer():
    """检查项目中的Three.js渲染器"""
    renderer_path = "src/core/visualization/three_renderer.py"
    
    if os.path.exists(renderer_path):
        print_status(f"找到Three.js渲染器: {renderer_path}", "OK")
        return True
    else:
        print_status("未找到Three.js渲染器", "WARNING", f"期望路径: {renderer_path}")
        return False

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Three.js检查工具")
    print("=" * 60 + "\n")
    
    # 检查Node.js和npm
    node_npm_available = check_node_npm()
    
    # 检查package.json
    package_json_available, package_path, threejs_version = check_frontend_package_json()
    
    # 检查Three.js文件
    threejs_files_available, threejs_path, threejs_file_version = check_threejs_files()
    
    # 检查Three.js导入
    threejs_imports_available, _ = check_threejs_imports()
    
    # 检查Three.js示例
    threejs_examples_available, _ = check_threejs_examples()
    
    # 检查Three.js渲染器
    threejs_renderer_available = check_threejs_renderer()
    
    # 如果Three.js未安装，询问是否安装
    if node_npm_available and package_json_available and not threejs_files_available:
        try:
            response = input("是否安装Three.js? (y/n): ")
            if response.lower() == 'y':
                install_threejs(package_path)
            else:
                print_status("用户选择不安装Three.js", "INFO")
        except KeyboardInterrupt:
            print("\n用户取消操作")
    
    print("\n" + "=" * 60)
    print("Three.js检查完成")
    print("=" * 60 + "\n")
    
    print("日志已保存到 threejs_check.log")
    
    return True

if __name__ == "__main__":
    main() 