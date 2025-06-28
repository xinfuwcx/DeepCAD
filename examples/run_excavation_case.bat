@echo off
echo 基坑开挖案例测试
echo ==================

REM 设置Python环境
call env\Scripts\activate.bat

REM 创建结果目录
if not exist "examples\case_results" mkdir "examples\case_results"
if not exist "examples\case_results\figures" mkdir "examples\case_results\figures"

echo.
echo 步骤1: 运行基坑开挖案例
echo -------------------------
python examples\excavation_case.py

echo.
echo 步骤2: 可视化计算结果
echo -------------------------
python examples\visualize_results.py --result "examples\case_results\result.vtk" --mesh "examples\case_results\mesh.msh"

echo.
echo 案例测试完成！
echo 结果保存在 examples\case_results 目录下
echo 可视化结果保存在 examples\case_results\figures 目录下

REM 打开结果目录
explorer "examples\case_results\figures"

pause



