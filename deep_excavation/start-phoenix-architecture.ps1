# 启动凤凰架构微服务系统
# 基于Docker Compose的完整微服务栈

Write-Host "=== 启动深基坑分析系统 - 凤凰架构版本 ===" -ForegroundColor Green

# 检查Docker是否安装
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到Docker。请先安装Docker Desktop。" -ForegroundColor Red
    exit 1
}

# 检查Docker Compose是否安装
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到docker-compose。请先安装Docker Compose。" -ForegroundColor Red
    exit 1
}

# 设置工作目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "当前工作目录: $(Get-Location)" -ForegroundColor Yellow

# 停止并清理现有容器
Write-Host "清理现有容器..." -ForegroundColor Yellow
docker-compose down -v --remove-orphans

# 创建数据目录
Write-Host "创建数据目录..." -ForegroundColor Yellow
$dataDirs = @("data/geometry", "data/mesh", "data/analysis", "data/result")
foreach ($dir in $dataDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 构建并启动服务
Write-Host "构建并启动微服务..." -ForegroundColor Yellow

# 首先启动基础设施服务
Write-Host "启动基础设施服务 (Consul, Redis, PostgreSQL, RabbitMQ)..." -ForegroundColor Cyan
docker-compose up -d consul redis postgres rabbitmq minio

# 等待基础设施服务启动
Write-Host "等待基础设施服务启动..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# 启动监控服务
Write-Host "启动监控服务 (Prometheus, Grafana, Jaeger)..." -ForegroundColor Cyan
docker-compose up -d prometheus grafana jaeger elasticsearch kibana

# 等待监控服务启动
Start-Sleep -Seconds 20

# 启动API网关
Write-Host "启动API网关..." -ForegroundColor Cyan
docker-compose up -d api-gateway

# 启动业务微服务
Write-Host "启动业务微服务..." -ForegroundColor Cyan
docker-compose up -d geometry-service mesh-service analysis-service result-service project-service file-service notification-service

# 启动前端
Write-Host "启动前端应用..." -ForegroundColor Cyan
docker-compose up -d frontend

# 等待所有服务启动
Write-Host "等待所有服务启动完成..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# 检查服务状态
Write-Host "检查服务状态..." -ForegroundColor Yellow
$services = @(
    @{Name="Consul"; URL="http://localhost:8500"; Description="服务发现"},
    @{Name="API Gateway"; URL="http://localhost:8000/health"; Description="API网关"},
    @{Name="Geometry Service"; URL="http://localhost:8000/api/geometry/health"; Description="几何服务"},
    @{Name="Prometheus"; URL="http://localhost:9090"; Description="监控系统"},
    @{Name="Grafana"; URL="http://localhost:3000"; Description="可视化面板"},
    @{Name="Jaeger"; URL="http://localhost:16686"; Description="链路追踪"},
    @{Name="RabbitMQ"; URL="http://localhost:15672"; Description="消息队列"},
    @{Name="MinIO"; URL="http://localhost:9001"; Description="对象存储"},
    @{Name="Frontend"; URL="http://localhost:3001"; Description="前端应用"}
)

Write-Host "`n=== 服务状态检查 ===" -ForegroundColor Green
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -Method GET -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($service.Name): 运行正常" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $($service.Name): 状态异常 ($($response.StatusCode))" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $($service.Name): 无法访问" -ForegroundColor Red
    }
}

Write-Host "`n=== 系统访问地址 ===" -ForegroundColor Green
Write-Host "🌐 前端应用:     http://localhost:3001" -ForegroundColor Cyan
Write-Host "🔧 API网关:      http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 Consul UI:    http://localhost:8500" -ForegroundColor Cyan
Write-Host "📈 Prometheus:   http://localhost:9090" -ForegroundColor Cyan
Write-Host "📊 Grafana:      http://localhost:3000 (admin/admin123)" -ForegroundColor Cyan
Write-Host "🔍 Jaeger:       http://localhost:16686" -ForegroundColor Cyan
Write-Host "🐰 RabbitMQ:     http://localhost:15672 (admin/admin123)" -ForegroundColor Cyan
Write-Host "📦 MinIO:        http://localhost:9001 (admin/admin123)" -ForegroundColor Cyan
Write-Host "📋 Kibana:       http://localhost:5601" -ForegroundColor Cyan

Write-Host "`n=== 微服务API端点 ===" -ForegroundColor Green
Write-Host "🔧 几何服务:     http://localhost:8000/api/geometry/" -ForegroundColor White
Write-Host "🕸️  网格服务:     http://localhost:8000/api/mesh/" -ForegroundColor White
Write-Host "⚡ 分析服务:     http://localhost:8000/api/analysis/" -ForegroundColor White
Write-Host "📊 结果服务:     http://localhost:8000/api/result/" -ForegroundColor White
Write-Host "📁 项目服务:     http://localhost:8000/api/project/" -ForegroundColor White
Write-Host "📎 文件服务:     http://localhost:8000/api/file/" -ForegroundColor White
Write-Host "🔔 通知服务:     http://localhost:8000/api/notification/" -ForegroundColor White

Write-Host "`n=== 使用说明 ===" -ForegroundColor Green
Write-Host "1. 系统已启动完成，所有服务运行在Docker容器中" -ForegroundColor White
Write-Host "2. 前端应用已连接到API网关，可以正常使用" -ForegroundColor White
Write-Host "3. 使用 'docker-compose logs <service-name>' 查看服务日志" -ForegroundColor White
Write-Host "4. 使用 'docker-compose down' 停止所有服务" -ForegroundColor White
Write-Host "5. 使用 'docker-compose ps' 查看服务状态" -ForegroundColor White

Write-Host "`n🎉 凤凰架构微服务系统启动完成！" -ForegroundColor Green 