import os
from glob import glob
import json
import numpy as np
import pyvista as pv


def _probe_stage(vtk_dir: str, first_file: str, topn: int = 10):
    """提取探针信息（最大位移/应力点及TopN节点列表），保存到 probe.json"""
    out = {"file": first_file, "n_points": 0, "n_cells": 0}
    try:
        mesh = pv.read(first_file)
        out["n_points"] = int(mesh.n_points)
        out["n_cells"] = int(mesh.n_cells)
        # 位移模量
        if 'DISPLACEMENT_X' in mesh.point_data:
            u2 = mesh.point_data['DISPLACEMENT_X']**2
            u2 += mesh.point_data.get('DISPLACEMENT_Y', 0)**2
            u2 += mesh.point_data.get('DISPLACEMENT_Z', 0)**2
            umag = np.sqrt(u2)
            imax = int(np.argmax(umag))
            out["max_displacement"] = float(umag[imax])
            out["max_displacement_point_id"] = imax
            # 输出TopN
            idx = np.argsort(-umag)[:topn]
            out["top_displacement_points"] = [int(i) for i in idx]
        # von Mises（若有应力张量分量）
        has_stress = all(k in mesh.point_data for k in (
            'CAUCHY_STRESS_TENSOR_XX', 'CAUCHY_STRESS_TENSOR_YY', 'CAUCHY_STRESS_TENSOR_ZZ'
        ))
        if has_stress:
            sx = mesh.point_data['CAUCHY_STRESS_TENSOR_XX']
            sy = mesh.point_data['CAUCHY_STRESS_TENSOR_YY']
            sz = mesh.point_data['CAUCHY_STRESS_TENSOR_ZZ']
            txy = mesh.point_data.get('CAUCHY_STRESS_TENSOR_XY', 0)
            tyz = mesh.point_data.get('CAUCHY_STRESS_TENSOR_YZ', 0)
            tzx = mesh.point_data.get('CAUCHY_STRESS_TENSOR_ZX', 0)
            vm = np.sqrt((sx-sy)**2 + (sy-sz)**2 + (sz-sx)**2 + 6*(txy**2 + tyz**2 + tzx**2))
            imax = int(np.argmax(vm))
            out["max_von_mises"] = float(vm[imax])
            out["max_von_mises_point_id"] = imax
            idx = np.argsort(-vm)[:topn]
            out["top_von_mises_points"] = [int(i) for i in idx]
        # 保存
        with open(os.path.join(vtk_dir, 'probe.json'), 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
    except Exception as e:
        out["error"] = str(e)
        with open(os.path.join(vtk_dir, 'probe.json'), 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)


def render_stage_screenshots(base_dir="data", stages=(1, 2)):
    pv.global_theme.font.size = 14
    pv.global_theme.background = 'white'
    out_images = []
    for s in stages:
        d = os.path.join(base_dir, f"VTK_Output_Stage_{s}")
        files = sorted(glob(os.path.join(d, '*.vtk')))
        if not files:
            continue
        f = files[-1] if s == 2 else files[0]
        mesh = pv.read(f)
        # Displacement magnitude
        if 'DISPLACEMENT_X' in mesh.point_data:
            u = mesh.point_data['DISPLACEMENT_X']**2
            u += mesh.point_data.get('DISPLACEMENT_Y', 0)**2
            u += mesh.point_data.get('DISPLACEMENT_Z', 0)**2
            mesh.point_data['DISP_MAG'] = np.sqrt(u)
            pl = pv.Plotter(off_screen=True, window_size=(1400, 900))
            pl.add_mesh(mesh, scalars='DISP_MAG', cmap='viridis')
            pl.add_axes()
            pl.add_text(f"Stage {s} - Displacement", font_size=14)
            img_path = os.path.join(d, 'screenshot_displacement.png')
            pl.show(screenshot=img_path)
            pl.close()
            out_images.append(img_path)
        # Von Mises stress from CAUCHY_STRESS_TENSOR_** if present
        mesh = pv.read(f)
        has_stress = all(k in mesh.point_data for k in (
            'CAUCHY_STRESS_TENSOR_XX', 'CAUCHY_STRESS_TENSOR_YY', 'CAUCHY_STRESS_TENSOR_ZZ'
        ))
        if has_stress:
            sx = mesh.point_data['CAUCHY_STRESS_TENSOR_XX']
            sy = mesh.point_data['CAUCHY_STRESS_TENSOR_YY']
            sz = mesh.point_data['CAUCHY_STRESS_TENSOR_ZZ']
            txy = mesh.point_data.get('CAUCHY_STRESS_TENSOR_XY', 0)
            tyz = mesh.point_data.get('CAUCHY_STRESS_TENSOR_YZ', 0)
            tzx = mesh.point_data.get('CAUCHY_STRESS_TENSOR_ZX', 0)
            vm = np.sqrt((sx-sy)**2 + (sy-sz)**2 + (sz-sx)**2 + 6*(txy**2 + tyz**2 + tzx**2))
            mesh.point_data['VON_MISES'] = vm
            pl = pv.Plotter(off_screen=True, window_size=(1400, 900))
            pl.add_mesh(mesh, scalars='VON_MISES', cmap='plasma')
            pl.add_axes()
            pl.add_text(f"Stage {s} - von Mises", font_size=14)
            img_path = os.path.join(d, 'screenshot_vonmises.png')
            pl.show(screenshot=img_path)
            pl.close()
            out_images.append(img_path)
        # 探针输出
        _probe_stage(d, f)
    return out_images


if __name__ == '__main__':
    imgs = render_stage_screenshots()
    for p in imgs:
        print(p)

