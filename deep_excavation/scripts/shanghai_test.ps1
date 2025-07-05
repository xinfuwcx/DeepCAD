# Shanghai Deep Excavation Project Test Script
# This script simulates a complete deep excavation analysis for a real project in Shanghai

Write-Host "Starting Shanghai Deep Excavation Project Test..." -ForegroundColor Cyan

# Create test data directory
$testDir = Join-Path $PSScriptRoot "..\data\shanghai_case"
if (-not (Test-Path $testDir)) {
    New-Item -ItemType Directory -Path $testDir | Out-Null
}

# Create simulated result data
$simulatedResult = @{
    status = "success"
    project_name = "Shanghai Office Building Deep Excavation Project"
    results = @{
        results = @{
            seepage = @{
                total_discharge_m3_per_s = 0.00852
                max_head_difference = 17.5
                max_seepage_force_kPa = 16.2
                max_exit_gradient = 0.38
            }
            structural = @{
                max_displacement_mm = 38.2
                max_bending_moment_kNm = 685.3
                max_negative_moment_kNm = -520.8
                max_strut_force_kN = 1820
            }
            deformation = @{
                max_horizontal_displacement_mm = 42.5
                max_vertical_displacement_mm = 35.8
                max_heave_mm = 28.6
            }
            stability = @{
                overall_safety_factor = 1.52
                basal_heave_factor = 1.65
                critical_surface = "Circular slip surface through pit bottom"
            }
            settlement = @{
                max_settlement_mm = 32.5
                influence_range_m = 45.2
                adjacent_building_settlement_mm = 18.3
                settlement_trough_angle = 35
            }
        }
        mesh_info = @{
            total_nodes = 412000
            total_elements = 256000
            mesh_quality = "Good"
        }
        computation_time = 186.5  # seconds
    }
}

# Save simulated result
$resultPath = Join-Path $testDir "shanghai_case_result.json"
$simulatedResult | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultPath

Write-Host "Test data has been created: $resultPath" -ForegroundColor Green

# Display analysis results
Write-Host "`nAnalysis Results:" -ForegroundColor Cyan
Write-Host "Status: $($simulatedResult.status)" -ForegroundColor Green
Write-Host "Project Name: $($simulatedResult.project_name)" -ForegroundColor Green

# Display seepage analysis results
if ($simulatedResult.results.results.seepage) {
    Write-Host "`nSeepage Analysis Results:" -ForegroundColor Yellow
    Write-Host "  Total Discharge: $($simulatedResult.results.results.seepage.total_discharge_m3_per_s) m³/s" -ForegroundColor White
    Write-Host "  Max Head Difference: $($simulatedResult.results.results.seepage.max_head_difference) m" -ForegroundColor White
    Write-Host "  Max Seepage Force: $($simulatedResult.results.results.seepage.max_seepage_force_kPa) kPa" -ForegroundColor White
    Write-Host "  Max Exit Gradient: $($simulatedResult.results.results.seepage.max_exit_gradient)" -ForegroundColor White
}

# Display structural analysis results
if ($simulatedResult.results.results.structural) {
    Write-Host "`nStructural Analysis Results:" -ForegroundColor Yellow
    Write-Host "  Max Horizontal Displacement: $($simulatedResult.results.results.structural.max_displacement_mm) mm" -ForegroundColor White
    Write-Host "  Max Positive Bending Moment: $($simulatedResult.results.results.structural.max_bending_moment_kNm) kN·m" -ForegroundColor White
    Write-Host "  Max Negative Bending Moment: $($simulatedResult.results.results.structural.max_negative_moment_kNm) kN·m" -ForegroundColor White
    Write-Host "  Max Strut Force: $($simulatedResult.results.results.structural.max_strut_force_kN) kN" -ForegroundColor White
}

# Display deformation analysis results
if ($simulatedResult.results.results.deformation) {
    Write-Host "`nDeformation Analysis Results:" -ForegroundColor Yellow
    Write-Host "  Max Horizontal Displacement: $($simulatedResult.results.results.deformation.max_horizontal_displacement_mm) mm" -ForegroundColor White
    Write-Host "  Max Vertical Displacement: $($simulatedResult.results.results.deformation.max_vertical_displacement_mm) mm" -ForegroundColor White
    Write-Host "  Max Bottom Heave: $($simulatedResult.results.results.deformation.max_heave_mm) mm" -ForegroundColor White
}

# Display stability analysis results
if ($simulatedResult.results.results.stability) {
    Write-Host "`nStability Analysis Results:" -ForegroundColor Yellow
    Write-Host "  Overall Safety Factor: $($simulatedResult.results.results.stability.overall_safety_factor)" -ForegroundColor White
    Write-Host "  Critical Slip Surface: $($simulatedResult.results.results.stability.critical_surface)" -ForegroundColor White
    Write-Host "  Basal Heave Safety Factor: $($simulatedResult.results.results.stability.basal_heave_factor)" -ForegroundColor White
}

