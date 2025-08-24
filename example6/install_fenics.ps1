# FEniCSx (dolfinx) PowerShell 安装脚本 for Python 3.13
# =====================================================

Write-Host "===========================================", -ForegroundColor Green
Write-Host " FEniCSx (dolfinx) 安装脚本 for Python 3.13", -ForegroundColor Green  
Write-Host "===========================================", -ForegroundColor Green

# 检查是否已安装conda
$condaExists = Get-Command conda -ErrorAction SilentlyContinue
if (-not $condaExists) {
    Write-Host "", -ForegroundColor Yellow
    Write-Host "步骤1: 安装 Miniconda", -ForegroundColor Yellow
    Write-Host "----------------------------------------", -ForegroundColor Yellow
    
    # 尝试使用winget安装
    $wingetExists = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetExists) {
        Write-Host "使用 winget 安装 Miniconda...", -ForegroundColor White
        try {
            winget install Anaconda.Miniconda3
            Write-Host "Miniconda 安装完成！请重启 PowerShell 并重新运行此脚本。", -ForegroundColor Green
            Read-Host "按回车键退出"
            exit
        }
        catch {
            Write-Host "winget 安装失败，请手动安装", -ForegroundColor Red
        }
    }
    
    Write-Host "请手动下载并安装 Miniconda:", -ForegroundColor White
    Write-Host "https://docs.anaconda.com/miniconda/miniconda-install/", -ForegroundColor Cyan
    Write-Host "安装完成后重启 PowerShell 并重新运行此脚本", -ForegroundColor White
    Read-Host "按回车键退出"
    exit
}

Write-Host "", -ForegroundColor White
Write-Host "找到 conda，继续安装...", -ForegroundColor Green

# 创建conda环境
Write-Host "", -ForegroundColor Yellow
Write-Host "步骤2: 创建 FEniCSx 环境", -ForegroundColor Yellow
Write-Host "----------------------------------------", -ForegroundColor Yellow

$envName = "fenicsx-env"
Write-Host "创建环境: $envName", -ForegroundColor White

try {
    # 创建环境
    conda create -n $envName python=3.13 -y
    
    # 激活环境并安装包
    Write-Host "安装 FEniCSx 和依赖包...", -ForegroundColor White
    conda activate $envName
    conda install -c conda-forge fenics-dolfinx mpich -y
    conda install -c conda-forge pyvista pyvistaqt -y  
    conda install matplotlib numpy scipy -y
    
    Write-Host "", -ForegroundColor Green
    Write-Host "安装完成！", -ForegroundColor Green
    
    # 测试安装
    Write-Host "", -ForegroundColor Yellow
    Write-Host "步骤3: 测试安装", -ForegroundColor Yellow
    Write-Host "----------------------------------------", -ForegroundColor Yellow
    
    python -c "import dolfinx; print('FEniCSx version:', dolfinx.__version__)"
    python -c "import pyvista; print('PyVista version:', pyvista.__version__)"
    
    Write-Host "", -ForegroundColor Green
    Write-Host "FEniCSx 安装成功！", -ForegroundColor Green
    Write-Host "", -ForegroundColor White
    Write-Host "使用方法:", -ForegroundColor White
    Write-Host "conda activate $envName", -ForegroundColor Cyan
    Write-Host "cd E:\DeepCAD\example6", -ForegroundColor Cyan
    Write-Host "python main.py", -ForegroundColor Cyan
    
}
catch {
    Write-Host "安装过程中出现错误: $($_.Exception.Message)", -ForegroundColor Red
    Write-Host "请检查网络连接或手动执行安装命令", -ForegroundColor Yellow
}

Read-Host "按回车键退出"