"""
智能缓存系统
@author Deep Excavation Team
@date 2025-01-27
"""

import asyncio
import json
import hashlib
import time
import pickle
from typing import Any, Dict, Optional, List, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
import redis
from loguru import logger
import os
import threading
from concurrent.futures import ThreadPoolExecutor


class CacheLevel(Enum):
    """缓存级别"""
    L1_MEMORY = "l1_memory"
    L2_REDIS = "l2_redis"
    L3_FILE = "l3_file"


@dataclass
class CacheEntry:
    """缓存条目"""
    key: str
    value: Any
    created_at: float
    accessed_at: float
    access_count: int = 0
    ttl: Optional[float] = None
    size_bytes: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_expired(self) -> bool:
        """检查是否过期"""
        if self.ttl is None:
            return False
        return time.time() - self.created_at > self.ttl

    def touch(self):
        """更新访问时间"""
        self.accessed_at = time.time()
        self.access_count += 1


@dataclass
class AccessPattern:
    """访问模式"""
    key: str
    access_frequency: float
    last_access: float
    access_intervals: List[float] = field(default_factory=list)
    
    def is_hot(self) -> bool:
        """是否为热点数据"""
        return self.access_frequency > 10  # 每小时访问超过10次
    
    def is_warm(self) -> bool:
        """是否为温数据"""
        return 1 < self.access_frequency <= 10
    
    def is_cold(self) -> bool:
        """是否为冷数据"""
        return self.access_frequency <= 1


class MemoryCache:
    """L1内存缓存"""
    
    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self.cache: Dict[str, CacheEntry] = {}
        self.lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        with self.lock:
            entry = self.cache.get(key)
            if entry is None:
                return None
            
            if entry.is_expired():
                del self.cache[key]
                return None
            
            entry.touch()
            return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[float] = None):
        """设置缓存值"""
        with self.lock:
            # 如果缓存满了，移除最少使用的条目
            if len(self.cache) >= self.max_size and key not in self.cache:
                self._evict_lru()
            
            # 计算值的大小
            size_bytes = self._calculate_size(value)
            
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=time.time(),
                accessed_at=time.time(),
                ttl=ttl,
                size_bytes=size_bytes
            )
            
            self.cache[key] = entry
    
    def delete(self, key: str) -> bool:
        """删除缓存条目"""
        with self.lock:
            return self.cache.pop(key, None) is not None
    
    def clear(self):
        """清空缓存"""
        with self.lock:
            self.cache.clear()
    
    def _evict_lru(self):
        """移除最少使用的条目"""
        if not self.cache:
            return
        
        lru_key = min(
            self.cache.keys(),
            key=lambda k: (self.cache[k].accessed_at, self.cache[k].access_count)
        )
        del self.cache[lru_key]
        logger.debug(f"L1缓存LRU移除: {lru_key}")
    
    def _calculate_size(self, value: Any) -> int:
        """计算值的大小"""
        try:
            return len(pickle.dumps(value))
        except Exception:
            return 1024  # 默认1KB
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计"""
        with self.lock:
            total_size = sum(entry.size_bytes for entry in self.cache.values())
            total_accesses = sum(entry.access_count for entry in self.cache.values())
            
            return {
                "level": "L1_MEMORY",
                "entries": len(self.cache),
                "max_size": self.max_size,
                "total_size_bytes": total_size,
                "total_accesses": total_accesses,
                "avg_access_count": total_accesses / len(self.cache) if self.cache else 0
            }


class RedisCache:
    """L2 Redis缓存"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0", 
                 key_prefix: str = "deep_excavation:"):
        self.key_prefix = key_prefix
        try:
            self.redis_client = redis.from_url(redis_url)
            self.redis_client.ping()
            self.available = True
            logger.info("Redis缓存连接成功")
        except Exception as e:
            logger.warning(f"Redis缓存连接失败: {e}")
            self.redis_client = None
            self.available = False
    
    def _make_key(self, key: str) -> str:
        """生成完整的Redis键名"""
        return f"{self.key_prefix}{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        if not self.available:
            return None
        
        try:
            redis_key = self._make_key(key)
            data = self.redis_client.get(redis_key)
            if data is None:
                return None
            
            # 更新访问时间
            self.redis_client.hset(
                f"{redis_key}:meta",
                "accessed_at", str(time.time())
            )
            
            return pickle.loads(data)
        except Exception as e:
            logger.error(f"Redis获取失败: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[float] = None):
        """设置缓存值"""
        if not self.available:
            return
        
        try:
            redis_key = self._make_key(key)
            data = pickle.dumps(value)
            
            # 设置值
            if ttl:
                self.redis_client.setex(redis_key, int(ttl), data)
            else:
                self.redis_client.set(redis_key, data)
            
            # 设置元数据
            metadata = {
                "created_at": str(time.time()),
                "accessed_at": str(time.time()),
                "size_bytes": str(len(data))
            }
            self.redis_client.hset(f"{redis_key}:meta", mapping=metadata)
            
        except Exception as e:
            logger.error(f"Redis设置失败: {e}")
    
    async def delete(self, key: str) -> bool:
        """删除缓存条目"""
        if not self.available:
            return False
        
        try:
            redis_key = self._make_key(key)
            result = self.redis_client.delete(redis_key, f"{redis_key}:meta")
            return result > 0
        except Exception as e:
            logger.error(f"Redis删除失败: {e}")
            return False
    
    def clear(self):
        """清空缓存"""
        if not self.available:
            return
        
        try:
            pattern = f"{self.key_prefix}*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis清空失败: {e}")


