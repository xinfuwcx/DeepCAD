@echo off
echo =====================================================
echo  DeepCAD Example6 with FEniCSx Environment
echo =====================================================

echo.
echo 激活FEniCS环境...
call "D:\ProgramData\miniconda3\Scripts\activate.bat" fenicsx-final

echo.
echo 环境信息:
python -c "import sys; print('Python:', sys.version[:5])"
python -c "try: import dolfinx; print('FEniCSx: 已安装'); except: print('FEniCSx: 导入失败 (MPI问题，但基础组件可用)')"
python -c "import pyvista; print('PyVista:', pyvista.__version__)"
python -c "import basix; print('Basix:', basix.__version__)"
python -c "import ufl; print('UFL:', ufl.__version__)"

echo.
echo 启动桥墩浅蚀模拟系统...
cd /d "E:\DeepCAD\example6"
python main.py

pause