# Display settlement analysis results
if ($simulatedResult.results.results.settlement) {
    Write-Host "`nSettlement Analysis Results:" -ForegroundColor Yellow
    Write-Host "  Max Settlement: $($simulatedResult.results.results.settlement.max_settlement_mm) mm" -ForegroundColor White
    Write-Host "  Influence Range: $($simulatedResult.results.results.settlement.influence_range_m) m" -ForegroundColor White
    Write-Host "  Adjacent Building Settlement: $($simulatedResult.results.results.settlement.adjacent_building_settlement_mm) mm" -ForegroundColor White
    Write-Host "  Settlement Trough Angle: $($simulatedResult.results.results.settlement.settlement_trough_angle) degrees" -ForegroundColor White
}

# Display computation information
Write-Host "`nComputation Information:" -ForegroundColor Cyan
Write-Host "  Total Nodes: $($simulatedResult.results.mesh_info.total_nodes)" -ForegroundColor White
Write-Host "  Total Elements: $($simulatedResult.results.mesh_info.total_elements)" -ForegroundColor White
Write-Host "  Mesh Quality: $($simulatedResult.results.mesh_info.mesh_quality)" -ForegroundColor White
Write-Host "  Computation Time: $($simulatedResult.results.computation_time) seconds" -ForegroundColor White

# Project details
Write-Host "`nProject Details:" -ForegroundColor Cyan
Write-Host "  Excavation Dimensions: 36.5m × 22.8m" -ForegroundColor White
Write-Host "  Excavation Depth: 19.0m" -ForegroundColor White
Write-Host "  Support System: Diaphragm wall with three levels of struts" -ForegroundColor White
Write-Host "  Diaphragm Wall: 0.8m thick, 28.0m deep" -ForegroundColor White
Write-Host "  Strut Levels: -2.5m, -8.5m, -14.5m" -ForegroundColor White
Write-Host "  Groundwater Level: -1.5m from ground surface" -ForegroundColor White
Write-Host "  Soil Layers: 5 layers (Fill, Silty Clay, Fine Sand, Clay, Sandy Clay)" -ForegroundColor White

# Excavation stages
Write-Host "`nExcavation Stages:" -ForegroundColor Cyan
Write-Host "  Stage 1: Excavate to -3.5m" -ForegroundColor White
Write-Host "  Stage 2: Install first level struts" -ForegroundColor White
Write-Host "  Stage 3: Excavate to -9.5m" -ForegroundColor White
Write-Host "  Stage 4: Install second level struts" -ForegroundColor White
Write-Host "  Stage 5: Excavate to -15.5m" -ForegroundColor White
Write-Host "  Stage 6: Install third level struts" -ForegroundColor White
Write-Host "  Stage 7: Excavate to final level -19.0m" -ForegroundColor White

Write-Host "`nResults have been saved to: $resultPath" -ForegroundColor Green
Write-Host "`nTest completed." -ForegroundColor Cyan

# Create a simple visualization of the excavation
Write-Host "`nExcavation Cross-Section Visualization:" -ForegroundColor Cyan
Write-Host "  0.0m  Ground Level  ----------------------------------------" -ForegroundColor White
Write-Host "                      |                                      |" -ForegroundColor White
Write-Host " -1.5m  Water Level   |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|" -ForegroundColor Blue
Write-Host "                      |                                      |" -ForegroundColor White
Write-Host " -2.5m  Strut Level 1 |==========|              |===========|" -ForegroundColor Yellow
Write-Host "                      |          |              |           |" -ForegroundColor White
Write-Host "                      |          |              |           |" -ForegroundColor White
Write-Host " -8.5m  Strut Level 2 |==========|              |===========|" -ForegroundColor Yellow
Write-Host "                      |          |              |           |" -ForegroundColor White
Write-Host "                      |          |              |           |" -ForegroundColor White
Write-Host "-14.5m  Strut Level 3 |==========|              |===========|" -ForegroundColor Yellow
Write-Host "                      |          |              |           |" -ForegroundColor White
Write-Host "                      |          |              |           |" -ForegroundColor White
Write-Host "-19.0m  Bottom Level  |          ----------------           |" -ForegroundColor White
Write-Host "                      |                                     |" -ForegroundColor White
Write-Host "                      |                                     |" -ForegroundColor White
Write-Host "-28.0m  Wall Bottom   |                                     |" -ForegroundColor White
Write-Host "                      --------------------------------------- " -ForegroundColor White 