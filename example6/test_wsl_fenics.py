#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试WSL FEniCS集成
"""

import json
import subprocess
import tempfile
import os

def test_wsl_fenics():
    """测试WSL FEniCS调用"""
    
    print("🧪 测试WSL FEniCS集成...")
    
    # 创建测试参数
    test_params = {
        "pier_diameter": 2.0,
        "flow_velocity": 1.5,
        "water_depth": 4.0,
        "d50": 0.5,
        "water_density": 1000.0,
        "sediment_density": 2650.0,
        "gravity": 9.81,
        "mesh_file": "test_mesh.msh"
    }
    
    print(f"📋 测试参数: {test_params}")
    
    # 创建临时参数文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_params, f, ensure_ascii=False, indent=2)
        params_file = f.name
    
    try:
        # 转换到WSL路径
        wsl_params_file = params_file.replace("\\", "/").replace("C:", "/mnt/c").replace("E:", "/mnt/e")
        wsl_script_path = "/mnt/e/DeepCAD/example6/wsl_fenics_runner.py"
        
        print(f"🐧 WSL参数文件: {wsl_params_file}")
        print(f"🐧 WSL脚本路径: {wsl_script_path}")
        
        # 构建WSL命令
        wsl_command = [
            "wsl", "-e", "bash", "-c",
            f"cd /mnt/e/DeepCAD && python3 {wsl_script_path} --params '{wsl_params_file}'"
        ]
        
        print(f"⚡ 执行命令: {' '.join(wsl_command)}")
        
        # 执行WSL命令
        result = subprocess.run(
            wsl_command,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=60  # 1分钟超时
        )
        
        print(f"📤 返回码: {result.returncode}")
        
        # 安全处理输出
        stdout = result.stdout if result.stdout else ""
        stderr = result.stderr if result.stderr else ""
        
        print(f"📤 标准输出:\n{stdout}")
        
        if stderr:
            print(f"❌ 标准错误:\n{stderr}")
        
        if result.returncode == 0 and stdout:
            # 解析JSON输出
            output_lines = stdout.strip().split('\n')
            
            # 查找JSON结果
            json_start = -1
            json_end = -1
            
            for i, line in enumerate(output_lines):
                if "RESULT_JSON_START" in line:
                    json_start = i + 1
                elif "RESULT_JSON_END" in line:
                    json_end = i
                    break
            
            if json_start >= 0 and json_end >= 0:
                json_lines = output_lines[json_start:json_end]
                json_str = '\n'.join(json_lines)
                
                print(f"📊 JSON结果:\n{json_str}")
                
                try:
                    fenics_result = json.loads(json_str)
                    print("✅ WSL FEniCS测试成功!")
                    print(f"✅ 求解器: {fenics_result.get('method', '未知')}")
                    print(f"✅ 是否成功: {fenics_result.get('success', False)}")
                    
                    if fenics_result.get('success'):
                        print(f"📈 冲刷深度: {fenics_result.get('scour_depth', 0):.3f} m")
                        print(f"📈 最大速度: {fenics_result.get('max_velocity', 0):.3f} m/s")
                        print(f"⏱️ 计算时间: {fenics_result.get('computation_time', 0):.2f} s")
                    
                    return fenics_result
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON解析失败: {e}")
                    return {"success": False, "error": f"JSON解析失败: {e}"}
            else:
                print("❌ 未找到JSON结果标记")
                return {"success": False, "error": "未找到JSON结果标记"}
        else:
            print(f"❌ WSL命令执行失败，返回码: {result.returncode}")
            return {"success": False, "error": f"WSL命令失败: {result.stderr}"}
            
    except subprocess.TimeoutExpired:
        print("❌ WSL FEniCS调用超时")
        return {"success": False, "error": "WSL调用超时"}
    except Exception as e:
        print(f"❌ WSL调用异常: {e}")
        return {"success": False, "error": f"WSL调用异常: {str(e)}"}
    finally:
        # 清理临时文件
        try:
            os.unlink(params_file)
        except:
            pass

def test_wsl_environment():
    """测试WSL环境"""
    print("🔍 检查WSL环境...")
    
    try:
        # 检查WSL是否可用
        result = subprocess.run(["wsl", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ WSL可用")
            print(f"WSL版本信息:\n{result.stdout}")
        else:
            print("❌ WSL不可用")
            return False
            
        # 检查Python3是否可用
        result = subprocess.run(
            ["wsl", "-e", "python3", "--version"], 
            capture_output=True, text=True, encoding='utf-8', errors='ignore', timeout=10
        )
        if result.returncode == 0:
            output = result.stdout.strip() if result.stdout else "Python3"
            print(f"✅ Python3可用: {output}")
        else:
            print("❌ Python3不可用")
            return False
            
        # 检查FEniCS是否可用
        result = subprocess.run(
            ["wsl", "-e", "python3", "-c", "import dolfin; print('FEniCS版本:', dolfin.__version__)"],
            capture_output=True, text=True, encoding='utf-8', errors='ignore', timeout=20
        )
        if result.returncode == 0:
            output = result.stdout.strip() if result.stdout else "FEniCS可用"
            print(f"✅ FEniCS可用: {output}")
            return True
        else:
            error = result.stderr if result.stderr else "未知错误"
            print(f"❌ FEniCS不可用: {error}")
            return False
            
    except Exception as e:
        print(f"❌ WSL环境检查失败: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 WSL FEniCS集成测试")
    print("=" * 60)
    
    # 1. 测试WSL环境
    if test_wsl_environment():
        print("\n" + "=" * 60)
        print("🧪 开始FEniCS计算测试")
        print("=" * 60)
        
        # 2. 测试FEniCS计算
        result = test_wsl_fenics()
        
        print("\n" + "=" * 60)
        print("📋 测试总结")
        print("=" * 60)
        
        if result.get("success"):
            print("🎉 所有测试通过! WSL FEniCS集成工作正常.")
        else:
            print(f"❌ 测试失败: {result.get('error', '未知错误')}")
    else:
        print("\n❌ WSL环境不可用，跳过FEniCS测试")
    
    print("\n✅ 测试完成")
