import os
import time
from pathlib import Path
from unittest.mock import patch

from tidyr import TidyrScanner, get_project_activity, to_tilde_path


def create_fake_file(path: Path, size_bytes: int, mtime: float = None):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"x" * size_bytes)
    if mtime is not None:
        os.utime(path, (mtime, mtime))


def test_scanner_sizes_and_structure(tmp_path: Path):
    fake_home = tmp_path / "fakehome"
    fake_home.mkdir()

    # 1. Safe package cache: ~/.npm
    npm_file = fake_home / ".npm" / "cache" / "package.tgz"
    create_fake_file(npm_file, 5000)

    # 2. Project with node_modules and .next
    proj_dir = fake_home / "Projects" / "web-app"
    create_fake_file(proj_dir / "package.json", 200)
    create_fake_file(proj_dir / "src" / "index.ts", 800)
    create_fake_file(proj_dir / "node_modules" / "pkg" / "index.js", 3000)
    create_fake_file(proj_dir / ".next" / "cache.pack", 2000)

    # 3. Documents
    create_fake_file(fake_home / "Documents" / "notes.txt", 1000)

    scanner = TidyrScanner(home=fake_home)
    data = scanner.scan(max_depth=5)

    # Scanned bytes should equal sum of all files created: 5000 + 200 + 800 + 3000 + 2000 + 1000 = 12000
    assert data["scannedBytes"] == 12000
    assert data["tree"]["size"] == 12000
    assert data["home"] == "~"

    # Verify items were identified
    items_by_id = {item["id"]: item for item in data["items"]}

    # NPM cache item
    assert "npm-cache" in items_by_id
    npm_item = items_by_id["npm-cache"]
    assert npm_item["tier"] == "safe"
    assert npm_item["size"] == 5000
    assert npm_item["paths"] == ["~/.npm"]

    # Web app node_modules item
    assert "node-modules-web-app" in items_by_id
    nm_item = items_by_id["node-modules-web-app"]
    assert nm_item["tier"] == "review"
    assert nm_item["size"] == 3000
    assert nm_item["paths"] == ["~/Projects/web-app/node_modules"]

    # Web app .next item
    assert "next-web-app" in items_by_id
    next_item = items_by_id["next-web-app"]
    assert next_item["tier"] == "safe"
    assert next_item["size"] == 2000
    assert next_item["paths"] == ["~/Projects/web-app/.next"]


def test_idle_project_detection(tmp_path: Path):
    fake_home = tmp_path / "home"
    fake_home.mkdir()

    proj = fake_home / "idle-project"
    old_time = time.time() - (120 * 86400)  # 120 days ago
    recent_time = time.time() - 3600  # 1 hour ago

    # Source code is old
    create_fake_file(proj / "package.json", 100, mtime=old_time)
    create_fake_file(proj / "src" / "app.py", 400, mtime=old_time)

    # Node modules has a recent timestamp, but should be IGNORED for project activity!
    create_fake_file(proj / "node_modules" / "recent.js", 1000, mtime=recent_time)
    create_fake_file(proj / ".next" / "recent.cache", 500, mtime=recent_time)

    iso_str, days_idle = get_project_activity(proj, home_path=fake_home)
    assert days_idle is not None
    assert days_idle >= 119  # ~120 days idle
    assert iso_str is not None

    scanner = TidyrScanner(home=fake_home)
    data = scanner.scan(max_depth=4)
    nm_item = next(item for item in data["items"] if item["id"] == "node-modules-idle-project")
    assert nm_item["daysIdle"] >= 119
    assert "Inactive project dependencies" in nm_item["note"]

    next_item = next(item for item in data["items"] if item["id"] == "next-idle-project")
    assert next_item["daysIdle"] >= 119
    assert next_item["lastModified"] == iso_str


def test_skipped_folders_on_permission_error(tmp_path: Path):
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    secret_dir = fake_home / "protected" / "secret"
    create_fake_file(secret_dir / "data.bin", 500)

    real_scandir = os.scandir

    def mocked_scandir(path):
        resolved_str = str(Path(path).resolve())
        if "secret" in resolved_str:
            raise PermissionError("[Errno 13] Permission denied: secret")
        return real_scandir(path)

    with patch("os.scandir", side_effect=mocked_scandir):
        scanner = TidyrScanner(home=fake_home)
        data = scanner.scan(max_depth=4)

    assert len(data["skipped"]) > 0
    skipped_paths = [s["path"] for s in data["skipped"]]
    assert any("secret" in p for p in skipped_paths)
    reasons = [s["reason"].lower() for s in data["skipped"]]
    assert any("permission denied" in r for r in reasons)


def test_to_tilde_path():
    home = Path("/Users/developer").resolve()
    assert to_tilde_path(home, home) == "~"
    assert to_tilde_path(home / ".npm", home) == "~/.npm"
    assert to_tilde_path(home / "Projects" / "web", home) == "~/Projects/web"
