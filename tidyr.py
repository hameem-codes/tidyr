#!/usr/bin/env python3
"""
Tidyr - Developer Home Directory Space Scanner & Cleanup Script Generator.
Stdlib only. Zero external dependencies.
"""

import os
import sys
import json
import time
import shutil
import argparse
import mimetypes
import threading
import subprocess
import http.server
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

# UI Categories matching src/types/scan.ts
CATEGORIES = {
    "CODE": "Code projects",
    "AI": "AI models",
    "PACKAGE": "Package caches",
    "SDK": "SDKs",
    "DOCUMENTS": "Documents",
    "HOME": "Home",
}

SAFE_CACHE_DIRS = {
    ".npm": ("npm-cache", "npm cache", "safe", "Regenerates on next install.", "PACKAGE"),
    ".gradle/caches": ("gradle-cache", "Gradle caches", "safe", "Dependencies are fetched again when needed.", "PACKAGE"),
    ".cache/pip": ("pip-cache", "pip cache", "safe", "Safe package cache; regenerates on demand.", "PACKAGE"),
    ".cache/uv": ("uv-cache", "uv cache", "safe", "Safe package cache; regenerates on demand.", "PACKAGE"),
    ".cache/puppeteer": ("puppeteer-cache", "Puppeteer browser cache", "safe", "Browser binaries and cache; regenerates on demand.", "PACKAGE"),
    "Library/Developer/Xcode/DerivedData": ("xcode-derived", "Xcode DerivedData", "safe", "Build intermediates only; projects stay intact.", "SDK"),
}

REVIEW_DIRS = {
    ".ollama/models": ("ollama-models", "Ollama models", "review", "Re-downloads can be slow and expensive.", "AI"),
    ".cache/huggingface": ("huggingface", "Hugging Face models & datasets", "review", "Cached model weights and dataset checkpoints; re-downloading can be slow.", "AI"),
    ".docker": ("docker-data", "Docker data", "review", "Warning: Contains container images, build cache, and configuration. Removing this directory may break local containers or dev environments; prefer 'docker system prune' if Docker is running.", "PACKAGE"),
    "Library/Android": ("android", "Android SDK & emulators", "review", "Keep if you build Android apps locally.", "SDK"),
    "Android/Sdk": ("android-sdk", "Android SDK & emulators", "review", "Keep if you build Android apps locally.", "SDK"),
}

PROJECT_INDICATORS = {
    "package.json", "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "build.gradle.kts", "pyproject.toml", "requirements.txt", ".git"
}


def to_tilde_path(target_path: Path, home_path: Path) -> str:
    """Convert absolute path to ~/ relative path with forward slashes."""
    try:
        rel = target_path.resolve().relative_to(home_path.resolve())
        if str(rel) == ".":
            return "~"
        return "~/" + "/".join(rel.parts)
    except Exception:
        # Fallback if outside home
        return str(target_path).replace("\\", "/")


def sanitize_id(raw: str) -> str:
    """Create a URL/DOM safe ID string."""
    cleaned = []
    for c in raw.lower():
        if c.isalnum() or c in ("-", "_"):
            cleaned.append(c)
        else:
            cleaned.append("-")
    res = "".join(cleaned).strip("-")
    return res or "item"


def get_dir_size_and_mtime(
    dir_path: Path,
    ignore_names: Optional[set] = None,
    skipped_list: Optional[List[Dict[str, str]]] = None,
    home_path: Optional[Path] = None,
) -> Tuple[int, float]:
    """Calculate directory size and newest mtime, optionally skipping specified subfolders."""
    total_size = 0
    newest_mtime = 0.0

    try:
        with os.scandir(dir_path) as it:
            for entry in it:
                try:
                    if entry.is_symlink():
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        if ignore_names and entry.name in ignore_names:
                            continue
                        sub_size, sub_mtime = get_dir_size_and_mtime(
                            Path(entry.path), ignore_names, skipped_list, home_path
                        )
                        total_size += sub_size
                        if sub_mtime > newest_mtime:
                            newest_mtime = sub_mtime
                    elif entry.is_file(follow_symlinks=False):
                        stat = entry.stat(follow_symlinks=False)
                        total_size += stat.st_size
                        if stat.st_mtime > newest_mtime:
                            newest_mtime = stat.st_mtime
                except (PermissionError, FileNotFoundError, OSError) as e:
                    if skipped_list is not None and home_path is not None:
                        skipped_list.append({
                            "path": to_tilde_path(Path(entry.path), home_path),
                            "reason": str(e).split(":")[-1].strip() or "permission denied"
                        })
    except (PermissionError, FileNotFoundError, OSError) as e:
        if skipped_list is not None and home_path is not None:
            skipped_list.append({
                "path": to_tilde_path(dir_path, home_path),
                "reason": str(e).split(":")[-1].strip() or "permission denied"
            })

    return total_size, newest_mtime


