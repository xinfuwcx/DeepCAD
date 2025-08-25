# 桥墩冲刷计算方法技术文档

## 概述

本文档详细阐述example6系统中实现的各种桥墩冲刷深度计算方法，包括理论基础、实现细节、适用条件和精度分析。

## 冲刷机理基础

### 1. 冲刷物理过程

桥墩冲刷是水流与桥墩相互作用产生的复杂物理现象：

```
水流 → 桥墩 → 流线收缩 → 加速区 → 下冲流 → 床面剪切 → 泥沙起动 → 冲刷坑形成
```

#### 关键物理量

- **床面剪切应力**: τ = ρ × u*²
- **临界剪切应力**: τc = (ρs - ρ) × g × d50 × θc  
- **Shields参数**: θ = τ / ((ρs - ρ) × g × d50)
- **粒径雷诺数**: Re* = u* × d50 / ν

### 2. 无量纲参数

```python
def calculate_dimensionless_parameters(self, params):
    """计算关键无量纲参数"""
    
    # Froude数
    Fr = params.flow_velocity / math.sqrt(9.81 * params.water_depth)
    
    # Reynolds数  
    Re = params.flow_velocity * params.pier_diameter / 1e-6
    
    # 相对水深
    h_D = params.water_depth / params.pier_diameter
    
    # 相对粒径
    d_D = params.d50_sediment / (1000 * params.pier_diameter)  # 转换为m
    
    return Fr, Re, h_D, d_D
```

## HEC-18 方法详解

### 理论基础

HEC-18 (Hydraulic Engineering Circular No. 18) 是美国联邦公路管理局制定的桥墩冲刷计算标准。

#### 基本公式

```
ys/D = 2.0 × K1 × K2 × K3 × K4 × (h/D)^0.35 × Fr^0.43
```

其中：
- ys: 冲刷深度
- D: 桥墩宽度
- K1, K2, K3, K4: 修正系数

### 修正系数详解

#### K1: 桥墩形状系数

```python
def get_pier_shape_factor(self, pier_shape):
    """计算桥墩形状系数K1"""
    
    shape_factors = {
        PierShape.CIRCULAR: 1.0,           # 圆形桥墩
        PierShape.SQUARE: 1.1,             # 方形桥墩
        PierShape.SHARP_NOSE: 0.9,         # 尖头桥墩
        PierShape.ROUND_NOSE: 1.0,         # 圆头桥墩
        PierShape.GROUP: 1.0,              # 群桩基础
        PierShape.RECTANGULAR: 1.1         # 矩形桥墩
    }
    
    return shape_factors.get(pier_shape, 1.0)

# 理论依据：
# - 圆形截面流线型最好，系数最小
# - 方形产生更强的分离涡，系数较大
# - 尖头减少阻力，系数小于1.0
```

#### K2: 攻击角系数

```python
def get_attack_angle_factor(self, flow_angle, pier_length, pier_width):
    """计算攻击角系数K2"""
    
    # 将角度转换为弧度
    alpha = math.radians(abs(flow_angle))
    
    if alpha <= math.radians(5):
        # 正交流动
        return 1.0
    else:
        # 斜交流动修正
        L_D = pier_length / pier_width  # 长宽比
        
        # Melville修正公式
        K2 = (math.cos(alpha) + (L_D * math.sin(alpha))**0.65)**0.65
        
        return min(K2, 1.5)  # 限制最大值

# 物理意义：
# - alpha=0°: 垂直撞击，最大冲刷
# - alpha增大: 有效迎流面积减少，冲刷减轻
# - 长宽比影响斜流时的有效几何
```

#### K3: 河床条件系数

```python
def get_bed_condition_factor(self, bed_material, d50_mm):
    """计算河床条件系数K3"""
    
    if bed_material == "bedrock":
        return 1.1  # 基岩，冲刷有限
        
    elif bed_material == "clay":
        # 粘土河床，考虑粘聚力影响
        if d50_mm < 0.1:
            return 1.1  # 高粘聚力粘土
        else:
            return 1.0
            
    elif bed_material == "sand":
        # 砂质河床，标准条件
        return 1.0
        
    elif bed_material == "gravel":
        # 砾石河床，考虑粒径效应
        if d50_mm > 20:
            return 0.95  # 粗砾石抗冲刷能力强
        else:
            return 1.0
            
    else:
        return 1.0  # 默认值
```

