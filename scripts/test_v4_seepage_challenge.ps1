# 渗流分析功能测试脚本
# 此脚本用于测试渗流分析功能，包括数据流和物理组

Write-Host "开始测试渗流分析功能..." -ForegroundColor Cyan

# 设置Kratos环境变量
$KratosDir = Join-Path $PSScriptRoot "..\Kratos"
$KratosInstallDir = Join-Path $KratosDir "install"

if (-not (Test-Path $KratosInstallDir)) {
    Write-Host "Kratos尚未安装或构建，请先运行配置和构建脚本。" -ForegroundColor Red
    exit 1
}

# 将Kratos添加到环境变量
$env:PYTHONPATH = "$KratosInstallDir;$env:PYTHONPATH"
$env:PATH = "$KratosInstallDir;$env:PATH"

Write-Host "Kratos环境变量已配置。" -ForegroundColor Green

# 创建测试数据目录
$testDir = Join-Path $PSScriptRoot "..\data\seepage_test"
if (-not (Test-Path $testDir)) {
    New-Item -ItemType Directory -Path $testDir | Out-Null
}

# 创建测试DXF文件
$dxfContent = @"
  0
SECTION
  2
HEADER
  9
\$ACADVER
  1
AC1027
  9
\$DWGCODEPAGE
  3
ANSI_1252
  0
ENDSEC
  0
SECTION
  2
TABLES
  0
TABLE
  2
LAYER
  5
2
  0
LAYER
  5
10
  2
EXCAVATION_OUTLINE
  70
0
  62
7
  0
ENDTAB
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
LWPOLYLINE
  5
100
  8
EXCAVATION_OUTLINE
 90
5
 70
1
 43
0.0
 10
0.0
 20
0.0
 10
10.0
 20
0.0
 10
10.0
 20
5.0
 10
0.0
 20
5.0
 10
0.0
 20
0.0
  0
ENDSEC
  0
EOF
"@

$dxfFilePath = Join-Path $testDir "test_excavation.dxf"
$dxfContent | Out-File -FilePath $dxfFilePath -Encoding ascii

Write-Host "测试DXF文件已创建: $dxfFilePath" -ForegroundColor Green

# 创建测试数据JSON
$testData = @{
    project_name = "seepage_test_project"
    geometry_definition = @{
        project_name = "test_geometry"
        soil_profile = @(
            @{
                material_name = "clay"
                surface_points = @(
                    @(-5, -5, 0),
                    @(15, -5, 0),
                    @(15, 10, 0),
                    @(-5, 10, 0)
                )
                average_thickness = 5
            }
        )
        excavation = @{
            dxf_file_content = [System.IO.File]::ReadAllText($dxfFilePath)
            layer_name = "EXCAVATION_OUTLINE"
            excavation_depth = 3
        }
    }
    materials = @(
        @{
            name = "clay"
            hydraulic_conductivity_x = 0.00001
            hydraulic_conductivity_y = 0.00001
            hydraulic_conductivity_z = 0.000005
            porosity = 0.3
            specific_storage = 0.0001
        }
    )
    boundary_conditions = @(
        @{
            boundary_name = "left_boundary"
            total_head = 10.0
        },
        @{
            boundary_name = "right_boundary"
            total_head = 5.0
        }
    )
}

$testDataPath = Join-Path $testDir "test_data.json"
$testData | ConvertTo-Json -Depth 10 | Out-File -FilePath $testDataPath

Write-Host "测试数据已创建: $testDataPath" -ForegroundColor Green

# 运行测试
Write-Host "`n开始运行渗流分析测试..." -ForegroundColor Yellow

# 检查后端服务是否运行
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
    }
}
catch {
    $backendRunning = $false
}

if (-not $backendRunning) {
    Write-Host "后端服务未运行，正在启动..." -ForegroundColor Yellow
    $backendJob = Start-Job -ScriptBlock {
        Set-Location (Join-Path $using:PSScriptRoot "..")
        python run_backend.py
    }
    
    # 等待后端服务启动
    Start-Sleep -Seconds 5
}

# 发送测试请求
try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "正在发送渗流分析请求..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v4/seepage/analyze" -Method Post -Body ($testData | ConvertTo-Json -Depth 10) -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "渗流分析请求成功！" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "`n分析结果:" -ForegroundColor Cyan
        Write-Host "状态: $($result.pipeline_status)" -ForegroundColor Green
        Write-Host "总流量: $($result.seepage_results.total_discharge_m3_per_s) m³/s" -ForegroundColor Green
        
        # 保存结果
        $resultPath = Join-Path $testDir "test_result.json"
        $response.Content | Out-File -FilePath $resultPath
        Write-Host "结果已保存到: $resultPath" -ForegroundColor Green
    }
    else {
        Write-Host "请求失败: $($response.StatusCode)" -ForegroundColor Red
    }
}
catch {
    Write-Host "测试失败: $_" -ForegroundColor Red
}
finally {
    # 如果我们启动了后端服务，则停止它
    if (-not $backendRunning -and $backendJob) {
        Stop-Job $backendJob
        Remove-Job $backendJob
    }
}

Write-Host "`n测试完成。" -ForegroundColor Cyan 