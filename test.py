import requests, json

FID_0X = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"  # BTC/USD
FID_STRIPPED = FID_0X[2:]
BASE = "https://hermes.pyth.network"
HEADERS = {"Accept": "application/json", "User-Agent": "pyth-check/1.0"}


def fetch_latest(fid: str):
    """Latest snapshot from /api/latest_price_feeds (single entry)."""
    url = f"{BASE}/api/latest_price_feeds"
    params = {"ids[]": fid}
    r = requests.get(url, params=params, headers=HEADERS, timeout=30)
    return r


def fetch_recent_updates(fid: str, limit: int = 500):
    """Recent updates (no start/end) from /v2/updates/price/{id}."""
    url = f"{BASE}/v2/updates/price/{fid}"
    params = {"parsed": "true", "limit": limit}
    r = requests.get(url, params=params, headers=HEADERS, timeout=30)
    return r


def norm_point(entry):
    p = entry.get("parsed") or entry
    price_struct = (p.get("price") or p.get("ema_price") or {})
    raw = price_struct.get("price")
    expo = price_struct.get("expo", 0)
    ts = p.get("publish_time") or p.get("publishTime")
    if raw is None or ts is None:
        return None
    try:
        expo_i = int(expo)
        norm = raw * (10 ** expo_i)
    except Exception:
        norm = None
    return {"ts": ts, "raw": raw, "expo": expo, "norm": norm}


def run_for(fid: str):
    print(f"=== ID {fid} ===")

    # Latest snapshot
    r = fetch_latest(fid)
    print(f"latest HTTP {r.status_code}")
    if r.status_code == 200:
        try:
            latest = r.json()
            print("latest payload (truncated):")
            print(json.dumps(latest[:1], indent=2))
        except Exception as e:
            print(f"latest non-JSON: {e}\n{r.text[:200]}")
    else:
        print(r.text[:200])

    # Recent updates (array)
    r2 = fetch_recent_updates(fid)
    print(f"updates HTTP {r2.status_code}")
    if r2.status_code == 200:
        try:
            j = r2.json()
            items = j.get("data") if isinstance(j, dict) else (j if isinstance(j, list) else [])
            pts = []
            for it in items:
                pt = norm_point(it)
                if pt:
                    pts.append(pt)
            print(f"updates points returned: {len(pts)}")
            # Print the first 5 points as a sample
            print(json.dumps(pts[:5], indent=2))
        except Exception as e:
            print(f"updates non-JSON: {e}\n{r2.text[:200]}")
    else:
        print(r2.text[:200])

    print()


if __name__ == "__main__":
    for fid in (FID_0X, FID_STRIPPED):
        run_for(fid)