#### K4: 装甲层系数

```python
def get_armor_factor(self, has_armor, armor_d50_mm, bed_d50_mm):
    """计算装甲层系数K4"""
    
    if not has_armor:
        return 1.0
        
    # 装甲层粒径比
    armor_ratio = armor_d50_mm / bed_d50_mm
    
    if armor_ratio >= 2.0:
        # 强装甲层
        return 0.85
    elif armor_ratio >= 1.5:
        # 中等装甲层
        return 0.9
    else:
        # 弱装甲层
        return 0.95
```

### HEC-18完整实现

```python
def calculate_hec18_scour(self, params: ScourParameters) -> ScourResult:
    """HEC-18方法计算冲刷深度"""
    
    try:
        # 基本无量纲参数
        Fr = params.flow_velocity / math.sqrt(9.81 * params.water_depth)
        Re = params.flow_velocity * params.pier_diameter / 1e-6
        
        # 获取修正系数
        K1 = self.get_pier_shape_factor(params.pier_shape)
        K2 = self.get_attack_angle_factor(params.flow_angle, 
                                         params.pier_length, params.pier_width)
        K3 = self.get_bed_condition_factor(params.bed_material, params.d50_sediment)
        K4 = self.get_armor_factor(params.has_armor, 
                                  params.armor_d50, params.d50_sediment)
        
        # 相对水深
        h_D = params.water_depth / params.pier_width
        
        # HEC-18基本公式
        if Fr <= 0.8:
            # 亚临界流条件
            ys_D = 2.0 * K1 * K2 * K3 * K4 * (h_D**0.35) * (Fr**0.43)
        else:
            # 超临界流修正
            Fr_correction = 0.8**0.43 + 0.2 * (Fr - 0.8)
            ys_D = 2.0 * K1 * K2 * K3 * K4 * (h_D**0.35) * Fr_correction
        
        # 计算实际冲刷深度
        scour_depth = ys_D * params.pier_width
        
        # 物理限制检查
        max_scour = min(3.0 * params.pier_width, 2.0 * params.water_depth)
        scour_depth = min(scour_depth, max_scour)
        
        return ScourResult(
            scour_depth=scour_depth,
            method="HEC-18",
            froude_number=Fr,
            reynolds_number=Re,
            confidence=self.assess_hec18_confidence(params, Fr),
            success=True,
            warnings=self.validate_hec18_conditions(params, Fr)
        )
        
    except Exception as e:
        return ScourResult(success=False, warnings=[f"HEC-18计算失败: {str(e)}"])
```

## Richardson-Davis 方法

### 理论基础

Richardson-Davis方法基于Shields理论和量纲分析，考虑泥沙起动的临界条件。

#### 核心原理

```
当流体剪切应力 > 临界剪切应力时，泥沙开始运动
τ > τc ⇒ θ > θc
```

### 算法实现

```python
def calculate_richardson_davis_scour(self, params: ScourParameters) -> ScourResult:
    """Richardson-Davis方法"""
    
    # 基本参数
    U = params.flow_velocity        # 平均流速 (m/s)
    h = params.water_depth          # 水深 (m)
    D = params.pier_width           # 桥墩宽度 (m)
    d50 = params.d50_sediment / 1000  # 中值粒径 (m)
    
    # 水力参数
    rho_w = 1000    # 水密度 (kg/m³)
    rho_s = params.sediment_density  # 泥沙密度 (kg/m³)
    g = 9.81        # 重力加速度 (m/s²)
    nu = 1e-6       # 运动粘度 (m²/s)
    
    # 相对密度
    s = rho_s / rho_w
    
    # Shields临界参数
    # 计算粒径雷诺数
    u_star_c = math.sqrt((s - 1) * g * d50 * 0.047)  # 近似临界摩阻流速
    Re_star = u_star_c * d50 / nu
    
    # Shields曲线拟合
    if Re_star < 1:
        theta_c = 0.24 / Re_star
    elif Re_star < 10:
        theta_c = 0.14 / (Re_star**0.64)
    elif Re_star < 400:
        theta_c = 0.04 / (Re_star**0.1)
    else:
        theta_c = 0.013 * (Re_star**0.29)
    
    theta_c = max(theta_c, 0.03)  # 最小值限制
    
    # 桥墩周围最大流速估算
    U_max = U * self.velocity_amplification_factor(params)
    
    # 床面剪切应力
    tau = rho_w * (U_max**2) * self.friction_coefficient(params)
    
    # Shields参数
    theta = tau / ((rho_s - rho_w) * g * d50)
    
    # 冲刷深度计算
    if theta > theta_c:
        # 超过起动条件
        excess_theta = theta / theta_c - 1.0
        
        # Richardson-Davis公式
        scour_depth = 1.5 * D * (excess_theta**0.5)
        
        # 平衡时间估算 (小时)
        equilibrium_time = self.calculate_equilibrium_time(params, excess_theta)
        
    else:
        # 未达到起动条件
        scour_depth = 0.0
        equilibrium_time = float('inf')
    
    # 物理限制
    scour_depth = min(scour_depth, 2.5 * D, 1.8 * h)
    
    return ScourResult(
        scour_depth=scour_depth,
        equilibrium_time=equilibrium_time,
        method="Richardson-Davis",
        froude_number=U / math.sqrt(g * h),
        reynolds_number=U * D / nu,
        confidence=self.assess_rd_confidence(theta, theta_c),
        success=True
    )
```

