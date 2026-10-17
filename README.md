# Tidyr

Tidyr scans a developer's home folder, visualizes disk usage across projects, package caches, AI models, and SDKs, and generates clean, reviewable shell scripts for cleanup.

The app **never** deletes or alters files directly. All cleanup actions are provided as transparent, inspectable shell scripts that you review and execute manually.

---

## Architecture

- **Frontend (`tidyr-ui`)**: React 18, TypeScript, Vite, TailwindCSS, and Zustand.
- **Scanner & Local Bridge (`tidyr.py`)**: Python standard library only. Zero third-party Python dependencies.

---

## Getting Started

### 1. Installation

Ensure you have Node.js 18+ and Python 3.9+ installed.

```bash
# Clone repository
git clone https://github.com/hameem-codes/tidyr.git
cd tidyr

# Install frontend dependencies
npm install
```

### 2. Building the Frontend

Build the production bundle into the `dist/` directory:

```bash
npm run build
```

### 3. Running with Python Scanner & Bridge

Start the local server using Python (stdlib only):

```bash
python3 tidyr.py serve
```

The server binds strictly to `http://127.0.0.1:3000` (localhost only). It serves the built UI and provides local scanning endpoints:
- `POST /api/scan`: Initiates background home folder scanning
- `GET /api/scan/status`: Retrieves live folder counts and progress
- `GET /api/scan/result`: Fetches completed scan survey JSON
- `POST /api/reveal`: Safely reveals folders in macOS Finder, Windows Explorer, or Linux File Manager (strictly confined within your home folder)

You can also run standalone CLI scans directly to a JSON file:

```bash
# Scan home folder to scan.json
python3 tidyr.py --json scan.json

# Scan specific folder
python3 tidyr.py ~/Projects --json projects-scan.json
```

---

## Demo Mode

Tidyr is completely local-first and works offline:
- **Fallback sample dataset**: If `tidyr.py serve` is not running, the UI automatically falls back to sample demonstration data (`public/scan.json`).
- **Demo Data Badge**: When viewing fallback or demo data, a visible `Demo data` badge appears in the top navigation bar and scan panel.
- **Drag & Drop**: You can drag and drop any exported `scan.json` file anywhere onto the application window to load and inspect it immediately without running a server.
- **Development Server**: Run `npm run dev` to launch the Vite development server with hot module replacement at `http://localhost:3000/`.
