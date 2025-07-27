"""
自适应时间步长控制器
3号计算专家 - 智能时间步长优化系统
基于收敛性能和稳定性自动调节时间步长
"""

import numpy as np
import json
import time
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import math
from collections import deque

class AdaptationStrategy(Enum):
    CONSERVATIVE = "conservative"    # 保守策略，稳定优先
    AGGRESSIVE = "aggressive"       # 激进策略，效率优先
    BALANCED = "balanced"          # 平衡策略
    CUSTOM = "custom"              # 自定义策略

class ConvergenceIndicator(Enum):
    RESIDUAL_BASED = "residual_based"
    ITERATION_BASED = "iteration_based"
    ENERGY_BASED = "energy_based"
    MIXED = "mixed"

@dataclass
class TimeStepStats:
    """时间步统计信息"""
    step_number: int
    time_value: float
    dt: float
    iterations: int
    convergence_rate: float
    residual_norm: float
    solve_time: float
    stability_indicator: float
    adaptation_reason: str = ""

@dataclass
class AdaptationCriteria:
    """自适应准则"""
    min_dt: float = 1e-6
    max_dt: float = 1.0
    target_iterations: int = 8
    max_iterations: int = 50
    convergence_tolerance: float = 1e-6
    stability_factor: float = 0.8
    growth_factor: float = 1.5
    reduction_factor: float = 0.5
    smoothing_window: int = 5

@dataclass
class AdaptiveTimeStepConfiguration:
    """自适应时间步长配置"""
    initial_dt: float
    total_time: float
    adaptation_strategy: AdaptationStrategy
    convergence_indicator: ConvergenceIndicator
    criteria: AdaptationCriteria
    enable_predictor: bool = True
    enable_corrector: bool = True
    safety_checks: bool = True

