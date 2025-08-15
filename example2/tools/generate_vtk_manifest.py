#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 VTK 时间序列清单（frames_manifest.json）
- 扫描 example2/data/VTK_Output_Stage_1 和 _Stage_2
- 依据文件名中的帧序号排序（例如 Structure_0_1.vtk, Structure_0_2.vtk ...）
- 在各自目录写出 frames_manifest.json，便于后处理按清单加载
"""

import re
import json
from pathlib import Path
from typing import List, Dict

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

STAGE_DIRS = [
    DATA / "VTK_Output_Stage_1",
    DATA / "VTK_Output_Stage_2",
]

PATTERN = re.compile(r"^(?P<prefix>.+?)_(?P<part>\d+)_(?P<frame>\d+)\.vtk$", re.IGNORECASE)


def build_manifest_for_dir(stage_dir: Path, stage_num: int) -> Dict:
    files: List[Path] = list(stage_dir.glob("*.vtk"))
    parsed = []
    for f in files:
        m = PATTERN.match(f.name)
        if not m:
            continue
        try:
            frame = int(m.group("frame"))
        except ValueError:
            continue
        parsed.append((frame, f))

    parsed.sort(key=lambda x: x[0])

    frames = [
        {
            "index": i + 1,
            "frame": frame,
            "filename": p.name,
            "relative_path": str(p.relative_to(ROOT)),
        }
        for i, (frame, p) in enumerate(parsed)
    ]

    manifest = {
        "stage": stage_num,
        "directory": str(stage_dir.relative_to(ROOT)),
        "count": len(frames),
        "frames": frames,
    }

    out_file = stage_dir / "frames_manifest.json"
    out_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


def main() -> int:
    results = {}
    for stage_num, stage_dir in enumerate(STAGE_DIRS, start=1):
        if stage_dir.exists():
            manifest = build_manifest_for_dir(stage_dir, stage_num)
            results[stage_dir.name] = manifest["count"]
        else:
            results[stage_dir.name] = 0

    print("生成完成:")
    for k, v in results.items():
        print(f"  {k}: {v} 个帧")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

