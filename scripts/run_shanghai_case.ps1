# PowerShell Script to run a full analysis for the Shanghai Deep Excavation case.
# IMPORTANT: This script assumes the backend server is already running.
# Please run 'python run_backend.py' in a separate terminal before executing this script.

Write-Host "Starting end-to-end test for Shanghai Deep Excavation case..." -ForegroundColor Cyan
Write-Host "Please ensure the backend server is running on http://localhost:8000" -ForegroundColor Yellow

# Define Project Data based on the real Shanghai case
$testData = @{
    project_name = "Shanghai Office Building Deep Excavation"
    dxf_file_content = "" # Assuming DXF is handled by backend or not needed for this test run
    layer_name = "EXCAVATION_OUTLINE"
    soil_layers = @(
        @{ name = "Fill"; thickness = 2.5; unit_weight = 18.5; cohesion = 8.0; friction_angle = 10.0; young_modulus = 5000.0; poisson_ratio = 0.35; hydraulic_conductivity_x = 5.0e-6; hydraulic_conductivity_y = 5.0e-6; hydraulic_conductivity_z = 3.0e-6; porosity = 0.42; specific_storage = 0.0003 },
        @{ name = "Silty Clay"; thickness = 6.0; unit_weight = 17.8; cohesion = 12.0; friction_angle = 8.5; young_modulus = 4000.0; poisson_ratio = 0.42; hydraulic_conductivity_x = 2.0e-7; hydraulic_conductivity_y = 2.0e-7; hydraulic_conductivity_z = 1.0e-7; porosity = 0.48; specific_storage = 0.0005 },
        @{ name = "Fine Sand"; thickness = 3.5; unit_weight = 19.2; cohesion = 5.0; friction_angle = 28.0; young_modulus = 18000.0; poisson_ratio = 0.28; hydraulic_conductivity_x = 5.0e-5; hydraulic_conductivity_y = 5.0e-5; hydraulic_conductivity_z = 3.0e-5; porosity = 0.38; specific_storage = 0.0001 },
        @{ name = "Clay"; thickness = 8.0; unit_weight = 19.5; cohesion = 22.0; friction_angle = 15.0; young_modulus = 12000.0; poisson_ratio = 0.32; hydraulic_conductivity_x = 8.0e-7; hydraulic_conductivity_y = 8.0e-7; hydraulic_conductivity_z = 5.0e-7; porosity = 0.35; specific_storage = 0.0002 },
        @{ name = "Sandy Clay"; thickness = 6.0; unit_weight = 19.8; cohesion = 10.0; friction_angle = 25.0; young_modulus = 22000.0; poisson_ratio = 0.30; hydraulic_conductivity_x = 2.0e-5; hydraulic_conductivity_y = 2.0e-5; hydraulic_conductivity_z = 1.0e-5; porosity = 0.36; specific_storage = 0.00015 }
    )
    structural_elements = @(
        @{
            type = "diaphragm_wall"; name = "Diaphragm Wall";
            geometry = @{ height = 28.0; thickness = 0.8; top_level = 0.0; path = @( @{x=0;y=0;z=0}, @{x=36.5;y=0;z=0}, @{x=36.5;y=22.8;z=0}, @{x=25.2;y=22.8;z=0}, @{x=0;y=22.8;z=0}, @{x=0;y=0;z=0} ) };
            material = @{ young_modulus = 30e9; poisson_ratio = 0.2; unit_weight = 25.0; concrete_grade = "C30"; reinforcement_ratio = 0.01 }
        },
        @{
            type = "strut"; name = "Strut Level 1";
            geometry = @{ installation_depth = -2.5; section_type = "H-Beam"; section_height = 0.4; section_width = 0.4; spacing = 6.0 };
            material = @{ young_modulus = 210e9; poisson_ratio = 0.3; yield_strength = 345e6; steel_grade = "Q345" }
        },
        @{
            type = "strut"; name = "Strut Level 2";
            geometry = @{ installation_depth = -8.5; section_type = "H-Beam"; section_height = 0.5; section_width = 0.5; spacing = 6.0 };
            material = @{ young_modulus = 210e9; poisson_ratio = 0.3; yield_strength = 345e6; steel_grade = "Q345" }
        },
        @{
            type = "strut"; name = "Strut Level 3";
            geometry = @{ installation_depth = -14.5; section_type = "H-Beam"; section_height = 0.6; section_width = 0.6; spacing = 6.0 };
            material = @{ young_modulus = 210e9; poisson_ratio = 0.3; yield_strength = 345e6; steel_grade = "Q345" }
        }
    )
    boundary_conditions = @(
        @{ type = "hydraulic"; boundary_name = "Water Table"; value = -1.5 },
        @{ type = "hydraulic"; boundary_name = "Pit Bottom"; value = -19.0 },
        @{ type = "displacement"; boundary_name = "Model Bottom"; value = @(0.0, 0.0, 0.0) },
        @{ type = "displacement"; boundary_name = "Model Sides"; value = @(0.0, $null, 0.0) },
        @{ type = "force"; boundary_name = "Building Load"; value = 20.0 }
    )
    excavation_stages = @(
        @{ name = "Stage 1: Excavate to -3.5m"; depth = 3.5; active_supports = @("Diaphragm Wall") },
        @{ name = "Stage 2: Install Strut 1"; depth = 3.5; active_supports = @("Diaphragm Wall", "Strut Level 1") },
        @{ name = "Stage 3: Excavate to -9.5m"; depth = 9.5; active_supports = @("Diaphragm Wall", "Strut Level 1") },
        @{ name = "Stage 4: Install Strut 2"; depth = 9.5; active_supports = @("Diaphragm Wall", "Strut Level 1", "Strut Level 2") },
        @{ name = "Stage 5: Excavate to -15.5m"; depth = 15.5; active_supports = @("Diaphragm Wall", "Strut Level 1", "Strut Level 2") },
        @{ name = "Stage 6: Install Strut 3"; depth = 15.5; active_supports = @("Diaphragm Wall", "Strut Level 1", "Strut Level 2", "Strut Level 3") },
        @{ name = "Stage 7: Final Excavation to -19.0m"; depth = 19.0; active_supports = @("Diaphragm Wall", "Strut Level 1", "Strut Level 2", "Strut Level 3") }
    )
    analysis_types = @("seepage", "structural", "deformation", "stability", "settlement")
    analysis_parameters = @{
        mesh_size = @{ global_size = 2.0 }
    }
}

