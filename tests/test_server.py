import http.client
import json
import socket
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from http.server import ThreadingHTTPServer

import pytest
from tidyr import TidyrScanner, TidyrHTTPHandler, ScanManager, CATEGORIES


VALID_CATEGORIES = set(CATEGORIES.values())
VALID_TIERS = {"safe", "review"}


def validate_scan_schema(data: dict):
    """Validate JSON output against src/types/scan.ts schema."""
    assert isinstance(data, dict)
    assert "home" in data and isinstance(data["home"], str)
    assert "scannedAt" in data and isinstance(data["scannedAt"], str)
    # Ensure scannedAt is valid ISO timestamp
    datetime.fromisoformat(data["scannedAt"].replace("Z", "+00:00"))
    assert "scannedBytes" in data and isinstance(data["scannedBytes"], (int, float))
    assert "baseFreeBytes" in data and isinstance(data["baseFreeBytes"], (int, float))
    assert "skipped" in data and isinstance(data["skipped"], list)
    assert "tree" in data and isinstance(data["tree"], dict)
    assert "items" in data and isinstance(data["items"], list)

    for skipped in data["skipped"]:
        assert "path" in skipped and isinstance(skipped["path"], str)
        assert "reason" in skipped and isinstance(skipped["reason"], str)

    def validate_tree_node(node: dict):
        assert "id" in node and isinstance(node["id"], str)
        assert "name" in node and isinstance(node["name"], str)
        assert "path" in node and isinstance(node["path"], str)
        assert node["path"] == "~" or node["path"].startswith("~/")
        assert "size" in node and isinstance(node["size"], (int, float))
        assert "category" in node and node["category"] in VALID_CATEGORIES

        if "candidate" in node:
            assert isinstance(node["candidate"], str)
        if "children" in node:
            assert isinstance(node["children"], list)
            for child in node["children"]:
                validate_tree_node(child)

    validate_tree_node(data["tree"])

    for item in data["items"]:
        assert "id" in item and isinstance(item["id"], str)
        assert "label" in item and isinstance(item["label"], str)
        assert "tier" in item and item["tier"] in VALID_TIERS
        assert "size" in item and isinstance(item["size"], (int, float))
        assert "paths" in item and isinstance(item["paths"], list)
        for p in item["paths"]:
            assert p == "~" or p.startswith("~/")
        assert "note" in item and isinstance(item["note"], str)

        if "lastModified" in item:
            assert isinstance(item["lastModified"], str)
        if "daysIdle" in item:
            assert isinstance(item["daysIdle"], int)
            assert item["daysIdle"] >= 0


def test_schema_conformance(tmp_path: Path):
    fake_home = tmp_path / "home"
    fake_home.mkdir()

    (fake_home / ".npm").mkdir()
    (fake_home / ".npm" / "cache.bin").write_bytes(b"x" * 200)

    proj = fake_home / "demo-proj"
    proj.mkdir()
    (proj / "package.json").write_text("{}")
    (proj / "node_modules").mkdir()
    (proj / "node_modules" / "mod.js").write_bytes(b"x" * 300)

    scanner = TidyrScanner(home=fake_home)
    data = scanner.scan(max_depth=3)
    validate_scan_schema(data)


@pytest.fixture
def test_server(tmp_path: Path):
    fake_home = tmp_path / "fakehome"
    fake_home.mkdir()
    (fake_home / "existing.txt").write_text("hello")

    fake_dist = tmp_path / "dist"
    fake_dist.mkdir()
    (fake_dist / "index.html").write_text("<!DOCTYPE html><html><body>UI</body></html>")

    class TestHandler(TidyrHTTPHandler):
        dist_dir = fake_dist
        scan_manager = ScanManager(home=fake_home)

    server = ThreadingHTTPServer(("127.0.0.1", 0), TestHandler)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    yield f"http://127.0.0.1:{port}", fake_home, TestHandler.scan_manager

    server.shutdown()
    server.server_close()


