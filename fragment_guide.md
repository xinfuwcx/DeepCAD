# Gmsh Fragment 功能及物理组结合使用指南

## 目录
1. [概述](#概述)  
2. [基础概念](#基础概念)  
   1. [Fragment 运算](#fragment-运算)  
   2. [物理组（Physical Groups）](#物理组physical-groups)  
3. [在 `.geo` 脚本中使用 Fragment](#在-geo-脚本中使用-fragment)  
   1. [几何示例：立方体相交](#几何示例立方体相交)  
   2. [脚本解析](#脚本解析)  
4. [在 Python API 中使用 Fragment](#在-python-api-中使用-fragment)  
5. [与物理组结合的典型工作流](#与物理组结合的典型工作流)  
6. [常见问题与调试](#常见问题与调试)  
7. [参考资料](#参考资料)  

---

## 概述

在复杂几何建模中，常常需要将多个几何体进行布尔运算（并、交、差），而 Fragment 运算（碎片化）是 Gmsh 提供的一种特殊布尔运算，用于在保留所有输入实体的前提下，自动生成它们的分割（fragment）结果。结合物理组，用户可以方便地标识片段化后各区域（面、体）的网格属性或边界条件。

---

## 基础概念

### Fragment 运算

- 功能：将两个（或多个）几何实体进行“碎片化”处理，输出所有相交或划分后的子实体。  
- 与其他布尔运算差异：
  - **BoolUnion**：合并、消除内部面；  
  - **BoolCut**：对 A 切割 B，只保留 A–B；  
  - **BoolFragment**（简称 Fragment）：保留所有输入实体及其交叉分割结果。

### 物理组（Physical Groups）

- 用于标记网格中的“物理域”或“物理边界”，以便后续指定材料、边界条件或子域求解。  
- 物理组类型：  
  - 0：点（Points）  
  - 1：线（Curves）  
  - 2：面（Surfaces）  
  - 3：体（Volumes）  
- 语法示例：
  ```geo
  Physical Surface("壁面", 1) = { surf_id1, surf_id2 };
  Physical Volume("流体域", 2) = { vol_id };
  ```

---

## 在 `.geo` 脚本中使用 Fragment

### 几何示例：立方体相交

假设有两个重叠的立方体 `Box1` 和 `Box2`，我们希望：
1. 对它们做碎片化运算；  
2. 将碎片化后所有独立体标记为不同物理域；  
3. 将相交产生的新面标记为“接触面”。

```geo
// 定义第一个立方体
Box(1) = { 0, 0, 0,   1, 1, 1 };

// 定义第二个立方体，部分与第一个相交
Box(2) = { 0.5, 0.5, 0.5,   1, 1, 1 };

// 执行碎片化：生成所有分割体和分割面
Fragment{ Volume{1}; Volume{2}; }{}

// 获取结果标签（Gmsh 会自动生成新的面/体 ID）
```

### 脚本解析

1. `Box(1) = {…}` & `Box(2) = {…}`：分别创建两个体实体，ID 为 1, 2。  
2. `Fragment{ Volume{1}; Volume{2}; }{}`：  
   - 花括号内第一个列表指定要碎片化的主体集合，第二个列表可以指定工具集合（此处为空）。  
   - 结果：  
     - 原始两体被分割成若干互不相交的小体；  
     - 相交区域生成新的面；  
     - Gmsh 内部自动给每个子体、子面分配新的连续 ID。  

3. **标记物理组**：  
   - 假设碎片化后生成了体 ID `3,4,5`（视几何重叠情况而定），新的面 ID `6,7` 为相交面。  
   - 在碎片化命令之后添加：
   ```geo
   // 标记所有子体为“固体域”
   Physical Volume("SolidDomains") = { 3, 4, 5 };

   // 标记相交面为“接触面”
   Physical Surface("ContactSurfaces") = { 6, 7 };
   ```

4. **生成网格**：
   ```geo
   Mesh 3;
   ```

---

## 在 Python API 中使用 Fragment

```python
import gmsh

gmsh.initialize()
gmsh.model.add("fragment_demo")

# 定义两个盒子
lc = 1e-1
gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1, tag=1)
gmsh.model.occ.addBox(0.5, 0.5, 0.5, 1, 1, 1, tag=2)

# 同步 CAD
gmsh.model.occ.synchronize()

# 执行碎片化
vol_tags, vol_map = gmsh.model.occ.fragment([(3,1)], [(3,2)])
# vol_tags 返回 [(dim, tag), ...]，dim=3 表示体
# vol_map 返回 { oldTag: [ newTags ], … }

# 同步后续拓扑变化
gmsh.model.occ.synchronize()

# 获取所有新体标签
new_vols = [ tag for dim, tag in gmsh.model.getEntities(dim=3) ]

# 标记为物理组
gmsh.model.addPhysicalGroup(3, new_vols, name="AllFragments")

# 相交面也可同理获取并添加 Surface 物理组
new_surfs = [ tag for dim, tag in gmsh.model.getEntities(dim=2) if tag not in original_surfs ]
gmsh.model.addPhysicalGroup(2, new_surfs, name="ContactSurfaces")

# 生成网格并写出
gmsh.model.mesh.generate(3)
gmsh.write("fragment_demo.msh")
gmsh.finalize()
```

---

## 与物理组结合的典型工作流

1. 定义各几何实体（Box、Sphere、Cylinder…）  
2. 同步 CAD（必要时）  
3. 在需要碎片化的实体上调用 `Fragment` 或 `occ.fragment`  
4. 再次同步拓扑  
5. 遍历各维度（2D 面、3D 体）实体，按需求分组或筛选  
6. `Physical Group` 标记：  
   - 对求解域（Volume）  
   - 对边界/接触面（Surface）  
7. 调整网格尺寸、设置网格参数  
8. 生成网格、输出文件  

---

## 常见问题与调试

- **碎片化后 ID 混乱**  
  - 建议在 Fragment 前先收集原始实体 ID；Fragment 后通过映射返回值或遍历实体重建标签关系。  
- **面/体数量激增导致网格过大**  
  - 只对必要区域做碎片化；在脚本中先 `BooleanDifference` 除去无关区域。  
- **物理组 ID 冲突**  
  - 显式指定物理组 ID 或使用 `gmsh.options.setNumber("General.PhysicalGroupMinTag", 1000)` 之类的选项。  
- **Python API 中 `synchronize()` 忘记**  
  - 会导致实体未更新，报错 “Entity not found”。  

---

## 参考资料

- Gmsh 官网手册：  
  https://gmsh.info/doc/  
- Gmsh GitHub 示例：  
  https://github.com/geuzaine/gmsh  
- StackOverflow 相关讨论  

---

> **小贴士**：对大规模几何体碎片化前，先做小样本测试，确保分片合理，再批量处理以节省内存和计算时间。  

**使用方式**  
1. 直接将上述内容保存为 `fragment_guide.md`，或嵌入到现有文档中；  
2. 若要测试 `.geo` 示例，请将脚本另存为 `fragment_demo.geo`，在命令行运行：
   ```
   gmsh fragment_demo.geo -3 -format msh2
   ```
3. 若要运行 Python 示例，请确保已安装 `gmsh` Python 包：
   ```powershell
   pip install gmsh
   python fragment_demo.py
   ```