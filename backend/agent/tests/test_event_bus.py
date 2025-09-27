import asyncio

import pytest

from backend.agent.api.event_bus import EventBus


@pytest.mark.asyncio
async def test_event_bus_publish_and_subscribe() -> None:
    bus = EventBus()
    loop = asyncio.get_running_loop()
    bus.set_loop(loop)

    async def consume() -> list[dict]:
        collected = []
        async for event in bus.subscribe():
            collected.append(event)
            if len(collected) == 2:
                break
        return collected

    consumer = asyncio.create_task(consume())

    await bus.publish({"foo": 1})
    bus.publish_sync({"bar": 2})

    result = await consumer

    assert result == [{"foo": 1}, {"bar": 2}]

