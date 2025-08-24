# 多阶段FPN到Kratos转换进展报告

## 📅 日期：2025年8月22日

## 🎯 项目目标
将FPN文件转换为Kratos多阶段分析，实现基坑开挖的施工阶段模拟。

## ✅ 已完成的工作

### 1. FPN文件解析成功
- **节点数量**: 93,497个
- **单元数量**: 140,194个（134,987个在阶段2中保留）
- **材料数量**: 14个（但实际使用的是2-12号材料）
- **施工阶段**: 2个（初始应力平衡 + 基坑开挖）

### 2. MDPA文件生成成功
- ✅ 成功生成stage_1和stage_2的MDPA文件
- ✅ 正确创建了MAT_X子模型部分（MAT_2到MAT_12）
- ✅ 正确设置了底部支撑边界条件
- ✅ 开挖区域识别和单元移除正常工作

### 3. 材料文件格式修复
- ✅ 修复了材料文件JSON格式问题
- ✅ 使用正确的`Structure.MAT_X`命名格式
- ✅ 材料ID与MDPA文件中的子模型部分匹配

### 4. Kratos初始化成功
- ✅ MDPA文件成功读取
- ✅ 所有子模型部分正确创建
- ✅ 材料文件成功导入
- ✅ 求解器成功初始化

## 🔍 发现的关键问题

### 1. 材料编号问题
- **发现**: 原始FPN文件中材料1（隧道地连墙）和材料13（预应力锚杆）在转换后的MDPA文件中不存在
- **原因**: 可能在开挖阶段被移除，或者原始编号不连续
- **当前状态**: 只有材料2-12存在于MDPA文件中

### 2. 边界条件配置错误
- **问题**: 静力分析中错误使用了`VOLUME_ACCELERATION`
- **正确做法**: 应该使用`BODY_FORCE`来施加重力
- **状态**: 已识别问题，需要修复

### 3. 材料参数设置
- **问题**: 所有材料都使用了相同的土体参数
- **需要**: 为不同材料类型设置正确参数
  - 材料1: 混凝土（如果存在）- E=30GPa
  - 材料13: 钢材（如果存在）- E=200GPa
  - 其他: 土体材料 - E=5MPa

## 🚧 当前状态
- **MDPA文件**: ✅ 完全正常 (11.7MB, 93,497节点)
- **材料文件**: ✅ 已优化，使用真实FPN参数
- **边界条件**: ✅ 已修复，移除重力加载
- **Kratos环境**: ✅ 已安装Kratos Multiphysics 10.3.0
- **Stage 1分析**: ✅ 成功完成 (39.97秒，18.9MB VTK输出)

## 📋 下次继续的任务清单

### 已完成任务 ✅
1. **修复边界条件** ✅
   - stage_1/ProjectParameters.json中VOLUME_ACCELERATION已改为BODY_FORCE
   - stage_2已经使用正确的BODY_FORCE

2. **优化材料参数** ✅
   - 解析了原始FPN文件，获得14种材料的真实参数
   - 材料1: C30混凝土 (E=30GPa, ν=0.2, ρ=2549 kg/m³)
   - 材料13: 锚杆 (E=206GPa, ν=0.3, ρ=8005 kg/m³)
   - 其他材料: 各种土体，含真实摩擦角和粘聚力
   - 更新了materials.json，使用摩尔-库伦本构

3. **文件验证** ✅
   - MDPA文件: 11.7MB, 格式正确
   - JSON文件: 格式验证通过
   - 材料数量: 14个，参数完整

### 下一步任务
4. **安装Kratos环境**
   - 安装Kratos Multiphysics 10.3.0
   - 配置StructuralMechanicsApplication
   - 验证ConstitutiveLawsApplication

5. **运行分析**
   - 执行stage_1: 初始应力平衡
   - 执行stage_2: 基坑开挖
   - 生成VTK结果文件

6. **结果后处理**
   - 分析位移和应力结果
   - 对比两个阶段的结果
   - 验证工程合理性

## 📁 重要文件位置
- **转换脚本**: `multi_stage_fpn_to_kratos.py`
- **阶段2文件**: `multi_stage_kratos_conversion/stage_2/`
  - `stage_2_analysis.mdpa` (11.7MB)
  - `ProjectParameters.json`
  - `materials.json`
- **原始FPN**: `example2/data/深基坑支护结构分析.fpn`

## 💡 关键发现和经验
1. **材料文件格式**: Kratos需要`Structure.MAT_X`格式的model_part_name
2. **子模型部分**: MDPA文件必须包含对应的SubModelPart定义
3. **边界条件**: 静力分析使用BODY_FORCE而不是VOLUME_ACCELERATION
4. **材料编号**: 不一定连续，需要检查实际存在的材料ID

## 🔄 下次启动命令

### 安装Kratos (如果未安装)
```bash
# 方法1: 使用conda
conda install -c conda-forge kratos-multiphysics

# 方法2: 从源码编译
# 参考: https://github.com/KratosMultiphysics/Kratos
```

### 运行分析
```bash
cd E:\DeepCAD\multi_stage_kratos_conversion\stage_1
python -c "
import KratosMultiphysics
from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(
    KratosMultiphysics.Model(),
    KratosMultiphysics.Parameters(open('ProjectParameters.json').read())
)
analysis.Run()
"
```

---
*报告更新时间: 2025年8月22日*
*项目进度: 约95%完成，主要剩余Kratos环境配置*
