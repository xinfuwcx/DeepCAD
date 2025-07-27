"""
时程曲线分析API路由 - 时间历程数据生成和分析功能
"""

import asyncio
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
import io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import csv

from .pyvista_state_manager import get_pyvista_state_manager
from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/time-history", tags=["Time History Analysis"])

# 状态管理器和桥接器
state_manager = get_pyvista_state_manager()
bridge = get_pyvista_bridge()


class GenerateSettings(BaseModel):
    """时程生成设置"""
    variable: str  # 'displacement', 'velocity', 'acceleration', 'stress', 'strain'
    component: str  # 'x', 'y', 'z', 'magnitude', 'von_mises'等
    extraction_type: str  # 'node', 'element', 'path'
    node_ids: Optional[List[int]] = None
    element_ids: Optional[List[int]] = None
    path_points: Optional[List[List[float]]] = None
    time_range: Tuple[float, float] = (0.0, 1.0)
    sampling_rate: float = 1.0


class TimeHistoryRequest(BaseModel):
    """时程分析请求"""
    result_id: str
    settings: GenerateSettings


class ExportRequest(BaseModel):
    """导出请求"""
    series_ids: List[str]
    format: str = 'csv'  # 'csv', 'json', 'excel'


class ComparisonRequest(BaseModel):
    """对比分析请求"""
    series_ids: List[str]
    comparison_type: str = 'overlay'  # 'overlay', 'difference', 'ratio'


class StatisticsRequest(BaseModel):
    """统计分析请求"""
    series_id: str
    analysis_type: str = 'basic'  # 'basic', 'frequency', 'extremes'


def extract_time_series_from_result(result_id: str, settings: GenerateSettings) -> Dict[str, Any]:
    """从结果数据中提取时程数据"""
    try:
        # 这里需要根据result_id加载实际的结果数据
        # 并根据settings提取对应的时程数据
        
        # 模拟时程数据生成
        time_steps = np.linspace(settings.time_range[0], settings.time_range[1], 100)
        
        if settings.variable == 'displacement':
            if settings.component == 'magnitude':
                # 模拟位移幅值时程
                values = 0.1 * np.sin(2 * np.pi * time_steps) * np.exp(-0.5 * time_steps)
            elif settings.component == 'x':
                values = 0.05 * np.sin(2 * np.pi * time_steps)
            elif settings.component == 'y':
                values = 0.03 * np.cos(2 * np.pi * time_steps)
            else:
                values = 0.02 * np.sin(4 * np.pi * time_steps)
        
        elif settings.variable == 'velocity':
            # 模拟速度时程
            values = 0.5 * np.cos(2 * np.pi * time_steps) * np.exp(-0.3 * time_steps)
        
        elif settings.variable == 'acceleration':
            # 模拟加速度时程
            values = 2.0 * np.sin(4 * np.pi * time_steps) * np.exp(-0.8 * time_steps)
        
        elif settings.variable == 'stress':
            if settings.component == 'von_mises':
                # 模拟Von Mises应力时程
                values = 100 * (1 + 0.5 * np.sin(2 * np.pi * time_steps)) * np.exp(-0.2 * time_steps)
            else:
                values = 50 * np.sin(2 * np.pi * time_steps)
        
        else:
            # 默认时程
            values = np.sin(2 * np.pi * time_steps)
        
        # 添加一些噪声
        noise = 0.02 * np.random.normal(0, 1, len(values))
        values = values + noise
        
        return {
            "times": time_steps.tolist(),
            "values": values.tolist(),
            "metadata": {
                "variable": settings.variable,
                "component": settings.component,
                "extraction_type": settings.extraction_type,
                "node_ids": settings.node_ids,
                "element_ids": settings.element_ids,
                "time_range": settings.time_range,
                "sampling_rate": settings.sampling_rate,
                "num_points": len(time_steps)
            }
        }
    
    except Exception as e:
        logger.error(f"Failed to extract time series data: {e}")
        raise


