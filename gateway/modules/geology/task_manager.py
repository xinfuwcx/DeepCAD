import threading
import time
import uuid
from typing import Any, Dict, Optional


class Job:
    def __init__(self, kind: str, payload: Dict[str, Any]):
        self.id = uuid.uuid4().hex[:12]
        self.kind = kind
        self.payload = payload
        self.status = "queued"
        self.progress = 0.0
        self.error: Optional[str] = None
        self.result: Optional[Dict[str, Any]] = None
        self.created_at = time.time()
        self.updated_at = self.created_at

    def status_dict(self) -> Dict[str, Any]:
        return {
            "jobId": self.id,
            "kind": self.kind,
            "status": self.status,
            "progress": self.progress,
            "error": self.error,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


class JobStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._jobs: Dict[str, Job] = {}

    def create(self, kind: str, payload: Dict[str, Any]) -> Job:
        job = Job(kind, payload)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def set(self, job: Job):
        with self._lock:
            self._jobs[job.id] = job

    def cleanup(self, ttl_sec: float = 3600.0):
        now = time.time()
        with self._lock:
            for jid in list(self._jobs.keys()):
                j = self._jobs[jid]
                if now - j.created_at > ttl_sec:
                    self._jobs.pop(jid, None)


jobs = JobStore()
