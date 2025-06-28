#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file physics_ai_system.py
@description ����AIϵͳ����ģ�飬����PINNģ�͡�IoT���ݺ�CAE����
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import time
import datetime
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Union, Optional, Any
import threading
import queue

# ��������AIģ��
from src.ai.physics_ai import (
    PhysicsInformedNN, 
    HeatEquationPINN, 
    WaveEquationPINN, 
    ElasticityPINN, 
    PDEInverseAnalysis
)

# ����IoT����ģ��
from src.ai.iot_data_collector import (
    SimpleIoTDataReader, 
    SensorType, 
    SensorStatus, 
    SimulatedIoTDataCollector
)

# ����IoT���ݴ���ģ��
from src.ai.iot_data_processor import (
    IoTDataProcessor,
    IoTDataFusion
)

# ����PINN����ģ��
from src.ai.pinn_integration import IoTPINNIntegrator

# ����CAEģ��
try:
    from src.core.simulation.terra_wrapper import TerraWrapper
    from src.core.simulation.compute_base import ComputeEngine
    HAS_CAE = True
except ImportError:
    HAS_CAE = False
    print("���棺δ�ҵ�CAEģ�飬���ֹ��ܽ�������")

# ������־
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "physics_ai_system.log"), mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("PhysicsAISystem")

