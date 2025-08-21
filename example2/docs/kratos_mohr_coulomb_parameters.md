# Kratos 摩尔-库伦本构模型参数配置指南

## 基础理论要点

### 屈服准则
摩尔-库伦在主应力空间是"六边锥"型，常用 p–q 形式：
```
q = (6 sinφ)/(3 − sinφ) · p + (6 c cosφ)/(3 − sinφ)
```
其中：
- p 为平均应力
- q 为偏应力强度  
- φ 为内摩擦角
- c 为黏聚力

### 流动法则
通常采用非关联流动，塑性势用胀角 ψ（ψ ≤ φ）控制体积膨胀。

### 强度演化
可做理想塑性（常量 c, φ）或随塑性变量硬化/软化（如 c(κ)、φ(κ)）。

## Kratos 中的主要参数（Variables）

### 弹性参数
- `YOUNG_MODULUS`（E）：杨氏模量，单位 Pa
- `POISSON_RATIO`（ν）：泊松比，无量纲
- `DENSITY`（ρ）：密度，单位 kg/m³

### 强度参数
- `COHESION`（c）：黏聚力，单位 Pa
- `INTERNAL_FRICTION_ANGLE`（φ）：内摩擦角，**弧度制**
- `INTERNAL_DILATANCY_ANGLE`（ψ）：剪胀角，**弧度制**

### 可选/扩展参数
- `TENSILE_STRENGTH`（ft）：拉截断/张拉强度
- `HARDENING` 参数：如随塑性变量的 c、φ 表达或表格
- `SHEAR_MODULUS`/`BULK_MODULUS`：若直接给定

### 重要注意事项
⚠️ **角度单位**：Kratos 变量默认用**弧度**；若习惯度数，请转弧度（deg × π/180）

## 常见构成律名称（StructuralMechanicsApplication）

1. `SmallStrainMohrCoulombPlastic3D`
2. `SmallStrainMohrCoulombPlasticPlaneStrain2D`  
3. `SmallStrainMohrCoulombPlasticPlaneStress2D`

对应输出通常可取：
- `CAUCHY_STRESS_TENSOR`/`Vector`
- `PLASTIC_STRAIN_VECTOR`
- `EQUIVALENT_PLASTIC_STRAIN`

## 典型材料块配置示例

```json
{
  "properties": [
    {
      "model_part_name": "SoilLayer_1",
      "properties_id": 1,
      "Material": {
        "constitutive_law": {
          "name": "SmallStrainMohrCoulombPlastic3D"
        },
        "Variables": {
          "DENSITY": 2000.0,
          "YOUNG_MODULUS": 25000000.0,
          "POISSON_RATIO": 0.3,
          "COHESION": 35000.0,
          "INTERNAL_FRICTION_ANGLE": 0.4887,
          "INTERNAL_DILATANCY_ANGLE": 0.0
        },
        "Tables": {}
      }
    }
  ]
}
```

## 剪胀角计算经验关系

### Bolton (1986) 经验关系
```
ψ = φ - 30°
```
但需满足：
- ψ ≥ 0°（不能为负）
- ψ ≤ φ（剪胀角不能大于摩擦角）

### 密度修正
对于松散土（密度 < 1800 kg/m³）：
```
ψ = (φ - 30°) × 0.5
```

## 参数验证规则

1. **剪胀角约束**：ψ ≤ φ
2. **角度范围**：0° ≤ ψ ≤ φ ≤ 90°
3. **黏聚力**：c ≥ 0
4. **弹性模量**：E > 0
5. **泊松比**：-1 < ν < 0.5

## 常见错误及解决方案

### 错误1：使用度数而非弧度
```python
# ❌ 错误
"INTERNAL_FRICTION_ANGLE": 30.0  # 度数

# ✅ 正确  
"INTERNAL_FRICTION_ANGLE": np.radians(30.0)  # 弧度
```

### 错误2：剪胀角大于摩擦角
```python
# ❌ 错误
friction_angle = 25.0
dilatancy_angle = 30.0  # > friction_angle

# ✅ 正确
dilatancy_angle = max(0.0, min(friction_angle, friction_angle - 30.0))
```

### 错误3：使用错误的参数名称
```python
# ❌ 错误
"FRICTION_ANGLE": np.radians(30.0)
"DILATANCY_ANGLE": np.radians(5.0)

# ✅ 正确
"INTERNAL_FRICTION_ANGLE": np.radians(30.0)
"INTERNAL_DILATANCY_ANGLE": np.radians(5.0)
```

## 代码实现示例

```python
def create_mohr_coulomb_material(
    friction_angle_deg: float,
    cohesion_pa: float,
    young_modulus_pa: float,
    poisson_ratio: float,
    density_kg_m3: float
) -> Dict[str, Any]:
    """创建摩尔-库伦材料配置"""
    
    # 计算剪胀角（Bolton经验关系）
    dilatancy_angle_deg = max(0.0, friction_angle_deg - 30.0)
    
    # 验证参数
    assert 0 <= friction_angle_deg <= 90, "摩擦角应在0-90度之间"
    assert dilatancy_angle_deg <= friction_angle_deg, "剪胀角不能大于摩擦角"
    assert cohesion_pa >= 0, "黏聚力不能为负"
    assert young_modulus_pa > 0, "杨氏模量必须为正"
    assert -1 < poisson_ratio < 0.5, "泊松比应在(-1, 0.5)范围内"
    
    return {
        "constitutive_law": {
            "name": "SmallStrainMohrCoulombPlastic3D"
        },
        "Variables": {
            "DENSITY": density_kg_m3,
            "YOUNG_MODULUS": young_modulus_pa,
            "POISSON_RATIO": poisson_ratio,
            "COHESION": cohesion_pa,
            "INTERNAL_FRICTION_ANGLE": np.radians(friction_angle_deg),
            "INTERNAL_DILATANCY_ANGLE": np.radians(dilatancy_angle_deg)
        }
    }
```

## 参考文献

1. Bolton, M.D. (1986). The strength and dilatancy of sands. Géotechnique, 36(1), 65-78.
2. Kratos Multiphysics Documentation
3. StructuralMechanicsApplication Manual