def is_project_dir(p: Path) -> bool:
    """Check if directory appears to be a source code project."""
    try:
        for indicator in PROJECT_INDICATORS:
            if (p / indicator).exists():
                return True
    except OSError:
        pass
    return False


def get_project_activity(
    project_dir: Path,
    skipped_list: Optional[List[Dict[str, str]]] = None,
    home_path: Optional[Path] = None,
    now: Optional[float] = None,
) -> Tuple[Optional[str], Optional[int]]:
    """
    Real idle-project detection: newest mtime in a project,
    ignoring node_modules, .next, and .turbo.
    """
    ignore_set = {"node_modules", ".next", ".turbo"}
    _, newest_mtime = get_dir_size_and_mtime(
        project_dir, ignore_names=ignore_set, skipped_list=skipped_list, home_path=home_path
    )
    if newest_mtime <= 0:
        return None, None

    ref_time = time.time() if now is None else now
    days_idle = max(0, int((ref_time - newest_mtime) / 86400))
    iso_str = datetime.fromtimestamp(newest_mtime, tz=timezone.utc).isoformat()
    return iso_str, days_idle


def classify_category(rel_path_str: str, name: str) -> str:
    """Classify folder path into one of the UI categories."""
    p = rel_path_str.lower().replace("\\", "/")
    if p in ("", ".", "~"):
        return CATEGORIES["HOME"]
    if any(k in p for k in (".ollama", "huggingface", "models", "lm-studio", "checkpoints")):
        return CATEGORIES["AI"]
    if any(k in p for k in (".npm", ".cache", ".gradle", ".cargo", "node_modules", ".yarn", ".pnpm-store", ".docker")):
        return CATEGORIES["PACKAGE"]
    if any(k in p for k in ("android", "developer/xcode", "sdk", "sdks", ".rustup", ".nvm", ".pyenv")):
        return CATEGORIES["SDK"]
    if any(k in p for k in ("desktop", "projects", "workspace", "dev", "repos", "code", "source", "apps")):
        return CATEGORIES["CODE"]
    if any(k in p for k in ("documents", "downloads", "pictures", "music", "movies", "notes")):
        return CATEGORIES["DOCUMENTS"]
    return CATEGORIES["DOCUMENTS"]


