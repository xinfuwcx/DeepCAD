"""
项目管理路由模块
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...models.user import User
from ...models.project import (
    Project, ProjectCreate, ProjectUpdate, ProjectResponse,
    SeepageModel, SeepageModelCreate, SeepageModelUpdate, SeepageModelResponse
)
from ...auth.auth import get_current_active_user

router = APIRouter(prefix="/projects", tags=["项目管理"])


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建新项目"""
    db_project = Project(
        name=project_data.name,
        description=project_data.description,
        location=project_data.location,
        project_type=project_data.project_type,
        user_id=current_user.id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取当前用户的所有项目"""
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取单个项目详情"""
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新项目信息"""
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )
    
    # 更新项目属性
    for key, value in project_data.dict(exclude_unset=True).items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除项目"""
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )
    
    db.delete(project)
    db.commit()


# --- 渗流模型相关路由 ---

@router.post("/{project_id}/seepage-models/", response_model=SeepageModelResponse)
async def create_seepage_model(
    project_id: int,
    model_data: SeepageModelCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """为项目创建渗流分析模型"""
    # 验证项目存在且属于当前用户
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )
    
    # 创建模型
    db_model = SeepageModel(
        name=model_data.name,
        description=model_data.description,
        project_id=project_id,
        soil_layers=model_data.soil_layers,
        boundary_conditions=model_data.boundary_conditions,
        mesh_config=model_data.mesh_config,
        analysis_config=model_data.analysis_config
    )
    
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    
    return db_model


@router.get(
    "/{project_id}/seepage-models/",
    response_model=List[SeepageModelResponse]
)
async def get_seepage_models(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目的所有渗流分析模型"""
    # 验证项目存在且属于当前用户
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )
    
    # 获取模型列表
    models = (
        db.query(SeepageModel)
        .filter(SeepageModel.project_id == project_id)
        .all()
    )
    
    return models


@router.get(
    "/{project_id}/seepage-models/{model_id}",
    response_model=SeepageModelResponse
)
async def get_seepage_model(
    project_id: int,
    model_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取特定渗流分析模型详情"""
    # 验证项目存在且属于当前用户
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )
    
    # 获取模型
    model = (
        db.query(SeepageModel)
        .filter(
            SeepageModel.id == model_id,
            SeepageModel.project_id == project_id
        )
        .first()
    )
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到渗流模型或无权访问"
        )
    
    return model

# New endpoint for optimizable parameters
@router.get("/{project_id}/optimizable-parameters")
async def get_optimizable_parameters(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a list of parameters from the project that can be used for
    inverse analysis or design optimization.

    **This is a mock implementation.** In a real scenario, this would inspect
    the project's geological model, material properties, and geometric entities.
    """
    # First, verify the user has access to the project.
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到项目或无权访问"
        )

    # Mock data representing parameters from different parts of the model
    mock_parameters = [
        {
            "id": "soil_layer_1_E",
            "name": "第1层土 - 弹性模量 (E)",
            "group": "土层材料",
            "value": 15e6,
            "min": 5e6,
            "max": 50e6,
            "step": 1e6,
            "unit": "Pa"
        },
        {
            "id": "soil_layer_1_c",
            "name": "第1层土 - 内聚力 (c)",
            "group": "土层材料",
            "value": 20000,
            "min": 5000,
            "max": 100000,
            "step": 1000,
            "unit": "Pa"
        },
        {
            "id": "soil_layer_2_E",
            "name": "第2层土 - 弹性模量 (E)",
            "group": "土层材料",
            "value": 30e6,
            "min": 10e6,
            "max": 80e6,
            "step": 1e6,
            "unit": "Pa"
        },
        {
            "id": "anchor_1_length",
            "name": "锚杆组1 - 长度",
            "group": "支护结构",
            "value": 15.0,
            "min": 8.0,
            "max": 25.0,
            "step": 0.5,
            "unit": "m"
        },
        {
            "id": "diaphragm_wall_thickness",
            "name": "地连墙 - 厚度",
            "group": "支护结构",
            "value": 0.8,
            "min": 0.6,
            "max": 1.2,
            "step": 0.1,
            "unit": "m"
        }
    ]

    return mock_parameters 