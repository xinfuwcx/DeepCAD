@echo off
echo ======================================================
echo 运行高级深基坑分析示例
echo ======================================================
echo.

echo 1. 参数敏感性分析和不确定性量化示例
python examples/advanced/parameter_uncertainty_demo.py
echo.
echo 参数分析示例完成
echo ======================================================
echo.

echo 2. FEM-PINN双向数据交换示例
python examples/advanced/fem_pinn_exchange_demo.py
echo.
echo 数据交换示例完成
echo ======================================================
echo.

echo 3. 自适应网格细化示例
python examples/advanced/adaptive_mesh_refinement_demo.py
echo.
echo 网格细化示例完成
echo ======================================================
echo.

echo 所有高级示例运行完成
echo 结果保存在 results 目录中
echo ======================================================

pause 