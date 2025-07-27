"""
多阶段施工模拟系统
专门用于基坑开挖的分阶段施工过程模拟
"""

import os
import sys
import json
import numpy as np
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta

# 设置Kratos路径
kratos_path = Path(__file__).parent / "kratos_source" / "kratos" / "bin" / "Release"
if str(kratos_path) not in sys.path:
    sys.path.insert(0, str(kratos_path))
os.environ['PATH'] = str(kratos_path / "libs") + os.pathsep + os.environ.get('PATH', '')

logger = logging.getLogger(__name__)

class ConstructionStage:
    """施工阶段定义"""
    
    def __init__(self, stage_id: str, stage_name: str, duration_days: int):
        self.stage_id = stage_id
        self.stage_name = stage_name
        self.duration_days = duration_days
        self.start_date = None
        self.end_date = None
        
        # 施工活动
        self.excavation_activities = []
        self.support_activities = []
        self.monitoring_activities = []
        
        # 施工参数
        self.excavation_depth = 0.0
        self.excavation_rate = 0.0  # m/day
        self.support_installation_time = 0
        
        # 质量控制
        self.quality_requirements = {}
        self.safety_factors = {}
        
    def add_excavation_activity(self, depth: float, excavation_rate: float, method: str = "mechanical"):
        """添加开挖活动"""
        activity = {
            "type": "excavation",
            "depth": depth,
            "excavation_rate": excavation_rate,
            "method": method,
            "duration": depth / excavation_rate if excavation_rate > 0 else 1
        }
        self.excavation_activities.append(activity)
        self.excavation_depth = max(self.excavation_depth, depth)
        
    def add_support_activity(self, support_type: str, installation_time: int, properties: Dict[str, Any]):
        """添加支护活动"""
        activity = {
            "type": "support",
            "support_type": support_type,  # retaining_wall, strut, anchor
            "installation_time": installation_time,
            "properties": properties
        }
        self.support_activities.append(activity)
        self.support_installation_time += installation_time
        
    def add_monitoring_activity(self, monitoring_type: str, frequency: int, parameters: List[str]):
        """添加监测活动"""
        activity = {
            "type": "monitoring",
            "monitoring_type": monitoring_type,  # displacement, stress, water_pressure
            "frequency": frequency,  # times per day
            "parameters": parameters
        }
        self.monitoring_activities.append(activity)
        
    def set_quality_requirements(self, displacement_limit: float, stress_limit: float, safety_factor: float):
        """设置质量要求"""
        self.quality_requirements = {
            "max_displacement": displacement_limit,
            "max_stress": stress_limit,
            "min_safety_factor": safety_factor
        }