def post_json(url: str, data: dict) -> tuple[int, dict]:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json", "Origin": "http://localhost:3000"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def get_json(url: str) -> tuple[int, dict]:
    req = urllib.request.Request(
        url,
        headers={"Origin": "http://localhost:3000"},
        method="GET"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def test_reveal_path_escape_rejection(test_server):
    base_url, fake_home, _ = test_server

    # 1. Reject path traversal with ..
    status, res = post_json(f"{base_url}/api/reveal", {"path": "~/../../etc/passwd"})
    assert status == 403
    assert "error" in res

    # 2. Reject absolute path outside home
    outside_path = str(Path(fake_home).parent / "outside.txt")
    status, res = post_json(f"{base_url}/api/reveal", {"path": outside_path})
    assert status == 403
    assert "error" in res

    # 3. Reject missing or non-string path
    status, res = post_json(f"{base_url}/api/reveal", {"path": 1234})
    assert status == 400

    # 4. Reject non-existent path inside home
    status, res = post_json(f"{base_url}/api/reveal", {"path": "~/nonexistent_file.txt"})
    assert status == 404

    # 5. Accept valid existing path inside home
    status, res = post_json(f"{base_url}/api/reveal", {"path": "~/existing.txt"})
    assert status == 200
    assert res.get("success") is True


def test_server_scan_flow_and_result(test_server):
    base_url, fake_home, scan_mgr = test_server

    # Check status initially idle
    status, res = get_json(f"{base_url}/api/scan/status")
    assert status == 200
    assert "status" in res

    # Trigger scan
    status, res = post_json(f"{base_url}/api/scan", {"folder": "~"})
    assert status == 200

    # Wait for scan thread to finish
    if scan_mgr._thread:
        scan_mgr._thread.join(timeout=5)

    # Check status is ready
    status, res = get_json(f"{base_url}/api/scan/status")
    assert status == 200
    assert res["status"] == "ready"

    # Get scan result and validate against schema
    status, scan_data = get_json(f"{base_url}/api/scan/result")
    assert status == 200
    validate_scan_schema(scan_data)


def test_scan_traversal_path_falls_back_to_home(test_server):
    base_url, fake_home, scan_mgr = test_server

    with scan_mgr.lock:
        scan_mgr.status = "idle"
        scan_mgr.result = None

    status, res = post_json(f"{base_url}/api/scan", {"folder": "~/../outside"})
    assert status == 200

    assert scan_mgr.scan_path == fake_home

    if scan_mgr._thread:
        scan_mgr._thread.join(timeout=5)

    status, scan_data = get_json(f"{base_url}/api/scan/result")
    assert status == 200
    validate_scan_schema(scan_data)
    assert scan_data["tree"]["path"] == "~"


def test_post_rejects_text_plain_content_type(test_server):
    base_url, _, _ = test_server

    req = urllib.request.Request(
        f"{base_url}/api/scan",
        data=b"hello text",
        headers={"Content-Type": "text/plain", "Origin": "http://localhost:3000"},
        method="POST"
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(req)
    assert exc_info.value.code == 403


def test_post_rejects_evil_origin(test_server):
    base_url, _, _ = test_server

    req = urllib.request.Request(
        f"{base_url}/api/scan",
        data=json.dumps({"folder": "~"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Origin": "https://evil.example"},
        method="POST"
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(req)
    assert exc_info.value.code == 403


def test_post_rejects_bad_host_header(test_server):
    base_url, _, _ = test_server
    port = urllib.parse.urlsplit(base_url).port

    conn = http.client.HTTPConnection("127.0.0.1", port)
    conn.request(
        "POST",
        "/api/scan",
        body=json.dumps({"folder": "~"}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Origin": "http://localhost:3000",
            "Host": "evil.example:8080"
        }
    )
    resp = conn.getresponse()
    assert resp.status == 403
    conn.close()