### 辅助计算方法

```python
def velocity_amplification_factor(self, params):
    """桥墩周围速度放大系数"""
    
    # 基于势流理论的速度放大
    h_D = params.water_depth / params.pier_width
    
    if h_D > 3.0:
        # 深水条件，主要考虑水平收缩
        return 1.8  
    elif h_D > 1.5:
        # 中等水深
        return 1.5 + 0.6 * (3.0 - h_D) / 1.5
    else:
        # 浅水条件，三维效应显著
        return 2.2

def friction_coefficient(self, params):
    """床面摩阻系数"""
    
    # 基于粒径的摩阻系数
    d50_mm = params.d50_sediment
    
    if d50_mm < 0.5:
        return 0.002  # 细砂
    elif d50_mm < 2.0:
        return 0.003  # 中砂
    elif d50_mm < 10.0:
        return 0.005  # 粗砂
    else:
        return 0.008  # 砾石
```

## Melville-Coleman 方法

### 理论框架

Melville-Coleman方法采用分解法，将复杂冲刷问题分解为各独立因素的乘积。

#### 基本公式

```
ys = ys0 × Kh × Kd × Ks × Kθ × Kσ
```

其中：
- ys0: 参考冲刷深度
- Kh: 水深效应系数
- Kd: 泥沙粒径效应系数  
- Ks: 桥墩形状效应系数
- Kθ: 攻击角效应系数
- Kσ: 河床形态效应系数

### 实现细节

```python
def calculate_melville_coleman_scour(self, params: ScourParameters) -> ScourResult:
    """Melville-Coleman分解法"""
    
    D = params.pier_width
    h = params.water_depth
    U = params.flow_velocity
    d50 = params.d50_sediment / 1000  # 转换为米
    
    # 参考冲刷深度（深水、细砂、圆形桥墩、垂直入流）
    Uc = self.calculate_critical_velocity(d50, h)
    
    if U <= Uc:
        return ScourResult(
            scour_depth=0.0,
            method="Melville-Coleman", 
            success=True,
            warnings=["流速未达到临界起动速度"]
        )
    
    # 基准冲刷深度
    ys0 = 2.4 * D
    
    # 各修正系数
    Kh = self.melville_depth_factor(h, D)
    Kd = self.melville_sediment_factor(d50, D)
    Ks = self.melville_shape_factor(params.pier_shape)
    Ktheta = self.melville_angle_factor(params.flow_angle)
    Ksigma = self.melville_bed_form_factor(params.bed_form_type)
    
    # 综合冲刷深度
    scour_depth = ys0 * Kh * Kd * Ks * Ktheta * Ksigma
    
    return ScourResult(
        scour_depth=scour_depth,
        method="Melville-Coleman",
        froude_number=U / math.sqrt(9.81 * h),
        reynolds_number=U * D / 1e-6,
        confidence=0.85,
        success=True
    )

def melville_depth_factor(self, h, D):
    """水深效应系数Kh"""
    h_D = h / D
    
    if h_D >= 2.6:
        return 1.0      # 深水条件
    elif h_D >= 0.2:
        return 0.78 * (h_D**0.6)  # 中等水深
    else:
        return 0.45     # 浅水限制

def melville_sediment_factor(self, d50, D):
    """泥沙粒径效应系数Kd"""
    d50_mm = d50 * 1000
    D_mm = D * 1000
    
    if d50_mm <= 0.4:
        return 1.0      # 细砂，粒径效应可忽略
    elif d50_mm < 40:
        return 0.57 * math.log(2.24 * D_mm / d50_mm)
    else:
        return 0.4      # 粗砂砾石限制
```

