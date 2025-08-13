from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class GeotechnicalMaterialType(str, Enum):
    CLAY = "CLAY"
    SILT = "SILT"
    SAND = "SAND"
    GRAVEL = "GRAVEL"
    ORGANIC_SOIL = "ORGANIC_SOIL"
    FILL = "FILL"
    ROCK_HARD = "ROCK_HARD"
    ROCK_SOFT = "ROCK_SOFT"
    ROCK_WEATHERED = "ROCK_WEATHERED"
    ROCK_FRACTURED = "ROCK_FRACTURED"
    CONCRETE = "CONCRETE"
    STEEL = "STEEL"
    REINFORCEMENT = "REINFORCEMENT"
    SHOTCRETE = "SHOTCRETE"
    GROUTING = "GROUTING"
    TIMBER = "TIMBER"
    COMPOSITE = "COMPOSITE"
    GEOSYNTHETIC = "GEOSYNTHETIC"
    FROZEN_SOIL = "FROZEN_SOIL"
    SWELLING_SOIL = "SWELLING_SOIL"
    COLLAPSIBLE_SOIL = "COLLAPSIBLE_SOIL"
    SOFT_SOIL = "SOFT_SOIL"


class ConstitutiveModel(str, Enum):
    LINEAR_ELASTIC = "LINEAR_ELASTIC"
    NONLINEAR_ELASTIC = "NONLINEAR_ELASTIC"
    ORTHOTROPIC = "ORTHOTROPIC"
    MOHR_COULOMB = "MOHR_COULOMB"
    DRUCKER_PRAGER = "DRUCKER_PRAGER"
    TRESCA = "TRESCA"
    VON_MISES = "VON_MISES"
    CAM_CLAY = "CAM_CLAY"
    MODIFIED_CAM_CLAY = "MODIFIED_CAM_CLAY"
    HARDENING_SOIL = "HARDENING_SOIL"
    HARDENING_SOIL_SMALL_STRAIN = "HARDENING_SOIL_SMALL_STRAIN"
    SOFT_SOIL = "SOFT_SOIL"
    SOFT_SOIL_CREEP = "SOFT_SOIL_CREEP"
    HOEK_BROWN = "HOEK_BROWN"
    JOINTED_ROCK = "JOINTED_ROCK"
    UBIQUITOUS_JOINT = "UBIQUITOUS_JOINT"
    EQUIVALENT_LINEAR = "EQUIVALENT_LINEAR"
    RAMBERG_OSGOOD = "RAMBERG_OSGOOD"
    BIOT_CONSOLIDATION = "BIOT_CONSOLIDATION"
    TERZAGHI_CONSOLIDATION = "TERZAGHI_CONSOLIDATION"


class MaterialStatus(str, Enum):
    draft = "draft"
    review = "review"
    approved = "approved"
    archived = "archived"


class ReliabilityLevel(str, Enum):
    experimental = "experimental"
    literature = "literature"
    empirical = "empirical"
    standard = "standard"
    code = "code"


# Basic material properties schemas
class BaseMaterialProperties(BaseModel):
    density: float = Field(..., description="密度 (kg/m³)")
    unitWeight: float = Field(..., description="重度 (kN/m³)")
    elasticModulus: float = Field(..., description="弹性模量 (kPa)")
    poissonRatio: float = Field(..., description="泊松比")
    specificGravity: Optional[float] = Field(None, description="比重")
    voidRatio: Optional[float] = Field(None, description="孔隙比")
    porosity: Optional[float] = Field(None, description="孔隙率")
    saturationDegree: Optional[float] = Field(None, description="饱和度")
    waterContent: Optional[float] = Field(None, description="含水量 (%)")
    
    class Config:
        extra = "allow"


