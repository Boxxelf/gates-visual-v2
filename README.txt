# ETS Gates Visualization (CSV-only)

## How to run
- Option A: open `web/index.html` with a local HTTP server (recommended)
  - Python: `cd web && python3 -m http.server 8000` then open http://localhost:8000
- Option B: open `index.html` directly (`file://`) — some browsers may block local CSV fetch.

## Update data
Replace files in `/data` with the same column names.

## Validate data
`python tools/validate.py /path/to/ets-viz`