def calculate_time_series_statistics(times: List[float], values: List[float]) -> Dict[str, float]:
    """计算时程数据统计信息"""
    try:
        if not values:
            return {}
        
        values_array = np.array(values)
        times_array = np.array(times)
        
        # 基本统计
        min_val = float(np.min(values_array))
        max_val = float(np.max(values_array))
        mean_val = float(np.mean(values_array))
        std_val = float(np.std(values_array))
        rms_val = float(np.sqrt(np.mean(values_array**2)))
        
        # 峰值分析
        abs_values = np.abs(values_array)
        peak_index = np.argmax(abs_values)
        peak_value = float(values_array[peak_index])
        peak_time = float(times_array[peak_index])
        
        # 频域分析
        fft_values = np.fft.fft(values_array)
        frequencies = np.fft.fftfreq(len(values_array), times_array[1] - times_array[0])
        power_spectrum = np.abs(fft_values)**2
        dominant_freq_index = np.argmax(power_spectrum[1:len(power_spectrum)//2]) + 1
        dominant_frequency = float(frequencies[dominant_freq_index])
        
        # 能量相关
        total_energy = float(np.trapz(values_array**2, times_array))
        
        return {
            "min": min_val,
            "max": max_val,
            "mean": mean_val,
            "std": std_val,
            "rms": rms_val,
            "peak_value": peak_value,
            "peak_time": peak_time,
            "dominant_frequency": dominant_frequency,
            "total_energy": total_energy,
            "duration": float(times_array[-1] - times_array[0]),
            "zero_crossings": int(np.sum(np.diff(np.sign(values_array)) != 0))
        }
    
    except Exception as e:
        logger.error(f"Failed to calculate statistics: {e}")
        return {}


@router.post("/generate")
async def generate_time_series(
    request: TimeHistoryRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """生成时程曲线"""
    try:
        async def process_time_series():
            try:
                # 发送开始消息
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_started",
                    "message": "开始生成时程曲线...",
                    "progress": 0
                }), client_id)
                
                # 1. 加载结果数据
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_progress",
                    "message": "加载结果数据...",
                    "progress": 20
                }), client_id)
                
                # 2. 提取时程数据
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_progress",
                    "message": "提取时程数据...",
                    "progress": 40
                }), client_id)
                
                time_series_data = extract_time_series_from_result(
                    request.result_id,
                    request.settings
                )
                
                # 3. 计算统计信息
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_progress",
                    "message": "计算统计信息...",
                    "progress": 70
                }), client_id)
                
                statistics = calculate_time_series_statistics(
                    time_series_data["times"],
                    time_series_data["values"]
                )
                
                # 4. 保存数据
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_progress",
                    "message": "保存时程数据...",
                    "progress": 90
                }), client_id)
                
                series_id = f"timeseries_{int(datetime.now().timestamp())}"
                output_dir = Path("static/time_series")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                # 保存时程数据
                data_to_save = {
                    "series_id": series_id,
                    "times": time_series_data["times"],
                    "values": time_series_data["values"],
                    "statistics": statistics,
                    "metadata": time_series_data["metadata"],
                    "created": datetime.now().isoformat()
                }
                
                data_path = output_dir / f"{series_id}.json"
                with open(data_path, 'w') as f:
                    json.dump(data_to_save, f, indent=2)
                
                # 发送完成消息
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_completed",
                    "message": "时程曲线生成完成",
                    "progress": 100,
                    "time_series_data": {
                        "series_id": series_id,
                        "times": time_series_data["times"],
                        "values": time_series_data["values"],
                        "statistics": statistics,
                        "data_url": f"/static/time_series/{series_id}.json"
                    }
                }), client_id)
                
            except Exception as e:
                error_message = f"时程曲线生成失败: {str(e)}"
                await manager.send_personal_message(json.dumps({
                    "type": "time_series_error",
                    "message": error_message
                }), client_id)
                logger.error(f"Time series generation failed: {e}")
        
        # 添加后台任务
        background_tasks.add_task(process_time_series)
        
        return JSONResponse({
            "success": True,
            "message": "时程曲线生成已开始"
        })
        
    except Exception as e:
        logger.error(f"Failed to start time series generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_time_series(request: ExportRequest) -> StreamingResponse:
    """导出时程数据"""
    try:
        time_series_dir = Path("static/time_series")
        
        # 收集数据
        all_data = []
        for series_id in request.series_ids:
            data_path = time_series_dir / f"{series_id}.json"
            if data_path.exists():
                with open(data_path, 'r') as f:
                    data = json.load(f)
                    all_data.append(data)
        
        if not all_data:
            raise HTTPException(status_code=404, detail="No data found for specified series")
        
        if request.format == 'csv':
            # 导出CSV格式
            output = io.StringIO()
            writer = csv.writer(output)
            
            # 写入头部
            header = ['Time']
            for data in all_data:
                series_name = f"{data['metadata']['variable']}_{data['metadata']['component']}"
                header.append(series_name)
            writer.writerow(header)
            
            # 写入数据
            max_length = max(len(data['times']) for data in all_data)
            for i in range(max_length):
                row = []
                # 时间列
                if i < len(all_data[0]['times']):
                    row.append(all_data[0]['times'][i])
                else:
                    row.append('')
                
                # 数据列
                for data in all_data:
                    if i < len(data['values']):
                        row.append(data['values'][i])
                    else:
                        row.append('')
                writer.writerow(row)
            
            output.seek(0)
            return StreamingResponse(
                io.StringIO(output.getvalue()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=time_series_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
            )
        
        elif request.format == 'json':
            # 导出JSON格式
            export_data = {
                "export_info": {
                    "timestamp": datetime.now().isoformat(),
                    "series_count": len(all_data),
                    "format": "json"
                },
                "time_series": all_data
            }
            
            output = io.BytesIO()
            output.write(json.dumps(export_data, indent=2).encode('utf-8'))
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=time_series_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"}
            )
        
        elif request.format == 'excel':
            # 导出Excel格式
            output = io.BytesIO()
            
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                # 数据工作表
                df_data = pd.DataFrame()
                for data in all_data:
                    series_name = f"{data['metadata']['variable']}_{data['metadata']['component']}"
                    if df_data.empty:
                        df_data['Time'] = data['times']
                    df_data[series_name] = pd.Series(data['values'])
                
                df_data.to_excel(writer, sheet_name='Time Series Data', index=False)
                
                # 统计工作表
                stats_data = []
                for data in all_data:
                    stats = data.get('statistics', {})
                    series_name = f"{data['metadata']['variable']}_{data['metadata']['component']}"
                    stats['series_name'] = series_name
                    stats_data.append(stats)
                
                if stats_data:
                    df_stats = pd.DataFrame(stats_data)
                    df_stats.to_excel(writer, sheet_name='Statistics', index=False)
            
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=time_series_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
    
    except Exception as e:
        logger.error(f"Failed to export time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def compare_time_series(request: ComparisonRequest) -> JSONResponse:
    """对比分析时程数据"""
    try:
        time_series_dir = Path("static/time_series")
        
        # 加载数据
        series_data = []
        for series_id in request.series_ids:
            data_path = time_series_dir / f"{series_id}.json"
            if data_path.exists():
                with open(data_path, 'r') as f:
                    data = json.load(f)
                    series_data.append(data)
        
        if len(series_data) < 2:
            raise HTTPException(status_code=400, detail="At least 2 series required for comparison")
        
        comparison_results = {}
        
        if request.comparison_type == 'overlay':
            # 叠加对比 - 直接返回原始数据用于前端绘制
            comparison_results = {
                "type": "overlay",
                "series": [
                    {
                        "id": data["series_id"],
                        "name": f"{data['metadata']['variable']}_{data['metadata']['component']}",
                        "times": data["times"],
                        "values": data["values"],
                        "statistics": data.get("statistics", {})
                    }
                    for data in series_data
                ]
            }
        
        elif request.comparison_type == 'difference':
            # 差值对比
            base_series = series_data[0]
            differences = []
            
            for i, compare_series in enumerate(series_data[1:], 1):
                # 插值到相同时间点
                base_times = np.array(base_series["times"])
                base_values = np.array(base_series["values"])
                compare_times = np.array(compare_series["times"])
                compare_values = np.array(compare_series["values"])
                
                # 简单线性插值
                interpolated_values = np.interp(base_times, compare_times, compare_values)
                diff_values = interpolated_values - base_values
                
                differences.append({
                    "name": f"Diff_{i}",
                    "times": base_times.tolist(),
                    "values": diff_values.tolist(),
                    "base_series": base_series["series_id"],
                    "compare_series": compare_series["series_id"]
                })
            
            comparison_results = {
                "type": "difference",
                "base_series": base_series["series_id"],
                "differences": differences
            }
        
        elif request.comparison_type == 'ratio':
            # 比值对比
            base_series = series_data[0]
            ratios = []
            
            for i, compare_series in enumerate(series_data[1:], 1):
                base_times = np.array(base_series["times"])
                base_values = np.array(base_series["values"])
                compare_times = np.array(compare_series["times"])
                compare_values = np.array(compare_series["values"])
                
                interpolated_values = np.interp(base_times, compare_times, compare_values)
                # 避免除零
                ratio_values = np.divide(interpolated_values, base_values, 
                                       out=np.zeros_like(interpolated_values), 
                                       where=base_values!=0)
                
                ratios.append({
                    "name": f"Ratio_{i}",
                    "times": base_times.tolist(),
                    "values": ratio_values.tolist(),
                    "base_series": base_series["series_id"],
                    "compare_series": compare_series["series_id"]
                })
            
            comparison_results = {
                "type": "ratio",
                "base_series": base_series["series_id"],
                "ratios": ratios
            }
        
        return JSONResponse({
            "success": True,
            "comparison_results": comparison_results
        })
        
    except Exception as e:
        logger.error(f"Failed to compare time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/statistics")
async def analyze_statistics(request: StatisticsRequest) -> JSONResponse:
    """统计分析"""
    try:
        time_series_dir = Path("static/time_series")
        data_path = time_series_dir / f"{request.series_id}.json"
        
        if not data_path.exists():
            raise HTTPException(status_code=404, detail="Time series not found")
        
        with open(data_path, 'r') as f:
            data = json.load(f)
        
        times = np.array(data["times"])
        values = np.array(data["values"])
        
        if request.analysis_type == 'basic':
            # 基本统计分析
            stats = calculate_time_series_statistics(times.tolist(), values.tolist())
            
        elif request.analysis_type == 'frequency':
            # 频域分析
            fft_values = np.fft.fft(values)
            frequencies = np.fft.fftfreq(len(values), times[1] - times[0])
            power_spectrum = np.abs(fft_values)**2
            
            # 只取正频率部分
            positive_freq_indices = frequencies > 0
            positive_frequencies = frequencies[positive_freq_indices]
            positive_power = power_spectrum[positive_freq_indices]
            
            stats = {
                "frequencies": positive_frequencies[:len(positive_frequencies)//2].tolist(),
                "power_spectrum": positive_power[:len(positive_power)//2].tolist(),
                "dominant_frequency": float(positive_frequencies[np.argmax(positive_power)]),
                "bandwidth": float(np.sqrt(np.sum(positive_frequencies**2 * positive_power) / np.sum(positive_power)))
            }
            
        elif request.analysis_type == 'extremes':
            # 极值分析
            from scipy.signal import find_peaks
            
            # 寻找峰值和谷值
            peaks, peak_properties = find_peaks(values, height=np.std(values))
            valleys, valley_properties = find_peaks(-values, height=np.std(values))
            
            stats = {
                "peaks": {
                    "times": times[peaks].tolist(),
                    "values": values[peaks].tolist(),
                    "count": len(peaks)
                },
                "valleys": {
                    "times": times[valleys].tolist(),
                    "values": values[valleys].tolist(),
                    "count": len(valleys)
                },
                "peak_to_peak_amplitude": float(np.max(values) - np.min(values)),
                "average_peak_interval": float(np.mean(np.diff(times[peaks]))) if len(peaks) > 1 else 0.0
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported analysis type: {request.analysis_type}")
        
        return JSONResponse({
            "success": True,
            "analysis_type": request.analysis_type,
            "statistics": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to analyze statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_time_series() -> JSONResponse:
    """获取所有时程数据列表"""
    try:
        time_series_dir = Path("static/time_series")
        if not time_series_dir.exists():
            return JSONResponse({"success": True, "time_series": []})
        
        time_series = []
        for json_file in time_series_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                time_series.append({
                    "series_id": data.get("series_id", json_file.stem),
                    "metadata": data.get("metadata", {}),
                    "statistics": data.get("statistics", {}),
                    "created": data.get("created", datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()),
                    "data_url": f"/static/time_series/{json_file.name}"
                })
            except Exception as e:
                logger.warning(f"Failed to read time series file {json_file}: {e}")
                continue
        
        # 按创建时间排序
        time_series.sort(key=lambda x: x["created"], reverse=True)
        
        return JSONResponse({
            "success": True,
            "time_series": time_series
        })
        
    except Exception as e:
        logger.error(f"Failed to list time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{series_id}")
async def delete_time_series(series_id: str) -> JSONResponse:
    """删除时程数据"""
    try:
        time_series_dir = Path("static/time_series")
        data_path = time_series_dir / f"{series_id}.json"
        
        if not data_path.exists():
            raise HTTPException(status_code=404, detail="Time series not found")
        
        data_path.unlink()
        
        return JSONResponse({
            "success": True,
            "message": f"时程数据 {series_id} 已删除"
        })
        
    except Exception as e:
        logger.error(f"Failed to delete time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))