$testDataJson = $testData | ConvertTo-Json -Depth 10

# Check if backend is accessible
Write-Host "`nChecking for backend server..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -ErrorAction Stop
    Write-Host "Backend found at $($response.BaseResponse.ResponseUri)." -ForegroundColor Green
} catch {
    Write-Host "Error: Could not connect to backend at http://localhost:8000." -ForegroundColor Red
    Write-Host "Please make sure you have started the backend server by running 'python run_backend.py' from the project root." -ForegroundColor Red
    exit 1
}

# Send analysis request to the backend
Write-Host "`nSending analysis request to backend..." -ForegroundColor Cyan
try {
    $headers = @{ "Content-Type" = "application/json" }
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/deep-excavation/analyze" -Method Post -Body $testDataJson -Headers $headers -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "Analysis request successful!" -ForegroundColor Green
        
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "`n--- ANALYSIS RESULTS ---" -ForegroundColor Cyan
        
        # Display summary
        Write-Host "Project: $($result.project_name)"
        Write-Host "Status: $($result.status)"
        Write-Host "Computation Time: $($result.computation_time_seconds) seconds"
        
        # Display detailed results
        $result.results | ConvertTo-Json -Depth 5 | Write-Output
        
        # Save results to file
        $resultDir = Join-Path $PSScriptRoot "..\data\shanghai_case_run"
        if (-not (Test-Path $resultDir)) {
            New-Item -ItemType Directory -Path $resultDir | Out-Null
        }
        $resultPath = Join-Path $resultDir "analysis_results.json"
        $response.Content | Out-File -FilePath $resultPath
        Write-Host "`nFull results saved to: $resultPath" -ForegroundColor Green
        
    } else {
        Write-Host "Request failed with status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host "Response content: $($response.Content)" -ForegroundColor Red
    }
} catch {
    Write-Host "An error occurred during the analysis request: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $reader.BaseStream.Position = 0
        $errorBody = $reader.ReadToEnd();
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`nEnd-to-end test script finished." -ForegroundColor Cyan 