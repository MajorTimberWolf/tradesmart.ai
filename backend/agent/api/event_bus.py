"""Simple in-process event bus for streaming server-sent events."""

from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator, Dict, Set


class EventBus:
    def __init__(self) -> None:
        self._subscribers: Set[asyncio.Queue[Dict[str, Any]]] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._lock = asyncio.Lock()

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def publish(self, event: Dict[str, Any]) -> None:
        if not self._subscribers:
            return
        await asyncio.gather(*(queue.put(event) for queue in list(self._subscribers)))

    def publish_sync(self, event: Dict[str, Any]) -> None:
        if self._loop is None:
            return
        try:
            asyncio.run_coroutine_threadsafe(self.publish(event), self._loop)
        except RuntimeError:
            pass

    async def subscribe(self) -> AsyncIterator[Dict[str, Any]]:
        queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        async with self._lock:
            self._subscribers.add(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            async with self._lock:
                self._subscribers.discard(queue)


event_bus = EventBus()


__all__ = ["EventBus", "event_bus"]