class TidyrScanner:
    def __init__(self, home: Optional[Path] = None):
        self.home = (home or Path.home()).resolve()
        self.scanned_folders_count = 0
        self.skipped: List[Dict[str, str]] = []
        self.items_map: Dict[str, Dict[str, Any]] = {}
        self.progress_callback = None

    def scan(self, max_depth: int = 4, progress_callback=None) -> Dict[str, Any]:
        self.scanned_folders_count = 0
        self.skipped = []
        self.items_map = {}
        self.progress_callback = progress_callback

        scanned_at = datetime.now(timezone.utc).isoformat()
        try:
            total_free = shutil.disk_usage(self.home).free
        except OSError:
            total_free = 0

        # Scan tree starting at home
        tree_node = self._scan_node(self.home, depth=0, max_depth=max_depth)

        # Build list of items from items_map
        items_list = list(self.items_map.values())

        # Ensure scannedBytes equals tree size
        scanned_bytes = tree_node.get("size", 0)

        return {
            "home": "~",
            "scannedAt": scanned_at,
            "scannedBytes": scanned_bytes,
            "baseFreeBytes": total_free,
            "skipped": self.skipped,
            "tree": tree_node,
            "items": items_list,
        }

    def _scan_node(self, current: Path, depth: int, max_depth: int) -> Dict[str, Any]:
        self.scanned_folders_count += 1
        if self.progress_callback:
            self.progress_callback(self.scanned_folders_count, current)

        tilde_path = to_tilde_path(current, self.home)
        name = "~" if current == self.home else current.name
        node_id = "home" if current == self.home else sanitize_id(tilde_path.replace("~/", ""))

        rel_parts = current.relative_to(self.home).parts if current != self.home else ()
        rel_str = "/".join(rel_parts)
        category = classify_category(rel_str, name)

        node: Dict[str, Any] = {
            "id": node_id,
            "name": name,
            "path": tilde_path,
            "size": 0,
            "category": category,
        }

        # Check known candidate matches
        candidate_id = self._check_known_candidates(current, rel_str, tilde_path)
        if candidate_id:
            node["candidate"] = candidate_id

        is_proj = "node_modules" not in rel_parts and ".git" not in rel_parts and is_project_dir(current)
        if is_proj:
            node["category"] = CATEGORIES["CODE"]
            self._handle_project_subitems(current, tilde_path)

        # Recurse children if within depth
        total_size = 0
        children: List[Dict[str, Any]] = []

        if depth < max_depth:
            try:
                with os.scandir(current) as it:
                    for entry in it:
                        try:
                            if entry.is_symlink():
                                continue
                            if entry.is_dir(follow_symlinks=False):
                                child_path = Path(entry.path)
                                child_node = self._scan_node(child_path, depth + 1, max_depth)
                                if is_proj:
                                    proj_slug = sanitize_id(current.name)
                                    if entry.name == "node_modules":
                                        child_node["candidate"] = f"node-modules-{proj_slug}"
                                        child_node["category"] = CATEGORIES["PACKAGE"]
                                    elif entry.name == ".next":
                                        child_node["candidate"] = f"next-{proj_slug}"
                                        child_node["category"] = CATEGORIES["CODE"]
                                    elif entry.name == ".turbo":
                                        child_node["candidate"] = f"turbo-{proj_slug}"
                                        child_node["category"] = CATEGORIES["CODE"]
                                if child_node["size"] > 0 or child_node.get("children"):
                                    children.append(child_node)
                                total_size += child_node["size"]
                            elif entry.is_file(follow_symlinks=False):
                                total_size += entry.stat(follow_symlinks=False).st_size
                        except (PermissionError, FileNotFoundError, OSError) as e:
                            self.skipped.append({
                                "path": to_tilde_path(Path(entry.path), self.home),
                                "reason": str(e).split(":")[-1].strip() or "permission denied"
                            })
            except (PermissionError, FileNotFoundError, OSError) as e:
                self.skipped.append({
                    "path": tilde_path,
                    "reason": str(e).split(":")[-1].strip() or "permission denied"
                })
        else:
            # Reached max depth, compute size directly
            dir_size, _ = get_dir_size_and_mtime(current, skipped_list=self.skipped, home_path=self.home)
            total_size = dir_size

        node["size"] = total_size
        if children:
            # Sort children by size descending
            children.sort(key=lambda c: c["size"], reverse=True)
            node["children"] = children

        return node

    def _check_known_candidates(self, current: Path, rel_str: str, tilde_path: str) -> Optional[str]:
        # Check safe caches
        for sub, info in SAFE_CACHE_DIRS.items():
            if rel_str == sub or rel_str.endswith("/" + sub):
                cid, label, tier, note, cat = info
                size, _ = get_dir_size_and_mtime(current, skipped_list=self.skipped, home_path=self.home)
                if size > 0:
                    if cid in self.items_map:
                        self.items_map[cid]["size"] += size
                        if tilde_path not in self.items_map[cid]["paths"]:
                            self.items_map[cid]["paths"].append(tilde_path)
                    else:
                        self.items_map[cid] = {
                            "id": cid,
                            "label": label,
                            "tier": tier,
                            "size": size,
                            "paths": [tilde_path],
                            "note": note,
                        }
                    return cid

        # Check review dirs
        for sub, info in REVIEW_DIRS.items():
            if rel_str == sub or rel_str.endswith("/" + sub):
                cid, label, tier, note, cat = info
                size, _ = get_dir_size_and_mtime(current, skipped_list=self.skipped, home_path=self.home)
                if size > 0:
                    if cid in self.items_map:
                        self.items_map[cid]["size"] += size
                        if tilde_path not in self.items_map[cid]["paths"]:
                            self.items_map[cid]["paths"].append(tilde_path)
                    else:
                        self.items_map[cid] = {
                            "id": cid,
                            "label": label,
                            "tier": tier,
                            "size": size,
                            "paths": [tilde_path],
                            "note": note,
                        }
                    return cid

        return None

    def _handle_project_subitems(self, project_dir: Path, proj_tilde: str):
        """Handle per-project node_modules, .next, .turbo items."""
        proj_name = project_dir.name
        proj_slug = sanitize_id(proj_name)
        last_mod, days_idle = get_project_activity(
            project_dir, skipped_list=self.skipped, home_path=self.home
        )

        # 1. Per-project node_modules
        nm_path = project_dir / "node_modules"
        if nm_path.exists() and not nm_path.is_symlink():
            nm_size, _ = get_dir_size_and_mtime(nm_path, skipped_list=self.skipped, home_path=self.home)
            if nm_size > 0:
                cid = f"node-modules-{proj_slug}"
                nm_tilde = f"{proj_tilde}/node_modules"
                item_data: Dict[str, Any] = {
                    "id": cid,
                    "label": f"{proj_name}/node_modules",
                    "tier": "review",
                    "size": nm_size,
                    "paths": [nm_tilde],
                    "note": "Project dependencies. Regenerates with npm install.",
                }
                if last_mod is not None:
                    item_data["lastModified"] = last_mod
                if days_idle is not None:
                    item_data["daysIdle"] = days_idle
                    if days_idle >= 90:
                        item_data["note"] = "Inactive project dependencies. Regenerates with npm install."
                self.items_map[cid] = item_data

        # 2. Per-project .next
        next_path = project_dir / ".next"
        if next_path.exists() and not next_path.is_symlink():
            next_size, _ = get_dir_size_and_mtime(next_path, skipped_list=self.skipped, home_path=self.home)
            if next_size > 0:
                cid = f"next-{proj_slug}"
                next_tilde = f"{proj_tilde}/.next"
                self.items_map[cid] = {
                    "id": cid,
                    "label": f"{proj_name}/.next",
                    "tier": "safe",
                    "size": next_size,
                    "paths": [next_tilde],
                    "note": "Next.js build cache and output; safe to clean.",
                }

        # 3. Per-project .turbo
        turbo_path = project_dir / ".turbo"
        if turbo_path.exists() and not turbo_path.is_symlink():
            turbo_size, _ = get_dir_size_and_mtime(turbo_path, skipped_list=self.skipped, home_path=self.home)
            if turbo_size > 0:
                cid = f"turbo-{proj_slug}"
                turbo_tilde = f"{proj_tilde}/.turbo"
                self.items_map[cid] = {
                    "id": cid,
                    "label": f"{proj_name}/.turbo",
                    "tier": "safe",
                    "size": turbo_size,
                    "paths": [turbo_tilde],
                    "note": "Turborepo build cache and artifacts; regenerates on build.",
                }


