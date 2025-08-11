#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 example2/data/两阶段计算2.fpn 解析并导出VTU，同时遍历两个分析步的激活材料/荷载/边界。
运行: python example2/export_vtu_from_fpn.py
"""
import sys
from pathlib import Path

# 确保 example2 在路径中
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from PyQt6.QtWidgets import QApplication

from modules.preprocessor import PreProcessor


def summarize_stage(p: PreProcessor, idx: int):
    p.set_current_analysis_stage(idx)
    stage = p.get_current_analysis_stage()
    mat = sorted(list(getattr(p, 'current_active_materials', set())))
    print(f"Stage[{idx}] name={stage.get('name')} id={stage.get('id')}\n  active_materials={mat}")


def stage_visibility_array(p: PreProcessor):
    import numpy as np
    if not hasattr(p, 'mesh') or p.mesh is None:
        return None
    if 'MaterialID' not in p.mesh.cell_data:
        return None
    active = getattr(p, 'current_active_materials', None)
    if not active:
        return None
    mids = p.mesh.cell_data['MaterialID']
    # mids may be numpy types; normalize to int
    active_set = {int(x) for x in active}
    visible = np.array([1 if int(m) in active_set else 0 for m in mids], dtype=np.int8)
    return visible


def main():
    app = QApplication(sys.argv)  # PreProcessor构造了QWidget，需Qt上下文

    fpn = ROOT / 'data' / '两阶段计算2.fpn'
    print('FPN exists:', fpn.exists(), f"path={fpn}")

    p = PreProcessor()
    p.load_fpn_file(str(fpn))

    out_dir = ROOT / 'output'
    out_dir.mkdir(parents=True, exist_ok=True)

    # 基础网格导出
    vtk_path = out_dir / 'liangjianduan2_mesh.vtk'
    try:
        p.mesh.save(str(vtk_path))
    except Exception:
        p.export_mesh(str(vtk_path))
    print('Exported:', vtk_path, 'exists:', vtk_path.exists())

    # 为第二阶段生成带 StageVisible 的导出（如果存在第二阶段）
    stages = p.fpn_data.get('analysis_stages', []) if hasattr(p, 'fpn_data') else []
    for i in range(min(2, len(stages))):
        summarize_stage(p, i)
        if i == 1 and hasattr(p, 'mesh') and p.mesh is not None:
            vis = stage_visibility_array(p)
            if vis is not None:
                mesh2 = p.mesh.copy()
                mesh2.cell_data['StageVisible'] = vis
                stage_vtk = out_dir / 'liangjianduan2_stage2.vtk'
                mesh2.save(str(stage_vtk))
                print('Exported stage-2 with StageVisible:', stage_vtk, 'exists:', stage_vtk.exists())

    # 立即退出
    app.quit()


if __name__ == '__main__':
    sys.exit(main())

