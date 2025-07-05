# 深基坑工程统一分析测试脚本
# 此脚本用于测试深基坑工程的完整分析流程，包括渗流、支护结构、土体变形、稳定性和沉降分析

Write-Host "开始测试深基坑工程统一分析功能..." -ForegroundColor Cyan

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
$testDir = Join-Path $PSScriptRoot "..\data\deep_excavation_test"
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
20.0
 20
0.0
 10
20.0
 20
15.0
 10
0.0
 20
15.0
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
    project_name = "deep_excavation_test_project"
    dxf_file_content = [System.IO.File]::ReadAllText($dxfFilePath)
    layer_name = "EXCAVATION_OUTLINE"
    soil_layers = @(
        @{
            name = "粘土层"
            thickness = 5.0
            unit_weight = 18.5
            cohesion = 15.0
            friction_angle = 20.0
            young_modulus = 20000.0
            poisson_ratio = 0.3
            hydraulic_conductivity_x = 0.00001
            hydraulic_conductivity_y = 0.00001
            hydraulic_conductivity_z = 0.000005
            porosity = 0.3
            specific_storage = 0.0001
        },
        @{
            name = "砂土层"
            thickness = 10.0
            unit_weight = 19.0
            cohesion = 5.0
            friction_angle = 30.0
            young_modulus = 30000.0
            poisson_ratio = 0.25
            hydraulic_conductivity_x = 0.0001
            hydraulic_conductivity_y = 0.0001
            hydraulic_conductivity_z = 0.00005
            porosity = 0.35
            specific_storage = 0.0002
        }
    )
    structural_elements = @(
        @{
            type = "diaphragm_wall"
            name = "地下连续墙"
            geometry = @{
                height = 25.0
                thickness = 0.8
                top_level = 0.0
                path = @(
                    @{x = 0.0; y = 0.0; z = 0.0},
                    @{x = 20.0; y = 0.0; z = 0.0},
                    @{x = 20.0; y = 15.0; z = 0.0},
                    @{x = 0.0; y = 15.0; z = 0.0}
                )
            }
            material = @{
                young_modulus = 30000000.0
                poisson_ratio = 0.2
                unit_weight = 25.0
            }
        },
        @{
            type = "anchor"
            name = "锚杆系统"
            geometry = @{
                length = 15.0
                angle = 15.0
                spacing = 2.5
                installation_depth = -5.0
            }
            material = @{
                young_modulus = 210000000.0
                prestress = 300.0
                cross_section_area = 0.0005
            }
        }
    )
    boundary_conditions = @(
        @{
            type = "hydraulic"
            boundary_name = "外侧边界"
            value = 10.0
        },
        @{
            type = "hydraulic"
            boundary_name = "基坑内侧"
            value = 2.0
        },
        @{
            type = "displacement"
            boundary_name = "底部边界"
            value = @(0.0, 0.0, 0.0)
        }
    )
    excavation_stages = @(
        @{
            name = "第一阶段开挖"
            depth = 5.0
            active_supports = @("地下连续墙")
        },
        @{
            name = "安装锚杆"
            depth = 5.0
            active_supports = @("地下连续墙", "锚杆系统")
        },
        @{
            name = "第二阶段开挖"
            depth = 10.0
            active_supports = @("地下连续墙", "锚杆系统")
        }
    )
    analysis_types = @("seepage", "structural", "deformation", "stability", "settlement")
}

$testDataPath = Join-Path $testDir "test_data.json"
$testData | ConvertTo-Json -Depth 10 | Out-File -FilePath $testDataPath

Write-Host "测试数据已创建: $testDataPath" -ForegroundColor Green

# 运行测试
Write-Host "`n开始运行深基坑工程统一分析测试..." -ForegroundColor Yellow

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
    
    Write-Host "正在发送深基坑工程统一分析请求..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/deep-excavation/analyze" -Method Post -Body ($testData | ConvertTo-Json -Depth 10) -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "深基坑工程统一分析请求成功！" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "`n分析结果:" -ForegroundColor Cyan
        Write-Host "状态: $($result.status)" -ForegroundColor Green
        Write-Host "项目名称: $($result.project_name)" -ForegroundColor Green
        
        # 显示各项分析结果
        if ($result.results.results.seepage) {
            Write-Host "`n渗流分析结果:" -ForegroundColor Yellow
            Write-Host "  总流量: $($result.results.results.seepage.total_discharge_m3_per_s) m³/s" -ForegroundColor White
            Write-Host "  最大水头差: $($result.results.results.seepage.max_head_difference) m" -ForegroundColor White
        }
        
        if ($result.results.results.structural) {
            Write-Host "`n支护结构分析结果:" -ForegroundColor Yellow
            Write-Host "  最大位移: $($result.results.results.structural.max_displacement_mm) mm" -ForegroundColor White
            Write-Host "  最大弯矩: $($result.results.results.structural.max_bending_moment_kNm) kN·m" -ForegroundColor White
        }
        
        if ($result.results.results.deformation) {
            Write-Host "`n土体变形分析结果:" -ForegroundColor Yellow
            Write-Host "  最大垂直位移: $($result.results.results.deformation.max_vertical_displacement_mm) mm" -ForegroundColor White
            Write-Host "  最大水平位移: $($result.results.results.deformation.max_horizontal_displacement_mm) mm" -ForegroundColor White
        }
        
        if ($result.results.results.stability) {
            Write-Host "`n稳定性分析结果:" -ForegroundColor Yellow
            Write-Host "  安全系数: $($result.results.results.stability.safety_factor)" -ForegroundColor White
            Write-Host "  临界滑动面: $($result.results.results.stability.critical_surface)" -ForegroundColor White
        }
        
        if ($result.results.results.settlement) {
            Write-Host "`n沉降分析结果:" -ForegroundColor Yellow
            Write-Host "  最大沉降量: $($result.results.results.settlement.max_settlement_mm) mm" -ForegroundColor White
            Write-Host "  影响范围: $($result.results.results.settlement.influence_range_m) m" -ForegroundColor White
        }
        
        # 保存结果
        $resultPath = Join-Path $testDir "test_result.json"
        $response.Content | Out-File -FilePath $resultPath
        Write-Host "`n结果已保存到: $resultPath" -ForegroundColor Green
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