class AdaptiveTimeStepController:
    """自适应时间步长控制器"""
    
    def __init__(self, config: AdaptiveTimeStepConfiguration):
        self.config = config
        self.current_time = 0.0
        self.current_dt = config.initial_dt
        self.step_number = 0
        
        # 历史数据用于分析趋势
        self.step_history: deque = deque(maxlen=config.criteria.smoothing_window * 2)
        self.dt_history: deque = deque(maxlen=config.criteria.smoothing_window * 2)
        self.convergence_history: deque = deque(maxlen=config.criteria.smoothing_window)
        
        # 预测器-校正器状态
        self.predictor_enabled = config.enable_predictor
        self.corrector_enabled = config.enable_corrector
        
        # 统计数据
        self.total_steps = 0
        self.total_iterations = 0
        self.total_rejected_steps = 0
        self.adaptation_events = 0
        
        print("⏰ 自适应时间步长控制器初始化")
        print(f"📊 初始时间步: {config.initial_dt}")
        print(f"🎯 策略: {config.adaptation_strategy.value}")

    def suggest_next_timestep(self, solver_stats: Dict[str, Any]) -> Tuple[float, str]:
        """建议下一个时间步长"""
        
        # 记录当前步的统计信息
        current_stats = self._create_step_stats(solver_stats)
        self.step_history.append(current_stats)
        self.dt_history.append(self.current_dt)
        
        # 基于策略计算建议的时间步长
        if self.config.adaptation_strategy == AdaptationStrategy.CONSERVATIVE:
            suggested_dt, reason = self._conservative_adaptation(current_stats)
        elif self.config.adaptation_strategy == AdaptationStrategy.AGGRESSIVE:
            suggested_dt, reason = self._aggressive_adaptation(current_stats)
        elif self.config.adaptation_strategy == AdaptationStrategy.BALANCED:
            suggested_dt, reason = self._balanced_adaptation(current_stats)
        else:  # CUSTOM
            suggested_dt, reason = self._custom_adaptation(current_stats)
        
        # 应用安全检查
        if self.config.safety_checks:
            suggested_dt, safety_reason = self._apply_safety_checks(suggested_dt, current_stats)
            if safety_reason:
                reason += f" + {safety_reason}"
        
        # 应用边界限制
        suggested_dt = np.clip(suggested_dt, 
                             self.config.criteria.min_dt, 
                             self.config.criteria.max_dt)
        
        # 记录适应事件
        if abs(suggested_dt - self.current_dt) / self.current_dt > 0.1:
            self.adaptation_events += 1
            print(f"📈 时间步调整: {self.current_dt:.2e} → {suggested_dt:.2e} ({reason})")
        
        return suggested_dt, reason

    def _create_step_stats(self, solver_stats: Dict[str, Any]) -> TimeStepStats:
        """创建步统计信息"""
        return TimeStepStats(
            step_number=self.step_number,
            time_value=self.current_time,
            dt=self.current_dt,
            iterations=solver_stats.get('iterations', 0),
            convergence_rate=solver_stats.get('convergence_rate', 1.0),
            residual_norm=solver_stats.get('residual_norm', 1e-6),
            solve_time=solver_stats.get('solve_time', 0.0),
            stability_indicator=self._calculate_stability_indicator(solver_stats)
        )

    def _calculate_stability_indicator(self, solver_stats: Dict[str, Any]) -> float:
        """计算稳定性指标"""
        # 基于收敛迭代次数和残差计算稳定性
        iterations = solver_stats.get('iterations', 0)
        residual = solver_stats.get('residual_norm', 1e-6)
        max_iterations = self.config.criteria.max_iterations
        
        # 迭代次数稳定性因子 (越少越稳定)
        iteration_factor = 1.0 - (iterations / max_iterations)
        
        # 残差稳定性因子 (越小越稳定)
        residual_factor = max(0.0, 1.0 - math.log10(residual / self.config.criteria.convergence_tolerance))
        
        # 收敛速度稳定性因子
        convergence_rate = solver_stats.get('convergence_rate', 1.0)
        rate_factor = min(1.0, convergence_rate)
        
        # 综合稳定性指标
        stability = (iteration_factor + residual_factor + rate_factor) / 3.0
        return np.clip(stability, 0.0, 1.0)

    def _conservative_adaptation(self, stats: TimeStepStats) -> Tuple[float, str]:
        """保守自适应策略"""
        target_iter = self.config.criteria.target_iterations
        current_iter = stats.iterations
        
        if current_iter > target_iter * 1.5:
            # 收敛太慢，减小时间步
            factor = self.config.criteria.reduction_factor
            new_dt = self.current_dt * factor
            reason = f"收敛慢({current_iter}>{target_iter}),减步长"
        elif current_iter < target_iter * 0.5 and stats.stability_indicator > 0.8:
            # 收敛很快且稳定，谨慎增大时间步
            factor = min(1.2, self.config.criteria.growth_factor)  # 保守增长
            new_dt = self.current_dt * factor
            reason = f"收敛快且稳定,谨慎增步长"
        else:
            # 保持当前时间步
            new_dt = self.current_dt
            reason = "保持当前步长"
        
        return new_dt, reason

    def _aggressive_adaptation(self, stats: TimeStepStats) -> Tuple[float, str]:
        """激进自适应策略"""
        target_iter = self.config.criteria.target_iterations
        current_iter = stats.iterations
        
        if current_iter > target_iter * 1.2:
            # 收敛稍慢就减小时间步
            factor = self.config.criteria.reduction_factor
            new_dt = self.current_dt * factor
            reason = f"快速响应收敛慢,减步长"
        elif current_iter < target_iter * 0.7:
            # 收敛较快就激进增大时间步
            factor = self.config.criteria.growth_factor
            new_dt = self.current_dt * factor
            reason = f"激进增大步长提升效率"
        else:
            new_dt = self.current_dt
            reason = "维持步长"
        
        return new_dt, reason

    def _balanced_adaptation(self, stats: TimeStepStats) -> Tuple[float, str]:
        """平衡自适应策略"""
        target_iter = self.config.criteria.target_iterations
        current_iter = stats.iterations
        stability = stats.stability_indicator
        
        # 计算理想时间步长倍数
        if current_iter > 0:
            ideal_factor = target_iter / current_iter
        else:
            ideal_factor = 1.0
        
        # 根据稳定性调整
        stability_weight = 0.5 + 0.5 * stability  # 0.5 到 1.0
        
        if current_iter > target_iter * 1.3:
            # 收敛太慢
            factor = self.config.criteria.reduction_factor * stability_weight
            new_dt = self.current_dt * factor
            reason = f"平衡策略:收敛慢,稳定性{stability:.2f}"
        elif current_iter < target_iter * 0.6 and stability > 0.7:
            # 收敛快且相对稳定
            factor = min(ideal_factor, self.config.criteria.growth_factor) * stability_weight
            new_dt = self.current_dt * factor
            reason = f"平衡策略:收敛快,增步长"
        else:
            # 微调
            factor = (ideal_factor - 1.0) * 0.5 + 1.0  # 缓慢调整
            new_dt = self.current_dt * factor
            reason = f"平衡策略:微调"
        
        return new_dt, reason

    def _custom_adaptation(self, stats: TimeStepStats) -> Tuple[float, str]:
        """自定义自适应策略"""
        # 基于多因素的复杂策略
        
        # 1. 收敛性因子
        convergence_factor = self._calculate_convergence_factor(stats)
        
        # 2. 稳定性因子  
        stability_factor = stats.stability_indicator
        
        # 3. 历史趋势因子
        trend_factor = self._calculate_trend_factor()
        
        # 4. 效率因子
        efficiency_factor = self._calculate_efficiency_factor(stats)
        
        # 综合权重计算
        weights = [0.4, 0.3, 0.2, 0.1]  # 收敛性, 稳定性, 趋势, 效率
        factors = [convergence_factor, stability_factor, trend_factor, efficiency_factor]
        
        combined_factor = sum(w * f for w, f in zip(weights, factors))
        
        # 计算新的时间步长
        adjustment = (combined_factor - 0.5) * 2.0  # 映射到 -1 到 1
        
        if adjustment > 0.2:
            new_dt = self.current_dt * self.config.criteria.growth_factor
            reason = "综合评估:增大步长"
        elif adjustment < -0.2:
            new_dt = self.current_dt * self.config.criteria.reduction_factor
            reason = "综合评估:减小步长"
        else:
            new_dt = self.current_dt * (1.0 + adjustment * 0.1)
            reason = "综合评估:微调"
        
        return new_dt, reason

    def _calculate_convergence_factor(self, stats: TimeStepStats) -> float:
        """计算收敛性因子"""
        target = self.config.criteria.target_iterations
        actual = stats.iterations
        
        if actual == 0:
            return 1.0
        
        # 理想比例
        ratio = target / actual
        
        # 映射到 0-1 范围
        if ratio > 2.0:  # 收敛太快
            return 0.8  # 可以增大步长
        elif ratio < 0.5:  # 收敛太慢
            return 0.2  # 需要减小步长
        else:
            return 0.5 + (ratio - 1.0) * 0.3  # 在0.5附近

    def _calculate_trend_factor(self) -> float:
        """计算历史趋势因子"""
        if len(self.convergence_history) < 3:
            return 0.5  # 中性
        
        recent_iterations = list(self.convergence_history)[-3:]
        
        # 计算趋势
        if len(recent_iterations) >= 2:
            trend = (recent_iterations[-1] - recent_iterations[0]) / len(recent_iterations)
            
            if trend > 2:  # 收敛性在恶化
                return 0.3
            elif trend < -2:  # 收敛性在改善
                return 0.7
            else:
                return 0.5
        
        return 0.5

    def _calculate_efficiency_factor(self, stats: TimeStepStats) -> float:
        """计算效率因子"""
        # 基于求解时间和收敛效果
        if stats.solve_time <= 0:
            return 0.5
        
        # 每次迭代的平均时间
        time_per_iteration = stats.solve_time / max(stats.iterations, 1)
        
        # 如果求解很快，可以尝试更大的步长
        if time_per_iteration < 0.1:
            return 0.7
        elif time_per_iteration > 1.0:
            return 0.3
        else:
            return 0.5

    def _apply_safety_checks(self, suggested_dt: float, stats: TimeStepStats) -> Tuple[float, str]:
        """应用安全检查"""
        safety_reason = ""
        
        # 1. 最大变化率限制
        max_change_ratio = 2.0
        change_ratio = suggested_dt / self.current_dt
        
        if change_ratio > max_change_ratio:
            suggested_dt = self.current_dt * max_change_ratio
            safety_reason = f"限制增长率<{max_change_ratio}"
        elif change_ratio < 1.0 / max_change_ratio:
            suggested_dt = self.current_dt / max_change_ratio
            safety_reason = f"限制减小率<{max_change_ratio}"
        
        # 2. 连续减小保护
        if len(self.dt_history) >= 2:
            last_two_changes = [
                self.dt_history[-1] / self.dt_history[-2] if len(self.dt_history) >= 2 else 1.0,
                suggested_dt / self.current_dt
            ]
            
            if all(change < 0.8 for change in last_two_changes):
                suggested_dt = max(suggested_dt, self.current_dt * 0.9)
                safety_reason += " 连续减小保护"
        
        # 3. 稳定性检查
        if stats.stability_indicator < 0.3 and suggested_dt > self.current_dt:
            suggested_dt = self.current_dt * 0.9
            safety_reason += " 稳定性保护"
        
        return suggested_dt, safety_reason

    def accept_timestep(self, dt: float, solver_stats: Dict[str, Any]) -> bool:
        """接受时间步长"""
        self.current_dt = dt
        self.current_time += dt
        self.step_number += 1
        self.total_steps += 1
        self.total_iterations += solver_stats.get('iterations', 0)
        
        # 更新历史记录
        if 'iterations' in solver_stats:
            self.convergence_history.append(solver_stats['iterations'])
        
        return True

    def reject_timestep(self, reason: str = "求解失败") -> float:
        """拒绝时间步长，返回新的更小步长"""
        self.total_rejected_steps += 1
        
        # 大幅减小时间步长
        new_dt = self.current_dt * 0.25
        new_dt = max(new_dt, self.config.criteria.min_dt)
        
        print(f"❌ 拒绝时间步: {self.current_dt:.2e} → {new_dt:.2e} ({reason})")
        
        self.current_dt = new_dt
        return new_dt

    def predict_completion_time(self) -> Tuple[float, int]:
        """预测完成时间"""
        remaining_time = self.config.total_time - self.current_time
        
        if remaining_time <= 0:
            return 0.0, 0
        
        # 基于当前步长估算
        estimated_steps = int(np.ceil(remaining_time / self.current_dt))
        
        # 基于历史平均步长估算
        if len(self.dt_history) > 0:
            avg_dt = np.mean(list(self.dt_history))
            estimated_steps_avg = int(np.ceil(remaining_time / avg_dt))
            estimated_steps = (estimated_steps + estimated_steps_avg) // 2
        
        return remaining_time, estimated_steps

    def get_adaptation_statistics(self) -> Dict[str, Any]:
        """获取自适应统计信息"""
        avg_dt = np.mean(list(self.dt_history)) if self.dt_history else self.config.initial_dt
        
        return {
            "total_steps": self.total_steps,
            "total_iterations": self.total_iterations,
            "total_rejected_steps": self.total_rejected_steps,
            "adaptation_events": self.adaptation_events,
            "current_time": self.current_time,
            "current_dt": self.current_dt,
            "average_dt": avg_dt,
            "min_dt_used": min(self.dt_history) if self.dt_history else self.current_dt,
            "max_dt_used": max(self.dt_history) if self.dt_history else self.current_dt,
            "avg_iterations_per_step": self.total_iterations / max(self.total_steps, 1),
            "rejection_rate": self.total_rejected_steps / max(self.total_steps, 1),
            "adaptation_rate": self.adaptation_events / max(self.total_steps, 1)
        }

    def export_history(self, filename: str):
        """导出历史数据"""
        history_data = {
            "configuration": {
                "initial_dt": self.config.initial_dt,
                "total_time": self.config.total_time,
                "strategy": self.config.adaptation_strategy.value,
                "criteria": self.config.criteria.__dict__
            },
            "step_history": [stats.__dict__ for stats in self.step_history],
            "dt_history": list(self.dt_history),
            "statistics": self.get_adaptation_statistics()
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(history_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 历史数据已导出: {filename}")


def create_excavation_timestep_controller(strategy: str = "balanced") -> AdaptiveTimeStepController:
    """创建深基坑工程自适应时间步长控制器"""
    
    criteria = AdaptationCriteria(
        min_dt=1e-6,
        max_dt=0.1,  # 基坑工程通常需要较小的时间步
        target_iterations=10,
        max_iterations=50,
        convergence_tolerance=1e-6,
        stability_factor=0.8,
        growth_factor=1.3,  # 保守的增长因子
        reduction_factor=0.6,
        smoothing_window=5
    )
    
    config = AdaptiveTimeStepConfiguration(
        initial_dt=0.01,
        total_time=1.0,
        adaptation_strategy=AdaptationStrategy(strategy),
        convergence_indicator=ConvergenceIndicator.MIXED,
        criteria=criteria,
        enable_predictor=True,
        enable_corrector=True,
        safety_checks=True
    )
    
    return AdaptiveTimeStepController(config)


if __name__ == "__main__":
    # 测试自适应时间步长控制器
    print("🧪 测试自适应时间步长控制器...")
    
    controller = create_excavation_timestep_controller("balanced")
    
    # 模拟求解过程
    time_step = 0
    while controller.current_time < controller.config.total_time and time_step < 100:
        time_step += 1
        
        # 模拟求解器统计数据
        # 随机生成一些有趋势的数据来测试自适应
        base_iterations = 8 + np.sin(time_step * 0.1) * 3 + np.random.normal(0, 2)
        solver_stats = {
            "iterations": max(1, int(base_iterations)),
            "convergence_rate": 0.8 + np.random.normal(0, 0.1),
            "residual_norm": 1e-6 * (1 + np.random.normal(0, 0.5)),
            "solve_time": 0.1 + np.random.normal(0, 0.02)
        }
        
        # 获取建议的时间步长
        suggested_dt, reason = controller.suggest_next_timestep(solver_stats)
        
        # 模拟偶尔的求解失败
        if np.random.random() < 0.05:  # 5%失败率
            controller.reject_timestep("求解不收敛")
            continue
        
        # 接受时间步长
        controller.accept_timestep(suggested_dt, solver_stats)
        
        if time_step % 10 == 0:
            remaining_time, estimated_steps = controller.predict_completion_time()
            print(f"Step {time_step}: t={controller.current_time:.3f}, dt={controller.current_dt:.2e}, "
                  f"预计剩余{estimated_steps}步")
    
    # 显示统计结果
    stats = controller.get_adaptation_statistics()
    print("\n📊 自适应统计结果:")
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.3e}")
        else:
            print(f"  {key}: {value}")
    
    # 导出历史数据
    controller.export_history("adaptive_timestep_history.json")
    print("🎉 自适应时间步长控制器测试完成!")