class ConstructionSimulator:
    """施工模拟器"""
    
    def __init__(self, project_name: str):
        self.project_name = project_name
        self.work_dir = Path(f"./construction_projects/{project_name}")
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        # 施工计划
        self.construction_stages = []
        self.project_start_date = datetime.now()
        self.total_duration = 0
        
        # 模拟参数
        self.simulation_settings = {
            "time_step_days": 1,
            "monitoring_interval": 1,
            "weather_effects": True,
            "equipment_efficiency": 0.8,
            "quality_control_level": "strict"
        }
        
        # 结果数据
        self.simulation_results = {}
        self.daily_progress = []
        self.quality_reports = []
        
    def add_construction_stage(self, stage: ConstructionStage):
        """添加施工阶段"""
        # 设置时间
        if self.construction_stages:
            stage.start_date = self.construction_stages[-1].end_date + timedelta(days=1)
        else:
            stage.start_date = self.project_start_date
            
        stage.end_date = stage.start_date + timedelta(days=stage.duration_days)
        
        self.construction_stages.append(stage)
        self.total_duration += stage.duration_days
        logger.info(f"Added construction stage: {stage.stage_name} ({stage.duration_days} days)")
        
    def set_simulation_parameters(self, params: Dict[str, Any]):
        """设置模拟参数"""
        self.simulation_settings.update(params)
        logger.info("Simulation parameters updated")
        
    def run_construction_simulation(self) -> Dict[str, Any]:
        """运行施工模拟"""
        logger.info("Starting construction simulation...")
        
        try:
            # 1. 初始化模拟
            self._initialize_simulation()
            
            # 2. 逐日模拟
            current_date = self.project_start_date
            total_days = self.total_duration
            
            for day in range(total_days):
                daily_result = self._simulate_daily_construction(current_date, day)
                self.daily_progress.append(daily_result)
                current_date += timedelta(days=1)
                
            # 3. 生成质量报告
            self._generate_quality_reports()
            
            # 4. 分析结果
            analysis_results = self._analyze_simulation_results()
            
            # 5. 保存结果
            self._save_simulation_results(analysis_results)
            
            logger.info("Construction simulation completed successfully")
            return {
                "success": True,
                "results": analysis_results,
                "output_directory": str(self.work_dir)
            }
            
        except Exception as e:
            logger.error(f"Construction simulation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "output_directory": str(self.work_dir)
            }
            
    def _initialize_simulation(self):
        """初始化模拟"""
        # 验证施工计划
        if not self.construction_stages:
            raise ValueError("No construction stages defined")
            
        # 初始化结果数据结构
        self.simulation_results = {
            "project_summary": {
                "total_stages": len(self.construction_stages),
                "total_duration": self.total_duration,
                "start_date": self.project_start_date.strftime("%Y-%m-%d"),
                "estimated_completion": (self.project_start_date + timedelta(days=self.total_duration)).strftime("%Y-%m-%d")
            },
            "daily_progress": [],
            "stage_summaries": [],
            "quality_metrics": {
                "displacement_records": [],
                "stress_records": [],
                "safety_factor_records": []
            }
        }
        
        logger.info("Simulation initialized")
        
    def _simulate_daily_construction(self, date: datetime, day_index: int) -> Dict[str, Any]:
        """模拟单日施工"""
        # 确定当前施工阶段
        current_stage = self._get_current_stage(date)
        if not current_stage:
            return {"date": date.strftime("%Y-%m-%d"), "status": "idle", "activities": []}
            
        # 模拟天气影响
        weather_factor = self._simulate_weather_effects(date)
        
        # 模拟施工活动
        activities_performed = []
        total_excavation = 0.0
        supports_installed = 0
        
        # 开挖活动
        for activity in current_stage.excavation_activities:
            if activity["type"] == "excavation":
                daily_excavation = activity["excavation_rate"] * weather_factor * self.simulation_settings["equipment_efficiency"]
                total_excavation += daily_excavation
                activities_performed.append({
                    "type": "excavation",
                    "amount": daily_excavation,
                    "method": activity["method"],
                    "efficiency": weather_factor
                })
                
        # 支护活动
        for activity in current_stage.support_activities:
            if activity["type"] == "support":
                supports_installed += 1
                activities_performed.append({
                    "type": "support",
                    "support_type": activity["support_type"],
                    "installation_time": activity["installation_time"],
                    "properties": activity["properties"]
                })
                
        # 监测活动
        monitoring_data = self._simulate_monitoring(current_stage, day_index)
        activities_performed.extend(monitoring_data["activities"])
        
        # 质量检查
        quality_check = self._perform_quality_check(current_stage, monitoring_data)
        
        daily_result = {
            "date": date.strftime("%Y-%m-%d"),
            "day_index": day_index,
            "stage_id": current_stage.stage_id,
            "stage_name": current_stage.stage_name,
            "weather_factor": float(weather_factor),
            "activities_performed": activities_performed,
            "total_excavation": float(total_excavation),
            "supports_installed": supports_installed,
            "monitoring_data": monitoring_data,
            "quality_check": quality_check,
            "cumulative_progress": {
                "total_excavated": float(sum([day.get("total_excavation", 0) for day in self.daily_progress]) + total_excavation),
                "total_supports": sum([day.get("supports_installed", 0) for day in self.daily_progress]) + supports_installed
            }
        }
        
        return daily_result
        
    def _get_current_stage(self, date: datetime) -> Optional[ConstructionStage]:
        """获取当前施工阶段"""
        for stage in self.construction_stages:
            if stage.start_date <= date <= stage.end_date:
                return stage
        return None
        
    def _simulate_weather_effects(self, date: datetime) -> float:
        """模拟天气影响"""
        if not self.simulation_settings["weather_effects"]:
            return 1.0
            
        # 简化的天气模型
        day_of_year = date.timetuple().tm_yday
        base_factor = 0.8 + 0.2 * np.sin(2 * np.pi * day_of_year / 365)  # 季节变化
        random_factor = 0.9 + 0.2 * np.random.random()  # 随机天气
        
        return float(base_factor * random_factor)
        
    def _simulate_monitoring(self, stage: ConstructionStage, day_index: int) -> Dict[str, Any]:
        """模拟监测数据"""
        monitoring_data = {
            "activities": [],
            "measurements": {}
        }
        
        for activity in stage.monitoring_activities:
            if activity["type"] == "monitoring":
                # 生成模拟监测数据
                measurements = {}
                
                for param in activity["parameters"]:
                    if param == "displacement":
                        # 位移随时间增长，有随机波动
                        base_displacement = 0.1 * day_index / 30  # 每30天增长0.1mm
                        measurements[param] = float(base_displacement + np.random.normal(0, 0.02))
                    elif param == "stress":
                        # 应力变化
                        base_stress = 50000 + 1000 * day_index  # Pa
                        measurements[param] = float(base_stress + np.random.normal(0, 5000))
                    elif param == "water_pressure":
                        # 水压变化
                        base_pressure = 10000 + 500 * np.sin(day_index / 10)  # Pa
                        measurements[param] = float(base_pressure + np.random.normal(0, 1000))
                        
                monitoring_data["activities"].append({
                    "type": "monitoring",
                    "monitoring_type": activity["monitoring_type"],
                    "measurements": measurements
                })
                
                monitoring_data["measurements"].update(measurements)
                
        return monitoring_data
        
    def _perform_quality_check(self, stage: ConstructionStage, monitoring_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行质量检查"""
        quality_check = {
            "passed": True,
            "issues": [],
            "recommendations": []
        }
        
        measurements = monitoring_data.get("measurements", {})
        requirements = stage.quality_requirements
        
        # 检查位移限制
        if "displacement" in measurements and "max_displacement" in requirements:
            if abs(measurements["displacement"]) > requirements["max_displacement"]:
                quality_check["passed"] = False
                quality_check["issues"].append(f"位移超限: {measurements['displacement']:.3f}mm > {requirements['max_displacement']}mm")
                quality_check["recommendations"].append("加强支护措施或调整开挖速度")
                
        # 检查应力限制
        if "stress" in measurements and "max_stress" in requirements:
            if measurements["stress"] > requirements["max_stress"]:
                quality_check["passed"] = False
                quality_check["issues"].append(f"应力超限: {measurements['stress']:.0f}Pa > {requirements['max_stress']:.0f}Pa")
                quality_check["recommendations"].append("检查支护结构完整性")
                
        # 计算安全系数
        if measurements:
            safety_factor = self._calculate_safety_factor(measurements)
            if "min_safety_factor" in requirements and safety_factor < requirements["min_safety_factor"]:
                quality_check["passed"] = False
                quality_check["issues"].append(f"安全系数不足: {safety_factor:.2f} < {requirements['min_safety_factor']:.2f}")
                quality_check["recommendations"].append("暂停施工，加强支护措施")
                
        return quality_check
        
    def _calculate_safety_factor(self, measurements: Dict[str, Any]) -> float:
        """计算安全系数"""
        # 简化的安全系数计算
        base_safety = 2.5
        
        if "displacement" in measurements:
            disp_factor = max(0.5, 1.0 - abs(measurements["displacement"]) / 50.0)
            base_safety *= disp_factor
            
        if "stress" in measurements:
            stress_factor = max(0.5, 1.0 - measurements["stress"] / 200000.0)
            base_safety *= stress_factor
            
        return float(max(0.5, base_safety))
        
    def _generate_quality_reports(self):
        """生成质量报告"""
        stage_reports = {}
        
        for stage in self.construction_stages:
            stage_data = [day for day in self.daily_progress if day.get("stage_id") == stage.stage_id]
            
            if stage_data:
                # 统计质量指标
                passed_days = sum([1 for day in stage_data if day.get("quality_check", {}).get("passed", True)])
                total_days = len(stage_data)
                
                all_issues = []
                all_recommendations = []
                for day in stage_data:
                    quality_check = day.get("quality_check", {})
                    all_issues.extend(quality_check.get("issues", []))
                    all_recommendations.extend(quality_check.get("recommendations", []))
                
                stage_reports[stage.stage_id] = {
                    "stage_name": stage.stage_name,
                    "total_days": total_days,
                    "quality_pass_rate": float(passed_days / total_days) if total_days > 0 else 0.0,
                    "total_issues": len(all_issues),
                    "unique_issues": list(set(all_issues)),
                    "recommendations": list(set(all_recommendations))
                }
                
        self.quality_reports = stage_reports
        logger.info("Quality reports generated")
        
    def _analyze_simulation_results(self) -> Dict[str, Any]:
        """分析模拟结果"""
        if not self.daily_progress:
            return {}
            
        # 总体统计
        total_excavated = sum([day.get("total_excavation", 0) for day in self.daily_progress])
        total_supports = sum([day.get("supports_installed", 0) for day in self.daily_progress])
        average_weather_factor = np.mean([day.get("weather_factor", 1.0) for day in self.daily_progress])
        
        # 质量统计
        total_quality_issues = sum([len(day.get("quality_check", {}).get("issues", [])) for day in self.daily_progress])
        quality_pass_days = sum([1 for day in self.daily_progress if day.get("quality_check", {}).get("passed", True)])
        overall_quality_rate = float(quality_pass_days / len(self.daily_progress)) if self.daily_progress else 0.0
        
        # 进度分析
        planned_duration = self.total_duration
        actual_duration = len(self.daily_progress)
        schedule_performance = float(planned_duration / actual_duration) if actual_duration > 0 else 1.0
        
        # 风险评估
        risk_level = self._assess_project_risks()
        
        analysis_results = {
            "project_summary": self.simulation_results["project_summary"],
            "performance_metrics": {
                "total_excavated_m3": float(total_excavated * 100),  # 假设每m深度对应100m3
                "total_supports_installed": int(total_supports),
                "average_weather_impact": float(average_weather_factor),
                "schedule_performance_index": float(schedule_performance),
                "quality_pass_rate": float(overall_quality_rate * 100),
                "total_quality_issues": int(total_quality_issues)
            },
            "stage_analysis": self._analyze_stage_performance(),
            "quality_reports": self.quality_reports,
            "risk_assessment": risk_level,
            "recommendations": self._generate_project_recommendations(),
            "daily_progress_data": self.daily_progress[:30]  # 限制数据量
        }
        
        return analysis_results
        
    def _analyze_stage_performance(self) -> Dict[str, Any]:
        """分析各阶段性能"""
        stage_analysis = {}
        
        for stage in self.construction_stages:
            stage_data = [day for day in self.daily_progress if day.get("stage_id") == stage.stage_id]
            
            if stage_data:
                avg_excavation = np.mean([day.get("total_excavation", 0) for day in stage_data])
                avg_weather = np.mean([day.get("weather_factor", 1.0) for day in stage_data])
                quality_rate = np.mean([1 if day.get("quality_check", {}).get("passed", True) else 0 for day in stage_data])
                
                stage_analysis[stage.stage_id] = {
                    "stage_name": stage.stage_name,
                    "planned_duration": stage.duration_days,
                    "actual_duration": len(stage_data),
                    "average_daily_excavation": float(avg_excavation),
                    "average_weather_factor": float(avg_weather),
                    "quality_pass_rate": float(quality_rate * 100),
                    "performance_rating": self._rate_stage_performance(avg_excavation, quality_rate, avg_weather)
                }
                
        return stage_analysis
        
    def _rate_stage_performance(self, excavation_rate: float, quality_rate: float, weather_factor: float) -> str:
        """评估阶段性能"""
        score = 0
        
        if excavation_rate > 0.5:  # 好的开挖效率
            score += 2
        elif excavation_rate > 0.2:
            score += 1
            
        if quality_rate > 0.9:  # 高质量率
            score += 2
        elif quality_rate > 0.7:
            score += 1
            
        if weather_factor > 0.8:  # 好天气条件
            score += 1
            
        if score >= 4:
            return "优秀"
        elif score >= 2:
            return "良好"
        else:
            return "需要改进"
            
    def _assess_project_risks(self) -> Dict[str, Any]:
        """评估项目风险"""
        risks = {
            "overall_risk_level": "低",
            "identified_risks": [],
            "mitigation_measures": []
        }
        
        # 质量风险
        if self.quality_reports:
            avg_quality_rate = np.mean([report["quality_pass_rate"] for report in self.quality_reports.values()])
            if avg_quality_rate < 0.7:
                risks["identified_risks"].append("质量控制风险")
                risks["mitigation_measures"].append("加强质量检查频率和标准")
                risks["overall_risk_level"] = "高"
            elif avg_quality_rate < 0.9:
                risks["overall_risk_level"] = "中"
                
        # 进度风险
        if len(self.daily_progress) > self.total_duration * 1.1:
            risks["identified_risks"].append("进度延期风险")
            risks["mitigation_measures"].append("优化施工工序和资源配置")
            
        # 天气风险
        weather_factors = [day.get("weather_factor", 1.0) for day in self.daily_progress]
        if weather_factors and np.mean(weather_factors) < 0.7:
            risks["identified_risks"].append("天气影响风险")
            risks["mitigation_measures"].append("制定恶劣天气应对预案")
            
        return risks
        
    def _generate_project_recommendations(self) -> List[str]:
        """生成项目建议"""
        recommendations = []
        
        # 基于分析结果生成建议
        if self.quality_reports:
            avg_quality_rate = np.mean([report["quality_pass_rate"] for report in self.quality_reports.values()])
            if avg_quality_rate < 0.8:
                recommendations.append("建议加强施工质量控制和监测频率")
                
        # 进度建议
        if len(self.daily_progress) > self.total_duration:
            recommendations.append("当前进度落后，建议优化资源配置和施工方案")
            
        # 通用建议
        recommendations.extend([
            "建立完善的监测预警系统",
            "定期评估施工风险和质量状况", 
            "加强与设计单位的沟通协调",
            "制定详细的应急处置预案"
        ])
        
        return recommendations
        
    def _save_simulation_results(self, results: Dict[str, Any]):
        """保存模拟结果"""
        results_file = self.work_dir / f"{self.project_name}_construction_simulation.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Simulation results saved to: {results_file}")

# 便捷函数
def create_typical_construction_plan() -> List[ConstructionStage]:
    """创建典型的施工计划"""
    stages = []
    
    # 阶段1: 准备工作
    stage1 = ConstructionStage("stage1", "施工准备", 7)
    stage1.add_excavation_activity(0.5, 0.2, "manual")
    stage1.add_support_activity("site_preparation", 2, {"type": "temporary_fence"})
    stage1.add_monitoring_activity("baseline", 1, ["displacement", "stress"])
    stage1.set_quality_requirements(5.0, 100000, 2.0)
    stages.append(stage1)
    
    # 阶段2: 第一层开挖
    stage2 = ConstructionStage("stage2", "第一层开挖", 10)
    stage2.add_excavation_activity(2.0, 0.3, "mechanical")
    stage2.add_support_activity("retaining_wall", 3, {"thickness": 0.8, "depth": 15.0})
    stage2.add_monitoring_activity("continuous", 2, ["displacement", "stress", "water_pressure"])
    stage2.set_quality_requirements(10.0, 150000, 1.8)
    stages.append(stage2)
    
    # 阶段3: 支撑安装
    stage3 = ConstructionStage("stage3", "支撑系统安装", 5)
    stage3.add_support_activity("strut_system", 4, {"beam_size": "600x800", "spacing": 3.0})
    stage3.add_monitoring_activity("installation", 3, ["displacement", "stress"])
    stage3.set_quality_requirements(15.0, 180000, 1.5)
    stages.append(stage3)
    
    # 阶段4: 第二层开挖
    stage4 = ConstructionStage("stage4", "第二层开挖", 12)
    stage4.add_excavation_activity(4.0, 0.25, "mechanical")
    stage4.add_monitoring_activity("intensive", 4, ["displacement", "stress", "water_pressure"])
    stage4.set_quality_requirements(20.0, 200000, 1.5)
    stages.append(stage4)
    
    # 阶段5: 最终开挖
    stage5 = ConstructionStage("stage5", "最终开挖", 8)
    stage5.add_excavation_activity(6.0, 0.2, "careful_mechanical")
    stage5.add_support_activity("anchor_system", 2, {"capacity": 400000, "angle": 20})
    stage5.add_monitoring_activity("final", 5, ["displacement", "stress", "water_pressure"])
    stage5.set_quality_requirements(25.0, 250000, 1.3)
    stages.append(stage5)
    
    return stages

if __name__ == "__main__":
    # 测试多阶段施工模拟
    print("Testing Construction Simulation System...")
    
    simulator = ConstructionSimulator("test_excavation_project")
    
    # 添加施工阶段
    stages = create_typical_construction_plan()
    for stage in stages:
        simulator.add_construction_stage(stage)
        
    # 设置模拟参数
    simulator.set_simulation_parameters({
        "time_step_days": 1,
        "weather_effects": True,
        "equipment_efficiency": 0.85,
        "quality_control_level": "strict"
    })
    
    # 运行模拟
    result = simulator.run_construction_simulation()
    
    print("Construction Simulation Result:")
    print(json.dumps(result, indent=2, ensure_ascii=False))