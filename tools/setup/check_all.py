#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
深基坑CAE系统依赖检查主脚本
用于运行所有检查脚本并生成综合报告
"""

import os
import sys
import subprocess
import platform
import importlib
import logging
import datetime
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('check_all.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("DependencyChecker")

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

def check_script_exists(script_name):
    """检查脚本是否存在"""
    if os.path.exists(script_name):
        return True
    else:
        print_status(f"脚本 {script_name} 不存在", "ERROR")
        return False

def run_check_script(script_name):
    """运行检查脚本"""
    if not check_script_exists(script_name):
        return False, None
    
    print_status(f"正在运行 {script_name}...", "INFO")
    success, output = run_command([sys.executable, script_name])
    
    if success:
        print_status(f"{script_name} 运行成功", "OK")
        return True, output
    else:
        print_status(f"{script_name} 运行失败", "ERROR", output)
        return False, output

def generate_report(results):
    """生成综合报告"""
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report = f"""
深基坑CAE系统依赖检查报告
==============================================
生成时间: {now}
系统信息: {platform.system()} {platform.release()} {platform.version()}
Python版本: {sys.version.split()[0]}
==============================================

检查结果摘要:
"""
    
    for script_name, (success, _) in results.items():
        status = "通过" if success else "失败"
        status_color = f"{GREEN}{status}{RESET}" if success else f"{RED}{status}{RESET}"
        report += f"  - {script_name}: {status_color}\n"
    
    report += """
==============================================

详细检查结果:
"""
    
    for script_name, (success, output) in results.items():
        report += f"\n{'-' * 50}\n"
        report += f"{script_name} 检查结果:\n"
        report += f"{'-' * 50}\n"
        
        if output:
            report += output
        else:
            report += "无输出\n"
    
    report += f"\n{'-' * 50}\n"
    report += "报告结束\n"
    
    # 保存报告到文件
    with open("dependency_report.txt", "w", encoding="utf-8") as f:
        f.write(report.replace(GREEN, "").replace(RED, "").replace(YELLOW, "").replace(BLUE, "").replace(RESET, ""))
    
    return report

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("深基坑CAE系统依赖检查工具")
    print("=" * 60 + "\n")
    
    # 检查脚本列表
    check_scripts = [
        "check_dependencies.py",
        "check_gmsh.py",
        "check_kratos.py",
        "check_trame.py",
        "check_threejs.py",
        "check_pytorch.py"
    ]
    
    # 检查脚本是否存在，如果不存在则创建
    missing_scripts = [script for script in check_scripts if not os.path.exists(script)]
    if missing_scripts:
        print_status(f"以下检查脚本不存在: {', '.join(missing_scripts)}", "WARNING")
        print_status("请先创建这些脚本，或者从其他位置复制", "INFO")
        return False
    
    # 运行所有检查脚本
    results = {}
    for script in check_scripts:
        success, output = run_check_script(script)
        results[script] = (success, output)
    
    # 生成综合报告
    report = generate_report(results)
    print("\n" + "=" * 60)
    print("所有检查完成，报告已生成")
    print("=" * 60 + "\n")
    
    print(report)
    
    print("\n报告已保存到 dependency_report.txt")
    print("日志已保存到 check_all.log")
    
    return True

if __name__ == "__main__":
    main() 