#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
处理Kratos编译过程中的网络依赖问题
解决方案包括：手动下载、离线缓存、代理设置等
"""

import os
import sys
import subprocess
import urllib.request
import urllib.error
import shutil
from pathlib import Path
import zipfile
import tarfile
import logging

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('../../logs/dependency_download.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DependencyHandler:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.cache_dir = self.project_root / "temp" / "dependency_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # 常用的依赖下载地址
        self.dependencies = {
            'googletest': {
                'url': 'https://github.com/google/googletest/archive/refs/tags/release-1.12.1.zip',
                'mirror_urls': [
                    'https://gitee.com/mirrors/googletest/repository/archive/release-1.12.1.zip',
                    'https://hub.fastgit.xyz/google/googletest/archive/refs/tags/release-1.12.1.zip'
                ],
                'filename': 'googletest-1.12.1.zip',
                'extract_dir': 'googletest-release-1.12.1'
            },
            'eigen': {
                'url': 'https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.zip',
                'mirror_urls': [
                    'https://gitee.com/mirrors/eigen/repository/archive/3.4.0.zip'
                ],
                'filename': 'eigen-3.4.0.zip',
                'extract_dir': 'eigen-3.4.0'
            }
        }
    
    def test_network_connectivity(self):
        """测试网络连通性"""
        test_urls = [
            'https://www.google.com',
            'https://github.com',
            'https://gitee.com'
        ]
        
        results = {}
        for url in test_urls:
            try:
                response = urllib.request.urlopen(url, timeout=10)
                results[url] = True
                logger.info(f"✓ 可以访问: {url}")
            except Exception as e:
                results[url] = False
                logger.warning(f"✗ 无法访问: {url} - {str(e)}")
        
        return results
    
    def download_with_retry(self, urls, filename, max_retries=3):
        """尝试从多个URL下载文件"""
        if isinstance(urls, str):
            urls = [urls]
        
        filepath = self.cache_dir / filename
        
        # 如果文件已存在，先检查是否完整
        if filepath.exists():
            logger.info(f"文件已存在: {filepath}")
            return str(filepath)
        
        for url in urls:
            for attempt in range(max_retries):
                try:
                    logger.info(f"尝试下载 ({attempt+1}/{max_retries}): {url}")
                    
                    # 创建请求，设置用户代理
                    req = urllib.request.Request(url)
                    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                    
                    with urllib.request.urlopen(req, timeout=30) as response:
                        with open(filepath, 'wb') as f:
                            shutil.copyfileobj(response, f)
                    
                    logger.info(f"✓ 下载成功: {filepath}")
                    return str(filepath)
                    
                except Exception as e:
                    logger.warning(f"下载失败 ({attempt+1}/{max_retries}): {str(e)}")
                    if filepath.exists():
                        filepath.unlink()  # 删除不完整的文件
        
        logger.error(f"所有下载尝试都失败了: {filename}")
        return None
    
    def extract_archive(self, archive_path, extract_to=None):
        """解压缩文件"""
        if extract_to is None:
            extract_to = self.cache_dir
        
        archive_path = Path(archive_path)
        extract_to = Path(extract_to)
        extract_to.mkdir(parents=True, exist_ok=True)
        
        try:
            if archive_path.suffix.lower() == '.zip':
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_to)
            elif archive_path.suffix.lower() in ['.tar', '.gz', '.tgz']:
                with tarfile.open(archive_path, 'r:*') as tar_ref:
                    tar_ref.extractall(extract_to)
            else:
                logger.error(f"不支持的压缩格式: {archive_path}")
                return None
            
            logger.info(f"✓ 解压成功: {archive_path} -> {extract_to}")
            return str(extract_to)
            
        except Exception as e:
            logger.error(f"解压失败: {str(e)}")
            return None
    
    def download_dependencies(self, dep_names=None):
        """下载指定的依赖"""
        if dep_names is None:
            dep_names = list(self.dependencies.keys())
        elif isinstance(dep_names, str):
            dep_names = [dep_names]
        
        logger.info("开始下载依赖包...")
        results = {}
        
        for dep_name in dep_names:
            if dep_name not in self.dependencies:
                logger.warning(f"未知的依赖: {dep_name}")
                continue
            
            dep_info = self.dependencies[dep_name]
            logger.info(f"处理依赖: {dep_name}")
            
            # 尝试下载
            all_urls = [dep_info['url']] + dep_info.get('mirror_urls', [])
            downloaded_file = self.download_with_retry(all_urls, dep_info['filename'])
            
            if downloaded_file:
                # 解压
                extracted_path = self.extract_archive(downloaded_file)
                if extracted_path:
                    results[dep_name] = {
                        'downloaded': downloaded_file,
                        'extracted': extracted_path,
                        'success': True
                    }
                else:
                    results[dep_name] = {'success': False, 'error': 'extraction_failed'}
            else:
                results[dep_name] = {'success': False, 'error': 'download_failed'}
        
        return results
    
    def setup_cmake_cache(self, build_dir):
        """设置CMake缓存以使用本地依赖"""
        build_dir = Path(build_dir)
        build_dir.mkdir(parents=True, exist_ok=True)
        
        cache_file = build_dir / "CMakeCache.txt"
        cache_entries = []
        
        # GoogleTest配置
        googletest_dir = self.cache_dir / "googletest-release-1.12.1"
        if googletest_dir.exists():
            cache_entries.extend([
                f"GTEST_ROOT:PATH={googletest_dir}",
                f"GTEST_INCLUDE_DIR:PATH={googletest_dir}/googletest/include",
                f"GTEST_LIBRARY:FILEPATH={googletest_dir}/build/lib/Release/gtest.lib",
                f"GTEST_MAIN_LIBRARY:FILEPATH={googletest_dir}/build/lib/Release/gtest_main.lib"
            ])
        
        # Eigen配置
        eigen_dir = self.cache_dir / "eigen-3.4.0" 
        if eigen_dir.exists():
            cache_entries.extend([
                f"EIGEN3_ROOT:PATH={eigen_dir}",
                f"EIGEN3_INCLUDE_DIR:PATH={eigen_dir}"
            ])
        
        if cache_entries:
            with open(cache_file, 'a', encoding='utf-8') as f:
                for entry in cache_entries:
                    f.write(f"{entry}\n")
            logger.info(f"CMake缓存已配置: {cache_file}")
    
    def create_offline_cmake_options(self):
        """创建离线CMake配置选项"""
        options = []
        
        # 禁用自动下载
        options.extend([
            "-DKRATOS_BUILD_TESTING=OFF",  # 暂时禁用测试以避免googletest下载
            "-DBUILD_TESTING=OFF",
            "-DGTEST_CREATE_SHARED_LIBRARY=OFF"
        ])
        
        # GoogleTest本地路径
        googletest_dir = self.cache_dir / "googletest-release-1.12.1"
        if googletest_dir.exists():
            options.extend([
                f"-DGTEST_ROOT={googletest_dir}",
                f"-DGTEST_INCLUDE_DIR={googletest_dir}/googletest/include"
            ])
        
        # Eigen本地路径
        eigen_dir = self.cache_dir / "eigen-3.4.0"
        if eigen_dir.exists():
            options.extend([
                f"-DEIGEN3_ROOT={eigen_dir}",
                f"-DEIGEN3_INCLUDE_DIR={eigen_dir}"
            ])
        
        return options
    
    def run_manual_download(self):
        """手动下载模式 - 提供下载链接和说明"""
        logger.info("=== 手动下载模式 ===")
        logger.info("由于网络问题，请手动下载以下文件：")
        
        download_dir = self.cache_dir
        logger.info(f"下载目录: {download_dir}")
        
        for name, info in self.dependencies.items():
            logger.info(f"\n{name}:")
            logger.info(f"  主要下载地址: {info['url']}")
            for mirror in info.get('mirror_urls', []):
                logger.info(f"  镜像地址: {mirror}")
            logger.info(f"  保存为: {download_dir / info['filename']}")
        
        logger.info("\n下载完成后，请重新运行编译脚本")

def main():
    """主函数"""
    handler = DependencyHandler()
    
    print("Kratos依赖处理工具")
    print("=" * 50)
    
    # 测试网络连通性
    print("\n1. 测试网络连通性...")
    connectivity = handler.test_network_connectivity()
    
    has_internet = any(connectivity.values())
    if not has_internet:
        print("❌ 没有可用的网络连接")
        handler.run_manual_download()
        return
    
    # 尝试自动下载
    print("\n2. 尝试自动下载依赖...")
    results = handler.download_dependencies(['googletest'])
    
    success_count = sum(1 for r in results.values() if r.get('success', False))
    total_count = len(results)
    
    print(f"\n下载结果: {success_count}/{total_count} 成功")
    
    for name, result in results.items():
        if result.get('success', False):
            print(f"✓ {name}: 成功")
        else:
            print(f"✗ {name}: 失败 - {result.get('error', 'unknown')}")
    
    # 生成CMake选项
    print("\n3. 生成离线CMake配置...")
    options = handler.create_offline_cmake_options()
    
    options_file = handler.project_root / "temp" / "cmake_offline_options.txt"
    with open(options_file, 'w', encoding='utf-8') as f:
        for option in options:
            f.write(f"{option}\n")
    
    print(f"离线CMake选项已保存到: {options_file}")
    print("请在编译时使用这些选项")

if __name__ == "__main__":
    main()