class FileCache:
    """L3文件缓存"""
    
    def __init__(self, cache_dir: str = "cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        self.executor = ThreadPoolExecutor(max_workers=2)
    
    def _make_path(self, key: str) -> str:
        """生成文件路径"""
        safe_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_key}.cache")
    
    def _make_meta_path(self, key: str) -> str:
        """生成元数据文件路径"""
        safe_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_key}.meta")
    
    async def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        try:
            file_path = self._make_path(key)
            meta_path = self._make_meta_path(key)
            
            if not os.path.exists(file_path):
                return None
            
            # 检查是否过期
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as f:
                    metadata = json.load(f)
                    ttl = metadata.get('ttl')
                    created_at = metadata.get('created_at', 0)
                    
                    if ttl and time.time() - created_at > ttl:
                        # 过期，删除文件
                        os.remove(file_path)
                        os.remove(meta_path)
                        return None
            
            # 异步读取文件
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(
                self.executor, 
                self._read_file, 
                file_path
            )
            
            # 更新访问时间
            if os.path.exists(meta_path):
                await loop.run_in_executor(
                    self.executor,
                    self._update_access_time,
                    meta_path
                )
            
            return data
            
        except Exception as e:
            logger.error(f"文件缓存获取失败: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[float] = None):
        """设置缓存值"""
        try:
            file_path = self._make_path(key)
            meta_path = self._make_meta_path(key)
            
            # 异步写入文件
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                self._write_file,
                file_path, value
            )
            
            # 写入元数据
            metadata = {
                "created_at": time.time(),
                "accessed_at": time.time(),
                "ttl": ttl,
                "key": key
            }
            
            await loop.run_in_executor(
                self.executor,
                self._write_metadata,
                meta_path, metadata
            )
            
        except Exception as e:
            logger.error(f"文件缓存设置失败: {e}")
    
    def _read_file(self, file_path: str) -> Any:
        """读取文件"""
        with open(file_path, 'rb') as f:
            return pickle.load(f)
    
    def _write_file(self, file_path: str, value: Any):
        """写入文件"""
        with open(file_path, 'wb') as f:
            pickle.dump(value, f)
    
    def _write_metadata(self, meta_path: str, metadata: Dict[str, Any]):
        """写入元数据"""
        with open(meta_path, 'w') as f:
            json.dump(metadata, f)
    
    def _update_access_time(self, meta_path: str):
        """更新访问时间"""
        try:
            with open(meta_path, 'r') as f:
                metadata = json.load(f)
            
            metadata['accessed_at'] = time.time()
            
            with open(meta_path, 'w') as f:
                json.dump(metadata, f)
        except Exception:
            pass


