"""
SimPEG 反演引擎
支持多种反演策略和正则化方法的反演计算
"""

import numpy as np
from typing import Dict, List, Optional, Union, Tuple, Callable
from SimPEG import (
    maps, utils, data_misfit, regularization, optimization, 
    inverse_problem, inversion, directives
)
import matplotlib.pyplot as plt
import time
from scipy.optimize import minimize


class InversionEngine:
    """SimPEG 反演计算引擎"""
    
    def __init__(self):
        self.inversions = {}
        self.current_inversion = None
        self.optimization_history = []
        
    def setup_least_squares_inversion(self,
                                    simulation,
                                    observed_data: np.ndarray,
                                    uncertainties: np.ndarray,
                                    starting_model: np.ndarray,
                                    regularization_config: Dict = None) -> object:
        """
        设置最小二乘反演
        
        Parameters:
        -----------
        simulation : SimPEG simulation
            正演仿真对象
        observed_data : array
            观测数据
        uncertainties : array
            数据不确定性
        starting_model : array
            初始模型
        regularization_config : dict, optional
            正则化配置
            
        Returns:
        --------
        inv : SimPEG inversion
            反演对象
        """
        # 设置数据拟合
        dmis = data_misfit.L2DataMisfit(
            simulation=simulation, 
            data=observed_data,
            noise_floor=uncertainties
        )
        
        # 设置正则化
        if regularization_config is None:
            regularization_config = {
                'alpha_s': 1e-4,  # 平滑约束权重
                'alpha_x': 1.0,   # X方向权重
                'alpha_y': 1.0,   # Y方向权重  
                'alpha_z': 1.0,   # Z方向权重
                'reference_model': None
            }
            
        reg = regularization.Sparse(
            simulation.mesh,
            alpha_s=regularization_config['alpha_s'],
            alpha_x=regularization_config['alpha_x'],
            alpha_y=regularization_config['alpha_y'],
            alpha_z=regularization_config['alpha_z']
        )
        
        # 设置参考模型
        if regularization_config['reference_model'] is not None:
            reg.reference_model = regularization_config['reference_model']
        else:
            reg.reference_model = starting_model
            
        # 设置优化算法
        opt = optimization.InexactGaussNewton(
            maxIter=20,
            maxIterLS=20,
            maxIterCG=10,
            tolCG=1e-3
        )
        
        # 创建反演问题
        inv_prob = inverse_problem.BaseInvProblem(dmis, reg, opt)
        
        # 设置指令
        target_misfit = directives.TargetMisfit(chifact=1.0)
        beta_schedule = directives.BetaSchedule(coolingFactor=2, coolingRate=1)
        beta_estimate = directives.BetaEstimate_ByEig(beta0_ratio=1e-1)
        
        # 创建反演对象
        inv = inversion.BaseInversion(
            inv_prob, 
            directiveList=[target_misfit, beta_schedule, beta_estimate]
        )
        
        self.inversions['least_squares'] = {
            'inversion': inv,
            'simulation': simulation,
            'data_misfit': dmis,
            'regularization': reg,
            'optimization': opt,
            'starting_model': starting_model,
            'observed_data': observed_data,
            'uncertainties': uncertainties
        }
        
        self.current_inversion = self.inversions['least_squares']
        
        print(f"最小二乘反演设置完成:")
        print(f"  数据点数: {len(observed_data)}")
        print(f"  模型参数数: {len(starting_model)}")
        print(f"  正则化权重: α_s={regularization_config['alpha_s']:.1e}")
        print(f"  最大迭代数: {opt.maxIter}")
        
        return inv
        
    def setup_robust_inversion(self,
                             simulation,
                             observed_data: np.ndarray,
                             uncertainties: np.ndarray,
                             starting_model: np.ndarray,
                             robust_norm: str = 'huber',
                             regularization_config: Dict = None) -> object:
        """
        设置稳健反演
        
        Parameters:
        -----------
        simulation : SimPEG simulation
            正演仿真对象
        observed_data : array
            观测数据
        uncertainties : array
            数据不确定性
        starting_model : array
            初始模型
        robust_norm : str
            稳健范数类型 'huber', 'l1', 'l2'
        regularization_config : dict, optional
            正则化配置
            
        Returns:
        --------
        inv : SimPEG inversion
            稳健反演对象
        """
        # 设置稳健数据拟合
        if robust_norm == 'huber':
            dmis = data_misfit.L2DataMisfit(
                simulation=simulation,
                data=observed_data,
                noise_floor=uncertainties
            )
            # 添加 Huber 范数的实现需要自定义
        elif robust_norm == 'l1':
            dmis = data_misfit.L1DataMisfit(
                simulation=simulation,
                data=observed_data,
                noise_floor=uncertainties
            )
        else:  # l2
            dmis = data_misfit.L2DataMisfit(
                simulation=simulation,
                data=observed_data,
                noise_floor=uncertainties
            )
            
        # 设置稳健正则化
        if regularization_config is None:
            regularization_config = {
                'alpha_s': 1e-3,
                'alpha_x': 1.0,
                'alpha_y': 1.0,
                'alpha_z': 1.0,
                'norm': 'l1'  # 稳健正则化使用L1范数
            }
            
        if regularization_config.get('norm') == 'l1':
            reg = regularization.Sparse(
                simulation.mesh,
                alpha_s=regularization_config['alpha_s'],
                alpha_x=regularization_config['alpha_x'],
                alpha_y=regularization_config['alpha_y'],
                alpha_z=regularization_config['alpha_z']
            )
        else:
            reg = regularization.Tikhonov(
                simulation.mesh,
                alpha_s=regularization_config['alpha_s'],
                alpha_x=regularization_config['alpha_x'],
                alpha_y=regularization_config['alpha_y'],
                alpha_z=regularization_config['alpha_z']
            )
            
        reg.reference_model = starting_model
        
        # 设置优化算法（稳健反演通常需要更多迭代）
        opt = optimization.ProjectedGNCG(
            maxIter=50,
            maxIterLS=20,
            maxIterCG=20,
            tolCG=1e-4
        )
        
        # 创建反演问题
        inv_prob = inverse_problem.BaseInvProblem(dmis, reg, opt)
        
        # 设置指令
        target_misfit = directives.TargetMisfit(chifact=1.0)
        beta_schedule = directives.BetaSchedule(coolingFactor=2, coolingRate=1)
        beta_estimate = directives.BetaEstimate_ByEig(beta0_ratio=1e-2)
        
        # IRLS 指令用于稀疏反演
        if robust_norm == 'l1' or regularization_config.get('norm') == 'l1':
            irls = directives.Update_IRLS(
                max_irls_iterations=20,
                minGNiter=1,
                beta_tol=1e-2
            )
            directive_list = [target_misfit, beta_schedule, beta_estimate, irls]
        else:
            directive_list = [target_misfit, beta_schedule, beta_estimate]
            
        # 创建反演对象
        inv = inversion.BaseInversion(inv_prob, directiveList=directive_list)
        
        self.inversions['robust'] = {
            'inversion': inv,
            'simulation': simulation,
            'data_misfit': dmis,
            'regularization': reg,
            'optimization': opt,
            'starting_model': starting_model,
            'observed_data': observed_data,
            'uncertainties': uncertainties,
            'robust_norm': robust_norm
        }
        
        self.current_inversion = self.inversions['robust']
        
        print(f"稳健反演设置完成:")
        print(f"  稳健范数: {robust_norm}")
        print(f"  数据点数: {len(observed_data)}")
        print(f"  模型参数数: {len(starting_model)}")
        print(f"  最大迭代数: {opt.maxIter}")
        
        return inv
        
    def setup_joint_inversion(self,
                            simulations: List,
                            observed_data_list: List[np.ndarray],
                            uncertainties_list: List[np.ndarray],
                            starting_models: List[np.ndarray],
                            coupling_weights: List[float] = None) -> object:
        """
        设置联合反演
        
        Parameters:
        -----------
        simulations : list
            多个正演仿真对象
        observed_data_list : list of arrays
            多组观测数据
        uncertainties_list : list of arrays
            多组数据不确定性
        starting_models : list of arrays
            多个初始模型
        coupling_weights : list of floats, optional
            耦合权重
            
        Returns:
        --------
        inv : SimPEG inversion
            联合反演对象
        """
        n_methods = len(simulations)
        
        if coupling_weights is None:
            coupling_weights = [1.0] * n_methods
            
        # 创建多个数据拟合项
        data_misfits = []
        for i, (sim, data, uncert) in enumerate(zip(simulations, observed_data_list, uncertainties_list)):
            dmis = data_misfit.L2DataMisfit(
                simulation=sim,
                data=data,
                noise_floor=uncert
            )
            data_misfits.append(dmis)
            
        # 组合数据拟合
        combined_dmis = data_misfit.SumDataMisfit(data_misfits, coupling_weights)
        
        # 创建联合正则化
        # 假设所有方法使用相同的网格
        mesh = simulations[0].mesh
        
        # 个体正则化
        individual_regs = []
        for i, model in enumerate(starting_models):
            reg = regularization.Tikhonov(
                mesh,
                alpha_s=1e-4,
                reference_model=model
            )
            individual_regs.append(reg)
            
        # 交叉梯度约束（结构耦合）
        cross_grad_reg = self._create_cross_gradient_regularization(
            mesh, starting_models[0], starting_models[1]
        )
        
        # 组合正则化
        combined_reg = regularization.SumRegularization(
            individual_regs + [cross_grad_reg]
        )
        
        # 优化算法
        opt = optimization.InexactGaussNewton(maxIter=30)
        
        # 反演问题
        inv_prob = inverse_problem.BaseInvProblem(combined_dmis, combined_reg, opt)
        
        # 指令
        target_misfit = directives.TargetMisfit(chifact=float(n_methods))
        beta_schedule = directives.BetaSchedule(coolingFactor=2, coolingRate=1)
        beta_estimate = directives.BetaEstimate_ByEig(beta0_ratio=1e-1)
        
        # 创建反演对象
        inv = inversion.BaseInversion(
            inv_prob,
            directiveList=[target_misfit, beta_schedule, beta_estimate]
        )
        
        # 组合初始模型
        combined_starting_model = np.concatenate(starting_models)
        
        self.inversions['joint'] = {
            'inversion': inv,
            'simulations': simulations,
            'data_misfits': data_misfits,
            'regularization': combined_reg,
            'optimization': opt,
            'starting_model': combined_starting_model,
            'individual_starting_models': starting_models,
            'observed_data_list': observed_data_list,
            'uncertainties_list': uncertainties_list,
            'coupling_weights': coupling_weights
        }
        
        self.current_inversion = self.inversions['joint']
        
        print(f"联合反演设置完成:")
        print(f"  方法数量: {n_methods}")
        print(f"  总数据点数: {sum(len(data) for data in observed_data_list)}")
        print(f"  总模型参数数: {len(combined_starting_model)}")
        print(f"  耦合权重: {coupling_weights}")
        
        return inv
        
    def _create_cross_gradient_regularization(self, mesh, model1, model2, alpha=1e-3):
        """创建交叉梯度正则化"""
        # 这是一个简化的交叉梯度实现
        # 实际实现需要更复杂的梯度计算
        class CrossGradientRegularization(regularization.BaseRegularization):
            def __init__(self, mesh, alpha=1e-3):
                super().__init__(mesh)
                self.alpha = alpha
                
            def __call__(self, m):
                # 简化的交叉梯度计算
                n_params = len(m) // 2
                m1, m2 = m[:n_params], m[n_params:]
                
                # 计算梯度（简化版本）
                grad1 = np.gradient(m1.reshape(-1))
                grad2 = np.gradient(m2.reshape(-1))
                
                # 交叉梯度
                cross_grad = np.sum((grad1 * grad2) ** 2)
                
                return self.alpha * cross_grad
                
        return CrossGradientRegularization(mesh, alpha)
        
    def run_inversion(self, 
                     inversion_type: str = None,
                     callback: Callable = None,
                     save_iterations: bool = True) -> Dict:
        """
        运行反演计算
        
        Parameters:
        -----------
        inversion_type : str, optional
            反演类型，默认为当前反演
        callback : callable, optional
            回调函数，用于监控进度
        save_iterations : bool
            是否保存迭代过程
            
        Returns:
        --------
        results : dict
            反演结果
        """
        if inversion_type is None:
            inv_config = self.current_inversion
        else:
            inv_config = self.inversions.get(inversion_type)
            
        if inv_config is None:
            raise ValueError(f"反演 {inversion_type} 尚未设置")
            
        inv = inv_config['inversion']
        starting_model = inv_config['starting_model']
        
        # 设置回调函数监控进度
        if callback is not None:
            self._setup_callback(inv, callback)
            
        # 清空优化历史
        self.optimization_history = []
        
        print("开始反演计算...")
        start_time = time.time()
        
        # 运行反演
        recovered_model = inv.run(starting_model)
        
        compute_time = time.time() - start_time
        
        # 计算最终数据拟合
        simulation = inv_config['simulation'] if 'simulation' in inv_config else inv_config['simulations'][0]
        predicted_data = simulation.dpred(recovered_model)
        observed_data = inv_config['observed_data'] if 'observed_data' in inv_config else inv_config['observed_data_list'][0]
        
        # 计算统计指标
        data_misfit = np.linalg.norm(predicted_data - observed_data)
        rms_error = np.sqrt(np.mean((predicted_data - observed_data) ** 2))
        correlation = np.corrcoef(predicted_data, observed_data)[0, 1]
        
        results = {
            'recovered_model': recovered_model,
            'predicted_data': predicted_data,
            'data_misfit': data_misfit,
            'rms_error': rms_error,
            'correlation': correlation,
            'compute_time': compute_time,
            'n_iterations': len(self.optimization_history),
            'optimization_history': self.optimization_history.copy(),
            'starting_model': starting_model,
            'observed_data': observed_data
        }
        
        print(f"反演计算完成:")
        print(f"  计算时间: {compute_time:.1f} 秒")
        print(f"  迭代次数: {results['n_iterations']}")
        print(f"  最终数据拟合: {data_misfit:.3e}")
        print(f"  RMS 误差: {rms_error:.3e}")
        print(f"  相关系数: {correlation:.3f}")
        
        return results
        
    def _setup_callback(self, inversion, callback):
        """设置反演回调函数"""
        def iteration_callback(opt, x, g):
            """优化过程回调"""
            iteration = len(self.optimization_history)
            
            # 计算当前目标函数值
            objective = opt.f(x)
            
            # 记录优化历史
            self.optimization_history.append({
                'iteration': iteration,
                'objective': objective,
                'model': x.copy(),
                'gradient_norm': np.linalg.norm(g)
            })
            
            # 调用用户回调
            if callback is not None:
                callback(iteration, objective, x, g)
                
        # 设置回调
        if hasattr(inversion.invProb.opt, 'callback'):
            inversion.invProb.opt.callback = iteration_callback
            
    def analyze_convergence(self, results: Dict) -> Dict:
        """
        分析反演收敛性
        
        Parameters:
        -----------
        results : dict
            反演结果
            
        Returns:
        --------
        convergence_analysis : dict
            收敛性分析结果
        """
        history = results.get('optimization_history', [])
        
        if not history:
            return {"error": "没有优化历史记录"}
            
        iterations = [h['iteration'] for h in history]
        objectives = [h['objective'] for h in history]
        gradient_norms = [h['gradient_norm'] for h in history]
        
        # 计算收敛指标
        final_objective = objectives[-1]
        objective_reduction = (objectives[0] - final_objective) / objectives[0] if objectives[0] != 0 else 0
        
        # 检查收敛趋势
        converged = False
        if len(objectives) > 5:
            recent_change = abs(objectives[-1] - objectives[-5]) / abs(objectives[-5]) if objectives[-5] != 0 else 0
            converged = recent_change < 0.01  # 1% 变化阈值
            
        convergence_analysis = {
            'total_iterations': len(iterations),
            'final_objective': final_objective,
            'objective_reduction': objective_reduction,
            'final_gradient_norm': gradient_norms[-1],
            'converged': converged,
            'convergence_rate': self._estimate_convergence_rate(objectives)
        }
        
        return convergence_analysis
        
    def _estimate_convergence_rate(self, objectives):
        """估算收敛速率"""
        if len(objectives) < 5:
            return None
            
        # 使用最后几次迭代估算收敛速率
        recent_objectives = objectives[-5:]
        rates = []
        
        for i in range(1, len(recent_objectives)):
            if recent_objectives[i-1] != 0:
                rate = abs(recent_objectives[i] - recent_objectives[i-1]) / abs(recent_objectives[i-1])
                rates.append(rate)
                
        return np.mean(rates) if rates else None
        
    def plot_inversion_results(self, results: Dict, method: str = 'gravity'):
        """
        绘制反演结果
        
        Parameters:
        -----------
        results : dict
            反演结果
        method : str
            地球物理方法
        """
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        
        # 收敛曲线
        if results.get('optimization_history'):
            history = results['optimization_history']
            iterations = [h['iteration'] for h in history]
            objectives = [h['objective'] for h in history]
            
            axes[0, 0].plot(iterations, objectives, 'b-', linewidth=2)
            axes[0, 0].set_xlabel('迭代次数')
            axes[0, 0].set_ylabel('目标函数值')
            axes[0, 0].set_title('收敛曲线')
            axes[0, 0].grid(True, alpha=0.3)
            axes[0, 0].set_yscale('log')
            
        # 数据拟合对比
        observed = results['observed_data']
        predicted = results['predicted_data']
        
        axes[0, 1].scatter(observed, predicted, alpha=0.6, s=20)
        min_val, max_val = min(np.min(observed), np.min(predicted)), max(np.max(observed), np.max(predicted))
        axes[0, 1].plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2)
        axes[0, 1].set_xlabel('观测数据')
        axes[0, 1].set_ylabel('预测数据')
        axes[0, 1].set_title(f'数据拟合 (R={results["correlation"]:.3f})')
        axes[0, 1].grid(True, alpha=0.3)
        
        # 数据拟合残差
        residuals = predicted - observed
        axes[0, 2].hist(residuals, bins=30, alpha=0.7, edgecolor='black')
        axes[0, 2].axvline(0, color='red', linestyle='--', linewidth=2)
        axes[0, 2].set_xlabel('残差')
        axes[0, 2].set_ylabel('频数')
        axes[0, 2].set_title(f'残差分布 (RMS={results["rms_error"]:.3e})')
        axes[0, 2].grid(True, alpha=0.3)
        
        # 模型对比
        starting_model = results['starting_model']
        recovered_model = results['recovered_model']
        
        # 初始模型
        axes[1, 0].hist(starting_model, bins=30, alpha=0.7, color='blue', label='初始模型')
        axes[1, 0].set_xlabel('模型参数值')
        axes[1, 0].set_ylabel('频数')
        axes[1, 0].set_title('初始模型分布')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)
        
        # 反演模型
        axes[1, 1].hist(recovered_model, bins=30, alpha=0.7, color='green', label='反演模型')
        axes[1, 1].set_xlabel('模型参数值')
        axes[1, 1].set_ylabel('频数')
        axes[1, 1].set_title('反演模型分布')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
        
        # 模型更新
        model_change = recovered_model - starting_model
        axes[1, 2].hist(model_change, bins=30, alpha=0.7, color='orange', label='模型更新')
        axes[1, 2].axvline(0, color='red', linestyle='--', linewidth=2)
        axes[1, 2].set_xlabel('模型参数变化')
        axes[1, 2].set_ylabel('频数')
        axes[1, 2].set_title('模型更新分布')
        axes[1, 2].legend()
        axes[1, 2].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()
        
        return fig
        
    def save_inversion_results(self, results: Dict, file_path: str):
        """
        保存反演结果
        
        Parameters:
        -----------
        results : dict
            反演结果
        file_path : str
            保存路径
        """
        import h5py
        
        with h5py.File(file_path, 'w') as f:
            # 保存主要结果
            f.create_dataset('recovered_model', data=results['recovered_model'])
            f.create_dataset('predicted_data', data=results['predicted_data'])
            f.create_dataset('starting_model', data=results['starting_model'])
            f.create_dataset('observed_data', data=results['observed_data'])
            
            # 保存统计信息
            stats_group = f.create_group('statistics')
            stats_group.attrs['data_misfit'] = results['data_misfit']
            stats_group.attrs['rms_error'] = results['rms_error']
            stats_group.attrs['correlation'] = results['correlation']
            stats_group.attrs['compute_time'] = results['compute_time']
            stats_group.attrs['n_iterations'] = results['n_iterations']
            
            # 保存优化历史
            if results.get('optimization_history'):
                history_group = f.create_group('optimization_history')
                iterations = [h['iteration'] for h in results['optimization_history']]
                objectives = [h['objective'] for h in results['optimization_history']]
                gradient_norms = [h['gradient_norm'] for h in results['optimization_history']]
                
                history_group.create_dataset('iterations', data=iterations)
                history_group.create_dataset('objectives', data=objectives)
                history_group.create_dataset('gradient_norms', data=gradient_norms)
                
        print(f"反演结果已保存到: {file_path}")


# 示例使用
def create_inversion_example():
    """创建反演示例"""
    engine = InversionEngine()
    
    print("=== 反演引擎示例 ===")
    print("反演引擎已初始化")
    print("支持的反演类型:")
    print("  - 最小二乘反演")
    print("  - 稳健反演")
    print("  - 联合反演")
    
    return engine


if __name__ == "__main__":
    # 运行示例
    inversion_engine = create_inversion_example()