class SoilMaterialProperties(BaseMaterialProperties):
    cohesion: Optional[float] = Field(None, description="粘聚力 (kPa)")
    frictionAngle: Optional[float] = Field(None, description="内摩擦角 (度)")
    dilatancyAngle: Optional[float] = Field(None, description="剪胀角 (度)")
    tensileStrength: Optional[float] = Field(None, description="抗拉强度 (kPa)")
    permeability: Optional[float] = Field(None, description="渗透系数 (m/s)")
    hydraulicConductivity: Optional[float] = Field(None, description="水力传导率 (m/s)")
    
    # Soil-specific properties
    liquidLimit: Optional[float] = Field(None, description="液限 (%)")
    plasticLimit: Optional[float] = Field(None, description="塑限 (%)")
    plasticityIndex: Optional[float] = Field(None, description="塑性指数")
    liquidityIndex: Optional[float] = Field(None, description="液性指数")
    compressionIndex: Optional[float] = Field(None, description="压缩指数 Cc")
    swellingIndex: Optional[float] = Field(None, description="回弹指数 Cs")
    preconsolidationPressure: Optional[float] = Field(None, description="前期固结压力 (kPa)")
    overconsolidationRatio: Optional[float] = Field(None, description="超固结比 OCR")


class RockMaterialProperties(BaseMaterialProperties):
    uniaxialCompressiveStrength: float = Field(..., description="单轴抗压强度 (MPa)")
    triaxialCompressiveStrength: Optional[float] = Field(None, description="三轴抗压强度 (MPa)")
    brazilianTensileStrength: Optional[float] = Field(None, description="巴西劈裂抗拉强度 (MPa)")
    rqd: Optional[float] = Field(None, description="岩石质量指标 (%)")
    gsi: Optional[float] = Field(None, description="地质强度指标")
    weatheringDegree: Optional[float] = Field(None, description="风化程度 (1-5级)")


class ArtificialMaterialProperties(BaseMaterialProperties):
    yieldStrength: Optional[float] = Field(None, description="屈服强度 (MPa)")
    ultimateStrength: Optional[float] = Field(None, description="极限强度 (MPa)")
    compressiveStrength: Optional[float] = Field(None, description="抗压强度 (MPa)")
    tensileStrength: Optional[float] = Field(None, description="抗拉强度 (MPa)")


# MIDAS compatibility schemas
class MIDASMaterialFormat(BaseModel):
    mnlmc: Optional[Dict[str, Any]] = Field(None, description="MIDAS MNLMC 参数")
    matgen: Optional[Dict[str, Any]] = Field(None, description="MIDAS MATGEN 参数")
    matporo: Optional[Dict[str, Any]] = Field(None, description="MIDAS MATPORO 参数")


class StagedMaterialProperties(BaseModel):
    stageId: int = Field(..., description="阶段ID")
    stageName: str = Field(..., description="阶段名称")
    activationTime: Optional[float] = Field(None, description="激活时间")
    materialModifications: Optional[Dict[str, Any]] = Field(None, description="材料属性修正")


# Main schemas
class GeotechnicalMaterial(BaseModel):
    id: str = Field(..., description="材料ID")
    name: str = Field(..., description="材料名称")
    materialType: GeotechnicalMaterialType = Field(..., description="材料类型")
    constitutiveModel: ConstitutiveModel = Field(..., description="本构模型")
    properties: Dict[str, Any] = Field(..., description="材料属性")
    
    # MIDAS compatibility
    midasFormat: Optional[MIDASMaterialFormat] = Field(None, description="MIDAS 格式参数")
    stagedProperties: Optional[List[StagedMaterialProperties]] = Field(None, description="施工阶段属性")
    
    # Metadata
    description: Optional[str] = Field(None, description="材料描述")
    source: Optional[str] = Field(None, description="数据来源")
    standard: Optional[str] = Field(None, description="参考标准")
    reliability: ReliabilityLevel = Field(ReliabilityLevel.empirical, description="可靠性等级")
    
    # Status and version
    status: MaterialStatus = Field(MaterialStatus.draft, description="状态")
    validated: bool = Field(False, description="是否验证")
    version: str = Field("1.0.0", description="版本号")
    
    # Usage tracking
    usageCount: Optional[int] = Field(0, description="使用次数")
    lastUsed: Optional[datetime] = Field(None, description="最后使用时间")
    projectIds: Optional[List[str]] = Field(None, description="使用项目ID列表")
    
    # Tags and categorization
    tags: Optional[List[str]] = Field(None, description="标签")
    category: Optional[str] = Field(None, description="分类")
    subCategory: Optional[str] = Field(None, description="子分类")
    
    # Timestamps
    created: datetime = Field(default_factory=datetime.now, description="创建时间")
    modified: datetime = Field(default_factory=datetime.now, description="修改时间")
    createdBy: Optional[str] = Field(None, description="创建者")
    modifiedBy: Optional[str] = Field(None, description="修改者")
    
    # Library type
    isLibraryMaterial: bool = Field(False, description="是否为库材料")
    isStandard: bool = Field(False, description="是否为标准材料")