@dataclass(frozen=True)
class InputSignature:
    """输入签名，用于生成多级缓存键。"""
    geometry_hash: str
    mesh_hash: Optional[str] = None
    analysis_hash: Optional[str] = None

    def to_tuple(self) -> Tuple[str, ...]:
        """返回用于哈希的元组表示。"""
        return tuple(filter(None, [self.geometry_hash, self.mesh_hash, self.analysis_hash]))


def _hash_bytes(data: bytes) -> str:
    """SHA256 哈希并返回前16位字符串。"""
    return hashlib.sha256(data).hexdigest()[:16]


def compute_geometry_hash(vertices: List[Tuple[float, float, float]], faces: List[Tuple[int, int, int]]) -> str:
    """根据几何顶点与拓扑生成 G-Hash。\n    稳定排序后序列化，保证同构几何得到同一哈希。"""
    verts_sorted = sorted(vertices)
    faces_sorted = sorted(faces)
    payload = json.dumps(
        {"v": verts_sorted, "f": faces_sorted},
        separators=(',', ':'),
        ensure_ascii=False,
    ).encode()
    return "G-" + _hash_bytes(payload)


def compute_mesh_hash(geometry_hash: str, mesh_params: Dict[str, Any]) -> str:
    """根据几何哈希 + 网格参数生成 M-Hash。"""
    # mesh_params 需要去除与顺序无关的键
    payload = json.dumps(
        {"g": geometry_hash, "m": mesh_params},
        sort_keys=True,
        separators=(',', ':'),
    ).encode()
    return "M-" + _hash_bytes(payload)


def compute_analysis_hash(mesh_hash: str, bc_loads: Dict[str, Any], solver_version: str) -> str:
    """根据网格哈希 + 边界条件/荷载 + 求解器版本生成 A-Hash。"""
    payload = json.dumps(
        {"m": mesh_hash, "bc": bc_loads, "solver": solver_version},
        sort_keys=True,
        separators=(',', ':'),
    ).encode()
    return "A-" + _hash_bytes(payload)


