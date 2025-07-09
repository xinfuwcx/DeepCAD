# 朱雀架构启动脚本
# 用于启动朱雀架构的所有服务

Write-Host "正在启动朱雀架构服务..." -ForegroundColor Cyan

# 检查Docker是否运行
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Docker未运行，请先启动Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查docker-compose是否可用
$composeStatus = docker-compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: docker-compose不可用，请安装docker-compose" -ForegroundColor Red
    exit 1
}

# 创建必要的目录
Write-Host "创建必要的目录..." -ForegroundColor Green
$directories = @(
    "./services/geometry/data",
    "./services/mesh/data",
    "./services/analysis/data",
    "./services/project/data",
    "./services/file/storage"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "创建目录: $dir" -ForegroundColor Green
    }
}

# 停止并移除旧容器
Write-Host "停止并移除旧容器..." -ForegroundColor Yellow
docker-compose down

# 构建并启动服务
Write-Host "构建并启动服务..." -ForegroundColor Green
docker-compose up --build -d

# 等待服务启动
Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host "检查服务状态..." -ForegroundColor Cyan
docker-compose ps

# 显示服务访问信息
Write-Host "`n朱雀架构服务已启动!" -ForegroundColor Green
Write-Host "`n访问以下地址使用服务:" -ForegroundColor Cyan
Write-Host "前端应用: http://localhost" -ForegroundColor White
Write-Host "API网关: http://localhost/api" -ForegroundColor White
Write-Host "Consul管理界面: http://localhost/consul" -ForegroundColor White
Write-Host "Prometheus监控: http://localhost/prometheus" -ForegroundColor White
Write-Host "Grafana仪表盘: http://localhost/grafana" -ForegroundColor White
Write-Host "Jaeger链路追踪: http://localhost/jaeger" -ForegroundColor White

Write-Host "`n使用以下命令查看服务日志:" -ForegroundColor Cyan
Write-Host "docker-compose logs -f [服务名称]" -ForegroundColor White
Write-Host "例如: docker-compose logs -f geometry-service" -ForegroundColor White

Write-Host "`n使用以下命令停止服务:" -ForegroundColor Cyan
Write-Host "docker-compose down" -ForegroundColor White

# 自动打开浏览器
$openBrowser = Read-Host "是否打开浏览器访问前端应用? (y/n)"
if ($openBrowser -eq "y") {
    Start-Process "http://localhost"
}

Write-Host "`n朱雀架构启动完成!" -ForegroundColor Green 