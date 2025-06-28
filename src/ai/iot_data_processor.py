#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file iot_data_processor.py
@description IoT���ݴ���ģ�飬���ڴ����ͷ�������������
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
from scipy import signal, stats, interpolate
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans, DBSCAN

# ����IoT����ģ��
from src.ai.iot_data_collector import SimpleIoTDataReader, SensorType, SensorStatus

# ������־
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "iot_data_processor.log"), mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("IoTDataProcessor")
class IoTDataProcessor:
    """IoT���ݴ���������"""
    
    def __init__(
        self,
        project_id: int,
        data_dir: str = None,
        results_dir: str = None
    ):
        """
        ��ʼ��IoT���ݴ�����
        
        ����:
            project_id: ��ĿID
            data_dir: ����Ŀ¼
            results_dir: ���Ŀ¼
        """
        self.project_id = project_id
        
        # ��������Ŀ¼
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                        "data", "iot", f"project_{project_id}")
        else:
            self.data_dir = data_dir
        
        # ���ý��Ŀ¼
        if results_dir is None:
            self.results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                           "data", "results", "iot_processing")
        else:
            self.results_dir = results_dir
        os.makedirs(self.results_dir, exist_ok=True)
        
        # �������ݶ�ȡ��
        self.data_reader = SimpleIoTDataReader(project_id=project_id, data_dir=self.data_dir)
        
        logger.info(f"��ʼ��IoT���ݴ���������ĿID: {project_id}")
    
    def load_data(
        self,
        data_type: Union[str, SensorType],
        start_date: str,
        end_date: str = None,
        sensor_ids: List[str] = None
    ) -> pd.DataFrame:
        """
        ��������
        
        ����:
            data_type: ��������
            start_date: ��ʼ���� (YYYYMMDD��ʽ)
            end_date: �������� (YYYYMMDD��ʽ)�����ΪNone������ʼ������ͬ
            sensor_ids: ������ID�б������ΪNone��������д�����
            
        ����:
            ����DataFrame
        """
        df = self.data_reader.read_data(data_type, start_date, end_date, sensor_ids)
        
        if df.empty:
            logger.warning(f"δ�ҵ��������� {data_type} �����ڷ�Χ {start_date} �� {end_date or start_date} ������")
        else:
            logger.info(f"������ {len(df)} ����¼")
        
        return df
    
    def preprocess_data(
        self,
        df: pd.DataFrame,
        normalize: bool = True,
        remove_outliers: bool = True,
        fill_missing: bool = True
    ) -> pd.DataFrame:
        """
        Ԥ��������
        
        ����:
            df: ��������DataFrame
            normalize: �Ƿ��׼������
            remove_outliers: �Ƿ��Ƴ��쳣ֵ
            fill_missing: �Ƿ����ȱʧֵ
            
        ����:
            Ԥ�������DataFrame
        """
        if df.empty:
            return df
        
        # �������ݣ������޸�ԭʼ����
        processed_df = df.copy()
        
        # ��������ID��ʱ�������
        if "sensor_id" in processed_df.columns and "timestamp" in processed_df.columns:
            processed_df = processed_df.sort_values(["sensor_id", "timestamp"])
        
        # �Ƴ��쳣ֵ
        if remove_outliers:
            processed_df = self._remove_outliers(processed_df)
        
        # ���ȱʧֵ
        if fill_missing:
            processed_df = self._fill_missing_values(processed_df)
        
        # ��׼������
        if normalize:
            processed_df = self._normalize_data(processed_df)
        
        return processed_df
    
    def _remove_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        �Ƴ��쳣ֵ
        
        ����:
            df: ��������DataFrame
            
        ����:
            �������DataFrame
        """
        if "value" not in df.columns or len(df) < 10:
            return df
        
        # ��������ID���鴦��
        result_dfs = []
        
        for sensor_id, group in df.groupby("sensor_id"):
            # ʹ��Z-score��������쳣ֵ
            z_scores = stats.zscore(group["value"])
            abs_z_scores = np.abs(z_scores)
            filtered_entries = abs_z_scores < 3.0  # 3����׼��
            
            # ����쳣ֵ
            outliers = group[~filtered_entries]
            if not outliers.empty:
                logger.info(f"������ {sensor_id} ��⵽ {len(outliers)} ���쳣ֵ")
            
            # ��������ֵ
            normal_df = group[filtered_entries].copy()
            result_dfs.append(normal_df)
        
        if result_dfs:
            return pd.concat(result_dfs)
        else:
            return df
    
    def _fill_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        ���ȱʧֵ
        
        ����:
            df: ��������DataFrame
            
        ����:
            �������DataFrame
        """
        if "value" not in df.columns or "timestamp" not in df.columns:
            return df
        
        # ��������ID���鴦��
        result_dfs = []
        
        for sensor_id, group in df.groupby("sensor_id"):
            # ����Ƿ���ȱʧֵ
            if not group["value"].isna().any():
                result_dfs.append(group)
                continue
            
            # ʹ�����Բ�ֵ���ȱʧֵ
            group_filled = group.copy()
            group_filled["value"] = group_filled["value"].interpolate(method="linear")
            
            # �����β��ȱʧֵ��ʹ���������Чֵ���
            group_filled["value"] = group_filled["value"].fillna(method="ffill").fillna(method="bfill")
            
            result_dfs.append(group_filled)
        
        if result_dfs:
            return pd.concat(result_dfs)
        else:
            return df
    
    def _normalize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        ��׼������
        
        ����:
            df: ��������DataFrame
            
        ����:
            ��׼�����DataFrame
        """
        if "value" not in df.columns:
            return df
        
        # ��������ID���鴦��
        result_dfs = []
        
        for sensor_id, group in df.groupby("sensor_id"):
            # ��������
            group_norm = group.copy()
            
            # ʹ��MinMaxScaler���й�һ��
            scaler = MinMaxScaler()
            values = group["value"].values.reshape(-1, 1)
            normalized_values = scaler.fit_transform(values)
            
            # ����ֵ
            group_norm["value_original"] = group["value"]
            group_norm["value"] = normalized_values.flatten()
            
            result_dfs.append(group_norm)
        
        if result_dfs:
            return pd.concat(result_dfs)
        else:
            return df
    def analyze_time_series(
        self,
        df: pd.DataFrame,
        analysis_type: str = "trend",
        window_size: int = 24,
        save_result: bool = True
    ) -> Dict[str, Any]:
        """
        ʱ�����з���
        
        ����:
            df: ��������DataFrame
            analysis_type: �������ͣ���ѡֵ: "trend", "seasonality", "anomaly"
            window_size: �������ڴ�С
            save_result: �Ƿ񱣴���
            
        ����:
            ��������ֵ�
        """
        if df.empty or "value" not in df.columns or "timestamp" not in df.columns:
            logger.warning("����Ϊ�ջ�ȱ�ٱ�Ҫ����")
            return {}
        
        results = {}
        
        # ��������ID���鴦��
        for sensor_id, group in df.groupby("sensor_id"):
            # ȷ�����ݰ�ʱ������
            group = group.sort_values("timestamp")
            
            # ��ȡʱ���ֵ
            times = group["timestamp"].values
            values = group["value"].values
            
            # ���ݷ�������ִ�в�ͬ�ķ���
            if analysis_type == "trend":
                result = self._analyze_trend(times, values, window_size)
            elif analysis_type == "seasonality":
                result = self._analyze_seasonality(times, values)
            elif analysis_type == "anomaly":
                result = self._analyze_anomaly(times, values, window_size)
            else:
                logger.warning(f"��֧�ֵķ�������: {analysis_type}")
                continue
            
            # ������
            results[sensor_id] = result
            
            # ���ӻ���������
            if save_result:
                self._save_analysis_result(sensor_id, analysis_type, times, values, result)
        
        return results
    
    def _analyze_trend(self, times: np.ndarray, values: np.ndarray, window_size: int) -> Dict[str, Any]:
        """��������"""
        # �����ƶ�ƽ��
        if len(values) > window_size:
            ma = np.convolve(values, np.ones(window_size)/window_size, mode="valid")
            ma_times = times[window_size-1:]
        else:
            ma = values
            ma_times = times
        
        # ������������
        if len(times) > 1:
            slope, intercept, r_value, p_value, std_err = stats.linregress(times, values)
            trend_line = slope * times + intercept
        else:
            slope = intercept = r_value = p_value = std_err = 0
            trend_line = values
        
        return {
            "moving_average": {
                "times": ma_times.tolist(),
                "values": ma.tolist()
            },
            "linear_trend": {
                "slope": slope,
                "intercept": intercept,
                "r_value": r_value,
                "p_value": p_value,
                "std_err": std_err,
                "line": trend_line.tolist()
            }
        }
    
    def _analyze_seasonality(self, times: np.ndarray, values: np.ndarray) -> Dict[str, Any]:
        """����������"""
        if len(values) < 10:
            return {"periodogram": {}}
        
        # ��������ͼ
        frequencies, spectrum = signal.periodogram(values)
        
        # �ҳ���ҪƵ��
        idx = np.argsort(spectrum)[-3:]  # ȡ��ǿ��3��Ƶ��
        main_frequencies = frequencies[idx]
        main_powers = spectrum[idx]
        
        # �����Ӧ������
        periods = 1.0 / main_frequencies[main_frequencies > 0]
        
        return {
            "periodogram": {
                "frequencies": frequencies.tolist(),
                "spectrum": spectrum.tolist(),
                "main_frequencies": main_frequencies.tolist(),
                "main_powers": main_powers.tolist(),
                "main_periods": periods.tolist() if len(periods) > 0 else []
            }
        }
    
    def _analyze_anomaly(self, times: np.ndarray, values: np.ndarray, window_size: int) -> Dict[str, Any]:
        """�����쳣ֵ"""
        if len(values) < window_size:
            return {"anomalies": []}
        
        # ʹ���ƶ�ƽ���ͱ�׼�����쳣
        ma = np.convolve(values, np.ones(window_size)/window_size, mode="valid")
        ma_extended = np.concatenate([np.ones(window_size-1) * ma[0], ma])
        
        # ����ÿ�������ƶ�ƽ����ƫ��
        deviations = np.abs(values - ma_extended)
        
        # ����ƫ��ľ�ֵ�ͱ�׼��
        mean_dev = np.mean(deviations)
        std_dev = np.std(deviations)
        
        # ����쳣ֵ (����3����׼��)
        threshold = mean_dev + 3 * std_dev
        anomaly_indices = np.where(deviations > threshold)[0]
        
        # ��ȡ�쳣��
        anomalies = []
        for idx in anomaly_indices:
            anomalies.append({
                "index": int(idx),
                "time": float(times[idx]),
                "value": float(values[idx]),
                "deviation": float(deviations[idx])
            })
        
        return {
            "anomalies": anomalies,
            "threshold": float(threshold),
            "mean_deviation": float(mean_dev),
            "std_deviation": float(std_dev)
        }
    def _save_analysis_result(
        self,
        sensor_id: str,
        analysis_type: str,
        times: np.ndarray,
        values: np.ndarray,
        result: Dict[str, Any]
    ):
        """����������"""
        # �������Ŀ¼
        result_dir = os.path.join(self.results_dir, analysis_type)
        os.makedirs(result_dir, exist_ok=True)
        
        # ���ɽ���ļ���
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = os.path.join(result_dir, f"{sensor_id}_{analysis_type}_{timestamp}")
        
        # ����JSON���
        with open(f"{result_file}.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        
        # ���ɿ��ӻ�ͼ��
        plt.figure(figsize=(12, 6))
        
        # ����ԭʼ����
        plt.plot(times, values, "b-", alpha=0.5, label="ԭʼ����")
        
        # ���ݷ������ͻ��Ʋ�ͬ�Ľ��
        if analysis_type == "trend":
            # �����ƶ�ƽ��
            ma_times = np.array(result["moving_average"]["times"])
            ma_values = np.array(result["moving_average"]["values"])
            plt.plot(ma_times, ma_values, "r-", linewidth=2, label="�ƶ�ƽ��")
            
            # ������������
            trend_line = np.array(result["linear_trend"]["line"])
            plt.plot(times, trend_line, "g--", linewidth=2, label="��������")
            
            # ����������Ϣ
            slope = result["linear_trend"]["slope"]
            r_value = result["linear_trend"]["r_value"]
            plt.title(f"������ {sensor_id} ���Ʒ��� (б��: {slope:.6f}, R: {r_value**2:.4f})")
            
        elif analysis_type == "seasonality":
            # ����ͼ�л�������ͼ
            plt.subplot(2, 1, 1)
            plt.plot(times, values, "b-", alpha=0.5, label="ԭʼ����")
            plt.title(f"������ {sensor_id} ԭʼ����")
            plt.xlabel("ʱ��")
            plt.ylabel("ֵ")
            plt.grid(True)
            
            plt.subplot(2, 1, 2)
            frequencies = np.array(result["periodogram"]["frequencies"])
            spectrum = np.array(result["periodogram"]["spectrum"])
            plt.plot(frequencies, spectrum, "r-")
            plt.title("����ͼ")
            plt.xlabel("Ƶ��")
            plt.ylabel("�������ܶ�")
            plt.grid(True)
            
            # �����ҪƵ��
            main_frequencies = np.array(result["periodogram"]["main_frequencies"])
            main_powers = np.array(result["periodogram"]["main_powers"])
            plt.scatter(main_frequencies, main_powers, color="green", marker="o")
            
            # ������Ҫ���ڱ�ǩ
            if "main_periods" in result["periodogram"] and len(result["periodogram"]["main_periods"]) > 0:
                periods = np.array(result["periodogram"]["main_periods"])
                for i, (freq, power, period) in enumerate(zip(main_frequencies, main_powers, periods)):
                    if freq > 0:
                        plt.annotate(f"T={period:.2f}", (freq, power), 
                                    textcoords="offset points", xytext=(0, 10), 
                                    ha="center")
            
        elif analysis_type == "anomaly":
            # �����쳣��
            anomalies = result["anomalies"]
            if anomalies:
                anomaly_times = [a["time"] for a in anomalies]
                anomaly_values = [a["value"] for a in anomalies]
                plt.scatter(anomaly_times, anomaly_values, color="red", marker="o", s=50, label="�쳣ֵ")
            
            plt.title(f"������ {sensor_id} �쳣ֵ��� (��ֵ: {result['threshold']:.4f})")
        
        plt.xlabel("ʱ��")
        plt.ylabel("ֵ")
        plt.grid(True)
        plt.legend()
        
        # ����ͼ��
        plt.tight_layout()
        plt.savefig(f"{result_file}.png")
        plt.close()
        
        logger.info(f"���� {sensor_id} �� {analysis_type} ��������� {result_file}")

class IoTDataFusion:
    """IoT�����ںϴ�����"""
    
    def __init__(
        self,
        project_id: int,
        data_dir: str = None,
        results_dir: str = None
    ):
        """
        ��ʼ��IoT�����ںϴ�����
        
        ����:
            project_id: ��ĿID
            data_dir: ����Ŀ¼
            results_dir: ���Ŀ¼
        """
        self.project_id = project_id
        
        # �������ݴ�����
        self.processor = IoTDataProcessor(project_id, data_dir, results_dir)
        
        logger.info(f"��ʼ��IoT�����ںϴ���������ĿID: {project_id}")
    
    def fuse_multi_sensor_data(
        self,
        sensor_types: List[Union[str, SensorType]],
        start_date: str,
        end_date: str = None,
        normalize: bool = True
    ) -> Dict[str, pd.DataFrame]:
        """
        �ں϶��ִ���������
        
        ����:
            sensor_types: �����������б�
            start_date: ��ʼ���� (YYYYMMDD��ʽ)
            end_date: �������� (YYYYMMDD��ʽ)�����ΪNone������ʼ������ͬ
            normalize: �Ƿ��׼������
            
        ����:
            �ںϺ�������ֵ�
        """
        # ���ز�Ԥ���������ʹ���������
        sensor_data = {}
        
        for sensor_type in sensor_types:
            # ��������
            df = self.processor.load_data(sensor_type, start_date, end_date)
            
            if df.empty:
                continue
            
            # Ԥ��������
            processed_df = self.processor.preprocess_data(df, normalize=normalize)
            
            # ���洦���������
            sensor_data[sensor_type if isinstance(sensor_type, str) else sensor_type.value] = processed_df
        
        if not sensor_data:
            logger.warning("û�п��õĴ��������ݽ����ں�")
            return {}
        
        # ʱ�����
        aligned_data = self._align_time_series(sensor_data)
        
        return aligned_data
    
    def _align_time_series(self, sensor_data: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """
        ���벻ͬ��������ʱ������
        
        ����:
            sensor_data: �����������ֵ�
            
        ����:
            ʱ������������ֵ�
        """
        if not sensor_data:
            return {}
        
        aligned_data = {}
        
        # ��ȡ����ʱ���
        all_timestamps = set()
        for df in sensor_data.values():
            if "timestamp" in df.columns:
                all_timestamps.update(df["timestamp"].values)
        
        all_timestamps = sorted(all_timestamps)
        
        # ��ÿ�ִ��������ͽ��д���
        for sensor_type, df in sensor_data.items():
            # ��������ID���鴦��
            aligned_dfs = []
            
            for sensor_id, group in df.groupby("sensor_id"):
                # ����ʱ����������
                ts_series = pd.Series(
                    group["value"].values,
                    index=pd.to_datetime(group["timestamp"], unit="s")
                )
                
                # �ز�����ͳһʱ���
                resampled = ts_series.reindex(
                    pd.to_datetime(all_timestamps, unit="s"),
                    method="nearest"
                )
                
                # ����������DataFrame
                aligned_df = pd.DataFrame({
                    "sensor_id": sensor_id,
                    "type": sensor_type,
                    "timestamp": all_timestamps,
                    "value": resampled.values
                })
                
                aligned_dfs.append(aligned_df)
            
            if aligned_dfs:
                aligned_data[sensor_type] = pd.concat(aligned_dfs)
        
        return aligned_data
    
    def perform_sensor_fusion(
        self,
        aligned_data: Dict[str, pd.DataFrame],
        fusion_method: str = "weighted_average",
        weights: Dict[str, float] = None
    ) -> pd.DataFrame:
        """
        ִ�д������ں�
        
        ����:
            aligned_data: ʱ������������ֵ�
            fusion_method: �ںϷ�������ѡֵ: "weighted_average", "kalman", "pca"
            weights: Ȩ���ֵ䣬���ڼ�Ȩƽ������
            
        ����:
            �ںϺ��DataFrame
        """
        if not aligned_data:
            return pd.DataFrame()
        
        # ��ȡ����ʱ���
        timestamps = None
        for df in aligned_data.values():
            if "timestamp" in df.columns:
                timestamps = df["timestamp"].unique()
                break
        
        if timestamps is None or len(timestamps) == 0:
            return pd.DataFrame()
        
        # �����ںϷ���ִ�в�ͬ���ں�
        if fusion_method == "weighted_average":
            return self._fusion_weighted_average(aligned_data, timestamps, weights)
        elif fusion_method == "kalman":
            return self._fusion_kalman_filter(aligned_data, timestamps)
        elif fusion_method == "pca":
            return self._fusion_pca(aligned_data, timestamps)
        else:
            logger.warning(f"��֧�ֵ��ںϷ���: {fusion_method}")
            return pd.DataFrame()
    
    def _fusion_weighted_average(
        self,
        aligned_data: Dict[str, pd.DataFrame],
        timestamps: np.ndarray,
        weights: Dict[str, float] = None
    ) -> pd.DataFrame:
        """��Ȩƽ���ں�"""
        # ����Ĭ��Ȩ��
        if weights is None:
            weights = {sensor_type: 1.0 for sensor_type in aligned_data.keys()}
        
        # ��׼��Ȩ��
        total_weight = sum(weights.values())
        if total_weight > 0:
            norm_weights = {k: w / total_weight for k, w in weights.items()}
        else:
            norm_weights = {k: 1.0 / len(weights) for k in weights.keys()}
        
        # ��ʼ�����
        fused_values = np.zeros(len(timestamps))
        
        # �����Ȩƽ��
        for sensor_type, df in aligned_data.items():
            if sensor_type not in norm_weights:
                continue
            
            # ����ÿ��ʱ����ƽ��ֵ
            time_values = {}
            for _, row in df.iterrows():
                ts = row["timestamp"]
                if ts not in time_values:
                    time_values[ts] = []
                time_values[ts].append(row["value"])
            
            # ���ӵ��ںϽ��
            for i, ts in enumerate(timestamps):
                if ts in time_values:
                    avg_value = np.mean(time_values[ts])
                    fused_values[i] += avg_value * norm_weights[sensor_type]
        
        # �����ںϽ��DataFrame
        fused_df = pd.DataFrame({
            "timestamp": timestamps,
            "value": fused_values,
            "fusion_method": "weighted_average"
        })
        
        return fused_df
    
    def _fusion_kalman_filter(
        self,
        aligned_data: Dict[str, pd.DataFrame],
        timestamps: np.ndarray
    ) -> pd.DataFrame:
        """�������˲��ں�"""
        # �򻯰濨�����˲�������״ֻ̬��һ������
        # ��ʼ��
        n = len(timestamps)
        x = np.zeros(n)  # ״̬����
        P = np.ones(n)   # �������Э����
        
        # ϵͳ����
        Q = 0.01  # ��������Э����
        
        # ��һ�β���
        first_measurement = False
        for sensor_type, df in aligned_data.items():
            if not first_measurement:
                # ����ÿ��ʱ����ƽ��ֵ��Ϊ��ʼ����
                time_values = {}
                for _, row in df.iterrows():
                    ts = row["timestamp"]
                    if ts not in time_values:
                        time_values[ts] = []
                    time_values[ts].append(row["value"])
                
                for i, ts in enumerate(timestamps):
                    if ts in time_values:
                        x[i] = np.mean(time_values[ts])
                
                first_measurement = True
                break
        
        # ����ÿ�ִ������Ĳ���
        for sensor_type, df in aligned_data.items():
            # ����ÿ��ʱ����ƽ��ֵ�ͷ���
            time_values = {}
            time_vars = {}
            
            for _, row in df.iterrows():
                ts = row["timestamp"]
                if ts not in time_values:
                    time_values[ts] = []
                time_values[ts].append(row["value"])
            
            # ���㷽��
            for ts, values in time_values.items():
                if len(values) > 1:
                    time_vars[ts] = np.var(values)
                else:
                    time_vars[ts] = 1.0  # Ĭ�Ϸ���
            
            # �������˲�����
            for i, ts in enumerate(timestamps):
                if ts in time_values:
                    z = np.mean(time_values[ts])  # ����ֵ
                    R = time_vars.get(ts, 1.0)    # ��������Э����
                    
                    # Ԥ��
                    x_pred = x[i]
                    P_pred = P[i] + Q
                    
                    # ����
                    K = P_pred / (P_pred + R)  # ����������
                    x[i] = x_pred + K * (z - x_pred)
                    P[i] = (1 - K) * P_pred
        
        # �����ںϽ��DataFrame
        fused_df = pd.DataFrame({
            "timestamp": timestamps,
            "value": x,
            "uncertainty": P,
            "fusion_method": "kalman_filter"
        })
        
        return fused_df
    
    def _fusion_pca(
        self,
        aligned_data: Dict[str, pd.DataFrame],
        timestamps: np.ndarray
    ) -> pd.DataFrame:
        """PCA�ں�"""
        # ������������
        feature_dict = {}
        
        # ��ÿ��ʱ��㣬�ռ����д�������ֵ
        for sensor_type, df in aligned_data.items():
            for _, row in df.iterrows():
                ts = row["timestamp"]
                sensor_id = row["sensor_id"]
                feature_key = f"{sensor_type}_{sensor_id}"
                
                if ts not in feature_dict:
                    feature_dict[ts] = {}
                
                feature_dict[ts][feature_key] = row["value"]
        
        # ת��Ϊ��������
        features = []
        valid_timestamps = []
        
        for ts in timestamps:
            if ts in feature_dict and len(feature_dict[ts]) > 0:
                features.append(list(feature_dict[ts].values()))
                valid_timestamps.append(ts)
        
        if not features:
            return pd.DataFrame()
        
        # ִ��PCA
        pca = PCA(n_components=1)
        try:
            pca_result = pca.fit_transform(features)
            
            # �����ںϽ��DataFrame
            fused_df = pd.DataFrame({
                "timestamp": valid_timestamps,
                "value": pca_result.flatten(),
                "explained_variance": pca.explained_variance_ratio_[0],
                "fusion_method": "pca"
            })
            
            return fused_df
        except Exception as e:
            logger.error(f"PCA�ں�ʧ��: {str(e)}")
            return pd.DataFrame()

# ʾ���÷�
if __name__ == "__main__":
    # ����IoT���ݴ�����
    processor = IoTDataProcessor(project_id=1)
    
    # ��������
    today = datetime.datetime.now().strftime("%Y%m%d")
    df = processor.load_data(
        data_type=SensorType.DISPLACEMENT,
        start_date=today
    )
    
    if not df.empty:
        # Ԥ��������
        processed_df = processor.preprocess_data(df)
        
        # ִ�����Ʒ���
        trend_results = processor.analyze_time_series(
            processed_df,
            analysis_type="trend",
            window_size=10
        )
        
        print(f"���Ʒ������: {len(trend_results)}��������")
        
        # �����ں�ʾ��
        fusion = IoTDataFusion(project_id=1)
        
        # �ں�λ�ƺ�Ӧ������
        fused_data = fusion.fuse_multi_sensor_data(
            sensor_types=[SensorType.DISPLACEMENT, SensorType.STRESS],
            start_date=today
        )
        
        if fused_data:
            # ִ�м�Ȩƽ���ں�
            weights = {
                SensorType.DISPLACEMENT.value: 0.7,
                SensorType.STRESS.value: 0.3
            }
            
            fused_result = fusion.perform_sensor_fusion(
                fused_data,
                fusion_method="weighted_average",
                weights=weights
            )
            
            print(f"�ںϽ��: {len(fused_result)}����¼")
    else:
        print("û�п��õĴ���������")
