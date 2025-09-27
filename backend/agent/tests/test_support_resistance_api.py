import json
from typing import List

from fastapi.testclient import TestClient

from backend.agent.api.server import app, _jobs, _sr_service


def test_support_resistance_endpoint_emits_sse(monkeypatch) -> None:
    updates: List[dict] = [
        {"publish_time": 0, "price": 1000, "expo": -2},
        {"publish_time": 4 * 60 * 60, "price": 1100, "expo": -2},
        {"publish_time": 8 * 60 * 60, "price": 900, "expo": -2},
        {"publish_time": 12 * 60 * 60, "price": 1150, "expo": -2},
    ]

    monkeypatch.setattr(_sr_service._history, "fetch_updates", lambda *args, **kwargs: updates)

    class DummyPrice:
        price = 2000.0

    monkeypatch.setattr(_sr_service._price_fetcher, "fetch_price", lambda *_args, **_kwargs: DummyPrice())
    monkeypatch.setattr(_jobs, "start_band_watch", lambda *args, **kwargs: "test-job")

    with TestClient(app) as client:
        with client.stream("GET", "/api/events") as stream:
            response = client.post(
                "/api/strategies/support-resistance",
                json={"symbol": "ETH_USD"},
            )
            assert response.status_code == 200

            for line in stream.iter_lines():
                if not line:
                    continue
                if line.startswith("data:"):
                    payload = json.loads(line[5:].strip())
                    assert payload["type"] == "strategy.support_resistance.created"
                    assert payload["payload"]["bands"]
                    break

