# PowerShell script to test the V3.2 Engineering Analysis Endpoint

$headers = @{
    "Content-Type"="application/json"
}

$body = @{
    width = 20.0
    height = 12.0
    length = 30.0
    soil_layers = @(
        @{
            thickness = 25.0
            material_name = "SiltyClay"
        }
    )
    materials = @(
        @{
            name = "SiltyClay"
            young_modulus = 20000000.0
            poisson_ratio = 0.3
            unit_weight = 18000.0
        },
        @{
            name = "C30_Concrete"
            young_modulus = 30000000000.0
            poisson_ratio = 0.2
            unit_weight = 25000.0
        }
    )
    diaphragm_wall = @{
        thickness = 0.8
        depth = 20.0
        material_name = "C30_Concrete"
    }
    anchors = @(
        @{
            level = 4.0
            length = 20.0
            angle = 15.0
            prestress_force = 500000.0
        },
        @{
            level = 8.0
            length = 18.0
            angle = 15.0
            prestress_force = 500000.0
        }
    )
    analysis_type = "3D_Soil_Structure_Interaction"
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/v3/run-analysis" -Method Post -Headers $headers -Body $body
} catch {
    Write-Host "An error occurred:"
    Write-Host $_.Exception.ToString()
    Write-Host "Response:"
    Write-Host $_.Exception.Response.GetResponseStream().ReadToEnd()
} 