def is_localhost_origin(origin: Optional[str]) -> bool:
    if not origin:
        return True
    try:
        parsed = urllib.parse.urlsplit(origin)
        return parsed.hostname in ("localhost", "127.0.0.1", "::1")
    except Exception:
        return False


def send_cors_headers(handler: http.server.BaseHTTPRequestHandler):
    origin = handler.headers.get("Origin")
    if is_localhost_origin(origin):
        handler.send_header("Access-Control-Allow-Origin", origin or "*")
        handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        handler.send_header("Access-Control-Allow-Headers", "Content-Type")


class ScanManager:
    def __init__(self, home: Optional[Path] = None):
        self.home = (home or Path.home()).resolve()
        self.lock = threading.Lock()
        self.status = "idle"
        self.folder_count = 0
        self.current_folder = ""
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self._thread: Optional[threading.Thread] = None

    def start_scan(self, target_folder: Optional[str] = None, max_depth: int = 3) -> Tuple[bool, str]:
        with self.lock:
            if self.status == "scanning":
                return False, "Scan already in progress"
            self.status = "scanning"
            self.folder_count = 0
            self.current_folder = ""
            self.error = None
            self.result = None

        scan_path = self.home
        if target_folder and target_folder != "~":
            if target_folder.startswith("~/"):
                scan_path = self.home / target_folder[2:]
            else:
                p = Path(target_folder).expanduser().resolve()
                if p == self.home or self.home in p.parents:
                    scan_path = p

        self._thread = threading.Thread(
            target=self._run_scan,
            args=(scan_path, max_depth),
            daemon=True,
        )
        self._thread.start()
        return True, "Scan started"

    def _run_scan(self, target_path: Path, max_depth: int):
        def progress_cb(count, current_path):
            with self.lock:
                self.folder_count = count
                self.current_folder = to_tilde_path(current_path, self.home)

        try:
            scanner = TidyrScanner(home=target_path)
            res = scanner.scan(max_depth=max_depth, progress_callback=progress_cb)
            with self.lock:
                self.result = res
                self.status = "ready"
                self.current_folder = ""
        except Exception as e:
            with self.lock:
                self.error = str(e)
                self.status = "error"

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "status": self.status,
                "folderCount": self.folder_count,
                "currentFolder": self.current_folder,
                "error": self.error,
            }

    def get_result(self) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.result


