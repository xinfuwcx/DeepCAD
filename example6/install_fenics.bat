@echo off
echo ===========================================
echo  FEniCSx (dolfinx) 安装脚本 for Python 3.13
echo ===========================================

echo.
echo 步骤1: 下载并安装 Miniconda
echo ----------------------------------------
echo 请手动下载并安装 Miniconda:
echo https://docs.anaconda.com/miniconda/miniconda-install/
echo.
echo 或者使用 winget 安装:
echo winget install Anaconda.Miniconda3
echo.

pause

echo.
echo 步骤2: 重启命令行后运行以下命令
echo ----------------------------------------
echo conda create -n fenicsx-env python=3.13
echo conda activate fenicsx-env
echo conda install -c conda-forge fenics-dolfinx mpich
echo conda install -c conda-forge pyvista pyvistaqt
echo conda install matplotlib numpy scipy
echo.

echo 步骤3: 激活环境并测试
echo ----------------------------------------
echo conda activate fenicsx-env
echo python -c "import dolfinx; print('FEniCSx version:', dolfinx.__version__)"
echo.

echo 步骤4: 在FEniCSx环境中运行example6
echo ----------------------------------------  
echo cd E:\DeepCAD\example6
echo python main.py
echo.

pause