class PhysicsAISystem:
    """����AIϵͳ������PINNģ�͡�IoT���ݺ�CAE����"""
    
    def __init__(
        self,
        project_id: int,
        data_dir: str = None,
        models_dir: str = None,
        results_dir: str = None,
        config: Dict[str, Any] = None
    ):
        """
        ��ʼ������AIϵͳ
        
        ����:
            project_id: ��ĿID
            data_dir: ����Ŀ¼
            models_dir: ģ��Ŀ¼
            results_dir: ���Ŀ¼
            config: ���ò���
        """
        self.project_id = project_id
        self.config = config or {}
        
        # ��������Ŀ¼
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                        "data")
        else:
            self.data_dir = data_dir
        
        # ����ģ��Ŀ¼
        if models_dir is None:
            self.models_dir = os.path.join(self.data_dir, "models")
        else:
            self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        
        # ���ý��Ŀ¼
        if results_dir is None:
            self.results_dir = os.path.join(self.data_dir, "results", "physics_ai")
        else:
            self.results_dir = results_dir
        os.makedirs(self.results_dir, exist_ok=True)
        
        # ��ʼ�����
        self.data_reader = SimpleIoTDataReader(project_id=project_id)
        self.data_processor = IoTDataProcessor(project_id=project_id)
        self.data_fusion = IoTDataFusion(project_id=project_id)
        self.pinn_integrator = IoTPINNIntegrator(project_id=project_id)
        
        # ��ʼ��CAE����
        self.cae_engine = None
        if HAS_CAE:
            try:
                self.cae_engine = TerraWrapper()
                logger.info("CAE�����ʼ���ɹ�")
            except Exception as e:
                logger.error(f"CAE�����ʼ��ʧ��: {str(e)}")
        
        # ������к��߳�
        self.task_queue = queue.Queue()
        self.task_results = {}
        self.worker_thread = None
        self.is_running = False
        
        logger.info(f"��ʼ������AIϵͳ����ĿID: {project_id}")
    
    def start_worker(self):
        """���������߳�"""
        if self.worker_thread is None or not self.worker_thread.is_alive():
            self.is_running = True
            self.worker_thread = threading.Thread(target=self._worker_loop)
            self.worker_thread.daemon = True
            self.worker_thread.start()
            logger.info("�����߳�������")
    
    def stop_worker(self):
        """ֹͣ�����߳�"""
        self.is_running = False
        if self.worker_thread and self.worker_thread.is_alive():
            self.task_queue.put(None)  # ����ֹͣ�ź�
            self.worker_thread.join(timeout=5.0)
            logger.info("�����߳���ֹͣ")
    
    def _worker_loop(self):
        """�����߳�ѭ��"""
        while self.is_running:
            try:
                task = self.task_queue.get(timeout=1.0)
                if task is None:  # ֹͣ�ź�
                    break
                
                task_id, task_type, task_params = task
                
                try:
                    # ִ������
                    self.task_results[task_id] = {
                        "status": "running",
                        "start_time": time.time(),
                        "progress": 0
                    }
                    
                    if task_type == "inverse_analysis":
                        result = self._run_inverse_analysis(task_id, **task_params)
                    elif task_type == "pinn_training":
                        result = self._run_pinn_training(task_id, **task_params)
                    elif task_type == "cae_analysis":
                        result = self._run_cae_analysis(task_id, **task_params)
                    elif task_type == "data_fusion":
                        result = self._run_data_fusion(task_id, **task_params)
                    else:
                        raise ValueError(f"��֧�ֵ���������: {task_type}")
                    
                    # ���½��
                    self.task_results[task_id].update({
                        "status": "completed",
                        "end_time": time.time(),
                        "progress": 100,
                        "result": result
                    })
                    
                except Exception as e:
                    logger.error(f"���� {task_id} ִ��ʧ��: {str(e)}", exc_info=True)
                    self.task_results[task_id].update({
                        "status": "failed",
                        "end_time": time.time(),
                        "error": str(e)
                    })
                
                finally:
                    self.task_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"�����߳��쳣: {str(e)}", exc_info=True)
    
    def submit_task(self, task_type: str, **task_params) -> str:
        """
        �ύ����
        
        ����:
            task_type: ��������
            **task_params: �������
            
        ����:
            ����ID
        """
        task_id = f"{task_type}_{int(time.time())}_{os.urandom(4).hex()}"
        
        self.task_queue.put((task_id, task_type, task_params))
        self.task_results[task_id] = {
            "status": "queued",
            "submit_time": time.time(),
            "task_type": task_type
        }
        
        # ȷ�������߳�������
        self.start_worker()
        
        logger.info(f"�ύ����: {task_id}, ����: {task_type}")
        return task_id
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        ��ȡ����״̬
        
        ����:
            task_id: ����ID
            
        ����:
            ����״̬�ֵ�
        """
        if task_id not in self.task_results:
            return {"status": "not_found", "error": f"���� {task_id} ������"}
        
        return self.task_results[task_id]
    
    def _run_inverse_analysis(self, task_id: str, **params) -> Dict[str, Any]:
        """ִ�з��ݷ�������"""
        # ���½���
        self._update_task_progress(task_id, 10, "���ع۲�����")
        
        # ��ȡ����
        data_type = params.get("data_type", SensorType.DISPLACEMENT)
        start_date = params.get("start_date", datetime.datetime.now().strftime("%Y%m%d"))
        end_date = params.get("end_date")
        pde_type = params.get("pde_type", "elasticity")
        initial_params = params.get("initial_params", {"youngs_modulus": 30000, "poisson_ratio": 0.3})
        max_iter = params.get("max_iter", 20)
        
        # ���ع۲�����
        df = self.data_reader.read_data(data_type, start_date, end_date)
        
        if df.empty:
            raise ValueError(f"δ�ҵ��������� {data_type} �����ڷ�Χ {start_date} �� {end_date or start_date} ������")
        
        # Ԥ��������
        self._update_task_progress(task_id, 20, "Ԥ��������")
        processed_df = self.data_processor.preprocess_data(df)
        
        # ׼���۲�����
        X = []
        Y = []
        
        for _, row in processed_df.iterrows():
            # ��ȡλ�ú�ʱ����Ϊ����
            location = row["location"] if isinstance(row["location"], list) else [0, 0, 0]
            timestamp = row["timestamp"]
            
            # �������ʱ�䣨����ʼʱ�俪ʼ��
            if "min_timestamp" not in locals():
                min_timestamp = processed_df["timestamp"].min()
            
            rel_time = timestamp - min_timestamp
            
            # ������� [t, x, y, z]
            feature = [rel_time] + location
            
            # ֵ��Ϊ��ǩ
            label = row["value"]
            
            X.append(feature)
            Y.append(label)
        
        X = np.array(X)
        Y = np.array(Y).reshape(-1, 1)
        
        # ��׼��
        self._update_task_progress(task_id, 30, "��׼������")
        for i in range(X.shape[1]):
            if X[:, i].max() > X[:, i].min():
                X[:, i] = (X[:, i] - X[:, i].min()) / (X[:, i].max() - X[:, i].min())
        
        # ׼���۲������ֵ�
        observation_data = {
            "X": X,
            "Y": Y
        }
        
        # ִ�з��ݷ���
        self._update_task_progress(task_id, 40, "ִ�з��ݷ���")
        result = self.pinn_integrator.perform_inverse_analysis(
            observation_data=observation_data,
            pde_type=pde_type,
            initial_params=initial_params,
            max_iter=max_iter
        )
        
        self._update_task_progress(task_id, 100, "���ݷ������")
        return result
    
    def _run_pinn_training(self, task_id: str, **params) -> Dict[str, Any]:
        """ִ��PINNѵ������"""
        # ���½���
        self._update_task_progress(task_id, 10, "׼��ѵ������")
        
        # ��ȡ����
        data_type = params.get("data_type", SensorType.DISPLACEMENT)
        start_date = params.get("start_date", datetime.datetime.now().strftime("%Y%m%d"))
        end_date = params.get("end_date")
        model_type = params.get("model_type", "elasticity")
        iterations = params.get("iterations", 10000)
        
        # ׼��PINN����
        pinn_data = self.pinn_integrator.prepare_data_for_pinn(
            data_type=data_type,
            start_date=start_date,
            end_date=end_date,
            normalize=True
        )
        
        if not pinn_data or "X_train" not in pinn_data or len(pinn_data["X_train"]) == 0:
            raise ValueError(f"û���㹻����������PINNѵ��")
        
        # ѵ��PINNģ��
        self._update_task_progress(task_id, 30, "ѵ��PINNģ��")
        result = self.pinn_integrator.train_pinn_with_iot_data(
            pinn_data=pinn_data,
            model_type=model_type,
            iterations=iterations,
            display_every=max(1, iterations // 10)
        )
        
        self._update_task_progress(task_id, 100, "PINNģ��ѵ�����")
        return result
    
    def _run_cae_analysis(self, task_id: str, **params) -> Dict[str, Any]:
        """ִ��CAE��������"""
        if not HAS_CAE or self.cae_engine is None:
            raise ValueError("CAE���治����")
        
        # ���½���
        self._update_task_progress(task_id, 10, "׼��CAEģ��")
        
        # ��ȡ����
        model_file = params.get("model_file")
        analysis_type = params.get("analysis_type", "static")
        material_params = params.get("material_params", {})
        boundary_conditions = params.get("boundary_conditions", {})
        
        if not model_file or not os.path.exists(model_file):
            raise ValueError(f"ģ���ļ�������: {model_file}")
        
        # ����ģ��
        self._update_task_progress(task_id, 20, "����CAEģ��")
        self.cae_engine.load_model(model_file)
        
        # ���ò��ϲ���
        self._update_task_progress(task_id, 30, "���ò��ϲ���")
        for material_id, props in material_params.items():
            self.cae_engine.set_material(material_id, props)
        
        # ���ñ߽�����
        self._update_task_progress(task_id, 40, "���ñ߽�����")
        for bc_id, bc_props in boundary_conditions.items():
            self.cae_engine.set_boundary_condition(bc_id, bc_props)
        
        # ִ�з���
        self._update_task_progress(task_id, 50, "ִ��CAE����")
        analysis_result = self.cae_engine.run_analysis(analysis_type)
        
        # ����
        self._update_task_progress(task_id, 80, "�����������")
        result_file = os.path.join(self.results_dir, f"cae_result_{task_id}.json")
        self.cae_engine.export_results(result_file)
        
        self._update_task_progress(task_id, 100, "CAE�������")
        return {
            "analysis_type": analysis_type,
            "result_file": result_file,
            "analysis_result": analysis_result
        }
    
    def _run_data_fusion(self, task_id: str, **params) -> Dict[str, Any]:
        """ִ�������ں�����"""
        # ���½���
        self._update_task_progress(task_id, 10, "׼������������")
        
        # ��ȡ����
        sensor_types = params.get("sensor_types", [SensorType.DISPLACEMENT, SensorType.STRESS])
        start_date = params.get("start_date", datetime.datetime.now().strftime("%Y%m%d"))
        end_date = params.get("end_date")
        fusion_method = params.get("fusion_method", "weighted_average")
        weights = params.get("weights")
        
        # �ں϶��ִ���������
        self._update_task_progress(task_id, 30, "�ںϴ���������")
        fused_data = self.data_fusion.fuse_multi_sensor_data(
            sensor_types=sensor_types,
            start_date=start_date,
            end_date=end_date,
            normalize=True
        )
        
        if not fused_data:
            raise ValueError(f"û�п��õĴ��������ݽ����ں�")
        
        # ִ�д������ں�
        self._update_task_progress(task_id, 60, f"ִ��{fusion_method}�ں�")
        fused_result = self.data_fusion.perform_sensor_fusion(
            fused_data,
            fusion_method=fusion_method,
            weights=weights
        )
        
        if fused_result.empty:
            raise ValueError(f"�������ں�ʧ��")
        
        # ������
        self._update_task_progress(task_id, 80, "�����ںϽ��")
        result_file = os.path.join(self.results_dir, f"fusion_result_{task_id}.csv")
        fused_result.to_csv(result_file, index=False)
        
        self._update_task_progress(task_id, 100, "�����ں����")
        return {
            "fusion_method": fusion_method,
            "sensor_types": [str(st) if not isinstance(st, str) else st for st in sensor_types],
            "result_file": result_file,
            "data_points": len(fused_result)
        }
    
    def _update_task_progress(self, task_id: str, progress: int, message: str):
        """�����������"""
        if task_id in self.task_results:
            self.task_results[task_id].update({
                "progress": progress,
                "message": message,
                "update_time": time.time()
            })
            logger.info(f"���� {task_id} ����: {progress}%, {message}")
    
    def run_integrated_analysis(
        self,
        model_file: str,
        sensor_data_config: Dict[str, Any],
        pinn_config: Dict[str, Any],
        cae_config: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        ���м��ɷ��������IoT���ݡ�PINNģ�ͺ�CAE����
        
        ����:
            model_file: ģ���ļ�·��
            sensor_data_config: ��������������
            pinn_config: PINNģ������
            cae_config: CAE��������
            
        ����:
            ���������ID�ֵ�
        """
        # �ύ�����ں�����
        fusion_task_id = self.submit_task(
            "data_fusion",
            **sensor_data_config
        )
        
        # �ύPINNѵ������
        pinn_task_id = self.submit_task(
            "pinn_training",
            **pinn_config
        )
        
        # �ύ������������
        inverse_task_id = self.submit_task(
            "inverse_analysis",
            **pinn_config
        )
        
        # �ȴ������������
        while True:
            inverse_status = self.get_task_status(inverse_task_id)
            if inverse_status["status"] in ["completed", "failed"]:
                break
            time.sleep(1)
        
        if inverse_status["status"] == "failed":
            logger.error(f"��������ʧ��: {inverse_status.get('error', 'δ֪����')}")
            return {
                "fusion_task_id": fusion_task_id,
                "pinn_task_id": pinn_task_id,
                "inverse_task_id": inverse_task_id,
                "cae_task_id": None
            }
        
        # ��ȡ���ݲ���
        inverse_result = inverse_status.get("result", {})
        optimized_params = inverse_result.get("optimized_params", {})
        
        # ����CAE�����еĲ��ϲ���
        if "material_params" in cae_config:
            for material_id, props in cae_config["material_params"].items():
                # �����ݲ������µ�����������
                for param_name, param_value in optimized_params.items():
                    if param_name in props:
                        props[param_name] = param_value
        
        # �ύCAE��������
        cae_config["model_file"] = model_file
        cae_task_id = self.submit_task(
            "cae_analysis",
            **cae_config
        )
        
        return {
            "fusion_task_id": fusion_task_id,
            "pinn_task_id": pinn_task_id,
            "inverse_task_id": inverse_task_id,
            "cae_task_id": cae_task_id
        }

# ʾ���÷�
if __name__ == "__main__":
    # ��������AIϵͳ
    system = PhysicsAISystem(project_id=1)
    
    # ���������߳�
    system.start_worker()
    
    try:
        # �ύ���ݷ�������
        today = datetime.datetime.now().strftime("%Y%m%d")
        
        task_id = system.submit_task(
            "inverse_analysis",
            data_type=SensorType.DISPLACEMENT,
            start_date=today,
            pde_type="elasticity",
            initial_params={"youngs_modulus": 30000, "poisson_ratio": 0.3},
            max_iter=5
        )
        
        print(f"�ύ����: {task_id}")
        
        # �ȴ��������
        while True:
            status = system.get_task_status(task_id)
            print(f"����״̬: {status['status']}, ����: {status.get('progress', 0)}%")
            
            if status["status"] in ["completed", "failed"]:
                break
            
            time.sleep(1)
        
        # ��ӡ���
        if status["status"] == "completed":
            print(f"�������: {status.get('result', {})}")
        else:
            print(f"����ʧ��: {status.get('error', 'δ֪����')}")
        
    finally:
        # ֹͣ�����߳�
        system.stop_worker()