## 方法对比和选择策略

### 适用条件分析

| 方法 | 适用条件 | 优点 | 局限性 |
|------|----------|------|--------|
| HEC-18 | 工程设计标准 | 权威性强，工程应用广泛 | 经验性强，外推有限 |
| Richardson-Davis | 细砂床面 | 物理机理明确 | 复杂流场适用性差 |
| Melville-Coleman | 通用条件 | 因素分解清晰 | 参数众多，校准困难 |

### 自动方法选择

```python
def select_optimal_method(self, params: ScourParameters) -> str:
    """根据参数条件自动选择最适合的计算方法"""
    
    # 计算关键参数
    Fr = params.flow_velocity / math.sqrt(9.81 * params.water_depth)
    h_D = params.water_depth / params.pier_width
    d50_mm = params.d50_sediment
    
    # 决策树逻辑
    if params.design_purpose == "preliminary":
        # 初步设计阶段
        if d50_mm < 2.0 and Fr < 0.5:
            return "Richardson-Davis"  # 适合细砂亚临界流
        else:
            return "HEC-18"           # 工程标准方法
            
    elif params.design_purpose == "detailed":
        # 详细设计阶段
        if h_D > 1.0 and Fr < 0.8:
            return "Melville-Coleman"  # 深水复杂条件
        else:
            return "HEC-18"           # 工程设计标准
            
    else:
        # 默认方法
        return "HEC-18"

def calculate_ensemble_result(self, params: ScourParameters) -> ScourResult:
    """集成多种方法的计算结果"""
    
    results = {}
    
    # 计算各方法结果
    try:
        results['hec18'] = self.calculate_hec18_scour(params)
    except:
        pass
        
    try:
        results['richardson_davis'] = self.calculate_richardson_davis_scour(params)
    except:
        pass
        
    try:
        results['melville_coleman'] = self.calculate_melville_coleman_scour(params)
    except:
        pass
    
    # 筛选有效结果
    valid_results = {k: v for k, v in results.items() if v.success}
    
    if not valid_results:
        return ScourResult(success=False, warnings=["所有方法计算失败"])
    
    # 加权平均（基于可信度）
    weighted_depths = []
    total_weight = 0
    
    for method, result in valid_results.items():
        weight = result.confidence
        weighted_depths.append(result.scour_depth * weight)
        total_weight += weight
    
    ensemble_depth = sum(weighted_depths) / total_weight
    
    # 统计信息
    depths = [r.scour_depth for r in valid_results.values()]
    std_dev = np.std(depths)
    relative_error = std_dev / np.mean(depths) if np.mean(depths) > 0 else 0
    
    return ScourResult(
        scour_depth=ensemble_depth,
        method="Ensemble",
        confidence=min(1.0, 1.0 - relative_error),
        success=True,
        warnings=[f"方法间标准差: {std_dev:.3f}m ({relative_error:.1%})"]
    )
```

## 结果验证和质量控制

### 物理合理性检查

```python
def validate_result_physics(self, result: ScourResult, params: ScourParameters) -> List[str]:
    """结果物理合理性检查"""
    warnings = []
    
    # 冲刷深度范围检查
    max_theoretical = 3.5 * params.pier_width
    if result.scour_depth > max_theoretical:
        warnings.append(f"冲刷深度超出理论上限 ({max_theoretical:.2f}m)")
    
    # 相对冲刷深度检查  
    relative_depth = result.scour_depth / params.pier_width
    if relative_depth > 4.0:
        warnings.append(f"相对冲刷深度过大 (ds/D = {relative_depth:.2f})")
    
    # 水深限制检查
    if result.scour_depth > 2.0 * params.water_depth:
        warnings.append("冲刷深度超过2倍水深，需考虑局部冲刷限制")
    
    return warnings
```

