"""
创建标准材料参数Excel模板示例
"""
import pandas as pd
from pathlib import Path

# 材料参数示例数据
materials_data = {
    "名称": [
        "粘土",
        "砂土", 
        "硬粘土",
        "中砂",
        "C30混凝土",
        "C40混凝土",
        "HRB400钢筋",
        "Q235钢板"
    ],
    "材料类型": [
        "土壤",
        "土壤",
        "土壤", 
        "土壤",
        "混凝土",
        "混凝土",
        "钢材",
        "钢材"
    ],
    "弹性模量": [
        20,      # MPa - 粘土
        50,      # MPa - 砂土
        35,      # MPa - 硬粘土
        80,      # MPa - 中砂
        30000,   # MPa - C30混凝土
        32500,   # MPa - C40混凝土
        200000,  # MPa - HRB400钢筋
        210000   # MPa - Q235钢板
    ],
    "泊松比": [
        0.35,    # 粘土
        0.30,    # 砂土
        0.33,    # 硬粘土
        0.28,    # 中砂
        0.20,    # C30混凝土
        0.20,    # C40混凝土
        0.30,    # HRB400钢筋
        0.30     # Q235钢板
    ],
    "密度": [
        1800,    # kg/m³ - 粘土
        1900,    # kg/m³ - 砂土
        1850,    # kg/m³ - 硬粘土
        1950,    # kg/m³ - 中砂
        2400,    # kg/m³ - C30混凝土
        2450,    # kg/m³ - C40混凝土
        7850,    # kg/m³ - HRB400钢筋
        7850     # kg/m³ - Q235钢板
    ],
    "粘聚力": [
        25,      # kPa - 粘土
        0,       # kPa - 砂土
        45,      # kPa - 硬粘土
        0,       # kPa - 中砂
        None,    # 混凝土不适用
        None,    # 混凝土不适用
        None,    # 钢材不适用
        None     # 钢材不适用
    ],
    "内摩擦角": [
        18,      # 度 - 粘土
        35,      # 度 - 砂土
        22,      # 度 - 硬粘土
        38,      # 度 - 中砂
        None,    # 混凝土不适用
        None,    # 混凝土不适用
        None,    # 钢材不适用
        None     # 钢材不适用
    ],
    "抗压强度": [
        None,    # 土壤不适用
        None,    # 土壤不适用
        None,    # 土壤不适用
        None,    # 土壤不适用
        30,      # MPa - C30混凝土
        40,      # MPa - C40混凝土
        None,    # 钢材不适用(抗压强度)
        None     # 钢材不适用(抗压强度)
    ],
    "屈服强度": [
        None,    # 土壤不适用
        None,    # 土壤不适用
        None,    # 土壤不适用
        None,    # 土壤不适用
        None,    # 混凝土不适用
        None,    # 混凝土不适用
        400,     # MPa - HRB400钢筋
        235      # MPa - Q235钢板
    ],
    "渗透系数": [
        1e-8,    # m/s - 粘土
        1e-4,    # m/s - 砂土
        5e-9,    # m/s - 硬粘土
        5e-4,    # m/s - 中砂
        None,    # 混凝土不适用
        None,    # 混凝土不适用
        None,    # 钢材不适用
        None     # 钢材不适用
    ]
}

def create_material_template():
    """创建材料参数Excel模板"""
    
    # 创建DataFrame
    df = pd.DataFrame(materials_data)
    
    # 确保输出目录存在
    output_dir = Path(__file__).parent
    output_file = output_dir / "材料参数模板.xlsx"
    
    # 创建Excel文件
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # 写入主数据表
        df.to_excel(writer, sheet_name='材料参数', index=False)
        
        # 创建说明表
        instructions = pd.DataFrame({
            "列名": [
                "名称", "材料类型", "弹性模量", "泊松比", "密度",
                "粘聚力", "内摩擦角", "抗压强度", "屈服强度", "渗透系数"
            ],
            "说明": [
                "材料的名称标识",
                "材料类型：土壤、混凝土、钢材等",
                "材料的弹性模量，单位：MPa",
                "材料的泊松比，无量纲",
                "材料密度，单位：kg/m³",
                "土壤的粘聚力，单位：kPa（仅土壤材料）",
                "土壤的内摩擦角，单位：度（仅土壤材料）",
                "混凝土的抗压强度，单位：MPa（仅混凝土材料）",
                "钢材的屈服强度，单位：MPa（仅钢材）",
                "土壤的渗透系数，单位：m/s（仅土壤材料）"
            ],
            "必需": [
                "是", "否", "是", "是", "是",
                "否", "否", "否", "否", "否"
            ],
            "示例": [
                "粘土", "土壤", "20", "0.35", "1800",
                "25", "18", "30", "400", "1e-8"
            ]
        })
        instructions.to_excel(writer, sheet_name='使用说明', index=False)
        
        # 创建材料类型参考表
        material_types = pd.DataFrame({
            "材料类型": ["土壤", "混凝土", "钢材"],
            "适用参数": [
                "弹性模量、泊松比、密度、粘聚力、内摩擦角、渗透系数",
                "弹性模量、泊松比、密度、抗压强度",
                "弹性模量、泊松比、密度、屈服强度"
            ],
            "本构模型": [
                "Mohr-Coulomb, Drucker-Prager",
                "LinearElastic, ConcreteDamage",
                "LinearElastic, Plasticity"
            ]
        })
        material_types.to_excel(writer, sheet_name='材料类型参考', index=False)
    
    print(f"材料参数模板已创建: {output_file}")
    return output_file

if __name__ == "__main__":
    create_material_template()