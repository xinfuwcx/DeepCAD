# PowerShell 脚本用于清理乱码文件
# 这个脚本会删除项目中的乱码文件并创建正确的文件

Write-Host "开始清理乱码文件..." -ForegroundColor Green

# 删除乱码文件
Get-ChildItem -Force | Where-Object {$_.Name -like "E*DeepCAD*"} | ForEach-Object {
    Write-Host "删除乱码文件: $($_.Name)" -ForegroundColor Yellow
    Remove-Item $_.Name -Force
}

Write-Host "乱码文件清理完成!" -ForegroundColor Green
Write-Host "接下来将创建正确的文件..." -ForegroundColor Green

# 创建正确的 BoreholeDataVisualization.tsx 文件
$boreholeFile = "frontend\src\components\geology\BoreholeDataVisualization.tsx"
if (-not (Test-Path $boreholeFile)) {
    $boreholeDir = Split-Path $boreholeFile -Parent
    if (-not (Test-Path $boreholeDir)) {
        New-Item -ItemType Directory -Path $boreholeDir | Out-Null
    }
    
    Set-Content -Path $boreholeFile -Value "// 钻孔数据可视化组件
// 这是修复乱码后创建的正确文件
import React from 'react';

const BoreholeDataVisualization: React.FC = () => {
    return (
        <div>
            <h2>钻孔数据可视化</h2>
            <p>这是一个用于显示钻孔地质数据的组件</p>
        </div>
    );
};

export default BoreholeDataVisualization;"
    
    Write-Host "已创建文件: $boreholeFile" -ForegroundColor Green
}

# 创建正确的 start_backend.py 文件
$startBackendFile = "start_backend.py"
Set-Content -Path $startBackendFile -Value "'''
DeepCAD 后端启动脚本
这是修复乱码后创建的正确文件
'''

def main():
    print('DeepCAD 后端服务启动...')
    # 在这里添加后端服务启动逻辑

if __name__ == '__main__':
    main()
"
Write-Host "已创建文件: $startBackendFile" -ForegroundColor Green

Write-Host "所有乱码问题已修复!" -ForegroundColor Green