def reveal_in_file_manager(target_path: Path) -> bool:
    """Reveal path in platform file manager (Finder / Explorer / File Manager)."""
    try:
        resolved = target_path.resolve()
        if sys.platform == "darwin":
            subprocess.run(["open", "-R", str(resolved)], check=False)
            return True
        elif sys.platform == "win32":
            if resolved.is_dir():
                subprocess.run(["explorer.exe", str(resolved)], check=False)
            else:
                subprocess.run(["explorer.exe", f"/select,{str(resolved)}"], check=False)
            return True
        elif sys.platform.startswith("linux"):
            dest = str(resolved if resolved.is_dir() else resolved.parent)
            if shutil.which("gio"):
                subprocess.run(["gio", "open", dest], check=False)
                return True
            elif shutil.which("xdg-open"):
                subprocess.run(["xdg-open", dest], check=False)
                return True
    except Exception:
        pass
    return False


GLOBAL_SCAN_MANAGER = ScanManager()


class TidyrHTTPHandler(http.server.BaseHTTPRequestHandler):
    dist_dir: Path = Path("dist").resolve()
    scan_manager: ScanManager = GLOBAL_SCAN_MANAGER

    def do_OPTIONS(self):
        origin = self.headers.get("Origin")
        if not is_localhost_origin(origin):
            self.send_error(403, "CORS forbidden")
            return
        self.send_response(204)
        send_cors_headers(self)
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlsplit(self.path)
        path = url_parts.path.strip("/")

        # API: GET /api/scan/status
        if path == "api/scan/status":
            self._send_json(200, self.scan_manager.get_status())
            return

        # API: GET /api/scan/result
        if path == "api/scan/result":
            res = self.scan_manager.get_result()
            if res is None:
                self._send_json(404, {"error": "No scan result available"})
            else:
                self._send_json(200, res)
            return

        # Static files from dist_dir
        rel_path = path
        target_file = (self.dist_dir / rel_path).resolve()
        try:
            if (self.dist_dir in target_file.parents or target_file == self.dist_dir) and target_file.is_file():
                self._serve_file(target_file)
                return
        except Exception:
            pass

        # SPA fallback to index.html
        index_file = self.dist_dir / "index.html"
        if index_file.is_file():
            self._serve_file(index_file)
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        url_parts = urllib.parse.urlsplit(self.path)
        path = url_parts.path.strip("/")

        if path == "api/scan":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                body = json.loads(body_bytes.decode("utf-8") or "{}")
            except Exception:
                body = {}

            target_folder = body.get("folder")
            max_depth = int(body.get("maxDepth", 3))
            ok, msg = self.scan_manager.start_scan(target_folder=target_folder, max_depth=max_depth)
            status_code = 200 if ok else 409
            self._send_json(status_code, {"status": self.scan_manager.get_status()["status"], "message": msg})
            return

        if path == "api/reveal":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                body = json.loads(body_bytes.decode("utf-8") or "{}")
            except Exception:
                body = {}

            req_path = body.get("path")
            if not req_path or not isinstance(req_path, str):
                self._send_json(400, {"error": "Missing or invalid path parameter"})
                return

            # Check for path traversal or null characters
            if ".." in req_path or "\0" in req_path:
                self._send_json(403, {"error": "Path traversal rejected"})
                return

            home = self.scan_manager.home
            if req_path == "~":
                resolved = home
            elif req_path.startswith("~/"):
                resolved = (home / req_path[2:]).resolve()
            else:
                resolved = Path(req_path).expanduser().resolve()

            # Security: All paths must resolve inside the home folder
            if resolved != home and home not in resolved.parents:
                self._send_json(403, {"error": "Path must resolve inside home folder"})
                return

            if not resolved.exists():
                self._send_json(404, {"error": "Target path not found"})
                return

            reveal_in_file_manager(resolved)
            self._send_json(200, {"success": True, "path": to_tilde_path(resolved, home)})
            return

        self.send_error(404, "Not Found")

    def _send_json(self, status: int, data: Any):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        send_cors_headers(self)
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, filepath: Path):
        content_type, _ = mimetypes.guess_type(str(filepath))
        if not content_type:
            if filepath.suffix == ".js":
                content_type = "application/javascript"
            elif filepath.suffix == ".css":
                content_type = "text/css"
            elif filepath.suffix == ".json":
                content_type = "application/json"
            else:
                content_type = "application/octet-stream"

        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(content)
        except OSError:
            self.send_error(500, "Error reading file")

    def log_message(self, format, *args):
        # Quiet standard request logs
        pass


