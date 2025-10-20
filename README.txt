# ETS Gates Visualization (CSV-only)

Live (GitHub Pages)
- https://boxxelf.github.io/gates-visual-v2/web/

Overview
- Pure front-end visualization (D3 + vanilla JS) that reads CSV files.
- All data is served statically from `data/*.csv` at the repo root. No backend needed.

Structure
- `web/`: Front-end (`index.html`, styles, scripts)
- `data/`: CSV datasets consumed by the front-end
- `tools/`: Helper scripts (e.g., data validation)

Run locally
- Start a local HTTP server from the `web/` directory:
  - Python: `cd web && python3 -m http.server 8000` then open http://localhost:8000
- Do not open `index.html` via `file://` (browsers block local CSV fetches).

Update data
- Replace the four CSVs under the repo-root `data/` (keep column names the same):
  - `calculus_topics.csv`
  - `cs_topics.csv`
  - `connections.csv`
  - `prerequisites.csv`
- Refresh the page to see changes (cache-busting is enabled in the front-end).

Deploy to GitHub Pages
1) Push this repo to GitHub with both `web/` and `data/` at the root.
2) In repository Settings → Pages:
   - Source: Deploy from a branch
   - Branch: `main / root`
3) After deployment, visit `https://<username>.github.io/<repo>/web/`.

Troubleshooting
- Page loads but data is empty:
  - Ensure you visit the `/web/` path (front-end loads CSV from `../data/`).
  - Ensure a real `data/` directory exists at the repo root (no symlinks).
- Chrome shows stale data:
  - Open DevTools → Network → check "Disable cache", then hard reload (Cmd+Shift+R).

Validate data (optional)
- Run a simple validation script:
  - `python tools/validate.py /path/to/ets-viz`
