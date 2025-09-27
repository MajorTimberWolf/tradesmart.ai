"""In-memory monitoring jobs that watch Pyth price for band touches.

This runner starts background threads that periodically poll the latest
Hermes price via the existing PriceFetcher and prints/logs band-touch events.
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from backend.agent.config.settings import AgentSettings, get_settings
from backend.agent.core.tools.price_fetcher import PriceFetcher


@dataclass
class WatchedBand:
    lower: float
    upper: float
    projected_until: Optional[int] = None
    band_type: str = "support"


@dataclass
class MonitorJob:
    id: str
    symbol: str
    bands: List[WatchedBand]
    stop_event: threading.Event = field(default_factory=threading.Event)
    thread: Optional[threading.Thread] = None


class MonitoringJobs:
    def __init__(self, settings: Optional[AgentSettings] = None) -> None:
        self._settings = settings or get_settings()
        self._jobs: Dict[str, MonitorJob] = {}
        self._lock = threading.Lock()

    def list_jobs(self) -> List[str]:
        with self._lock:
            return list(self._jobs.keys())

    def stop_job(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None:
            return
        job.stop_event.set()
        if job.thread and job.thread.is_alive():
            job.thread.join(timeout=1.0)
        with self._lock:
            self._jobs.pop(job_id, None)

    def start_band_watch(self, symbol: str, bands: List[WatchedBand]) -> str:
        job_id = str(uuid.uuid4())
        job = MonitorJob(id=job_id, symbol=symbol, bands=bands)

        def _loop() -> None:
            fetcher = PriceFetcher(self._settings)
            interval = max(5, int(self._settings.price_poll_interval_seconds))
            while not job.stop_event.is_set():
                try:
                    price = fetcher.fetch_price(symbol).price
                except Exception as exc:  # pragma: no cover - defensive
                    print(f"[monitor {job_id}] price fetch failed: {exc}")
                    time.sleep(interval)
                    continue

                now = int(time.time())
                for b in list(job.bands):
                    if b.projected_until is not None and now > b.projected_until:
                        continue
                    if b.lower <= price <= b.upper:
                        print(
                            f"[monitor {job_id}] {symbol} touched {b.band_type} band "
                            f"[{b.lower:.4f}, {b.upper:.4f}] at price {price:.4f}"
                        )
                        # In future: trigger execution path and notify frontend

                time.sleep(interval)

        t = threading.Thread(target=_loop, name=f"monitor-{job_id}", daemon=True)
        job.thread = t
        with self._lock:
            self._jobs[job_id] = job
        t.start()
        return job_id


__all__ = ["MonitoringJobs", "WatchedBand"]


