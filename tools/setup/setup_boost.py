#!/usr/bin/env python3
"""
下载并设置 Boost 库
"""

import os
import sys
import subprocess
import urllib.request
import zipfile
import shutil
from pathlib import Path

def download_boost():
    project_root = Path(r"e:\Deep Excavation")
    boost_dir = project_root / "boost"
    
    if boost_dir.exists():
        print(f"Boost 目录已存在: {boost_dir}")
        return str(boost_dir)
    
    boost_version = "1_82_0"
    boost_url = f"https://boostorg.jfrog.io/artifactory/main/release/1.82.0/source/boost_{boost_version}.zip"
    boost_zip = project_root / f"boost_{boost_version}.zip"
    
    print(f"下载 Boost 库...")
    print(f"URL: {boost_url}")
    
    try:
        urllib.request.urlretrieve(boost_url, boost_zip)
        print(f"下载完成: {boost_zip}")
    except Exception as e:
        print(f"下载失败: {e}")
        # 尝试其他镜像
        boost_url_alt = f"https://sourceforge.net/projects/boost/files/boost/1.82.0/boost_{boost_version}.zip/download"
        try:
            urllib.request.urlretrieve(boost_url_alt, boost_zip)
            print(f"从备用源下载完成: {boost_zip}")
        except Exception as e2:
            print(f"备用源也下载失败: {e2}")
            return None
    
    print("解压 Boost...")
    with zipfile.ZipFile(boost_zip, 'r') as zip_ref:
        zip_ref.extractall(project_root)
    
    # 重命名目录
    extracted_dir = project_root / f"boost_{boost_version}"
    if extracted_dir.exists():
        extracted_dir.rename(boost_dir)
    
    # 删除压缩文件
    boost_zip.unlink()
    
    print(f"Boost 设置完成: {boost_dir}")
    return str(boost_dir)

def build_boost(boost_root):
    """构建 Boost 库"""
    print("开始构建 Boost...")
    
    boost_path = Path(boost_root)
    os.chdir(str(boost_path))
    
    # 运行 bootstrap
    if os.name == 'nt':  # Windows
        bootstrap_cmd = "bootstrap.bat"
    else:
        bootstrap_cmd = "./bootstrap.sh"
    
    print(f"运行 {bootstrap_cmd}...")
    try:
        subprocess.run(bootstrap_cmd, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Bootstrap 失败: {e}")
        return False
    
    # 构建 Boost
    print("构建 Boost 库...")
    try:
        if os.name == 'nt':  # Windows
            subprocess.run("b2.exe --with-system --with-filesystem --with-thread --with-date_time --with-regex --with-serialization --with-program_options variant=release link=shared threading=multi runtime-link=shared", shell=True, check=True)
        else:
            subprocess.run("./b2 --with-system --with-filesystem --with-thread --with-date_time --with-regex --with-serialization --with-program_options variant=release link=shared threading=multi runtime-link=shared", shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Boost 构建失败: {e}")
        return False
    
    print("Boost 构建完成！")
    return True

def main():
    boost_root = download_boost()
    if not boost_root:
        print("❌ Boost 下载失败")
        return False
    
    # 对于 Kratos，我们通常只需要头文件，不需要完整构建
    print("✅ Boost 头文件已准备好")
    print(f"BOOST_ROOT: {boost_root}")
    
    # 设置环境变量
    os.environ['BOOST_ROOT'] = boost_root
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("✅ Boost 设置成功！")
        sys.exit(0)
    else:
        print("❌ Boost 设置失败！")
        sys.exit(1)