def run_server(host: str = "127.0.0.1", port: int = 3000, dist_dir: Optional[Path] = None, home_dir: Optional[Path] = None):
    """Run local HTTP server bound exclusively to 127.0.0.1."""
    resolved_dist = (dist_dir or Path("dist")).resolve()
    TidyrHTTPHandler.dist_dir = resolved_dist
    if home_dir:
        TidyrHTTPHandler.scan_manager = ScanManager(home=home_dir)

    server = http.server.ThreadingHTTPServer((host, port), TidyrHTTPHandler)
    print(f"Tidyr local server running at http://{host}:{port}/")
    print(f"Serving UI from {resolved_dist}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        parser = argparse.ArgumentParser(description="Tidyr Local Server")
        parser.add_argument("serve_cmd", help="serve")
        parser.add_argument("--port", type=int, default=3000, help="Port to listen on (default: 3000)")
        parser.add_argument("--dist", type=str, default="dist", help="Built UI dist directory (default: dist)")
        parser.add_argument("--home", dest="home_override", help="Override home directory path")
        args = parser.parse_args()

        run_server(host="127.0.0.1", port=args.port, dist_dir=Path(args.dist))
        return

    parser = argparse.ArgumentParser(description="Tidyr Home Scanner & Bridge")
    parser.add_argument("folder", nargs="?", default=None, help="Root folder to scan (default: user home)")
    parser.add_argument("--json", dest="json_path", help="Save scan output to specified JSON file (or - for stdout)")
    parser.add_argument("--home", dest="home_override", help="Override home directory path")
    parser.add_argument("--max-depth", dest="max_depth", type=int, default=3, help="Max directory recursion depth")

    args = parser.parse_args()

    home_dir = Path(args.home_override or args.folder or Path.home()).resolve()
    scanner = TidyrScanner(home=home_dir)
    data = scanner.scan(max_depth=args.max_depth)

    if args.json_path:
        if args.json_path == "-":
            print(json.dumps(data, indent=2))
        else:
            out_file = Path(args.json_path)
            out_file.parent.mkdir(parents=True, exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"Scan complete. Output written to {out_file}")
    else:
        print(f"Scanned {scanner.scanned_folders_count} folders in {home_dir}")
        print(f"Total size: {data['scannedBytes']} bytes")
        print(f"Candidate items found: {len(data['items'])}")


if __name__ == "__main__":
    main()
