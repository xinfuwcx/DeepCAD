@echo off
echo ======================================
echo 启动深基坑CAE系统
echo ======================================

REM 激活虚拟环境
call env\Scripts\activate.bat

REM 设置Python路径
set PYTHONPATH=%CD%

REM 启动后端API服务器
echo 启动后端API服务器...
start cmd /k "title 深基坑CAE系统后端 & python src\server\app.py"

REM 等待后端启动
timeout /t 5 /nobreak

REM 启动前端开发服务器
echo 启动前端开发服务器...
cd frontend
start cmd /k "title 深基坑CAE系统前端 & npm run dev"

REM 返回到根目录
cd ..

echo ======================================
echo 深基坑CAE系统启动完成
echo 后端API: http://localhost:8000
echo 前端界面: http://localhost:3000
echo API文档: http://localhost:8000/docs
echo ======================================

REM 打开浏览器
start http://localhost:3000