class IntelligentCacheSystem:
    """智能缓存系统"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.l1_cache = MemoryCache(max_size=100)
        self.l2_cache = RedisCache(redis_url)
        self.l3_cache = FileCache()
        
        # 访问模式分析
        self.access_patterns: Dict[str, AccessPattern] = {}
        self.pattern_lock = threading.RLock()
        
        # 统计信息
        self.stats = {
            "hits": {"L1": 0, "L2": 0, "L3": 0},
            "misses": 0,
            "total_requests": 0
        }
    
    def _update_access_pattern(self, key: str):
        """更新访问模式"""
        with self.pattern_lock:
            current_time = time.time()
            
            if key not in self.access_patterns:
                self.access_patterns[key] = AccessPattern(
                    key=key,
                    access_frequency=1,
                    last_access=current_time
                )
            else:
                pattern = self.access_patterns[key]
                
                # 计算访问间隔
                interval = current_time - pattern.last_access
                pattern.access_intervals.append(interval)
                
                # 保持最近100次访问记录
                if len(pattern.access_intervals) > 100:
                    pattern.access_intervals.pop(0)
                
                # 计算访问频率（每小时）
                if pattern.access_intervals:
                    avg_interval = sum(pattern.access_intervals) / len(pattern.access_intervals)
                    pattern.access_frequency = 3600 / avg_interval if avg_interval > 0 else 1
                
                pattern.last_access = current_time
    
    async def get(self, key: str) -> Optional[Any]:
        """智能获取缓存值"""
        self.stats["total_requests"] += 1
        self._update_access_pattern(key)
        
        # L1缓存检查
        value = self.l1_cache.get(key)
        if value is not None:
            self.stats["hits"]["L1"] += 1
            logger.debug(f"L1缓存命中: {key}")
            return value
        
        # L2缓存检查
        value = await self.l2_cache.get(key)
        if value is not None:
            self.stats["hits"]["L2"] += 1
            logger.debug(f"L2缓存命中: {key}")
            
            # 提升到L1
            pattern = self.access_patterns.get(key)
            if pattern and pattern.is_hot():
                self.l1_cache.set(key, value, ttl=300)  # 5分钟
            
            return value
        
        # L3缓存检查
        value = await self.l3_cache.get(key)
        if value is not None:
            self.stats["hits"]["L3"] += 1
            logger.debug(f"L3缓存命中: {key}")
            
            # 根据访问模式提升缓存级别
            pattern = self.access_patterns.get(key)
            if pattern:
                if pattern.is_hot():
                    # 提升到L1和L2
                    self.l1_cache.set(key, value, ttl=300)
                    await self.l2_cache.set(key, value, ttl=3600)
                elif pattern.is_warm():
                    # 提升到L2
                    await self.l2_cache.set(key, value, ttl=3600)
            
            return value
        
        # 缓存未命中
        self.stats["misses"] += 1
        logger.debug(f"缓存未命中: {key}")
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[float] = None):
        """智能设置缓存值"""
        self._update_access_pattern(key)
        
        # 根据访问模式决定缓存策略
        pattern = self.access_patterns.get(key)
        
        if pattern and pattern.is_hot():
            # 热点数据：三级缓存
            self.l1_cache.set(key, value, ttl=min(ttl or 300, 300))
            await self.l2_cache.set(key, value, ttl=min(ttl or 3600, 3600))
            await self.l3_cache.set(key, value, ttl=ttl)
            logger.debug(f"热点数据缓存: {key} -> L1+L2+L3")
        elif pattern and pattern.is_warm():
            # 温数据：二级缓存
            await self.l2_cache.set(key, value, ttl=min(ttl or 3600, 3600))
            await self.l3_cache.set(key, value, ttl=ttl)
            logger.debug(f"温数据缓存: {key} -> L2+L3")
        else:
            # 冷数据：仅文件缓存
            await self.l3_cache.set(key, value, ttl=ttl)
            logger.debug(f"冷数据缓存: {key} -> L3")
    
    async def delete(self, key: str) -> bool:
        """删除缓存条目"""
        results = [
            self.l1_cache.delete(key),
            await self.l2_cache.delete(key),
            # L3文件缓存删除需要实现
        ]
        
        # 删除访问模式记录
        with self.pattern_lock:
            self.access_patterns.pop(key, None)
        
        return any(results)
    
    def clear_all(self):
        """清空所有缓存"""
        self.l1_cache.clear()
        self.l2_cache.clear()
        # L3文件缓存清空需要实现
        
        with self.pattern_lock:
            self.access_patterns.clear()
        
        # 重置统计
        self.stats = {
            "hits": {"L1": 0, "L2": 0, "L3": 0},
            "misses": 0,
            "total_requests": 0
        }
    
    def get_cache_statistics(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        total_hits = sum(self.stats["hits"].values())
        hit_rate = total_hits / self.stats["total_requests"] if self.stats["total_requests"] > 0 else 0
        
        return {
            "hit_rate": round(hit_rate * 100, 2),
            "total_requests": self.stats["total_requests"],
            "hits_by_level": self.stats["hits"],
            "misses": self.stats["misses"],
            "l1_stats": self.l1_cache.get_stats(),
            "access_patterns": {
                "hot_keys": len([p for p in self.access_patterns.values() if p.is_hot()]),
                "warm_keys": len([p for p in self.access_patterns.values() if p.is_warm()]),
                "cold_keys": len([p for p in self.access_patterns.values() if p.is_cold()])
            }
        }


# 全局智能缓存系统实例
global_cache_system = IntelligentCacheSystem()


# 缓存装饰器
def cached(ttl: Optional[float] = None, 
          key_func: Optional[Callable] = None):
    """缓存装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{hash((args, tuple(kwargs.items())))}"
            
            # 尝试从缓存获取
            cached_result = await global_cache_system.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 执行函数
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # 存入缓存
            await global_cache_system.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator 