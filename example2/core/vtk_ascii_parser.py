from pathlib import Path
from typing import List, Tuple

def parse_vtk_ascii_pointdata_last(filepath: Path) -> Tuple[List[List[float]], List[List[float]]]:
    """
    轻量级 VTK ASCII 解析（兼容 VTK 4.0 的 FIELD FieldData）：
    - 优先解析 POINT_DATA 中的 DISPLACEMENT：
      1) 支持旧式 "VECTORS DISPLACEMENT ..."；
      2) 支持 "FIELD FieldData N" 下的 "DISPLACEMENT <comp> <tuples> <dtype>"。
    - 解析 CELL_DATA 中的应力：
      1) 若出现 FIELD 中的 CAUCHY_STRESS_TENSOR 或 GREEN_LAGRANGE_STRAIN_TENSOR，按九分量读取；
      2) 回退支持 "TENSORS ... STRESS" 样式。
    返回: (displacements[N][3], stresses[M][6])
    """
    disp: List[List[float]] = []
    stress: List[List[float]] = []

    if not filepath.exists():
        return disp, stress

    def _read_n_floats(stream, count: int) -> List[float]:
        vals: List[float] = []
        while len(vals) < count:
            line = stream.readline()
            if not line:
                break
            s = line.strip()
            if not s:
                continue
            # 若遇到新的段落标头，提前结束
            if s[0].isalpha() and not (s[0].isdigit() or s[0] in '+-.'):
                # 将读到的非数字行“退回”不易实现，这里直接终止（上层按已有数量处理）
                # 为稳健起见，打破后由上层忽略剩余
                break
            parts = s.split()
            for p in parts:
                try:
                    vals.append(float(p))
                except Exception:
                    # 忽略无效数字
                    pass
        return vals[:count]

    mode = None
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        while True:
            line = f.readline()
            if not line:
                break
            s = line.strip()
            if not s:
                continue
            if s.startswith('POINT_DATA'):
                mode = 'POINT_DATA'
                continue
            if s.startswith('CELL_DATA'):
                mode = 'CELL_DATA'
                continue

            # 1) 旧式 VECTORS DISPLACEMENT
            if mode == 'POINT_DATA' and s.startswith('VECTORS') and 'DISPLACEMENT' in s:
                # 读取直到遇到下一段标头（以字母开头）
                while True:
                    pos = f.tell()
                    vec_line = f.readline()
                    if not vec_line:
                        break
                    vec_s = vec_line.strip()
                    if (not vec_s) or vec_s[0].isalpha():
                        # 回退到段头，供后续解析
                        try:
                            f.seek(pos)
                        except Exception:
                            pass
                        break
                    parts = vec_s.split()
                    # 一行可包含多组三分量
                    try:
                        nums = [float(p) for p in parts]
                        for i in range(0, len(nums) - 2, 3):
                            disp.append([nums[i], nums[i+1], nums[i+2]])
                    except Exception:
                        continue
                continue

            # 2) VTK 4.0: FIELD FieldData N
            if s.startswith('FIELD') and 'FieldData' in s:
                # 读取声明的数组个数
                try:
                    tokens = s.split()
                    n_arrays = int(tokens[-1])
                except Exception:
                    n_arrays = 0
                for _ in range(n_arrays):
                    header = f.readline()
                    if not header:
                        break
                    h = header.strip().split()
                    if len(h) < 3:
                        # 例如: NAME comp tuples [dtype]
                        continue
                    name = h[0]
                    try:
                        ncomp = int(h[1])
                        ntuple = int(h[2])
                    except Exception:
                        # 无法解析分量/元组数，跳过
                        # 继续尝试下一数组
                        # 读掉一行避免死循环
                        continue
                    # dtype 可选，忽略
                    total = ncomp * ntuple
                    vals = _read_n_floats(f, total)
                    if len(vals) != total:
                        # 数据不完整，跳过
                        continue
                    # 将数据按 tuple 切分
                    if mode == 'POINT_DATA' and name.upper() == 'DISPLACEMENT' and ncomp >= 3:
                        for i in range(ntuple):
                            base = i * ncomp
                            disp.append([vals[base], vals[base+1], vals[base+2]])
                    elif mode == 'CELL_DATA' and name.upper() in (
                        'CAUCHY_STRESS_TENSOR', 'GREEN_LAGRANGE_STRAIN_TENSOR', 'PK2_STRESS_TENSOR', 'STRESS_TENSOR'):
                        # 取 3x3 张量的主分量及剪切分量（s11,s22,s33,s12,s13,s23）
                        if ncomp >= 9:
                            for i in range(ntuple):
                                base = i * ncomp
                                s11 = vals[base + 0]
                                s22 = vals[base + 4]
                                s33 = vals[base + 8]
                                s12 = vals[base + 1]
                                s13 = vals[base + 2]
                                s23 = vals[base + 5]
                                stress.append([s11, s22, s33, s12, s13, s23])
                        else:
                            # 若不是 9 分量，尽力而为（例如 6 分量顺序）
                            for i in range(ntuple):
                                base = i * ncomp
                                tpl = vals[base: base + ncomp]
                                # 右填充到6维
                                tpl6 = list(tpl[:6]) + [0.0] * max(0, 6 - len(tpl))
                                stress.append(tpl6[:6])
                continue

            # 3) 回退解析 TENSORS ... STRESS（旧式）
            if mode == 'CELL_DATA' and (('CAUCHY_STRESS_TENSOR' in s) or ('TENSORS' in s and 'STRESS' in s)):
                # 读取若干行数值，把每 9 个视为一个张量
                numbers: List[float] = []
                while True:
                    pos = f.tell()
                    ten_line = f.readline()
                    if not ten_line:
                        break
                    t = ten_line.strip()
                    if (not t) or t[0].isalpha():
                        # 回退
                        try:
                            f.seek(pos)
                        except Exception:
                            pass
                        break
                    for p in t.split():
                        try:
                            numbers.append(float(p))
                        except Exception:
                            pass
                    # 每 9 个数形成一个 3x3 张量
                    while len(numbers) >= 9:
                        s11, s22, s33, s12, s13, s23 = numbers[0], numbers[4], numbers[8], numbers[1], numbers[2], numbers[5]
                        stress.append([s11, s22, s33, s12, s13, s23])
                        numbers = numbers[9:]

    return disp, stress

