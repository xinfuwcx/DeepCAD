@echo off
echo ========================================
echo 安装Netgen网格生成工具
echo ========================================

echo 正在安装netgen-mesher包...
pip install netgen-mesher==6.2.2504 meshio==5.3.5

echo 安装完成后检查Netgen...
python tools/setup/check_netgen.py

echo ========================================
echo 如果上述检查成功，则Netgen已成功安装
echo ========================================
pause 