class GeotechnicalMaterialCreate(BaseModel):
    name: str
    materialType: GeotechnicalMaterialType
    constitutiveModel: ConstitutiveModel
    properties: Dict[str, Any]
    midasFormat: Optional[MIDASMaterialFormat] = None
    stagedProperties: Optional[List[StagedMaterialProperties]] = None
    description: Optional[str] = None
    source: Optional[str] = None
    standard: Optional[str] = None
    reliability: ReliabilityLevel = ReliabilityLevel.empirical
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    createdBy: Optional[str] = None


class GeotechnicalMaterialUpdate(BaseModel):
    name: Optional[str] = None
    materialType: Optional[GeotechnicalMaterialType] = None
    constitutiveModel: Optional[ConstitutiveModel] = None
    properties: Optional[Dict[str, Any]] = None
    midasFormat: Optional[MIDASMaterialFormat] = None
    stagedProperties: Optional[List[StagedMaterialProperties]] = None
    description: Optional[str] = None
    source: Optional[str] = None
    standard: Optional[str] = None
    reliability: Optional[ReliabilityLevel] = None
    status: Optional[MaterialStatus] = None
    validated: Optional[bool] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    modifiedBy: Optional[str] = None


class MaterialSearchCriteria(BaseModel):
    keyword: Optional[str] = None
    name: Optional[str] = None
    materialType: Optional[List[GeotechnicalMaterialType]] = None
    constitutiveModel: Optional[List[ConstitutiveModel]] = None
    densityRange: Optional[List[float]] = None
    modulusRange: Optional[List[float]] = None
    strengthRange: Optional[List[float]] = None
    permeabilityRange: Optional[List[float]] = None
    tags: Optional[List[str]] = None
    category: Optional[List[str]] = None
    reliability: Optional[List[ReliabilityLevel]] = None
    standard: Optional[List[str]] = None
    status: Optional[List[MaterialStatus]] = None
    validated: Optional[bool] = None
    recentlyUsed: Optional[bool] = None
    popularOnly: Optional[bool] = None
    sortBy: Optional[str] = "name"
    sortOrder: Optional[str] = "asc"
    page: Optional[int] = 1
    pageSize: Optional[int] = 20


class MaterialImportRequest(BaseModel):
    format: str = Field(..., description="导入格式 (json, midas_fpn, midas_mct)")
    data: str = Field(..., description="材料数据")
    mergeStrategy: Optional[str] = Field("append", description="合并策略")
    validateOnImport: bool = Field(True, description="导入时验证")


class MaterialExportRequest(BaseModel):
    materialIds: List[str] = Field(..., description="要导出的材料ID列表")
    format: str = Field(..., description="导出格式")
    includeMetadata: bool = Field(True, description="是否包含元数据")
    includeTestData: bool = Field(False, description="是否包含试验数据")
    includeValidation: bool = Field(False, description="是否包含验证结果")


# Legacy schemas for backward compatibility
class MaterialParameters(BaseModel):
    elasticModulus: float = Field(..., description="弹性模量 (MPa)")
    poissonRatio: float = Field(..., description="泊松比")
    density: float = Field(..., description="密度 (kg/m³)")

    class Config:
        extra = "allow"


class Material(BaseModel):
    id: str = Field(..., description="唯一ID")
    name: str = Field(..., description="材料名称")
    type: str = Field(..., description="材料类型 (e.g., 'concrete', 'steel', 'soil')")
    parameters: MaterialParameters = Field(..., description="材料物理参数")


class MaterialCreate(BaseModel):
    name: str
    type: str
    parameters: MaterialParameters


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    parameters: Optional[MaterialParameters] = None 