### 经验数据对比

```python
class ScourDataValidator:
    """冲刷数据验证器"""
    
    def __init__(self):
        # 加载历史验证数据
        self.validation_cases = self.load_historical_cases()
    
    def find_similar_cases(self, params: ScourParameters) -> List[dict]:
        """查找相似的历史案例"""
        similar_cases = []
        
        for case in self.validation_cases:
            similarity = self.calculate_similarity(params, case['params'])
            if similarity > 0.8:
                similar_cases.append({
                    'case': case,
                    'similarity': similarity
                })
        
        return sorted(similar_cases, key=lambda x: x['similarity'], reverse=True)
    
    def validate_against_cases(self, result: ScourResult, similar_cases: List[dict]) -> dict:
        """与相似案例对比验证"""
        if not similar_cases:
            return {'status': 'no_reference', 'message': '无相似历史案例'}
        
        case_depths = [case['case']['measured_depth'] for case in similar_cases[:3]]
        mean_depth = np.mean(case_depths)
        std_depth = np.std(case_depths)
        
        deviation = abs(result.scour_depth - mean_depth) / mean_depth
        
        if deviation < 0.2:
            status = 'good_agreement'
        elif deviation < 0.5:
            status = 'acceptable'
        else:
            status = 'poor_agreement'
        
        return {
            'status': status,
            'reference_mean': mean_depth,
            'reference_std': std_depth,
            'deviation': deviation,
            'num_cases': len(similar_cases)
        }
```

## 不确定性分析

### Monte Carlo 分析

```python
def uncertainty_analysis(self, params: ScourParameters, n_samples=1000) -> dict:
    """不确定性分析"""
    
    # 定义参数不确定性范围
    param_uncertainties = {
        'flow_velocity': 0.15,      # 15% 变异系数
        'water_depth': 0.10,        # 10% 变异系数  
        'd50_sediment': 0.25,       # 25% 变异系数
        'pier_width': 0.05          # 5% 变异系数
    }
    
    results = []
    
    for i in range(n_samples):
        # 生成随机参数样本
        sample_params = self.generate_random_params(params, param_uncertainties)
        
        # 计算冲刷深度
        try:
            result = self.calculate_hec18_scour(sample_params)
            if result.success:
                results.append(result.scour_depth)
        except:
            continue
    
    if not results:
        return {'error': '不确定性分析失败'}
    
    # 统计分析
    results = np.array(results)
    
    return {
        'mean': np.mean(results),
        'std': np.std(results),
        'cv': np.std(results) / np.mean(results),  # 变异系数
        'p05': np.percentile(results, 5),          # 5%分位数
        'p50': np.percentile(results, 50),         # 中位数
        'p95': np.percentile(results, 95),         # 95%分位数
        'samples': len(results)
    }
```

## 工程应用建议

### 设计安全系数

```python
def apply_safety_factors(self, scour_depth: float, design_level: str) -> float:
    """应用设计安全系数"""
    
    safety_factors = {
        'preliminary': 1.5,     # 初步设计
        'detailed': 1.3,        # 详细设计
        'construction': 1.2,    # 施工图设计
        'maintenance': 1.1      # 维护评估
    }
    
    factor = safety_factors.get(design_level, 1.3)
    return scour_depth * factor

def design_recommendations(self, result: ScourResult, params: ScourParameters) -> dict:
    """工程设计建议"""
    
    recommendations = {
        'foundation_depth': result.scour_depth + 2.0,  # 基础埋深建议
        'protection_measures': [],
        'monitoring_plan': {},
        'maintenance_frequency': 'annual'
    }
    
    # 防护措施建议
    if result.scour_depth > 2.0:
        recommendations['protection_measures'].extend([
            '抛石防护',
            '钢筋石笼',
            '混凝土护底'
        ])
    
    # 监测方案
    if result.scour_depth > 1.0:
        recommendations['monitoring_plan'] = {
            'frequency': 'quarterly',
            'methods': ['测深', '侧扫声纳'],
            'warning_level': result.scour_depth * 0.7
        }
    
    return recommendations
```

---

*桥墩冲刷计算方法文档 v1.0*  
*Example6专业分析系统*